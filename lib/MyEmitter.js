const Event = require('./protocol/constants/Event');
const BinlogEvent = require('./protocol/constants/BinlogEventType');

const ReqisterSlave = require('./protocol/sequences/ReqisterSlave');
const Binlog = require('./protocol/sequences/Binlog');

const mysql = require('mysql');
const EventEmitter = require('events');


class MyEmitter extends EventEmitter {

  /**
   * @param Object conf
   * @param Object conf.mysql                 - mysql pool connection options; 
   * @param Object [conf.binlog=null]           
   * @param Object [conf.binlog.slaveId=1]    - When using multiple clients against the same mysql server this ID must be counted up
   * @param Object [conf.binlog.lastPos=0]    - Start emitting events after this position
   * @param Object [conf.binlog.lastTime=0]   - Start emitting events after this time 
   * @param Object [conf.binlog.recoverTimeout=240]
   */
  constructor(conf) {
    super();


    // Create mysql pool
    this.pool = mysql.createPool(Object.assign({}, (conf.mysql ? conf.mysql : {})));

    // Check connection
    this.pool.getConnection(function(err, conn) {
      if (err) throw err;
      conn.ping(function(err) {
        if (err) throw err;
        conn.release();
      });
    });


    // Conf
    conf.binlog = Object.assign({
        slaveId: 1,
        lastPos: 0,
        lastTime: 0,
        values: false,
        recoverTimeout: 240,
        hasChecksum: null,
        version: 0,
      },
      (conf.binlog ? conf.binlog : {}));

    this._conf = {
      binlog: // ComBinlogDumpPacket
      {
        slaveId: conf.binlog.slaveId,
      },
      packet: // BinlogPacket
      {
        last: {
          pos: conf.binlog.lastPos,
          time: conf.binlog.lastTime,
        },
        values: conf.binlog.values,
        hasChecksum: conf.binlog.hasChecksum,
        version: conf.binlog.version
      },
      slave: // ComRegisterSlavePacket
      {
        slaveId: conf.binlog.slaveId,
      },
      recoverTimeout: conf.binlog.recoverTimeout
    };


    // Whether to emit native binlog | rows events
    this._binlogNativeEvents = false;
    this._binlogRowsEvents = false;
    this._wildcardEvents = false;

    this.on('newListener', function(event, listener) {
      if (
        typeof event == 'number' &&
        event < Event.ANY
      )
        this._binlogNativeEvents = true;

      if (
        event == BinlogEvent.ROWS_EVENT ||
        event == BinlogEvent.WRITE_ROWS_EVENT ||
        event == BinlogEvent.UPDATE_ROWS_EVENT ||
        event == BinlogEvent.DELETE_ROWS_EVENT
      ) this._binlogRowsEvents = true;

      if (event == Event.ANY) {
        this._binlogNativeEvents = true;
        this._binlogRowsEvents = true;
        this._wildcardEvents = true;
      }

    }.bind(this));


    this._conn = null; // active connection
    this._bl = null; // binlog sequence
  }


  /* Shortcuts */
  get pos() {
    return this._conf.packet.last.pos;
  }
  get time() {
    return this._conf.packet.last.time;
  }

  /**
   * @param Function [cb]
   */
  start(cb) {
    this._loadHasChecksum(cb ? cb : (err) => { if (err) throw err; });
  }

  _loadHasChecksum(cb) {
    if (this._conf.packet.hasChecksum === null) {
      this.pool.query(
        'SELECT `VARIABLE_VALUE` FROM `information_schema`.`GLOBAL_VARIABLES` WHERE `VARIABLE_NAME` LIKE "MASTER_VERIFY_CHECKSUM"',
        function(err, res) {
          if (err) return cb(err);

          this._conf.packet.hasChecksum = (res.length > 0 && res[0].VARIABLE_VALUE == 'ON');

          this._connect(cb);

        }.bind(this));
    } else {
      this._connect(cb);
    }
  }

  _connect(cb) {
    // Dont connect twice
    if (this._conn) {
      cb(new Error('Already connected'));
      return;
    }

    // Get connection
    this.pool.getConnection(function(err, conn) {
      if (err) return cb(err);

      this._conn = conn;
      this._conn.on('error', this.emit.bind(this, Event.ERROR_SQL));
      this._conn.on('unhandledError', this.emit.bind(this, Event.ERROR_SQL));
      this._conn._implyConnect();

      // Register Slave
      var rg = new ReqisterSlave(this._conf.slave);

      rg.on('error', this.emit.bind(this, Event.ERROR_COM));
      rg.on('unhandledError', this.emit.bind(this, Event.ERROR_COM));
      rg.on('timeout', this.emit.bind(this, Event.ERROR_COM));

      rg.on('end', function() {
        // Binlog
        this._bl = new Binlog({
            binlog: this._conf.binlog,
            packet: this._conf.packet
          },
          null,
          this._binlog_cb.bind(this)
        );

        this._bl.on('error', this.emit.bind(this, Event.ERROR_COM));
        this._bl.on('unhandledError', this.emit.bind(this, Event.ERROR_COM));

        this._bl.on('timeout', this.emit.bind(this, Event.TIMEOUT));
        this._bl.on('end', this.emit.bind(this, Event.END));

        this._bl.on('handshake', function() {
          this.emit(Event.CONNECTED);

          cb();

        }.bind(this));

        this._conn._protocol._enqueue(this._bl);

      }.bind(this));

      this._conn._protocol._enqueue(rg);

    }.bind(this));
  }

  _binlog_cb(err, packet) {
    if (err) {
      this.emit(Event.ERROR_COM, err);
    } else if (
      packet.error ||
      packet.data_error ||
      packet.data_row_errors
    ) {
      let err1 = packet.error;
      let err2 = packet.data_error;
      let err3 = packet.data_row_errors;

      delete packet.error;
      delete packet.data_error;
      delete packet.data_row_errors;

      if (err1) {
        this.emit(Event.ERROR_PARSE, err1, packet);
      }

      if (err2) {
        this.emit(Event.ERROR_PARSE_DATA, err2, packet);
      }

      if (err3) {
        for (let i = 0, l = err3.length; i < l; i++) {
          this.emit(Event.ERROR_PARSE_DATA, err3[i], packet);
        }
      }
    } else {
      packet.skipped ?
        this.emit(Event.SKIP, packet) :
        this.emit(Event.BINLOG, packet);
    }
  }

  /** Emit aditional events */
  emit(type, ...data) {
    // Super
    super.emit.apply(this, arguments);

    // Wildcard Events
    if (this._wildcardEvents) {
      super.emit.call(this, Event.ANY, type, ...data);
    }

    // Native events
    if (
      type == Event.BINLOG &&
      (
        this._binlogNativeEvents ||
        this._binlogRowsEvents
      ) &&
      data[0] && // has packet object
      data[0].eventType // has event type
    ) {
      var pck = data[0];

      // native rows event
      if (
        this._binlogRowsEvents &&
        (
          pck.eventType == BinlogEvent.TABLE_MAP_EVENT ||

          pck.eventType == BinlogEvent.WRITE_ROWS_EVENTv0 ||
          pck.eventType == BinlogEvent.WRITE_ROWS_EVENTv1 ||
          pck.eventType == BinlogEvent.WRITE_ROWS_EVENTv2 ||

          pck.eventType == BinlogEvent.UPDATE_ROWS_EVENTv0 ||
          pck.eventType == BinlogEvent.UPDATE_ROWS_EVENTv1 ||
          pck.eventType == BinlogEvent.UPDATE_ROWS_EVENTv2 ||

          pck.eventType == BinlogEvent.DELETE_ROWS_EVENTv0 ||
          pck.eventType == BinlogEvent.DELETE_ROWS_EVENTv1 ||
          pck.eventType == BinlogEvent.DELETE_ROWS_EVENTv2
        )
      ) {
        switch (pck.eventType) {
          case BinlogEvent.WRITE_ROWS_EVENTv0:
          case BinlogEvent.WRITE_ROWS_EVENTv1:
          case BinlogEvent.WRITE_ROWS_EVENTv2:
            pck.eventType = BinlogEvent.WRITE_ROWS_EVENT;
            this.emit(BinlogEvent.WRITE_ROWS_EVENT, pck);
            break;

          case BinlogEvent.UPDATE_ROWS_EVENTv0:
          case BinlogEvent.UPDATE_ROWS_EVENTv1:
          case BinlogEvent.UPDATE_ROWS_EVENTv2:
            pck.eventType = BinlogEvent.UPDATE_ROWS_EVENT;
            this.emit(BinlogEvent.UPDATE_ROWS_EVENT, pck);
            break;

          case BinlogEvent.DELETE_ROWS_EVENTv0:
          case BinlogEvent.DELETE_ROWS_EVENTv1:
          case BinlogEvent.DELETE_ROWS_EVENTv2:
            pck.eventType = BinlogEvent.DELETE_ROWS_EVENT;
            this.emit(BinlogEvent.DELETE_ROWS_EVENT, pck);
            break;

          default:
        }

        this.emit(BinlogEvent.ROWS_EVENT, pck);
      }

      // native binlog event
      if (this._binlogNativeEvents) {
        this.emit(pck.eventType, pck);
      }

      return;
    }

    // Event.ERROR
    switch (type) {
      case Event.ERROR_SQL:
      case Event.ERROR_COM:
      case Event.ERROR_PARSE:
      case Event.ERROR_PARSE_DATA:
      case Event.ERROR_RECOVER:
        super.emit.call(this, Event.ERROR, ...data);
        break;
      default:
    }

    // recover
    switch (type) {
      case Event.ERROR_SQL:
      case Event.ERROR_COM:
      case Event.ERROR_RECOVER:
      case Event.TIMEOUT:
      case Event.END:
        this._recover();
        break;
      default:
    }
  }


  _disconnect(cb) {
    try {
      this._bl.removeAllListeners(); // stop recovering
      this._conn.removeAllListeners();

      this._bl.end();

      this._conn._protocol.quit(); // throws a squence error
      this._conn.destroy(); // maybe the connection is broke
    } catch (erro) {
      // nothing to be done here
    } finally {
      this._bl = null;
      this._conn = null;

      this.emit(Event.DISCONNECTED);
      cb();
    }
  }

  _reconnect(cb) {
    this.emit(Event.RECONNECTING);

    this._disconnect(function(err) {
      if (err) return cb(err);

      this._connect(cb);

    }.bind(this));
  }

  _recover() {
    this.emit(Event.RECOVERING);

    this._disconnect(function() {
      setTimeout(function() {
          this._connect(function(err) {
            if (err) {
              this.emit(Event.ERROR_RECOVER, err);

              if (!this._conn || !this._bl) this._recover();
            }
          }.bind(this));

        }.bind(this),
        this._conf.recoverTimeout
      );
    }.bind(this));
  }


  /**
   * @param Function [cb]
   */
  stop(cb) {
    this._disconnect(cb ? cb : (err) => { throw err; });
  }


  /**
   * @param Function [cb]
   */
  restart(cb) {
    this.stop(function(err) {
      if (err) { if (cb) cb(err); return; }
      this.start(cb);
    }.bind(this));
  }


}

MyEmitter.Events = Event;
MyEmitter.BinlogEvents = BinlogEvent;

module.exports = MyEmitter;

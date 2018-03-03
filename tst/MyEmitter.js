/* jshint esversion: 6 */
/* global pool */


const MyEmitter = require('../index');
const conf = require('./MyEmitter.conf');

const Event = MyEmitter.Events;
const BinlogEvent = MyEmitter.BinlogEvents;

const assert = require('assert');
const Type = require('type-of-is');


var mse;


describe('MyEmitter', function()
{

  describe('Construct', function()
  {
    it('should construct', function()
    {
      mse = new MyEmitter(conf);

      mse.on(Event.ERROR, function(err, packet)
      {
        if (packet) console.error(packet.eventName);

        console.error(err);

        // if (packet) console.error(packet);

        if (packet.data.rows)
        {
          console.log(packet.data.rows);
        }
      });

      // mse.on(Event.ANY, function(type, packet)
      // {
      //   console.log(Event.eventName(type));
      //   if (packet)
      //   {
      //     console.log(packet.eventName);
      //     console.log(packet);
      //   }
      // });

      assert.ok(Type.is(mse, MyEmitter));
    });
  });


  describe('start', function()
  {
    it('should start', function(done)
    {
      mse.start(done);
    });
  });


  describe('stop', function()
  {
    it('should stop', function(done)
    {
      mse.stop(done);
    });

    it('should start again', function(done)
    {
      mse.start(done);
    });
  });


  describe('restart', function()
  {
    it('should restart', function(done)
    {
      mse.restart(done);
    });
  });

  describe('BINLOG', function()
  {
    it('should get BINLOG', function(done)
    {
      var tm;
      var bl = function(packet)
      {
        // console.log(packet.eventName);
        // console.log(packet);

        switch (packet.eventType)
        {
          case BinlogEvent.TABLE_MAP_EVENT:

            if (
              packet.data &&
              packet.data.schemaName == 'MyEmitter' &&
              packet.data.tableName == 'TstTable'
            )
            {
              tm = packet;
            }
            break;

          case BinlogEvent.WRITE_ROWS_EVENTv1:

            if (tm)
            {
              assert.equal(packet.data.tableId, tm.data.tableId);

              mse.removeListener(Event.BINLOG, bl);

              done();
            }
            break;

          default:
        }

      };
      mse.on(Event.BINLOG, bl);

      pool.query(
        "INSERT INTO `TstTable` (`data`) VALUES ('test4')",
        function(err, res)
        {
          if (err) throw err;
        });

    });
  });


  describe('WRITE_ROWS_EVENT', function()
  {
    it('should get WRITE_ROWS_EVENT', function(done)
    {
      var tm;
      var tmF = function(packet)
      {
        // console.log(packet.eventName);
        // console.log(packet);

        if (
          packet.data &&
          packet.data.schemaName == 'MyEmitter' &&
          packet.data.tableName == 'TstTable'
        )
        {
          tm = packet;
        }
      };

      var wF = function(packet)
      {
        // console.log(packet.eventName);
        // console.log(packet);

        if (tm)
        {
          assert.equal(packet.data.tableId, tm.data.tableId);

          mse.removeListener(BinlogEvent.TABLE_MAP_EVENT, tmF);
          mse.removeListener(BinlogEvent.WRITE_ROWS_EVENT, wF);

          done();
        }
      };

      mse.on(BinlogEvent.TABLE_MAP_EVENT, tmF);
      mse.on(BinlogEvent.WRITE_ROWS_EVENT, wF);

      pool.query(
        "INSERT INTO `TstTable` (`data`) VALUES ('test4')",
        function(err, res)
        {
          if (err) throw err;
        });

    });
  });


  describe('UPDATE_ROWS_EVENT', function()
  {
    it('should get UPDATE_ROWS_EVENT', function(done)
    {
      var tm;
      var tmF = function(packet)
      {
        // console.log(packet.eventName);
        // console.log(packet);

        if (
          packet.data &&
          packet.data.schemaName == 'MyEmitter' &&
          packet.data.tableName == 'TstTable'
        )
        {
          tm = packet;
        }
      };

      var wF = function(packet)
      {
        // console.log(packet.eventName);
        // console.log(packet);

        if (tm)
        {
          assert.equal(packet.data.tableId, tm.data.tableId);

          mse.removeListener(BinlogEvent.TABLE_MAP_EVENT, tmF);
          mse.removeListener(BinlogEvent.UPDATE_ROWS_EVENT, wF);

          done();
        }
      };

      mse.on(BinlogEvent.TABLE_MAP_EVENT, tmF);
      mse.on(BinlogEvent.UPDATE_ROWS_EVENT, wF);

      pool.query(
        "UPDATE `TstTable` SET `data` = 'test5' WHERE `id` = 1",
        function(err, res)
        {
          if (err) throw err;
        });

    });
  });


  describe('DELETE_ROWS_EVENT', function()
  {
    it('should get DELETE_ROWS_EVENT', function(done)
    {
      var tm;
      var tmF = function(packet)
      {
        // console.log(packet.eventName);
        // console.log(packet);

        if (
          packet.data &&
          packet.data.schemaName == 'MyEmitter' &&
          packet.data.tableName == 'TstTable'
        )
        {
          tm = packet;
        }
      };

      var wF = function(packet)
      {
        // console.log(packet.eventName);
        // console.log(packet);

        if (tm)
        {
          assert.equal(packet.data.tableId, tm.data.tableId);

          mse.removeListener(BinlogEvent.TABLE_MAP_EVENT, tmF);
          mse.removeListener(BinlogEvent.DELETE_ROWS_EVENT, wF);

          done();
        }
      };

      mse.on(BinlogEvent.TABLE_MAP_EVENT, tmF);
      mse.on(BinlogEvent.DELETE_ROWS_EVENT, wF);

      pool.query(
        "DELETE FROM `TstTable` WHERE `TstTable`.`id` = 1",
        function(err, res)
        {
          if (err) throw err;
        });

    });
  });


  describe('QUERY_EVENT', function()
  {
    it('should get QUERY_EVENT', function(done)
    {
      var wF = function(packet)
      {
        // console.log(packet.eventName);
        // console.log(packet);

        if (
          packet.data &&
          packet.data.query == 'TRUNCATE `TstTable`'
        )
        {
          mse.removeListener(BinlogEvent.QUERY_EVENT, wF);

          done();
        }
      };

      mse.on(BinlogEvent.QUERY_EVENT, wF);

      pool.query(
        "TRUNCATE `TstTable`",
        function(err, res)
        {
          if (err) throw err;
        });

    });
  });


  // Values don't work yet
  // describe('BINLOG', function()
  // {
  //   it('should get BINLOG packet', function(done)
  //   {
  //     this.timeout(1000);

  //     var insertId = 0;

  //     var bl = function(packet)
  //     {
  //       console.log(packet.eventName);
  //       console.log(packet);

  //       if (
  //         packet.data &&
  //         packet.data.rows
  //       )
  //       {
  //         console.log(packet.data.rows);
  //       }

  //       if (
  //         packet.data &&
  //         packet.data.rows &&
  //         packet.data.rows.length > 0 &&
  //         packet.data.rows[0] == insertId &&
  //         packet.data.rows[1] == 'test5'
  //       )
  //       {
  //         mse.removeListener(Event.BINLOG, bl);
  //         done();
  //       }
  //     };
  //     mse.on(Event.BINLOG, bl);

  //     pool.query(
  //       "INSERT INTO `TstTable` (`data`) VALUES ('test5')",
  //       function(err, res)
  //       {
  //         if (err) throw err;
  //         insertId = res.insertId;
  //       });

  //   });
  // });


  // Values don't work yet
  // describe('BINLOG fields', function()
  // {
  //   it('should get BINLOG fields', function(done)
  //   {
  //     this.timeout(1000);
  //     var insertId = 0;

  //     var bl = function(packet)
  //     {
  //       console.log(packet.eventName);

  //       if (packet.data.rows)
  //       {
  //         console.log(packet.data.rows);
  //       }

  //       if (
  //         packet.data.rows &&
  //         packet.data.rows.length > 0 &&
  //         packet.data.rows[0] == insertId
  //       )
  //       {
  //         mse.removeListener(Event.BINLOG, bl);

  //         assert.deepEqual(packet.data.rows, {});

  //         done();
  //       }
  //     };
  //     mse.on(Event.BINLOG, bl);

  //     pool.query(
  //       "INSERT INTO `TstFields` " +
  //       "(`id`, `f1`, `f2`, `f3`, `f4`, `f5`, `f6`, `f7`, `f8`, `f9`, `f10`, `f11`, `f12`, `f13`, `f14`, `f15`, `f16`, `f17`, `f18`, `f19`, `f20`, `f21`, `f22`, `f23`, `f24`, `f25`, `f26`, `f27`, `f28`, `f29`, `f30`, `f31`, `f32`, `f33`, `f34`, `f35`, `f36`) " +
  //       "VALUES " +
  //       "(NULL, '1', '2', '3', '4', '5', '6.1', '7.1', '8.1', b'0', '2018-02-21', '2018-02-21 19:01:01', '2018-02-21 19:02:02', '19:03:03', '2018', 'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 0x0, 0x1, '0x', '0x', '0x', '0x', 'e1', 's1', GeomFromText('\\'POINT(0 0)\\',0'), GeomFromText('\\'POINT(0 0)\\',0'), GeomFromText('\\'LINESTRING(0 0, )\\',0'), GeomFromText('\\'POLYGON((0 0, , , ))\\',0'), GeomFromText('\\'MULTIPOINT(0 0)\\',0'), GeomFromText('\\'MULTILINESTRING((0 0, ))\\',0'), GeomFromText('\\'MULTIPOLYGON(((0 0, , , )))\\',0'), GeomFromText('\\'GEOMETRYCOLLECTION()\\',0'));",
  //       function(err, res)
  //       {
  //         if (err) throw err;
  //         insertId = res.insertId;
  //       });

  //   });
  // });


  describe('stop', function()
  {
    it('should stop', function(done)
    {
      mse.stop(done);
    });
  });


});

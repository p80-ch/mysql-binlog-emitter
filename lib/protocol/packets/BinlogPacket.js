const BinlogEvent = require('../constants/BinlogEventType');

const MysqlType = require('mysql/lib/protocol/constants/types');
const MysqlTypeArray = Object.keys(MysqlType);

module.exports = BinlogPacket;

function BinlogPacket(options)
{
  options = options || {};
  // this.protocol41 = options.protocol41;

  // head
  this.timestamp = undefined;
  this.eventType = undefined;
  this.serverId = undefined;
  this.eventSize = undefined;

  // binlog-version > 1
  this.flags = undefined;
  this.logPos = undefined;

  this.version = undefined; // binlog version
  this.skipped = undefined; // whether parsing of the body was skipped

  this.data = undefined;

  this.error;
  this.data_error; 
  this.data_error_rows;
}

Object.defineProperty(BinlogPacket.prototype, 'eventName',
{
  get: function()
  {
    return BinlogEvent.eventName(this.eventType);
  }
});

BinlogPacket.prototype.parse = function(parser)
{
  var opt = parser._options;

  // Head
  try
  {
    this._parse_head(parser, opt);

    if (this.logPos)
    {
      opt.last.pos = this.logPos;
      opt.last.time = this.timestamp;
    }
  }
  catch (err)
  {
    this.error = err;
    return;
  }

  // Body
  if (!this.skipped)
  {
    try
    {
      this._parse_body(parser, opt);
    }
    catch (err)
    {
      this.data_error = err;
    }
  }
};

BinlogPacket.prototype._parse_head = function(parser, opt)
{
  // https://dev.mysql.com/doc/internals/en/binlog-event-header.html
  parser.parseUnsignedNumber(1); // marker

  this.timestamp = parser._hook.parseTimestamp();
  this.eventType = parser.parseUnsignedNumber(1);
  this.serverId = parser.parseUnsignedNumber(4);
  this.eventSize = parser.parseUnsignedNumber(4);

  // Version
  // https://dev.mysql.com/doc/internals/en/determining-binary-log-version.html
  if (opt.version === 0)
  {
    if (this.eventType == BinlogEvent.ROTATE_EVENT)
    {
      // do nothing; Check 2nd event
    }
    else if (this.eventType == BinlogEvent.START_EVENT_V3)
    {
      opt.version = (this.eventSize < 75) ? 1 : 3;
    }
    else if (this.eventType == BinlogEvent.FORMAT_DESCRIPTION_EVENT)
    {
      opt.version = 4;
    }
    else
    {
      opt.version = 3;
    }
  }
  this.version = opt.version;

  if (opt.version > 1)
  {
    this.logPos = parser.parseUnsignedNumber(4);
    this.flags = parser.parseUnsignedNumber(2);
  }

  // skip
  this.skipped = (
    (opt.last.pos && opt.last.pos > this.logPos) ||
    (opt.last.time && opt.last.time > this.timestamp)
  );
};

BinlogPacket.prototype._parse_body = function(parser, opt)
{
  this.data = {};

  switch (this.eventType)
  {

    // UNKNOWN_EVENT
    case BinlogEvent.UNKNOWN_EVENT:
      break; // do nothing


      // TABLE_MAP_EVENT
    case BinlogEvent.TABLE_MAP_EVENT:
      {
        // https://dev.mysql.com/doc/internals/en/table-map-event.html
        this.data.tableId = parser._hook.parseUnsignedNumber(6);
        this.data.flags = parser.parseUnsignedNumber(2);

        this.data.schemaName = parser._hook.parseStringL(1);

        /* null bitmask*/
        parser.parseUnsignedNumber(1);

        this.data.tableName = parser._hook.parseStringL(1);

        // only needed with row values
        if (opt.values)
        {
          /* null bitmask*/
          parser.parseUnsignedNumber(1);

          this.data.columns = {};

          this.data.columns.count = parser.parseLengthCodedNumber();

          this.data.columns.types = [];
          for (let i = 0, l = this.data.columns.count; i < l; i++)
          {
            this.data.columns.types.push(parser.parseUnsignedNumber(1));
          }

          this.data.columns.meta = parser.parseLengthCodedNumber();

          /* null bitmask*/
          parser.parseString(Math.floor((this.data.columns.count + 7) / 8));

          opt.lastTableMap = this.data;
        }
      }
      break;


      // ROWS_EVENT
    case BinlogEvent.WRITE_ROWS_EVENTv0:
    case BinlogEvent.WRITE_ROWS_EVENTv1:
    case BinlogEvent.WRITE_ROWS_EVENTv2:

    case BinlogEvent.UPDATE_ROWS_EVENTv0:
    case BinlogEvent.UPDATE_ROWS_EVENTv1:
    case BinlogEvent.UPDATE_ROWS_EVENTv2:

    case BinlogEvent.DELETE_ROWS_EVENTv0:
    case BinlogEvent.DELETE_ROWS_EVENTv1:
    case BinlogEvent.DELETE_ROWS_EVENTv2:
      {
        // https://dev.mysql.com/doc/internals/en/rows-event.html
        this.data.tableId = parser._hook.parseUnsignedNumber(6);

        this.data.flags = parser.parseUnsignedNumber(2);

        if (this.version == 2)
        {
          this.data.extraData = parser._hook.parseStringL(2);
        }

        // !!! Does not work yet !!!
        if (opt.values)
        {
          // Check TableMap
          let types;
          if (!opt.lastTableMap)
          {
            this.data_error = new Error('No table map');
          }
          else if (opt.lastTableMap.tableId != this.data.tableId)
          {
            this.data_error = new Error('Wrong tableId: ' + opt.lastTableMap.tableId);
          }
          else
          {
            types = opt.lastTableMap.columns.types;
          }

          let columnCount = parser.parseLengthCodedNumber();

          // columns-present-bitmap
          let cpb = Math.floor((columnCount + 7) / 8);

          let cols2 = (
            this.eventType == BinlogEvent.UPDATE_ROWS_EVENTv1 ||
            this.eventType == BinlogEvent.UPDATE_ROWS_EVENTv2
          );

          if (types)
          {
            this.data.rows = [];
            for (let i = 0, l = columnCount; i < l; i++)
            {
              this._parse_body_row(cpb, types[i], parser);

              if (cols2)
                this._parse_body_row(cpb, types[i], parser);
            }
          }
        }

      }
      break;


      // ROWS_QUERY_EVENT
    case BinlogEvent.ROWS_QUERY_EVENT:
      this.data.query = parser._hook.parseStringL(1);
      break;


      // QUERY_EVENT
    case BinlogEvent.QUERY_EVENT:

      // https://dev.mysql.com/doc/internals/en/query-event.html
      // Post-header
      this.data.slaveProxyId = parser.parseUnsignedNumber(4);
      this.data.executionTime = parser._hook.parseTimestamp();
      let schemaLength = parser.parseUnsignedNumber(1);
      this.data.errorCode = parser.parseUnsignedNumber(2);

      // Payload
      if (this.version > 3)
      {
        this.data.statusVars = parser._hook.parseStringL(2);
      }

      this.data.schema = parser._hook.parseString(schemaLength);

      /* null bitmask*/
      parser.parseUnsignedNumber(1);

      this.data.query = parser._hook.parseStringEOF();

      break;


      // XID_EVENT
    case BinlogEvent.XID_EVENT:
      this.data.xid = parser._hook.parseUnsignedNumber(8);
      break;


      // START_EVENT_V3
    case BinlogEvent.START_EVENT_V3:

      // https://dev.mysql.com/doc/internals/en/start-event-v3.html
      this.data.binlogVersion = parser.parseUnsignedNumber(2);
      this.data.mysqlServerVersion = parser._hook.parseString(50);
      this.data.createTimestamp = parser.parseUnsignedNumber(4);
      break;


      // STOP_EVENT
    case BinlogEvent.STOP_EVENT:
      break; // emtpy


      // ROTATE_EVENT
    case BinlogEvent.ROTATE_EVENT:
      if (this.version > 1 || this.version == 0) // version may not be set yet
      {
        this.data.position = parser._hook.parseUnsignedNumber(8);
      }
      this.data.nextBinlogName = parser._hook.parseStringEOF();
      break;


      // INTVAR_EVENT
    case BinlogEvent.INTVAR_EVENT:
      // this.data.type = parser.parseUnsignedNumber(1);
      // this.data.value = parser._hook.parseUnsignedNumber(8);
      this.data = null;
      break;


      // LOAD_EVENT
    case BinlogEvent.LOAD_EVENT:
      {
        // // https://dev.mysql.com/doc/internals/en/load-event.html
        // this.data.slaveProxyId = parser.parseUnsignedNumber(4);
        // this.data.execTime = parser.parseTimestamp();
        // this.data.skipLines = parser.parseUnsignedNumber(4);
        // let tableNameLen = parser.parseUnsignedNumber(1);
        // let schemaLen = parser.parseUnsignedNumber(1);
        // let numFields = parser.parseUnsignedNumber(4);

        // this.data.fieldTerm = parser.parseUnsignedNumber(1);
        // this.data.enclosedBy = parser.parseUnsignedNumber(1);
        // this.data.lineTerm = parser.parseUnsignedNumber(1);
        // this.data.lineStart = parser.parseUnsignedNumber(1);
        // this.data.escapedBy = parser.parseUnsignedNumber(1);
        // this.data.optFlags = parser.parseUnsignedNumber(1);
        // this.data.emptyFlags = parser.parseUnsignedNumber(1);

        // let fieldNameLengths = [];
        // for (let i = 0, l = numFields.length; i < l; i++)
        // {
        //   fieldNameLengths.push(parser._hook.parseString(1));
        // }

        // this.data.fieldNames = [];
        // for (let i = 0, l = numFields.length; i < l; i++)
        // {
        //   this.data.fieldNames.push(parser._hook.parseString0());
        //   // this.data.fieldNames.push(parser.parseString(fieldNameLengths[i]));
        // }

        // this.data.tableName = parser._hook.parseString(tableNameLen);
        // this.data.schemaName = parser._hook.parseString(schemaLen);
        // this.data.fileName = parser._hook.parseStringEOF();

        this.data = null;
      }
      break;


      // SLAVE_EVENT
    case BinlogEvent.SLAVE_EVENT:
      break; // do nothing


      // CREATE_FILE_EVENT
    case BinlogEvent.CREATE_FILE_EVENT:
      // this.data.fileId = parser.parseUnsignedNumber(4);
      // this.data.blockData = parser._hook.parseStringEOF();
      this.data = null;
      break;


      // APPEND_BLOCK_EVENT
    case BinlogEvent.APPEND_BLOCK_EVENT:
      // this.data.fileId = parser.parseUnsignedNumber(4);
      // this.data.blockData = parser._hook.parseStringEOF();
      this.data = null;
      break;


      // EXEC_LOAD_EVENT
    case BinlogEvent.EXEC_LOAD_EVENT:
      // this.data.fileId = parser.parseUnsignedNumber(4);
      this.data = null;
      break;


      // DELETE_FILE_EVENT
    case BinlogEvent.DELETE_FILE_EVENT:
      // this.data.fileId = parser.parseUnsignedNumber(4);
      this.data = null;
      break;


      // NEW_LOAD_EVENT
    case BinlogEvent.NEW_LOAD_EVENT:
      {
        // // https://dev.mysql.com/doc/internals/en/new-load-event.html
        // this.data.slaveProxyId = parser.parseUnsignedNumber(4);
        // this.data.execTime = parser.parseTimestamp();
        // this.data.skipLines = parser.parseUnsignedNumber(4);

        // let tableNameLen = parser.parseUnsignedNumber(1);
        // let schemaLen = parser.parseUnsignedNumber(1);
        // let numFields = parser.parseUnsignedNumber(4);

        // this.data.fieldTerm = parser._hook.parseStringL(1);
        // this.data.enclosedBy = parser._hook.parseStringL(1);
        // this.data.lineTerm = parser._hook.parseStringL(1);
        // this.data.lineStart = parser._hook.parseStringL(1);
        // this.data.escapedBy = parser._hook.parseStringL(1);
        // this.data.optFlags = parser._hook.parseStringL(1);

        // // let fieldNameLengths = [];
        // for (let i = 0, l = numFields.length; i < l; i++)
        // {
        //   parser._hook.parseString(1);
        //   // fieldNameLengths.push(parser._hook.parseString(1));
        // }

        // this.data.fieldNames = [];
        // for (let i = 0, l = numFields.length; i < l; i++)
        // {
        //   this.data.fieldNames.push(parser._hook.parseString0());
        //   // this.data.fieldNames.push(parser._hook.parseStringL(fieldNameLengths[i]));
        // }

        // this.data.tableName = parser._hook.parseString(tableNameLen);
        // this.data.schemaName = parser._hook.parseString(schemaLen);
        // this.data.fileName = parser._hook.parseStringEOF();

        this.data = null;
      }
      break;


      // RAND_EVENT
    case BinlogEvent.RAND_EVENT:
      // this.data.seed1 = parser._hook.parseUnsignedNumber(8);
      // this.data.seed2 = parser._hook.parseUnsignedNumber(8);

      this.data = null;
      break;


      // USER_VAR_EVENT
    case BinlogEvent.USER_VAR_EVENT:

      // // https://dev.mysql.com/doc/internals/en/user-var-event.html
      // this.data.name = parser._hook.parseStringL(4);

      // if (parser.parseUnsignedNumber(1))
      // { // is_null
      //   this.data.type = 'NULL';
      //   this.data.value = null;
      // }
      // else
      // {
      //   this.data.type = parser.parseUnsignedNumber(1);
      //   this.data.charset = parser.parseUnsignedNumber(4);
      //   this.data.value = parser._hook.parseStringL(4);
      //   //this.data.flags = parser.parseUnsignedNumber(1);
      // }

      this.data = null;
      break;


      // FORMAT_DESCRIPTION_EVENT
    case BinlogEvent.FORMAT_DESCRIPTION_EVENT:

      // // https://dev.mysql.com/doc/internals/en/format-description-event.html
      // this.data.binlogVersion = parser.parseUnsignedNumber(2);
      // this.data.mysqlServerVersion = parser._hook.parseString(50);
      // this.data.createTimestamp = parser._hook.parseTimestamp();
      // this.data.eventHeaderLength = parser.parseUnsignedNumber(1);
      // this.data.eventTypeHeaderLengths = parser._hook.parseStringEOF();

      this.data = null;
      break;


      // BEGIN_LOAD_QUERY_EVENT
    case BinlogEvent.BEGIN_LOAD_QUERY_EVENT:
      // this.data.fileId = parser.parseUnsignedNumber(4);
      // this.data.blockData = parser._hook.parseStringEOF();

      this.data = null;
      break;


      // EXECUTE_LOAD_QUERY_EVENT
    case BinlogEvent.EXECUTE_LOAD_QUERY_EVENT:

      // this.data.slaveProxyId = parser.parseUnsignedNumber(4);
      // this.data.execTime = parser.parseTimestamp();
      // this.data.schemaLen = parser.parseUnsignedNumber(1);
      // this.data.errorCode = parser.parseUnsignedNumber(2);
      // this.data.statusVarsLength = parser.parseUnsignedNumber(2);

      // this.data.fileId = parser.parseUnsignedNumber(4);
      // this.data.startPos = parser.parseUnsignedNumber(4);
      // this.data.endPos = parser.parseUnsignedNumber(4);
      // this.data.dupHandlingFlags = parser.parseUnsignedNumber(1);

      this.data = null;

      break;


      // INCIDENT_EVENT
    case BinlogEvent.INCIDENT_EVENT:
      // this.data.type = parser.parseUnsignedNumber(4);
      // this.data.message = parser._hook.parseStringL(1);

      this.data = null;
      break;


      // HEARTBEAT_EVENT
    case BinlogEvent.HEARTBEAT_EVENT:
      break; // empty


    case BinlogEvent.IGNORABLE_EVENT:
    case BinlogEvent.GTID_EVENT:
    case BinlogEvent.ANONYMOUS_GTID_EVENT:
    case BinlogEvent.PREVIOUS_GTIDS_EVENT:
      /* falls through */
    default:
  }
};


BinlogPacket.prototype._parse_body_row = function(cpb, type, parser)
{
  /*null bitmap*/
  parser.parseString(cpb);

  try
  {
    // https://dev.mysql.com/doc/internals/en/binary-protocol-value.html
    let value;

    switch (type)
    {


      case MysqlType.NULL:
        value = null;
        break;


      case MysqlType.TINY:
        value = parser.parseUnsignedNumber(1);
        break;


      case MysqlType.SHORT:
      case MysqlType.YEAR:
        value = parser.parseUnsignedNumber(2);
        break;


      case MysqlType.LONG:
      case MysqlType.INT24:
        value = parser.parseUnsignedNumber(4);
        break;


      case MysqlType.LONGLONG:
        value = parser._hook.parseUnsignedNumber(8);
        break;


      case MysqlType.FLOAT:
        value = parseFloat(parser._hook.parseStringL(4));
        break;


      case MysqlType.DOUBLE:
        value = parser._hook.parseStringL(8);
        // value = parseFloat(parser._hook.parseStringL(8));
        break;


      case MysqlType.ENUM:
        // value = parser.parseLengthCodedString();
        value = parseInt(parser.parseLengthCodedString(), 10);
        break;


      case MysqlType.BIT:
        value = parser.parseLengthCodedBuffer();
        break;


      case MysqlType.DECIMAL:
      case MysqlType.NEWDECIMAL:
        // value = parser.parseLengthCodedString();
        value = parseFloat(parser.parseLengthCodedString());
        break;


      case MysqlType.STRING:
      case MysqlType.VARCHAR:
      case MysqlType.VAR_STRING:
      case MysqlType.SET:
      case MysqlType.LONG_BLOB:
      case MysqlType.MEDIUM_BLOB:
      case MysqlType.BLOB:
      case MysqlType.TINY_BLOB:
        // case MysqlType.GEOMETRY:
        value = parser.parseLengthCodedString();
        break;

      case MysqlType.GEOMETRY:
        value = parser.parseGeometryValue();
        break;


      case MysqlType.DATE:
      case MysqlType.DATETIME:
      case MysqlType.DATETIME2:
      case MysqlType.TIMESTAMP:
      case MysqlType.TIMESTAMP2:
      case MysqlType.NEWDATE:
        {
          let length = parser.parseUnsignedNumber(1); // length valid values: 0, 4, 7, 11

          let date = [];

          if (length > 0)
          {
            date.push(parser.parseUnsignedNumber(1));
            date.push(parser.parseUnsignedNumber(2));
            date.push(parser.parseUnsignedNumber(1));

            if (length > 4)
            {
              date.push(parser.parseUnsignedNumber(1));
              date.push(parser.parseUnsignedNumber(1));
              date.push(parser.parseUnsignedNumber(1));

              if (length > 7)
              {
                date.push(parser.parseUnsignedNumber(1));
                date.push(parser.parseUnsignedNumber(4));
              }
            }

            // console.log(date);

            value = new Date(...date);
          }
          else
          {
            value = null;
          }
        }
        break;


      case MysqlType.TIME:
        {
          let length = parser.parseUnsignedNumber(1); // length valid values: 0, 8, 12

          if (length > 0)
          {
            let value = {};

            value.is_negative = (parser.parseUnsignedNumber(1) == 1);
            value.days = parser.parseUnsignedNumber(4);
            value.hours = parser.parseUnsignedNumber(1);
            value.minutes = parser.parseUnsignedNumber(1);
            value.seconds = parser.parseUnsignedNumber(1);

            if (length > 8)
            {
              value.micro_seconds = parser.parseUnsignedNumber(4);
            }
          }
          else
          {
            value = null;
          }
        }
        break;

      case MysqlType.TIME2:
        /* falls through */
      default:
        if (!this.data_error_rows) this.data_error_rows = [];
        this.data_error_rows.push(new Error('MysqlType not found: ' + (MysqlTypeArray.length < type ? MysqlTypeArray[type] : type)));
    }

    // this.data.rows.push(value);
    this.data.rows.push([MysqlTypeArray[type], value]);

  }
  catch (err)
  {
    if (!this.data_error_rows) this.data_error_rows = [];
    this.data_error_rows.push(err);
  }
};

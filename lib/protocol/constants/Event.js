const BinlogEvent = require('./BinlogEventType');

const Events = {

  ANY: 100, // wildcard event 

  CONNECTED: 101,
  DISCONNECTED: 102,
  RECONNECTING: 103,
  RECOVERING: 104,

  BINLOG: 110,
  SKIP: 111,

  TIMEOUT: 120,
  END: 121,

  ERROR: 400,
  ERROR_SQL: 401,
  ERROR_COM: 402, // binlog com error
  ERROR_PARSE: 403, // binlog parse error
  ERROR_PARSE_DATA: 404, // binlog parse data error
  ERROR_RECOVER: 405,

};

Events.eventName = function(type)
{
  return (type < Events.ANY) ?
    BinlogEvent.eventName(type) :
    Object.keys(this).find(k => this[k] === type);
};

module.exports = Events;

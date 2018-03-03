const Util = require('util');

const Packets = require('mysql/lib/protocol/packets');
const Sequence = require('mysql/lib/protocol/sequences/Sequence');

const BinlogPacket = require('../packets/BinlogPacket');
const ComBinlogDumpPacket = require('../packets/ComBinlogDumpPacket');

const ParserHook = require('../ParserHook');


module.exports = Binlog;

Util.inherits(Binlog, Sequence);

function Binlog(options, callback_end, callback_packet)
{
  Sequence.call(this, options, callback_end);

  this._options = options;
  this._callback_packet = callback_packet;

  //this._options.packet.version = 0; // binary log version
  this._options.packet.lastTableMap; // set by TABLE_MAP_EVENT

  this._handshaked = false;
}

Binlog.prototype.start = function()
{
  this.emit('packet', new ComBinlogDumpPacket(this._options.binlog));
};

Binlog.prototype.determinePacket = function determinePacket(firstByte, parser)
{
  switch (firstByte)
  {
    case 0x00:

      if (!this._handshaked)
      {
        this._handshaked = true;
        this.emit('handshake');
      }

      parser._hook = new ParserHook(parser);
      parser._options = this._options.packet; // push packet options into parser  

      return BinlogPacket;

    case 0xfe:
      return Packets.EofPacket;
    case 0xff:
      return Packets.ErrorPacket;
    default:
      return undefined;
  }
};

/*jshint sub:true*/
Binlog.prototype['BinlogPacket'] = function(packet)
{
  this._callback_packet(null, packet);
};

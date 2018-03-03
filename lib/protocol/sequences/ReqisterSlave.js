const Util = require('util');

const Packets = require('mysql/lib/protocol/packets');
const Sequence = require('mysql/lib/protocol/sequences/Sequence');

const ComRegisterSlavePacket = require('../packets/ComRegisterSlavePacket');


module.exports = ReqisterSlave;

Util.inherits(ReqisterSlave, Sequence);

function ReqisterSlave(options)
{
  Sequence.call(this, options);
  this._opt = options;
}

ReqisterSlave.prototype.start = function()
{
  this.emit('packet', new ComRegisterSlavePacket(this._opt));
};

// ReqisterSlave.determinePacket = function(byte)
// {
//   switch (byte)
//   {
//     case 0x00:
//       return Packets.OkPacket;
//     case 0xfe:
//       return Packets.EofPacket;
//     case 0xff:
//       return Packets.ErrorPacket;
//     default:
//       return undefined;
//   }
// };

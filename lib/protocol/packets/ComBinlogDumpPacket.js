module.exports = ComBinlogDumpPacket;

/**
 * https: //dev.mysql.com/doc/internals/en/com-binlog-dump.html
 */
function ComBinlogDumpPacket(options)
{
  options = options || {};

  this.command = 0x12;
  this.binlog_pos = options.position || 4;
  this.flags = options.nonBlock ? 1 : 0; // always 0
  this.serverId = options.slaveId || 1;
  this.binlog_filename = options.file || ''; // not needed
}

ComBinlogDumpPacket.prototype.write = function(writer)
{
  writer.writeUnsignedNumber(1, this.command);
  writer.writeUnsignedNumber(4, this.binlog_pos);
  writer.writeUnsignedNumber(2, this.flags);
  writer.writeUnsignedNumber(4, this.serverId);
  writer.writeNullTerminatedString(this.binlog_filename);
};

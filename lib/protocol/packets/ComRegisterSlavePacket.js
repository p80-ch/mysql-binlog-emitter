module.exports = ComRegisterSlavePacket;

/**
 * https://dev.mysql.com/doc/internals/en/com-register-slave.html
 */
function ComRegisterSlavePacket(options)
{
  options = options || {};

  this.command = 0x15;

  this.serverId = options.slaveId || 1;
  this.hostname = options.hostname || ''; // normally empty
  this.user = options.user || ''; // normally empty
  this.password = options.password || ''; // normally empty
  this.port = options.port || null; // normally empty
  this.replication_rank = options.replication_rank || 0; // ignored
  this.master_id = options.masterId || 0;
}

ComRegisterSlavePacket.prototype.write = function(writer)
{
  writer.writeUnsignedNumber(1, this.command);
  writer.writeUnsignedNumber(4, this.serverId);
  writer.writeUnsignedNumber(1, this.hostname.length);
  writer.writeNullTerminatedString(this.hostname);
  writer.writeUnsignedNumber(1, this.user.length);
  writer.writeNullTerminatedString(this.user);
  writer.writeUnsignedNumber(1, this.password.length);
  writer.writeNullTerminatedString(this.password);
  writer.writeUnsignedNumber(2, this.port);
  writer.writeUnsignedNumber(4, this.replication_rank);
  writer.writeUnsignedNumber(4, this.master_id);
};

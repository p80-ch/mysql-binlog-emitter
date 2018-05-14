# mysql-binlog-emitter
A nodejs mysql/mariadb slave replication event emitter.  

This is a high level implementation of mysql's binary log protocol, if your are only interested in changes occurring in your database, check out [mysql-event-emitter](https://www.npmjs.com/package/mysql-event-emitter).

\* It is tested against `mariadb 10.1.31` and binlog protocol version 4 \*


## Contents
- [Install](#install)
- [Setup](#setup)
- [Usage](#usage)
- [Options](#options)
- [Packet](#packet)
- [Examples](#examples)
- [Credits](#credits)


## Install
`npm install mysql-binlog-emitter`


## Setup
### Mysql Server
Enable binary log replication in `/etc/mysql/my.cnf`
```
[mysqld]
server-id        = 1
log_bin          = /var/log/mysql/mysql-bin
log_bin_index    = /var/log/mysql/mysql-bin.index
binlog-format    = row                              # needed for row events
# Optional
expire_logs_days = 10
max_binlog_size  = 100M
```

### Mysql User
Give your user the rights to read binary logs
```sql
GRANT REPLICATION SLAVE, REPLICATION CLIENT, SELECT ON *.* TO '[USER]'@'[HOST]'
```

### Reset Binary Log
After changing the mysql configuration you may have to run `RESET MASTER` once.  
To do that your user needs the `RELOAD` right
```sql
GRANT RELOAD ON *.* TO '[USER]'@'[HOST]'
```


## Usage
```js
const MyBinlogEmitter = require('mysql-binlog-emitter');
const Event = MyBinlogEmitter.Events;

var mbe =  MyBinlogEmitter({
  "mysql": {
    "user": "[USER]",
    "password": "[PWD]"
  }
});

mbe.on(Event.ANY, function(type, ...data){
  console.log(Event.eventName(type));
}):

mbe.start();
```


## Options
- For a single instance no binlog option is needed
- Any [mysql](https://www.npmjs.com/package/mysql) [connection](https://www.npmjs.com/package/mysql#connection-options) and [pool](https://www.npmjs.com/package/mysql#pool-options) option is supported.  

**Defaults**
```js
{  
  // mysql pool options
  "mysql": {
    "[socket]": "[SOCKET]",
    "[host]":   "127.0.0.1",
    "user":     "[USER]",
    "password": "[PWD]",
    "[database]": null        // (is not required)
  }
  // binlog options
  "binlog": {
    "slaveId": 1,             // Needs to be counted up, if more than one instance is running  
    "lastPos": 0,             // Skip all events < lastPos
    "lastTime": 0,            // Timstamp; Skip all events < lastTime 
    "recoverTimeout": 240,    // Time in ms between reconnection attempts. (Eg. on a mysql server restart)
    "hasChecksum": null,      // Auto detected; Boolean; Whether the server uses a checksum table
    "version": 0,             // Auto detected; (Only version 4 is supported right now)
  }
}
```
[//]: <> ("values": false,        // not yet implemented)


## Events
No  | Name              | Data              | . 
--- | ----------------- | ----------------- | --- 
100 | ANY               | EventType, Data   | Wildcard event; Emitts all events incl. BinlogEvents. 
101 | CONNECTED         |                   | 
102 | DISCONNECTED      |                   | 
103 | RECONNECTING      |                   | 
104 | RECOVERING        |                   | 
110 | BINLOG            | Packet            | Emits all BinlogEvents, except skipped one's 
111 | SKIP              | Packet            | Emits a packet w/out data, when a packet is skipped 
120 | TIMEOUT           |                   | 
121 | END               |                   | 
400 | ERROR             | Error             | Any Error 
401 | ERROR_SQL         | Error             | SQL Error 
402 | ERROR_COM         | Error             | SQL Com Error 
403 | ERROR_PARSE       | Error, Packet     | Binlog Parse Error 
404 | ERROR_PARSE_DATA  | Error, Packet     | Binlog Parse Data Error 
405 | ERROR_RECOVER     | Error             | Recover Error; *(Will not stop the emitter from recovering)* 


### BinlogEvents
As described in [MySQL Internals Manual](https://dev.mysql.com/doc/internals/en/) > [Binlog Event Types](https://dev.mysql.com/doc/internals/en/binlog-event-type.html)  

No  | Name 
--- | ---- 
0   | UNKNOWN_EVENT 
1   | START_EVENT_V3 
2   | QUERY_EVENT 
3   | STOP_EVENT 
4   | ROTATE_EVENT 
5   | INTVAR_EVENT 
6   | LOAD_EVENT 
7   | SLAVE_EVENT 
8   | CREATE_FILE_EVENT 
9   | APPEND_BLOCK_EVENT 
10  | EXEC_LOAD_EVENT 
11  | DELETE_FILE_EVENT 
12  | NEW_LOAD_EVENT 
13  | RAND_EVENT 
14  | USER_VAR_EVENT 
15  | FORMAT_DESCRIPTION_EVENT 
16  | XID_EVENT 
17  | BEGIN_LOAD_QUERY_EVENT 
18  | EXECUTE_LOAD_QUERY_EVENT 
19  | TABLE_MAP_EVENT 
21  | WRITE_ROWS_EVENTv0 
22  | UPDATE_ROWS_EVENTv0 
23  | DELETE_ROWS_EVENTv0 
24  | WRITE_ROWS_EVENTv1 
25  | UPDATE_ROWS_EVENTv1 
26  | DELETE_ROWS_EVENTv1 
27  | INCIDENT_EVENT 
28  | HEARTBEAT_EVENT 
29  | IGNORABLE_EVENT 
30  | ROWS_QUERY_EVENT 
31  | WRITE_ROWS_EVENTv2 
32  | UPDATE_ROWS_EVENTv2 
33  | DELETE_ROWS_EVENTv2 
34  | GTID_EVENT 
35  | ANONYMOUS_GTID_EVENT 
36  | PREVIOUS_GTIDS_EVENT 

***Additional wildcard events***  

No  | Name | Description 
--- | ---- | --- 
37  | ROWS_EVENT          | Emitted on WRITE/UPDATE/DELETE-ROWS_EVENT 
38  | WRITE_ROWS_EVENT    | Emitted on WRITE_ROWS_EVENT/v0/v1/v2;  <br/>Changes the packet.eventType 
39  | UPDATE_ROWS_EVENT   | Emitted on UPDATE_ROWS_EVENT/v0/v1/v2; <br/>Changes the packet.eventType 
40  | DELETE_ROWS_EVENT   | Emitted on DELETE_ROWS_EVENT/v0/v1/v2; <br/>Changes the packet.eventType 


## Packet
Packets consist of an [event header](https://dev.mysql.com/doc/internals/en/binlog-event-header.html) `packet` and an [event body](https://dev.mysql.com/doc/internals/en/binlog-event.html) `packet.data`.  
```js
BinlogPacket {                        // Packet Head
  timestamp: [UNIX Timestamp w/ ms],  // Log Time
  eventType: [Integer],               // BinlogEvent Type
  serverId: [Integer],                // Slave ID
  eventSize: [Integer],
  flags: [Integer],
  logPos: [Integer],                  // Log Position
  version: [Integer],                 // Protocol Version
  skipped: [Boolean],                 // Whether the packet was skipped
  data: [Object]                      // Packet Body
}
```
*(If `packet.data` is `null` the parser for it is not implemented yet)*  
*(Row events do not contain any data yet.)*

 
## Examples
```js
const MyBinlogEmitter = require('mysql-binlog-emitter');
const Event = MyBinlogEmitter.Events;
const BinlogEvent = MyBinlogEmitter.BinlogEvents;

var mbe =  MyEmitter({
  "mysql": {
    "user": "[USER]",
    "password": "[PWD]"
  }
});

mbe.on(BinlogEvent.WRITE_ROWS_EVENTv1, function(packet){
  
  console.log(Event.eventName(packet.eventType)); // Event.eventName includes BinlogEvents
  
  console.log(BinlogEvent.eventName(packet.eventType)); // BinlogEvent.eventName includes BinlogEvents only
  
  console.log(packet); 

}):

mye.start(function(err){
  console.log('started');
});

// get last log position
var pos = mye.pos;

// get last log time
var time = mye.time;

// gracefully restart
// packets will be skipped until last pos | time
mye.restart(function(err){
  console.log('restarted');
});

mye.stop(function(err){
  console.log('stopped');
});
```


# Credits
[mysql](https://www.npmjs.com/package/mysql)  
[Faking a slave: Subscribing to mysql row-based-replication changes](http://www.tocker.ca/2014/05/26/faking-a-slave-subscribing-to-mysql-row-based-replication-changes.html)  
[Dive into MySQL replication protocol](https://medium.com/@siddontang/dive-into-mysql-replication-protocol-cd14791bcc) and [go-mysql](https://github.com/siddontang/go-mysql)  
[ZongJi](https://github.com/nevill/zongji)

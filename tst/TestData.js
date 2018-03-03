/* jshint esversion: 6 */
/* global pool */


const conf = require('./MyEmitter.conf');

const mysql = require('mysql');

// const path = require('path');
// const exec = require('child_process').exec;

// const assert = require('assert');
// const Type = require('type-of-is');
// const moment = require('moment');


describe('TestData', function()
{


  describe('Reset Data', function()
  {
    it('should reset MASTER', function(done)
    {
      pool.query('RESET MASTER', done);
    });
  });

  describe('Reset TstTable', function()
  {
    it('should reset AUTO_INCREMENT', function(done)
    {
      pool.query('ALTER TABLE `TstTable` AUTO_INCREMENT = 1', done);
    });

    it('should INSERT', function(done)
    {
      pool.query("INSERT INTO `TstTable` (`data`) VALUES ('test1')", done);
    });

    it('should UPDATE', function(done)
    {
      pool.query("UPDATE `TstTable` SET `data` = 'test2' WHERE `id` = 1", done);
    });

    it('should DELETE', function(done)
    {
      pool.query("DELETE FROM `TstTable` WHERE `TstTable`.`id` = 1", done);
    });

    it('should INSERT 3', function(done)
    {
      pool.query("INSERT INTO `TstTable` (`data`) VALUES ('test3')", done);
    });

    it('should TRUNCATE', function(done)
    {
      pool.query("TRUNCATE `TstTable`", done);
    });
  });

  describe('Reset TstFields', function()
  {
    it('should reset AUTO_INCREMENT', function(done)
    {
      pool.query('ALTER TABLE `TstFields` AUTO_INCREMENT = 1', done);
    });

    it('should TRUNCATE', function(done)
    {
      pool.query("TRUNCATE `TstFields`", done);
    });

    it('should INSERT', function(done)
    {
      pool.query(
        "INSERT INTO `TstFields` " +
        "(`id`, `f1`, `f2`, `f3`, `f4`, `f5`, `f6`, `f7`, `f8`, `f9`, `f10`, `f11`, `f12`, `f13`, `f14`, `f15`, `f16`, `f17`, `f18`, `f19`, `f20`, `f21`, `f22`, `f23`, `f24`, `f25`, `f26`, `f27`, `f28`, `f29`, `f30`, `f31`, `f32`, `f33`, `f34`, `f35`, `f36`) " +
        "VALUES " +
        "(NULL, '1', '2', '3', '4', '5', '6.1', '7.1', '8.1', b'0', '2018-02-21', '2018-02-21 19:01:01', '2018-02-21 19:02:02', '19:03:03', '2018', 'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 0x0, 0x1, '0x', '0x', '0x', '0x', 'e1', 's1', GeomFromText('\\'POINT(0 0)\\',0'), GeomFromText('\\'POINT(0 0)\\',0'), GeomFromText('\\'LINESTRING(0 0, )\\',0'), GeomFromText('\\'POLYGON((0 0, , , ))\\',0'), GeomFromText('\\'MULTIPOINT(0 0)\\',0'), GeomFromText('\\'MULTILINESTRING((0 0, ))\\',0'), GeomFromText('\\'MULTIPOLYGON(((0 0, , , )))\\',0'), GeomFromText('\\'GEOMETRYCOLLECTION()\\',0'));",
        done);
    });
  });


  // Generate binlog dump
  // describe('Binlog Dump', function()
  // {
  //   it('should dump binlog', function(done)
  //   {
  //     pool.query(
  //       "SHOW BINARY LOGS",
  //       function(err, res)
  //       {
  //         if (err) return done(err);

  //         var cmd =
  //           'sudo mysqlbinlog' +
  //           ' --socket ' + conf.mysql.socket +
  //           ' --user ' + conf.mysql.user +
  //           ' /var/log/mysql/' + res[0].Log_name +
  //           ' > "' + path.resolve('./tst/db/dump/mysqlbinlog.' + moment().format('YYY-MM-DDThh-mm-ss')) + '"';

  //         // console.log(cmd);

  //         exec(cmd, done); // turn on to generate dumps
  //       });
  //   });
  // });


  // !!! Does not work !!!
  // describe('Rotate Binlog', function() {

  //   it('should rotate binlog', function(done) {
  //     var cmd = 'mysqlbinlogrotate --server=' + conf.mysql.user + ':@localhost:3306';
  //     console.log(cmd);
  //     exec(cmd, done);
  //   });

  //   it('should INSERT 4', function(done) {
  //     pool.query("INSERT INTO `TstTable` (`data`) VALUES ('test4')", done);
  //   });

  // });



});

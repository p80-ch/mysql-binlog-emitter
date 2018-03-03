/* global pool:true */

const mysql = require('mysql');

global.pool;

describe('Test', function()
{

  describe('Mysql', function()
  {
    it('should connect', function(done)
    {
      pool = mysql.createPool(
      {
        socket: "/var/run/mysqld/mysqld.sock",
        user: "MyEmitter",
        database: "MyEmitter"
      });

      pool.getConnection(function(err, conn)
      {
        if (err) return done(err);
        conn.ping(function(err)
        {
          if (err) return done(err);
          conn.release();
          done();
        });
      });
    });
  });

  require("./TestData");
  require("./MyEmitter");
  require("./MultiSlave");
  // require("./TestLoad");

});

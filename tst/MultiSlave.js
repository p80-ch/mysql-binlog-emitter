/* jshint esversion: 6 */
/* global pool */


const MyEmitter = require('../index');
const conf = require('./MyEmitter.conf');

const Event = MyEmitter.Events;
const BinlogEvent = MyEmitter.BinlogEvents;

const assert = require('assert');
const Type = require('type-of-is');


var mse1,
  mse2,
  mse3,
  mse4;


var onError = function(err, packet)
{
  if (packet) console.error(packet.eventName);

  console.error(err);

  if (packet) console.error(packet);
};


describe('MultiSlave', function()
{


  describe('Construct', function()
  {
    it('should construct 1', function()
    {
      mse1 = new MyEmitter(conf);

      mse1.on(Event.ERROR, onError);

      assert.ok(Type.is(mse1, MyEmitter));
    });

    it('should construct 2', function()
    {
      conf.binlog.slaveId = 2;

      mse2 = new MyEmitter(conf);

      mse2.on(Event.ERROR, onError);

      assert.ok(Type.is(mse2, MyEmitter));
    });

    it('should construct 3', function()
    {
      conf.binlog.slaveId = 3;

      mse3 = new MyEmitter(conf);

      mse3.on(Event.ERROR, onError);

      assert.ok(Type.is(mse3, MyEmitter));
    });

    it('should construct 4', function()
    {
      conf.binlog.slaveId = 4;

      mse4 = new MyEmitter(conf);

      mse4.on(Event.ERROR, onError);

      assert.ok(Type.is(mse4, MyEmitter));
    });
  });


  describe('start', function()
  {
    it('should start 1', function(done)
    {
      mse1.start(done);
    });

    it('should start 2', function(done)
    {
      mse2.start(done);
    });

    it('should start 3', function(done)
    {
      mse3.start(done);
    });

    it('should start 4', function(done)
    {
      mse4.start(done);
    });
  });


  describe('WRITE_ROWS_EVENT', function()
  {
    it('should get WRITE_ROWS_EVENT', function(done)
    {
      var all_done = [];
      var wF = function(packet)
      {
        // console.log(packet.eventName);
        // console.log(packet);

        this.removeListener(BinlogEvent.WRITE_ROWS_EVENT, wF);

        all_done.push(this._conf.binlog.slaveId);

        if (
          all_done.includes(1) &&
          all_done.includes(2) &&
          all_done.includes(3) &&
          all_done.includes(4)
        )
        {
          done();
        }
      };

      mse1.on(BinlogEvent.WRITE_ROWS_EVENT, wF);
      mse2.on(BinlogEvent.WRITE_ROWS_EVENT, wF);
      mse3.on(BinlogEvent.WRITE_ROWS_EVENT, wF);
      mse4.on(BinlogEvent.WRITE_ROWS_EVENT, wF);

      pool.query(
        "INSERT INTO `TstTable` (`data`) VALUES ('test4')",
        function(err, res)
        {
          if (err) throw err;
        });

    });
  });

  describe('stop', function()
  {
    it('should stop 1', function(done)
    {
      mse1.stop(done);
    });

    it('should stop 2', function(done)
    {
      mse2.stop(done);
    });

    it('should stop 3', function(done)
    {
      mse3.stop(done);
    });

    it('should stop 4', function(done)
    {
      mse4.stop(done);
    });
  });

});

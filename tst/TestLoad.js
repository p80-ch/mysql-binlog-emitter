/* jshint esversion: 6 */
/* global pool */


const MyEmitter = require('../index');
const conf = require('./MyEmitter.conf');

const Event = MyEmitter.Events;


var mse1,
  mse2,
  mse3,
  mse4;


var onAny = function(type, packet)
{
  var msg = Event.eventName(type);

  console.log(this._conf.binlog.slaveId + ' ' + msg);

  // if (packet) console.log(packet);
};


describe('TestLoad', function()
{


  describe('Construct', function()
  {
    it('should construct & start 1', function(done)
    {
      conf.binlog.slaveId = 1;
      mse1 = new MyEmitter(conf);
      // mse1.on(Event.ANY, onAny);
      mse1.start(done);
    });

    it('should construct & start 2', function(done)
    {
      conf.binlog.slaveId = 2;
      mse2 = new MyEmitter(conf);
      // mse2.on(Event.ANY, onAny);
      mse2.start(done);
    });

    it('should construct & start 3', function(done)
    {
      conf.binlog.slaveId = 3;
      mse3 = new MyEmitter(conf);
      // mse3.on(Event.ANY, onAny);
      mse3.start(done);
    });

    it('should construct & start 4', function(done)
    {
      conf.binlog.slaveId = 4;
      mse4 = new MyEmitter(conf);
      // mse4.on(Event.ANY, onAny);
      mse4.start(done);
    });
  });


  describe('Test Load', function()
  {
    it('should run for 10s', function(done)
    {
      // var tout = 2 * 60 * 1000; // 2 minutes
      var tout = 10 * 1000; // 10 seconds
      var end = Date.now() + tout;

      this.timeout(tout + 1000);

      var onError = function(err, packet)
      {
        if (packet) console.error(packet.eventName);
        if (packet) console.error(packet);
        console.error(err);
        // throw err;
      };

      mse1.on(Event.ERROR, onError);
      mse2.on(Event.ERROR, onError);
      mse3.on(Event.ERROR, onError);
      mse4.on(Event.ERROR, onError);


      var i = 0;
      var itv = setInterval(function()
      {
        if (Date.now() > end)
        {
          clearInterval(itv);

          mse1.removeListener(Event.ERROR, onError);
          mse2.removeListener(Event.ERROR, onError);
          mse3.removeListener(Event.ERROR, onError);
          mse4.removeListener(Event.ERROR, onError);

          console.log('Added ' + i + ' entries in ' + (tout / 1000) + ' seconds');
          done();
        }

        // console.log(i);

        pool.query(
          "INSERT INTO `TstTable` (`data`) VALUES ('x" + i + "')",
          function(err, res)
          {
            if (err) throw err;

            // console.log(res.insertId);

            pool.query(
              "UPDATE `TstTable` SET `data` = 'y" + i + "' WHERE `id` = " + res.insertId,
              function(err, res2)
              {
                if (err) throw err;
              });

          });

        i++;

      }, 1);


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

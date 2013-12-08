'use strict';

var Primus = require('primus')
  , emitter = require('../')
  , http = require('http').Server
  , expect = require('expect.js')
  , opts = { transformer: 'websockets' }
  , primus
  , srv;

// creates the client
function client(srv, primus, port){
  var addr = srv.address();
  var url = 'http://' + addr.address + ':' + (port || addr.port);
  return new primus.Socket(url);
}

// creates the server
function server(srv, opts) {
  return Primus(srv, opts).use('emitter', emitter);
}

describe('primus-emitter', function () {

  beforeEach(function beforeEach(done) {
    srv = http();
    primus = server(srv, opts);
    done();
  });

  afterEach(function afterEach(done) {
    srv.close();
    done();
  });

  it('should have required methods', function (done) {
    //primus.save('test.js');
    srv.listen(function () {
      primus.on('connection', function (spark) {
        expect(spark.send).to.be.a('function');
        expect(spark.on).to.be.a('function');
        done();
      });
      client(srv, primus);
    });
  });

  it('should emit event from server', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.send('news', 'data');
      });
      var cl = client(srv, primus);
      cl.on('news', function (data) {
        expect(data).to.be('data');
        done();
      });
    });
  });

  it('should emit object from server', function (done) {
    var msg = { hi: 'hello', num: 123456 };
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.send('news', msg);
      });
      var cl = client(srv, primus);
      cl.on('news', function (data) {
        expect(data).to.be.eql(msg);
        done();
      });
    });
  });

  it('should support ack from server', function (done) {
    var msg = { hi: 'hello', num: 123456 };
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.send('news', msg, function (err, res) {
          expect(res).to.be('received');
          expect(err).to.be.eql(null);
          done();
        });
      });
      var cl = client(srv, primus);
      cl.on('news', function (data, fn) {
        fn(null, 'received');
      });
    });
  });

  it('should emit event from client', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.on('news', function (data) {
          expect(data).to.be('data');
          done();
        });
      });
      var cl = client(srv, primus);
      cl.send('news', 'data');
    });
  });

  it('should emit object from client', function (done) {
    var msg = { hi: 'hello', num: 123456 };
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.on('news', function (data) {
          expect(data).to.be.eql(msg);
          done();
        });
      });
      var cl = client(srv, primus);
      cl.send('news', msg);
    });
  });

  it('should support ack from client', function (done) {
    var msg = { hi: 'hello', num: 123456 };
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.on('news', function (data, fn) {
          fn(null, 'received');
        });
      });
      var cl = client(srv, primus);
      cl.send('news', msg, function (err, res) {
        expect(res).to.be('received');
        expect(err).to.be.eql(null);
        done();
      });
    });
  });

  it('should support broadcasting from server', function (done) {
    var total = 0;
    srv.listen(function () {
      primus.on('connection', function (spark) {
        if (3 === ++total) primus.send('news', 'hi');
      });
      var cl1 = client(srv, primus)
        , cl2 = client(srv, primus)
        , cl3 = client(srv, primus);

      cl1.on('news', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      cl2.on('news', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      cl3.on('news', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      function finish() {
        if (1 > --total) done();
      }
    });
  });

  it('should return Primus instance when broadcasting from server', function () {
    expect(primus.send('news')).to.be.a(Primus);
    srv.listen();
  });

  it('should ignore reserved primus events', function (done) {
    var events = require('../lib/').Emitter.reservedEvents
      , len = events.length;
    srv.listen(function () {
      primus.on('connection', function (spark) {
        events.forEach(function (ev) {
          spark.on(ev, function () {
            done('Should not');
          });
        });
      });
      var cl = client(srv, primus);
      events.forEach(function(ev, i){
        cl.send(ev, 'hi');
        if (i === (len-1)) done();
      });
    });
  });

});
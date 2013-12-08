var PrimusIO = require('../');
var http = require('http').Server;
var expect = require('expect.js');
var opts = { transformer: 'websockets', parser: 'JSON' };

// creates the client
function client(srv, primus, port){
  var addr = srv.address();
  var url = 'http://' + addr.address + ':' + (port || addr.port);
  return new primus.Socket(url);
}

// creates the server
function server(srv, opts) {
  return PrimusIO(srv, opts);
}

describe('primus.io', function (){

  it('should play nice with emitter', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var a = primus.channel('a');
    srv.listen(function(){
      a.on('connection', function (spark) {
        done();
      });
    });
    var cl = client(srv, primus);
    var cla = cl.channel('a');
  });

  it('should allow sending message from server to client', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var a = primus.channel('a');
    srv.listen(function(){
      a.on('connection', function (spark) {
        spark.send('msg', { hi: 'hello' });
      });
    });
    var cl = client(srv, primus);
    var cla = cl.channel('a');
    cla.on('msg', function (msg) {
      expect(msg).to.be.eql({ hi: 'hello' });
      done();
    });
  });

  it('should allow sending message from client to server', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var a = primus.channel('a');
    srv.listen(function(){
      a.on('connection', function (spark) {
        spark.on('msg', function (msg) {
          expect(msg).to.be.eql({ hi: 'hello' });
          done();
        });
      });
    });
    var cl = client(srv, primus);
    var cla = cl.channel('a');
    cla.send('msg', { hi: 'hello' });
  });

  it('should support ack on the client', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var a = primus.channel('a');
    srv.listen(function(){
      a.on('connection', function (spark) {
        spark.on('msg', function (msg, fn) {
          expect(msg).to.be.eql({ hi: 'hello' });
          fn('thanks');
        });
      });
    });
    var cl = client(srv, primus);
    var cla = cl.channel('a');
    cla.send('msg', { hi: 'hello' }, function (msg) {
      expect(msg).to.be('thanks');
      done();
    });
  });

  it('should support ack on the server', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var a = primus.channel('a');
    srv.listen(function(){
      a.on('connection', function (spark) {
        spark.send('msg', { hi: 'hello' }, function (msg) {
          expect(msg).to.be('thanks');
          done();
        });
      });
    });
    var cl = client(srv, primus);
    var cla = cl.channel('a');
    cla.on('msg', function (msg, fn) {
      expect(msg).to.be.eql({ hi: 'hello' });
      fn('thanks');
    });
  });

  it('should allow joining a room', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var a = primus.channel('a');
    srv.listen(function(){
      a.on('connection', function (spark) {
        spark.join('a', function () {
          done();
        });
      });
    });
    var cl = client(srv, primus);
    var cla = cl.channel('a');
  });

  it('should allow leaving a room', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var a = primus.channel('a');
    srv.listen(function(){
      a.on('connection', function (spark) {
        spark.join('a');
        spark.leave('a', function () {
          done();
        });
      });
    });
    var cl = client(srv, primus);
    var cla = cl.channel('a');
  });

  it('should allow broadcasting a message to a client', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var a = primus.channel('a');
    srv.listen(function(){
      a.on('connection', function (spark) {
        spark.on('data', function (room) {
          if ('me' === room) {
            spark.room('r1').write('hi');
          } else {
            spark.join(room);
          }
        });
      });
    });
    var cl = client(srv, primus);
    var c1a = cl.channel('a');
    c1a.on('data', function (msg) {
      expect(msg).to.be('hi');
      done();
    });
    c1a.write('r1');
    setTimeout(function () {
      var me = cl.channel('a');
      me.write('me');
    }, 0);

  });

  it('should allow broadcasting a message to multiple clients', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var a = primus.channel('a');
    var count = 3;

    srv.listen(function(){
      a.on('connection', function (spark) {
        spark.on('data', function (room) {
          if ('me' === room) {
            spark.room('r1 r2 r3').write('hi');
          } else {
            spark.join(room);
          }
        });
      });
    });


    var cl = client(srv, primus);
    var c1a = cl.channel('a');
    var c2a = cl.channel('a');
    var c3a = cl.channel('a');

    c1a.write('r1');
    c2a.write('r2');
    c3a.write('r3');

    c1a.on('data', function (msg) {
      expect(msg).to.be('hi');
      if (!--count) done();
    });

    c2a.on('data', function (msg) {
      expect(msg).to.be('hi');
      if (!--count) done();
    });

    c3a.on('data', function (msg) {
      expect(msg).to.be('hi');
      if (!--count) done();
    });

    setTimeout(function () {
      var me = cl.channel('a');
      me.write('me');
    }, 0);

  });

  it('should allow broadcasting a message to a client with emitter', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var a = primus.channel('a');
    srv.listen(function(){
      a.on('connection', function (spark) {
        spark.on('join', function (room) {
          spark.join(room);
        });

        spark.on('msg', function (msg) {
          if ('broadcast' === msg) {
            spark.room('r1').send('msg', 'hi');
          }
        });
      });
    });
    var cl = client(srv, primus);
    var c1a = cl.channel('a');
    c1a.on('msg', function (msg) {
      expect(msg).to.be('hi');
      done();
    });
    c1a.send('join', 'r1');
    setTimeout(function () {
      var me = cl.channel('a');
      me.send('msg', 'broadcast');
    }, 0);

  });

  it('should allow sending to multiple rooms from server', function(done){
    this.timeout(0);
    var srv = http();
    var primus = server(srv, opts);
    var total = 2;
    var count = 0;

    srv.listen(function(){

      var c1 = client(srv, primus);
      var c2 = client(srv, primus);
      var c3 = client(srv, primus);
      var c4 = client(srv, primus);

      primus.on('connection', function(spark){
        spark.on('join', function (room) {
          spark.join(room, function () {
            if (3 === count++) {
              primus.room('room1 room2 room3').send('news');
            }
          });
        });
      });

      c1.on('news', function (data) {
        --total || finish();
      });

      c2.on('news', function (data) {
        --total || finish();
      });

      c3.on('news', function (data) {
        --total || finish();
      });

      c4.on('news', function (data) {
        finish(new Error('not'));
      });

      function finish (data) {
        srv.close();
        done(data);
      }

      c1.send('join','room1');
      c2.send('join','room2');
      c3.send('join','room3');
      c4.send('join','room4');

    });
  });

  it('should allow broadcasting a message to multiple clients with emitter from channel;', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var a = primus.channel('a');
    var count = 3;

    srv.listen(function(){
      a.on('connection', function (spark) {
        spark.on('join', function (room) {
          spark.join(room);
        });

        spark.on('msg', function (msg) {
          if ('broadcast' === msg) {
            a.room('r1 r2 r3').send('msg', 'hi');
          }
        });
      });
    });

    var cl = client(srv, primus);
    var c1a = cl.channel('a');
    var c2a = cl.channel('a');
    var c3a = cl.channel('a');

    c1a.send('join', 'r1');
    c2a.send('join', 'r2');
    c3a.send('join', 'r3');

    c1a.on('msg', function (msg) {
      expect(msg).to.be('hi');
      if (!--count) done();
    });

    c2a.on('msg', function (msg) {
      expect(msg).to.be('hi');
      if (!--count) done();
    });

    c3a.on('msg', function (msg) {
      expect(msg).to.be('hi');
      if (!--count) done();
    });

    setTimeout(function () {
      var me = cl.channel('a');
      me.send('msg', 'broadcast');
    }, 0);

  });

  it('should allow broadcasting a message to multiple clients with emitter', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var a = primus.channel('a');
    var count = 3;

    srv.listen(function(){
      a.on('connection', function (spark) {
        spark.on('join', function (room) {
          spark.join(room);
        });

        spark.on('msg', function (msg) {
          if ('broadcast' === msg) {
            spark.room('r1 r2 r3').send('msg', 'hi');
          }
        });
      });
    });

    var cl = client(srv, primus);
    var c1a = cl.channel('a');
    var c2a = cl.channel('a');
    var c3a = cl.channel('a');

    c1a.send('join', 'r1');
    c2a.send('join', 'r2');
    c3a.send('join', 'r3');

    c1a.on('msg', function (msg) {
      expect(msg).to.be('hi');
      if (!--count) done();
    });

    c2a.on('msg', function (msg) {
      expect(msg).to.be('hi');
      if (!--count) done();
    });

    c3a.on('msg', function (msg) {
      expect(msg).to.be('hi');
      if (!--count) done();
    });

    setTimeout(function () {
      var me = cl.channel('a');
      me.send('msg', 'broadcast');
    }, 0);

  });

});
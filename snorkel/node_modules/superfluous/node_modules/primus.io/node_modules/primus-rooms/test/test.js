'use strict';

var rooms = require('../')
  , Primus = require('primus')
  , http = require('http').Server
  , expect = require('expect.js')
  , opts = { transformer: 'websockets' }
  , srv, primus;

// creates the client
function client(srv, primus, port){
  var addr = srv.address()
    , url = 'http://' + addr.address + ':' + (port || addr.port);
  return new primus.Socket(url);
}

// creates the server
function server(srv, opts) {
  return Primus(srv, opts)
    .use('rooms', rooms);
}

describe('primus-rooms', function () {

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
    srv.listen(function () {
      primus.on('connection', function (spark) {
        expect(spark.join).to.be.a('function');
        expect(spark.leave).to.be.a('function');
        expect(spark.leaveAll).to.be.a('function');
        expect(spark.room).to.be.a('function');
        expect(spark.rooms).to.be.a('function');
        expect(spark.clients).to.be.a('function');
        done();
      });
      client(srv, primus);
    });
  });

  it('should join room', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.join('room1');
        spark.room('room1').clients(function (err, clients) {
          expect(!!~clients.indexOf(spark.id)).to.eql(true);
          done();
        });
      });
      client(srv, primus);
    });
  });
  
  it('should join multiple rooms at once', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.join('room1 room2 room3', function () {
          spark.room('room1').clients(function (err, clients) {
            expect(!!~clients.indexOf(spark.id)).to.be.ok();
            spark.room('room2').clients(function (err, clients) {
              expect(!!~clients.indexOf(spark.id)).to.be.ok();
              spark.room('room3').clients(function (err, clients) {
                expect(!!~clients.indexOf(spark.id)).to.be.ok();
                done();
              });
            });
          });
        });
      });
      client(srv, primus);
    });
  });

  it('should join multiple rooms at once passing an array as argument', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.join(['room1', 'room2', 'room3'], function () {
          spark.room('room1').clients(function (err, clients) {
            expect(!!~clients.indexOf(spark.id)).to.be.ok();
            spark.room('room2').clients(function (err, clients) {
              expect(!!~clients.indexOf(spark.id)).to.be.ok();
              spark.room('room3').clients(function (err, clients) {
                expect(!!~clients.indexOf(spark.id)).to.be.ok();
                done();
              });
            });
          });
        });
      });
      client(srv, primus);
    });
  });

  it('should leave room', function (done) {
    srv.listen(function () {  
      primus.on('connection', function (spark) {
        spark.join('room1');
        spark.leave('room1');
        spark.room('room1').clients(function (err, clients) {
          expect(!!~clients.indexOf(spark.id)).to.eql(false);
          done();
        });
      });
      client(srv, primus);
    });
  });
  
  it('should leave multiple rooms at once', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.join('room1 room2 room3 room4', function () {
          spark.leave('room1 room2 room3', function () {
            expect(spark.rooms()).to.eql(['room4']);
            done();
          });
        });
      });
      client(srv, primus);
    });
  });

  it('should leave multiple rooms at once passing an array', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.join('room1 room2 room3 room4', function () {
          spark.leave(['room1', 'room2', 'room3'], function () {
            expect(spark.rooms()).to.be.eql(['room4']);
  
            done();
          });
        });
      });
      client(srv, primus);
    });
  });

  it('should leave all rooms', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.join('room1');
        spark.join('room2');
        spark.join('room3');
        spark.leaveAll();
        expect(spark.rooms()).to.be.eql([]);
        done();
      });
      client(srv, primus);
    });
  });

  it('should cleanup room on leave', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.join('room1');
        spark.leave('room1');
        expect(spark.primus.adapter().rooms).to.be.empty();
        done();
      });
      client(srv, primus);
    });
  });

  it('should cleanup rooms on leave all', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.join('room1');
        spark.join('room2');
        spark.join('room3');
        spark.leaveAll();
        expect(spark.primus.adapter().rooms).to.be.empty();
        done();
      });
      client(srv, primus);
    });
  });

  it('should allow method channing', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark
        .join('room1')
        .join('room2')
        .join('room3')
        .leave('room1')
        .leave('room2')
        .leave('room3');
        process.nextTick(function () {
          expect(spark.rooms()).to.eql([]);
          done();
        });
      });
      client(srv, primus);
    });
  });

  it('should allow simple connection', function (done) {
    this.timeout(0);
    srv.listen(function () {
      var c1 = client(srv, primus);
      primus.on('connection', function (spark) {
        spark.on('data', function (data) {
          spark.write(data);
        });
      });
      c1.on('open', function () {
        c1.on('data', function (data) {
          if ('send' === data) {
            done();
          }
        });
      });
      c1.write('send');
    });
  });

  it('should allow sending to multiple rooms', function (done) {
    
    var total = 0
      , sender;

    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.on('data', function (data) {
          if ('send' === data) {
            sender = spark;
          }
          spark.join(data, function () {
            if (4 === ++total) {
              --total;
              sender.room('room1 room2 room3').write('hi');
            }
          });
        });
      });

      var c1 = client(srv, primus)
        , c2 = client(srv, primus)
        , c3 = client(srv, primus)
        , c4 = client(srv, primus);

      c1.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c2.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c3.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c4.on('data', function (msg) {
        done(new Error('not'));
      });

      function finish () {
        if (1 > --total) done();
      }
      
      c1.write('room1');
      c2.write('room2');
      c3.write('room3');
      c4.write('send');
    });
  });

  it('should allow defining exception ids when broadcasting', function (done) {
    
    var total = 0
      , sender
      , except = [];

    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.on('data', function (data) {
          if (/room1|room2/.test(data)) {
            except.push(spark.id);
          }          
          if ('send' === data) {
            sender = spark;
          }
          spark.join(data, function () {
            if (4 === ++total) {
              sender.room('room1 room2 room3').except(except).write('hi');
            }
          });
        });
      });

      var c1 = client(srv, primus)
        , c2 = client(srv, primus)
        , c3 = client(srv, primus)
        , c4 = client(srv, primus);

      c1.on('data', function (msg) {
        done(new Error('not'));
      });

      c2.on('data', function (msg) {
        done(new Error('not'));
      });

      c3.on('data', function (msg) {
        expect(msg).to.be('hi');
        done();
      });

      c4.on('data', function (msg) {
        done(new Error('not'));
      });
      
      c1.write('room1');
      c2.write('room2');
      c3.write('room3');
      c4.write('send');
    });
  });

  it('should allow defining exception ids as string when broadcasting', function (done) {
    
    var total = 0
      , sender
      , except = [];

    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.on('data', function (data) {
          if (/room1|room2/.test(data)) {
            except.push(spark.id);
          }          
          if ('send' === data) {
            sender = spark;
          }
          spark.join(data, function () {
            if (4 === ++total) {
              sender.room('room1 room2 room3').except(except.join(' ')).write('hi');
            }
          });
        });
      });

      var c1 = client(srv, primus)
        , c2 = client(srv, primus)
        , c3 = client(srv, primus)
        , c4 = client(srv, primus);

      c1.on('data', function (msg) {
        done(new Error('not'));
      });

      c2.on('data', function (msg) {
        done(new Error('not'));
      });

      c3.on('data', function (msg) {
        expect(msg).to.be('hi');
        done();
      });

      c4.on('data', function (msg) {
        done(new Error('not'));
      });
      
      c1.write('room1');
      c2.write('room2');
      c3.write('room3');
      c4.write('send');
    });
  });

  it('should allow defining exception ids when broadcasting from server', function (done) {
    
    var total = 0
      , sender
      , except = [];

    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.on('data', function (data) {
          if (/room1|room3/.test(data)) {
            except.push(spark.id);
          }          
          if ('send' === data) {
            sender = spark;
          }
          spark.join(data, function () {
            if (4 === ++total) {
              --total;
              primus.in('room1 room2 room3').except(except).write('hi');
            }
          });
        });
      });

      var c1 = client(srv, primus)
        , c2 = client(srv, primus)
        , c3 = client(srv, primus)
        , c4 = client(srv, primus);

      c1.on('data', function (msg) {
        done(new Error('not'));
      });

      c2.on('data', function (msg) {
        expect(msg).to.be('hi');
        done();
      });

      c3.on('data', function (msg) {
        done(new Error('not'));
      });

      c4.on('data', function (msg) {
        done(new Error('not'));
      });
      
      c1.write('room1');
      c2.write('room2');
      c3.write('room3');
      c4.write('send');
    });
  });

  it('should avoid sending dupes', function (done) {

    var total = 2;

    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.join('room1');
        spark.join('room2');
        spark.join('room3');
        spark.join('room4');
        spark.on('data', function (data) {
          if ('send' === data) {
            spark.room('room1 room2 room3').write('hi');
          }
        });
      });

      var c1 = client(srv, primus)
        , c2 = client(srv, primus)
        , c3 = client(srv, primus);

      c2.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c3.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      function finish () {
        if (1 > --total) done();
      }

      setTimeout(function() {
        c1.write('send');
      }, 50);
    });
  });

  it('should get all clients connected to a room', function (done) {
    var ids = [];
    srv.listen(function () {
      primus.on('connection', function (spark) {
        ids.push(spark.id);
        spark.join('room1');
        spark.on('data', function () {
          spark.room('room1').clients(function (err, clients) {
            expect(clients).to.be.eql(ids);
            done();
          });
        });
      });
      client(srv, primus);
      client(srv, primus);
      client(srv, primus);
      client(srv, primus)
      .write('send');
    });
  });

  it('should get all clients synchronously if no callback is provided', function (done) {
    var ids = [];
    srv.listen(function () {
      primus.on('connection', function (spark) {
        ids.push(spark.id);
        spark.join('room1');
        spark.on('data', function () {
          var clients = spark.room('room1').clients();
          expect(clients).to.be.eql(ids);
          done();
        });
      });
      client(srv, primus);
      client(srv, primus);
      client(srv, primus);
      client(srv, primus)
      .write('send');
    });
  });

  it('should check if a room is empty', function (done) {
    var sparks = [];
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.join('room1', function () {
          sparks.push(spark);
        });
        spark.on('data', function () {
          sparks.forEach(function (s) {
            expect(s.isRoomEmpty('room1')).to.be.eql(false);
            s.leaveAll();
          });
          expect(spark.room('room1').isRoomEmpty()).to.be.eql(true);
          done();
        });
      });
      client(srv, primus);
      client(srv, primus);
      client(srv, primus);
      client(srv, primus)
      .write('send');
    });
  });

  it('should check if a room is empty from server', function (done) {
    var sparks = [];
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.join('room1', function () {
          sparks.push(spark);
        });
        spark.on('data', function () {
          sparks.forEach(function (s) {
            expect(primus.isRoomEmpty('room1')).to.be.eql(false);
            s.leaveAll();
          });
          expect(primus.in('room1').isRoomEmpty()).to.be.eql(true);
          done();
        });
      });
      client(srv, primus);
      client(srv, primus);
      client(srv, primus);
      client(srv, primus)
      .write('send');
    });
  });

  it('should keeps track of rooms', function (done) {
    srv.listen(function () {
      var conn = client(srv, primus);
      primus.on('connection', function (spark) {
        spark.join('a', function () {
          expect(spark.rooms()).to.eql(['a']);
          spark.join('b', function () {
            expect(spark.rooms()).to.eql(['a', 'b']);
            spark.leave('b', function () {
              expect(spark.rooms()).to.eql(['a']);
              done();
            });
          });
        });
      });
    });
  });

  it('should return all rooms on server', function (done) {
    srv.listen(function () {
      var conn = client(srv, primus);
      primus.on('connection', function (spark) {
        spark.join('a', function () {
          spark.join('b', function () {
            spark.leave('c', function () {
              expect(primus.rooms()).to.eql(['a', 'b']);
              done();
            });
          });
        });
      });
    });
  });

  it('should return all rooms of specific client from server', function (done) {
    srv.listen(function () {
      var first = true;
      primus.on('connection', function (spark) {
        if (first) {
          spark.join('a', function () {
            spark.join('b', function () {
              spark.leave('c', function () {
                expect(primus.rooms(spark)).to.eql(['a', 'b']);
                client(srv, primus);
              });
            });
          });
          first = false;
        } else {
          spark.join('d', function () {
            spark.join('e', function () {
              spark.leave('f', function () {
                expect(primus.rooms(spark)).to.eql(['d', 'e']);
                done();
              });
            });
          });
        }
      });
      client(srv, primus);
    });
  });

  it('should allow passing adapter as argument', function (done) {

    opts.adapter = {
      add: function () {},
      del: function () {},
      delAll: function () {},
      broadcast: function () {},
      clients: function () {}
    };

    primus = server(srv, opts);
    srv.listen(function () {
      expect(primus.adapter()).to.be.eql(opts.adapter);
      delete opts.adapter;
      done();
    });
  });

  it('should allow setting and getting adapter', function (done) {
    var adapter = {
      add: function () {},
      del: function () {},
      delAll: function () {},
      broadcast: function () {},
      clients: function () {}
    };
    primus = server(srv, opts);
    srv.listen(function () {
      primus.adapter(adapter);
      expect(primus.adapter()).to.be.eql(adapter);
      done();
    });
  });

  it('should only allow objects as adapter', function () {
    var msg = 'Adapter should be an object';
    srv.listen(function () {
      try {
        primus.adapter('not valid');
      } catch (e) {
        expect(e.message).to.be(msg);
      }

      try {
        primus.adapter(function () {});
      } catch (e) {
        expect(e.message).to.be(msg);
      }

      try {
        primus.adapter(123456);
      } catch (e) {
        return expect(e.message).to.be(msg);
      }

      throw new Error('I should have throwed above');
    });
  });

  it('should remove client from room on client disconnect', function (done) {
    srv.listen(function () {
      
      var c1 = client(srv, primus);
      
      primus.on('connection', function (spark) {
        spark.join('a');
        spark.on('end', function () {   
          expect(spark.rooms()).to.be.empty();
          done();
        });
        spark.write('end');
      });

      c1.on('open', function () {
        c1.on('data', function (data) {
          if ('end' === data) c1.end();
        });
      });
    });
  });

  it('should get all clients connected to a room using primus method', function (done) {
    
    var ids = [];

    srv.listen(function () {
      primus.on('connection', function (spark) {
        ids.push(spark.id);
        primus.join(spark, 'room1');
        spark.on('data', function () {
          primus.room('room1').clients(function (err, clients) {
            expect(clients).to.be.eql(ids);
            done();
          });
        });
      });

      client(srv, primus);
      client(srv, primus);
      client(srv, primus);
      client(srv, primus)
      .write('send');
    });
  });

  it('should get all clients synchronously if no callback is provided using primus method', function (done) {
    
    var ids = [];

    srv.listen(function () {
      primus.on('connection', function (spark) {
        ids.push(spark.id);
        primus.join(spark, 'room1');
        spark.on('data', function () {
          var clients = primus.in('room1').clients();
          expect(clients).to.be.eql(ids);
          done();
        });
      });

      client(srv, primus);
      client(srv, primus);
      client(srv, primus);
      client(srv, primus)
      .write('send');
    });
  });

  it('should join spark to a room using primus method', function (done) {

    srv.listen(function () {
      primus.on('connection', function (spark) {
        primus.join(spark, 'room1', function () {
          spark.room('room1').clients(function (err, clients) {
            expect(!!~clients.indexOf(spark.id)).to.eql(true);
  
            done();
          });
        });
      });
      client(srv, primus);
    });
  });

  it('should remove spark form room using primus method', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        primus.join(spark, 'room1', function () {
          primus.leave(spark, 'room1', function () {
            spark.room('room1').clients(function (err, clients) {
              expect(!!~clients.indexOf(spark.id)).to.eql(false);
              done();
            });
          });
        });
      });
      client(srv, primus);
    });
  });

  it('should broadcast message to specific room from primus using `room`', function (done) {
    
    var total = 0;

    srv.listen(function () {

      var c1 = client(srv, primus)
        , c2 = client(srv, primus)
        , c3 = client(srv, primus);
      
      primus.on('connection', function (spark) {
        spark.on('data', function (data) {
          primus.join(spark, data, function () {
            if (3 === ++total) {
              --total;
              primus.room('a').write('hi');
            }
          });
        });
      });

      c1.write('a');
      c2.write('a');
      c3.write('b');

      c1.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c2.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c3.on('data', function (msg) {
        done(new Error('not'));
      });

      function finish () {
        if (1 > --total) done();
      }
      
    });
  });

  it('should broadcast message to multiple rooms from primus using `room` method', function (done) {
    
    var total = 0;

    srv.listen(function () {

      var c1 = client(srv, primus)
        , c2 = client(srv, primus)
        , c3 = client(srv, primus);

      primus.on('connection', function (spark) {
        spark.on('data', function (data) {
          primus.join(spark, data, function () {
            if (3 === ++total) {
              --total;
              primus.room('a b').write('hi');
            }
          });
        });
      });

      c1.write('a');
      c2.write('b');
      c3.write('c');

      c1.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c2.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c3.on('data', function (msg) {
        done(new Error('not'));
      });

      function finish () {
        if (1 > --total) done();
      }
      
    });
  });

  it('should trigger `joinroom` event when joining room', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.join('room1');
        spark.on('joinroom', function (room) {
          expect(room).to.be.eql('room1');
          done();
        });
      });
      client(srv, primus);
    });
  });

  it('should trigger `leaveroom` event when leaving room', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        spark.join('room1', function () {
          spark.leave('room1');
          spark.on('leaveroom', function (room) {
            expect(room).to.be.eql('room1');
            done();
          });
        });
      });
      client(srv, primus);
    });
  });

  it('should trigger `leaveallrooms` events on client disconnect', function (done) {
    srv.listen(function () {
      var c1 = client(srv, primus);
      primus.on('connection', function (spark) {
        spark.join('a');
        spark.on('leaveallrooms', function (rooms) {
          expect(rooms).to.be.eql(['a']);

          done();
        });
        spark.write('end');
      });
      c1.on('open', function () {
        c1.on('data', function (data) {
          if ('end' === data) c1.end();
        });
      });
    });
  });

  it('should trigger `joinroom` event when joining room using primus join method', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        primus.join(spark, 'room1');
        primus.on('joinroom', function (room, socket) {
          expect(room).to.be.eql('room1');
          expect(spark).to.be.eql(socket);
          done();
        });
      });
      client(srv, primus);
    });
  });

  it('should trigger `leaveroom` event when leaving room using primus leave method', function (done) {
    srv.listen(function () {
      primus.on('connection', function (spark) {
        primus.join(spark, 'room1', function () {
          primus.leave(spark, 'room1');
          primus.on('leaveroom', function (room, socket) {
            expect(room).to.be.eql('room1');
            expect(spark).to.be.eql(socket);
            done();
          });
        });
      });
      client(srv, primus);
    });
  });

  it('should trigger `leaveallrooms` events on client disconnect when listening on primus', function (done) {
    srv.listen(function () {
      var c1 = client(srv, primus);
      primus.on('connection', function (spark) {
        primus.join(spark, 'a');
        primus.on('leaveallrooms', function (rooms, socket) {
          expect(rooms).to.be.eql(['a']);
          expect(spark).to.be.eql(socket);
          done();
        });
        spark.write('end');
      });
      c1.on('open', function () {
        c1.on('data', function (data) {
          if ('end' === data) c1.end();
        });
      });
    });
  });

  it('should still support broadcasting from server with `write`', function (done) {
    
    var total = 0;

    srv.listen(function () {
      
      primus.on('connection', function (spark) {
        if (3 === ++total) primus.write('hi');
      });

      var cl1 = client(srv, primus)
        , cl2 = client(srv, primus)
        , cl3 = client(srv, primus);

      cl1.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      cl2.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      cl3.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      function finish() {
        if (1 > --total) done();
      }
    });
  });

  describe('primus-emitter', function () {

    it('should allow sending to specific room from client', function (done) {
      
      primus.use('emitter', 'primus-emitter');
      
      srv.listen(function () {
        var c1 = client(srv, primus)
          , c2 = client(srv, primus)
          , c3 = client(srv, primus);

        primus.on('connection', function (spark) {
          spark.on('join', function (room) {
            spark.join(room);
            if ('send' === room) {
              spark.room('room1').send('msg');
            }         
          });
        });

        c1.on('msg', function (data) {
          done();
        });

        c2.on('msg', function (data) {
          done(new Error('not'));
        });

        c3.on('msg', function (data) {
          done(new Error('not'));
        });

        c1.send('join', 'room1');
        c2.send('join', 'room2');

        setTimeout(function () {
          c3.send('join', 'send');
        }, 100);

      });
    });

    it('should allow sending to multiple rooms from client', function (done) {
      
      var total = 0
        , sender;

      primus.use('emitter', 'primus-emitter');

      srv.listen(function () {

        var c1 = client(srv, primus)
          , c2 = client(srv, primus)
          , c3 = client(srv, primus)
          , c4 = client(srv, primus);

        primus.on('connection', function (spark) {
          spark.on('join', function (room) {

            if ('send' === room) {
              sender = spark;
            }

            spark.join(room, function () {
              if (4 === ++total) {
                --total;
                sender.room('room1 room2 room3').send('msg', 'hi');
              }
            });
          });
        });

        c1.on('msg', function (msg) {
          expect(msg).to.be('hi');
          finish();
        });

        c2.on('msg', function (msg) {
          expect(msg).to.be('hi');
          finish();
        });

        c3.on('msg', function (msg) {
          expect(msg).to.be('hi');
          finish();
        });

        c4.on('msg', function (msg) {
          done(new Error('not'));
        });

        function finish() {
          if (1 > --total) done();
        }

        c1.send('join', 'room1');
        c2.send('join', 'room2');
        c3.send('join', 'room3');
        c4.send('join', 'send');

      });
    });

    it('should allow sending to a single room from server', function (done) {
      primus.use('emitter', 'primus-emitter');
      srv.listen(function () {
        
        var c1 = client(srv, primus);

        primus.on('connection', function (spark) {
          spark.join('room1', function () {
            primus.room('room1').send('news');
          });
        });
        c1.on('news', function (data) {
          done();
        });
      });
    });

    it('should not allow broadcasting message with ack', function (done) {
      primus.use('emitter', 'primus-emitter');
      srv.listen(function () {
        var c1 = client(srv, primus);
        primus.on('connection', function (spark) {
          spark.join('room1', function () {
            expect(function () {
              primus.room('room1').send('news', function(){});
            }).to.throwException(/Callbacks are not supported/);
            done();
          });
        });
        c1.on('news', function (data) {
          done();
        });
      });
    });

    it('should allow sending to multiple rooms from server', function (done) {

      var total = 0;

      primus.use('emitter', 'primus-emitter');

      srv.listen(function () {

        var c1 = client(srv, primus)
          , c2 = client(srv, primus)
          , c3 = client(srv, primus)
          , c4 = client(srv, primus);

        primus.on('connection', function (spark) {
          spark.on('join', function (room) {
            spark.join(room, function () {
              if (4 === ++total) {
                --total;
                primus.room('room1 room2 room3').send('msg', 'hi');
              }
            });
          });
        });

        c1.on('msg', function (msg) {
          expect(msg).to.be('hi');
          finish();
        });

        c2.on('msg', function (msg) {
          expect(msg).to.be('hi');
          finish();
        });

        c3.on('msg', function (msg) {
          expect(msg).to.be('hi');
          finish();
        });

        c4.on('msg', function (msg) {
          done(new Error('not'));
        });

        function finish() {
          if (1 > --total) done();
        }

        c1.send('join','room1');
        c2.send('join','room2');
        c3.send('join','room3');
        c4.send('join','room4');
      });
    });

    it('should return Primus instance when sending to a room from server', function() {
      primus.use('emitter', 'primus-emitter');
      expect(primus.room('room1').send('news')).to.be.a(Primus);
      srv.listen();
    });

    it('should allow sending to multiple rooms from server with `write`', function (done) {
      var total = 0;
      primus.use('emitter', 'primus-emitter');
      srv.listen(function () {
        var c1 = client(srv, primus)
          , c2 = client(srv, primus)
          , c3 = client(srv, primus)
          , c4 = client(srv, primus);

        primus.on('connection', function (spark) {
          spark.on('data', function (room) {
            spark.join(room, function () {
              if (4 === ++total) {
                --total;
                primus.room('room1 room2 room3').write('hi');
              }
            });
          });
        });

        c1.on('data', function (msg) {
          expect(msg).to.be('hi');
          finish();
        });

        c2.on('data', function (msg) {
          expect(msg).to.be('hi');
          finish();
        });

        c3.on('data', function (msg) {
          expect(msg).to.be('hi');
          finish();
        });

        c4.on('data', function (msg) {
          done(new Error('not'));
        });

        function finish() {
          if (1 > --total) done();
        }

        c1.write('room1');
        c2.write('room2');
        c3.write('room3');
        c4.write('room4');
      });
    });
        
    it('should still support broadcasting from server with primus-emitter `send`', function (done) {

      var total = 0;

      primus.use('emitter', 'primus-emitter');

      srv.listen(function () {
        
        primus.on('connection', function (spark) {
          if (3 === ++total) {
            primus.send('msg', 'hi');
          }
        });

        var cl1 = client(srv, primus)
          , cl2 = client(srv, primus)
          , cl3 = client(srv, primus);

        cl1.on('msg', function (msg) {
          expect(msg).to.be('hi');
          finish();
        });

        cl2.on('msg', function (msg) {
          expect(msg).to.be('hi');
          finish();
        });

        cl3.on('msg', function (msg) {
          expect(msg).to.be('hi');
          finish();
        });

        function finish() {
          if (1 > --total) done();
        }
      });
    });
  });

  describe('primus-multiplex', function () {

    it('should allow joining a room', function (done) {
      primus.use('multiplex', 'primus-multiplex');
      var a = primus.channel('a');
      srv.listen(function () {
        a.on('connection', function (spark) {
          spark.join('a', function () {
            done();
          });
        });
      });
      var cl = client(srv, primus)
        , cla = cl.channel('a');
    });

    it('should allow leaving a room', function (done) {
      primus.use('multiplex', 'primus-multiplex');
      var a = primus.channel('a');
      srv.listen(function () {
        a.on('connection', function (spark) {
          spark.join('a');
          spark.leave('a', function () {
            done();
          });
        });
      });
      var cl = client(srv, primus)
        , cla = cl.channel('a');
    });

    it('should allow broadcasting a message to a client', function (done) {
      primus.use('multiplex', 'primus-multiplex');
      var a = primus.channel('a');
      srv.listen(function () {
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
      var cl = client(srv, primus)
        , c1a = cl.channel('a');
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

    it('should allow broadcasting a message to multiple clients', function (done) {
      primus.use('multiplex', 'primus-multiplex');
      var a = primus.channel('a')
        , total = 3;

      srv.listen(function () {
        a.on('connection', function (spark) {
          spark.on('data', function (room) {
            spark.join(room);
            if ('send' === room) {
              spark.room('r1 r2 r3').write('hi');
            }
          });
        });
      });

      var cl = client(srv, primus)
        , c1a = cl.channel('a')
        , c2a = cl.channel('a')
        , c3a = cl.channel('a')
        , c4a = cl.channel('a');

      c1a.write('r1');
      c2a.write('r2');
      c3a.write('r3');

      c1a.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c2a.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c3a.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c4a.on('data', function (msg) {
        done(new Error('not'));
      });

      function finish() {
        if (1 > --total) done();
      }

      setTimeout(function () {
        c4a.write('send');
      }, 100);

    });

    it('should allow broadcasting a message to multiple clients with channel `write` method', function (done) {
      primus.use('multiplex', 'primus-multiplex');
      var a = primus.channel('a')
        , total = 3;

      srv.listen(function () {
        a.on('connection', function (spark) {
          spark.on('data', function (room) {
            spark.join(room);
            if ('send' === room) {
              a.room('r1 r2 r3').write('hi');
            }
          });
        });
      });

      var cl = client(srv, primus)
        , c1a = cl.channel('a')
        , c2a = cl.channel('a')
        , c3a = cl.channel('a')
        , c4a = cl.channel('a');

      c1a.write('r1');
      c2a.write('r2');
      c3a.write('r3');

      c1a.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c2a.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c3a.on('data', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c4a.on('data', function (msg) {
        done(new Error('not'));
      });

      function finish() {
        if (1 > --total) done();
      }

      setTimeout(function () {
        c4a.write('send');
      }, 100);

    });

    it('should allow broadcasting a message to multiple clients with channel `send` method', function (done) {
      
      primus.use('emitter', 'primus-emitter');
      primus.use('multiplex', 'primus-multiplex');

      var a = primus.channel('a')
        , total = 3;

      srv.listen(function () {
        a.on('connection', function (spark) {
          spark.on('join', function (room) {
            spark.join(room);
            if ('send' === room) {
              a.room('r1 r2 r3').send('msg', 'hi');
            }
          });
        });
      });

      var cl = client(srv, primus)
        , c1a = cl.channel('a')
        , c2a = cl.channel('a')
        , c3a = cl.channel('a')
        , c4a = cl.channel('a');

      c1a.send('join', 'r1');
      c2a.send('join', 'r2');
      c3a.send('join', 'r3');

      c1a.on('msg', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c2a.on('msg', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c3a.on('msg', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c4a.on('msg', function (msg) {
        done(new Error('not'));
      });

      function finish() {
        if (1 > --total) done();
      }

      setTimeout(function () {
        c4a.send('join', 'send');
      }, 100);

    });

    it('should allow broadcasting a message to a client with emitter', function (done) {
      
      primus.use('emitter', 'primus-emitter');
      primus.use('multiplex', 'primus-multiplex');
      
      var a = primus.channel('a');

      srv.listen(function () {
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

      var cl = client(srv, primus)
        , c1a = cl.channel('a');
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

    it('should allow broadcasting a message to multiple clients with emitter', function (done) {
      
      this.timeout(0);

      primus.use('multiplex', 'primus-multiplex');
      primus.use('emitter', 'primus-emitter');

      var a = primus.channel('a')
        , total = 3;

      srv.listen(function () {
        a.on('connection', function (spark) {
          spark.on('join', function (room) {
            spark.join(room);
            if ('send' === room) {
              spark.room('r1 r2 r3').send('msg', 'hi');
              return;
            }
          });
        });
      });

      var cl = client(srv, primus)
        , c1a = cl.channel('a')
        , c2a = cl.channel('a')
        , c3a = cl.channel('a')
        , c4a = cl.channel('a');

      c1a.send('join', 'r1');
      c2a.send('join', 'r2');
      c3a.send('join', 'r3');
      c3a.send('join', 'r4');

      c1a.on('msg', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c2a.on('msg', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c3a.on('msg', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      c4a.on('msg', function (msg) {
        done(new Error('not'));
      });

      function finish() {
        if (1 > --total) done();
      }

      setTimeout(function () {
        c4a.send('join', 'send');
      }, 100);

    });

    it('should get all clients synchronously if no callback is provided using channel method', function (done) {
      var ids = [];
      primus.use('multiplex', 'primus-multiplex');
      var a = primus.channel('a')
        , total = 0;

      srv.listen(function () {
        a.on('connection', function (spark) {
          ids.push(spark.id);
          a.join(spark, 'room1');
          if (3 === ++total) {
            var clients = a.in('room1').clients();
            expect(clients).to.be.eql(ids);
            done();
          }
        });

        var cl = client(srv, primus);
        cl.channel('a');
        cl.channel('a');
        cl.channel('a');
      });
    });

    it('should join spark to a room using channel method', function (done) {
      primus.use('multiplex', 'primus-multiplex');
      var a = primus.channel('a');

      srv.listen(function () {
        a.on('connection', function (spark) {
          a.join(spark, 'room1', function () {
            spark.room('room1').clients(function (err, clients) {
              expect(!!~clients.indexOf(spark.id)).to.eql(true);
              done();
            });
          });
        });
        var cl = client(srv, primus);
        cl.channel('a');
      });
    });

    it('should remove spark form room using channel method', function (done) {
      primus.use('multiplex', 'primus-multiplex');
      var a = primus.channel('a');

      srv.listen(function () {
        a.on('connection', function (spark) {
          a.join(spark, 'room1', function () {
            a.leave(spark, 'room1', function () {
              spark.room('room1').clients(function (err, clients) {
                expect(!!~clients.indexOf(spark.id)).to.eql(false);
                done();
              });
            });
          });
        });
        var cl = client(srv, primus);
        cl.channel('a');
      });
    });

    it('should trigger `joinroom` event when joining room', function (done) {
      primus.use('multiplex', 'primus-multiplex');
      var a = primus.channel('a');

      srv.listen(function () {
        a.on('connection', function (spark) {
          spark.join('room1');
          spark.on('joinroom', function (room) {
            expect(room).to.be.eql('room1');
            done();
          });
        });
        var cl = client(srv, primus);
        cl.channel('a');
      });
    });

    it('should trigger `leaveroom` event when leaving room', function (done) {
      primus.use('multiplex', 'primus-multiplex');
      var a = primus.channel('a');

      srv.listen(function () {
        a.on('connection', function (spark) {
          spark.join('room1', function () {
            spark.leave('room1');
            spark.on('leaveroom', function (room) {
              expect(room).to.be.eql('room1');
              done();
            });
          });
        });

        var cl = client(srv, primus);
        cl.channel('a');
      });
    });

    it('should trigger `leaveallrooms` events on client disconnect', function (done) {
      this.timeout(0);
      primus.use('multiplex', 'primus-multiplex');
      var a = primus.channel('a');

      srv.listen(function () {
        a.on('connection', function (spark) {
          spark.join('a');
          spark.on('leaveallrooms', function (rooms) {
            expect(rooms).to.be.eql(['a']);
            done();
          });
          spark.write('end');
        });

        var cl = client(srv, primus)
          , cla = cl.channel('a');

        cla.on('data', function (data) {
          if ('end' === data) cla.end();
        });
      });
    });

    it('should trigger `joinroom` event when joining room using channel join method', function (done) {
      primus.use('multiplex', 'primus-multiplex');
      var a = primus.channel('a');
      srv.listen(function () {
        a.on('connection', function (spark) {
          a.join(spark, 'room1');
          a.on('joinroom', function (room, socket) {
            expect(room).to.be.eql('room1');
            expect(spark).to.be.eql(socket);
            done();
          });
        });

        var cl = client(srv, primus)
          , cla = cl.channel('a');
      });
    });

    it('should trigger `leaveroom` event when leaving room using channel leave method', function (done) {
      primus.use('multiplex', 'primus-multiplex');
      var a = primus.channel('a');
      srv.listen(function () {
        a.on('connection', function (spark) {
          a.join(spark, 'room1', function () {
            a.leave(spark, 'room1');
            a.on('leaveroom', function (room, socket) {
              expect(room).to.be.eql('room1');
              expect(spark).to.be.eql(socket);
              done();
            });
          });
        });

        var cl = client(srv, primus)
          , cla = cl.channel('a');
      });
    });

    it('should trigger `leaveallrooms` events on client disconnect when listening on channel', function (done) {
      this.timeout(0);
      primus.use('multiplex', 'primus-multiplex');
      var a = primus.channel('a');
      srv.listen(function () {
        a.on('connection', function (spark) {
          a.join(spark, 'a');
          a.on('leaveallrooms', function (rooms, socket) {
            expect(rooms).to.be.eql(['a']);
            expect(spark).to.be.eql(socket);
            done();
          });
          spark.write('end');
        });

        var cl = client(srv, primus)
          , cla = cl.channel('a');

        cla.on('data', function (data) {
          if ('end' === data) cla.end();
        });
      });
    });
  });
});
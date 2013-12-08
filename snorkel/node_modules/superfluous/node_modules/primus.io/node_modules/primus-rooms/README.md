# Primus Rooms

[![Build Status](https://travis-ci.org/cayasso/primus-rooms.png?branch=master)](https://travis-ci.org/cayasso/primus-rooms)
[![NPM version](https://badge.fury.io/js/primus-rooms.png)](http://badge.fury.io/js/primus-rooms)

Node.JS module that adds room capabilities to a [Primus](https://github.com/3rd-Eden/primus) server.

## Instalation

```
npm install primus-rooms
```

## Usage

### On the Server

```javascript
var Primus = require('primus');
var Rooms = require('primus-rooms');
var server = require('http').createServer();

// primus instance
var primus = new Primus(server, { transformer: 'websockets' });

// add rooms to Primus
primus.use('rooms', Rooms);

primus.on('connection', function (spark) {

  spark.on('data', function(data) {

    data = data || {};
    var action = data.action;
    var room = data.room;

    // join a room
    if ('join' === action) {
      spark.join(room, function () {

        // send message to this client
        spark.write('you joined room ' + room);

        // send message to all clients except this one
        spark.room(room).write(spark.id + ' joined room ' + room);
      });
    }

    // leave a room
    if ('leave' === action) {
      spark.leave(room, function () {
        
        // send message to this client
        spark.write('you left room ' + room);
      });
    }

  });

});

server.listen(8080);
```

### On the Client

```javascript
var primus = Primus.connect('ws://localhost:8080');

primus.on('open', function () {

  // Send request to join the news room
  primus.write({ action: 'join', room: 'news' });

  // Send request to leave the news room
  primus.write({ action: 'leave', room: 'news' });

  // print server message
  primus.on('data', function (message) {
    console.log(message);
  });

});

```

## Client to client

### Client

```javascript
primus.write({ room: 'chat', msg: 'Hello some one' });
```

### Server

```javascript
primus.on('connection', function(spark){

  spark.on('data', function(data){
    var room = data.room;
    var message = data.msg;

    // check if spark is already in this room
    if (~spark.rooms().indexOf(room)) {
      send();
    } else {
    // join the room
    spark.join(room, function(){
      send();
    })
    }

    // send to all clients in the room
    function send() {
      spark.room(room).write(message);
    }
  })

});
```

## API

### primus.adapter(Adapter)

Set your own `adapter` for rooms, by default `primus-rooms` comes 
with its own `memory` adapter but its easy to provide a custom one.

```javascript
// as argument
var primus = new Primus(url, { transformer: 'sockjs', adapter: myAdapter });
primus.use('rooms', Rooms);

// by calling the method
primus.adapter(new MyAdapter());
```

### primus.join(spark, name, [fn])

Join client to a `room`, `fn` is optional callback.

```javascript
primus.join(spark, 'room', fn);
```

### primus.leave(spark, name, [fn])

Remove client from a specific `room`, `fn` is optional callback.

```javascript
primus.leave(spark, 'room', fn);
```

### primus.room(spark, name, [fn])

Target a specific `room` or rooms for broadcasting a message.

```javascript
primus.room('room').write('hi');
```

`in` is an equivalent method to `room`:

```javascript
primus.in('room').write('hi');
```

### primus.room(room).write(message)

Send a message to a specific `room`.

```javascript
primus.room('room').write('hi');
```
or to multiple rooms at once:

```javascript
primus.room('sport news art').write('hi');
```

### primus.room(name).except(ids);

Broadcast messages to clients in a room except to those especified.

```javascript
primus.room('room').except('1386018854525$0 1386018854526$1').write('hi');
```

or pass an array:

```javascript
var except = ['1386018854525$0', '1386018854526$1'];
primus.room('room').except(except).write('hi');
```

### primus.room(room).clients([fn])

Get all client `ids` connected to a specific `room`. 
If no callback is passed the function will return synchronously the ids 
but please remember that NOT all adapters are guaranteed to be able to do 
this operation synchronously.

```javascript
primus.room('room').clients(fn);
```

or synchronously if adapter supports it:

```javascript
var clients = primus.room('room').clients();
console.log(clients);
```
### primus.rooms([spark])

Get all active rooms on the server.

```javascript
primus.rooms();
```

Get all rooms a specific spark is connected to.

```javascript
primus.rooms(spark, fn);
```

### primus.on('joinroom')

The `joinroom` event is emitted every time a spark has joined a room. 
First argument of the callback is the `room` and second argument is the spark.

```javascript
primus.on('joinroom', function (room, spark) {
  console.log(spark.id + ' joined ' + room);
});
```

### primus.on('leaveroom')

The `leaveroom` event is emitted every time a spark has left a room. 
First argument of the callback is the `room` and second argument is the spark.

```javascript
primus.on('leaveroom', function (room, spark) {
  console.log(spark.id + ' left ' + room);
});
```

### primus.on('leaveallrooms')

The `leaveallrooms` event is emitted every time the leaveAll method 
is called on a spark or when the `end` event is emitted on the client. 
First argument of the callback is an array with all `rooms` client joined.

```javascript
primus.on('leaveroom', function (room, spark) {
  console.log(spark.id + ' leaving all rooms:', room);
});
```

### primus.on('roomserror')

The `roomserror` event is emitted every time a spark encounter an error when joining or leaving a room. 
First argument of the callback is the `error` object and second argument is the spark.

```javascript
primus.on('roomserror', function (error, spark) {
  console.log('room error from ' + spark.id, error);
});
```

### spark.join(name, [fn])

Join client to a `room`, `fn` is optional callback.

```javascript
spark.join('room');
```

Join multiple rooms at once.

```javascript
spark.join('room1 room2 room3', fn);
```

### spark.room(name, [fn])

Target a specific `room`.

```javascript
spark.room('room').write('hi');
spark.room('room').clients(fn);
```

`in` is an equivalent method to `room`:

```javascript
spark.in('room').write('hi');
spark.in('room').clients(fn);
```

### spark.room(room).write(message)

Send a message to a specific `room`.

```javascript
spark.room('room').write('hi');
```

### spark.room(name).except(ids);

Broadcast messages to clients in a room except to those especified.

```javascript
spark.room('room').except('1386018854525$0 1386018854526$1').write('hi');
```

or pass an array:

```javascript
var except = ['1386018854525$0', '1386018854526$1'];
spark.room('room').except(except).write('hi');
```

### spark.room(room).clients([fn])

Get all client `ids` connected to specific `room`. 
If no callback is passed the function will return synchronously the ids 
but please remember that NOT all adapters are guaranteed to be able to do 
this operation synchronously.

```javascript
spark.room('room').clients(fn);
```

or synchronously if adapter supports it:

```javascript
var clients = spark.room('room').clients();
console.log(clients);
```

### spark.leave(name, [fn])

Leave a specific `room`, `fn` is optional callback.

```javascript
spark.leave('room', fn);
```

Leave multiple rooms at once.

```javascript
spark.leave('room1 room2 room3', fn);
```

### spark.leaveAll()

Leave all rooms the client has joined.

```javascript
spark.leaveAll();
```

### spark.rooms()

Get all rooms client is connected to.

```javascript
spark.rooms();
```

### spark.isRoomEmpty([room])

Check to see if a room is empty.

```javascript
spark.isRoomEmpty('sport');
```

or you can also use it like this:

```javascript
spark.room('sport').isRoomEmpty();
```

### spark.on('joinroom')

The `joinroom` event is emitted every time a spark has joined a room. 
First argument of the callback is the `room`.

```javascript
spark.on('joinroom', function (room) {
  console.log(room);
});
```

### spark.on('leaveroom')

The `leaveroom` event is emitted every time a spark has left a room. 
First argument of the callback is the `room`.

```javascript
spark.on('leaveroom', function (room) {
  console.log(room);
});
```

### spark.on('leaveallrooms')

The `leaveallrooms` event is emitted every time the leaveAll method 
is called on a spark or when the `end` event is emitted on the client. 
First argument of the callback is an array with all `rooms` client joined.

```javascript
spark.on('leaveroom', function (room) {
  console.log(room);
});
```

### spark.on('roomserror')

The `roomserror` event is emitted every time a spark encounter an error when joining or leaving a room. 
First argument of the callback is the `error` object.

```javascript
spark.on('roomserror', function (error) {
  console.log(error);
});
```

## Run tests

``` bash
$ make test
```

## Other plugins

 * [primus-multiplex](https://github.com/cayasso/primus-multiplex)
 * [primus-emitter](https://github.com/cayasso/primus-emitter)
 * [primus-resource](https://github.com/cayasso/primus-resource)

## License

(The MIT License)

Copyright (c) 2013 Jonathan Brumley &lt;cayasso@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

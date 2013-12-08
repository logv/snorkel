# Primus Multiplex

[![Build Status](https://travis-ci.org/cayasso/primus-multiplex.png?branch=master)](https://travis-ci.org/cayasso/primus-multiplex)
[![NPM version](https://badge.fury.io/js/primus-multiplex.png)](http://badge.fury.io/js/primus-multiplex)

Node.JS module that adds mutiplexing to [Primus](https://github.com/3rd-Eden/primus).

## Instalation

```
$ npm install primus-multiplex
```

## Usage

### On the Server

```javascript
var Primus = require('primus');
var multiplex = require('primus-multiplex');
var server = require('http').createServer();

// primus instance
var primus = new Primus(server, { transformer: 'sockjs', parser: 'JSON' });

// add multiplex to Primus
primus.use('multiplex', multiplex);

var news = primus.channel('news');
news.on('connection', function (spark) {
  
  spark.write('hi from the news channel');

  spark.on('data', function (data) {
    spark.write(data);
  });

});

var sport = primus.channel('sport');
sport.on('connection', function (spark) {
  
  spark.write('hi from the sport channel');

  spark.on('data', function (data) {
    spark.write(data);
  });

});

server.listen(8080);
```

### On the Client

```javascript
var primus = Primus.connect('ws://localhost:8080');

// Connect to channels
var news = primus.channel('news');
var sport = primus.channel('sport');

// Send message
news.write('hi news channel');
sport.write('hi sport channel');

// Receive message
news.on('data', function (msg) {
    console.log(msg);
});
sport.on('data', function (msg) {
    console.log(msg);
});
```

## API

### Server

#### primus.channel(name)

Create a new channel on the server.

```javascript
var news = primus.channel('news');
news.on('connection', fn);
```

#### channel.write(message)

Broadcast a message to all connected `Sparks` in the channel.

```javascript
news.write(message);
```

#### channel.forEach(fn)

Iterare over all `Sparks` in a channel. This could also be used 
for broadcasting to specific `Sparks`.

```javascript
news.forEach(function (spark, id, connections) {
  spark.write('message');
});
```

#### channel.destroy()

Destroy the channel removing all 'Sparks' and event listeners.
This will emit a `close` event.

```javascript
news.on('connection', function (spark) {
  news.destroy();
});
```

#### channel.on('close', fn)
Triggers when the destroy method is called.

```javascript
news.on('connection', function (spark) {
  news.destroy();
});

news.on('close', function () {
  console.log('channel was destroyed');  
});
```

#### spark.end([fn])

End the connection.

```javascript
news.on('connection', function (spark) {
  spark.end(fn);
});
```

### Client

#### spark.write(message)

Send a message to the server.

```javascript
news.write('hi server');
```

#### spark.end()

Disconnect from a channel.

```javascript
var news = primus.channel('news');
news.end();
```

#### spark.on('data', fn)
Receive `data` from the server form the corresponding `channel`.

```javascript
spark.on('data', function(msg) {
  console.log('Received message from news channel', msg);
});
```

## Protocol

Each message consists of an array of four parts: `type` (`Number`), `id` (`String`),
`topic` (`String`), and `payload` (`Mixed`).

There are three valid message types:

 * `Packet#MESSAGE` (`1`)  send a message with `payload` on a `topic`.
 * `Packet#SUBSCRIBE` (`2`) subscribe to a given `topic`.
 * `Packet#UNSUBSCRIBE` (`3`) unsubscribe from a `topic`.

The `topic` identifies a channel registered on the server side.
The `id` represent a unique connection identifier generated on the client side. 

Each request to subscribe to a topic from a given client has a unique id.
This makes it possible for a single client to open multiple independent
channel connection to a single server-side service.

Invalid messages are simply ignored.

It's important to notice that the namespace is shared between both
parties and it is not a good idea to use the same topic names on the
client and on the server side. Both parties may express a will to
unsubscribe itself or other party from a topic.

## Run tests

``` bash
$ make test
```

## Inspiration

This library was inspire by this great post:

* https://www.rabbitmq.com/blog/2012/02/23/how-to-compose-apps-using-websockets/

## Other plugins

PrimusMultiplex is compatible with the following plugins, check the [examples](https://github.com/cayasso/primus-multiplex/tree/master/examples/node) to see more.

 * [primus-rooms](https://github.com/cayasso/primus-rooms)
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

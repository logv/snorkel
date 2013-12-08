var express = require('express');
var Primus = require('primus');
var Multiplex = require('../../../');

var port = 8080;

var app = express();
var server = require('http').createServer(app);

var primus = new Primus(server, { transformer: 'websockets' });
primus.use('emitter', 'primus-emitter');
primus.use('multiplex', Multiplex);


server.listen(port);

var apiChannel = primus.channel('api');

primus.on('connection', function(connection) {
  console.log('Primus: connection %s', connection.id);
});

apiChannel.on('connection', function(spark) {
  console.log('API channel: connection %s', spark.id);

  //spark.emit('news', 'HOOOOOOOOOO LLLLLLLLAAAAA');
  apiChannel.emit('news', { hola: 'mundo' });

});

require('./client');

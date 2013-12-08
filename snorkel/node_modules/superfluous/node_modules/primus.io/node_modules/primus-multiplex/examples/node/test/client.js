var Primus = require('primus');
var Multiplex = require('../../../');
var Emitter = require('primus-emitter');

var Socket = Primus.createSocket({ transformer: 'websockets', plugin: { multiplex: Multiplex, emitter: Emitter } });
var socket = new Socket('http://localhost:8080');

socket.on('open', function() {
  console.log('WS: open');
});

socket.on('reconnect', function(opts) {
  console.log('WS: reconnect');
});

socket.on('reconnecting', function(opts) {
  console.log('WS: reconnecting');
});



var api = socket.channel('api');

api.on('data', function(){
	//console.log('DATA ==>', arguments);
});

api.on('news', function(){
	console.log('NEWS ==>', arguments);
});


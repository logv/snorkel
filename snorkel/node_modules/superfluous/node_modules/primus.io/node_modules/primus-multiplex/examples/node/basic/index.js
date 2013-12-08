var Multiplex = require('../../../');
var Primus = require('primus');
var http = require('http');
var server = http.createServer();

// THE SERVER
var primus = new Primus(server, { transformer: 'websockets', parser: 'JSON' });

// Add multiplex functionality to primus
primus
.use('multiplex', Multiplex);

var ann = primus.channel('ann');
var bob = primus.channel('bob');
var tom = primus.channel('tom');

// Server stuff
ann.on('connection', function(spark){
  console.log('connected to ann');
  spark.write('hi Ann');
  // testing regular
});

// Server stuff
bob.on('connection', function(spark){
  console.log('connected to bob');
  spark.write('hi Bob');
});

// Server stuff
tom.on('connection', function(spark){
  console.log('connected to tom', spark.id);

  spark.on('data', function () {
    console.log('data from tom as client', arguments);
  });

  setInterval(function () {
    spark.write('hola Tom');
  }, 3000);
});


// THE CLIENT
function setClient () {

  var Socket = primus.Socket;
  var socket = new Socket('ws://localhost:8080');

  var ann = socket.channel('ann');
  var bob = socket.channel('bob');
  var tom = socket.channel('tom');

  ann.on('data', function (msg) {
    console.log('[ANN] ===> ' + msg);
  });

  tom.on('data', function (msg) {
    console.log('[TOM] ===> ' + msg);
  });

  bob.on('data', function (msg) {
    console.log('[BOB] ===> ' + msg);
  });

  setInterval(function () {
    tom.write('hi');
  }, 1000);

}

// Set first client
setTimeout(function () {
  setClient();
}, 0);

server.listen(process.env.PORT || 8080, function(){
  console.log('\033[96mlistening on localhost:9000 \033[39m');
});

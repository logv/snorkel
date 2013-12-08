var Emitter = require('../../');
var Primus = require('primus');
var http = require('http');
var server = http.createServer();

// THE SERVER
var primus = new Primus(server, { transformer: 'websockets', parser: 'JSON' });

// Add emitter functionality to primus
primus.use('emitter', Emitter);

// Server stuff
primus.on('connection', function(spark){

  // testing regular
  spark.on('news', function(data, fn){
    console.log(arguments);
    fn(null, 'ok');
  });

  setInterval(function(){
    spark.emit('news', 'data');
  }, 2500);

});


// THE CLIENT
function setClient (room) {

  var Socket = primus.Socket;
  var socket = new Socket('ws://localhost:8080');

  setInterval(function(){
    socket.emit('news', { 'hello': 'world' }, function (data) {
      console.log('sent', arguments);
    });
  }, 3500);

  // on data received
  socket.on('news', function (data) {
    console.log('MSG:', data);
  });
}

// Set first client
setTimeout(function () {
  setClient('me');
}, 0);

server.listen(process.env.PORT || 8080, function(){
  console.log('\033[96mlistening on localhost:9000 \033[39m');
});

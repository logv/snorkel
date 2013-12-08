var Rooms = require('../../');
var Primus = require('primus');
var http = require('http');
var server = http.createServer();



// THE SERVER
var primus = new Primus(server, { transformer: 'websockets', parser: 'JSON' });

// Add room functionality to primus
primus.use('rooms', Rooms);

// Server stuff
primus.on('connection', function(spark){

  // testing regular
  spark.on('data', function(data){

    // joining a room
    spark.join(data);

    // broadcasting to rooms
    if (data === 'me') {
      console.log('------- ------- -------');
      spark.room('room1 room2 room3 room4').write('- WELCOME -');
      spark.room('room4').write('- BIENVENIDOS -');
      spark.leave(data);
    }
  });
});



// THE CLIENT
function setClient (room) {

  var Socket = primus.Socket;
  var socket = new Socket('ws://localhost:8080');

  if (room === 'me') {
    setInterval(function(){
      socket.write(room);
    }, 1500);
  } else {
    socket.write(room);
  }

  // on data received
  socket.on('data', function (data) {
    console.log('MSG:', data);
  });
}

// Set first client
setTimeout(function () {
  setClient('me');
}, 10);

// Set one more client
setTimeout(function () {
  setClient('room1');
}, 100);

// Set one more client
setTimeout(function () {
  setClient('room2');
}, 10);

// Set one more client
setTimeout(function () {
  setClient('room3');
}, 10);

// Set one more client
setTimeout(function () {
  setClient('room4');
}, 10);

// Set one more client
setTimeout(function () {
  setClient('room1');
}, 10);

server.listen(process.env.PORT || 8080, function(){
  console.log('\033[96mlistening on localhost:9000 \033[39m');
});

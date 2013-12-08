var Multiplex = require('../../../');
var Primus = require('primus');
var Rooms = require('primus-rooms');
var http = require('http');
var server = http.createServer();

// THE SERVER
var primus = new Primus(server, { transformer: 'websockets', parser: 'JSON' });

// Add multiplex functionality to primus
primus

.use('multiplex', Multiplex)
.use('rooms', Rooms);

var a = primus.channel('a');

// Server stuff
a.on('connection', function(spark){

  // testing regular
  spark.on('data', function(room){

    // broadcasting to rooms
    if (room === 'me') {
      console.log('------- ------- -------');
      spark.room('room1 room2 room3').write('- WELCOME -');
      spark.leave(room);
    } else {
      // joining a room
      spark.join(room, function () {
        console.log('joining room ' + room);
      });
    }
  });

  // testing regular
});




// THE CLIENT
function client (room) {

  var Socket = primus.Socket;
  var socket = new Socket('ws://localhost:8080');
  var a = socket.channel('a');

  if (room === 'me') {
    setInterval(function(){
      a.write(room);
    }, 3000);
  } else {
    a.write(room);
  }

  // on data received
  a.on('data', function (data) {
    console.log('MSG:', data);
  });

}

// Set first client
client('room1');
client('room2');
client('room3');


setTimeout(function () {
  client('me');
}, 0);

server.listen(process.env.PORT || 8080, function(){
  console.log('\033[96mlistening on localhost: \033[39m');
});

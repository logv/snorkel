var PrimusIO = require('../../');
var http = require('http');
var server = http.createServer();

// The Primus server
var primus = new PrimusIO(server, { transformer: 'websockets', parser: 'JSON' });

// Listen to incoming connections
primus.on('connection', function(spark){

  console.log('new client connected');

  spark.send('ok', 'connected', function(msg){
    console.log(msg);
  });

  spark.on('join', function(room, fn){
    spark.join(room);
    fn('client joined room ' + room);
  });

  setInterval(function(){
    spark.room('news').send('brazil', 'CHAMPION');
  }, 2000);

});


// The client
function client(id) {

  var Socket = primus.Socket;
  var spark = new Socket('http://localhost:8080');

  spark.on('brazil', function(msg) {
    console.log('Brazil is', '****', msg, '****', id);
  });

  spark.on('ok', function(msg, fn){
    console.log('user is', msg);
    fn('client got message');
  });

  spark.send('join', 'news', function(msg){
    console.log(msg);
  });

}

// Set client
client('client1');
client('client2');


// Start server
server.listen(process.env.PORT || 8080, function(){
  console.log('\033[96mlistening on localhost:8080 \033[39m');
});
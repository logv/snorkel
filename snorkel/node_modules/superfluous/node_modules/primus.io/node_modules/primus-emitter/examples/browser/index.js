var Emitter = require('../../')
  , Primus = require('primus')
  , http = require('http')
  , fs = require('fs');

var server = http.createServer(function server(req, res) {
  res.setHeader('Content-Type', 'text/html');
  fs.createReadStream(__dirname + '/index.html').pipe(res);
});

// Primus server.
var primus = new Primus(server, { transformer: 'websockets', parser: 'JSON' });

// Add emitter functionality to primus
primus.use('emitter', Emitter);

// Listen for new connections
primus.on('connection', function connection(spark) {
  console.log('Incoming connection', spark.id);

  spark.emit('news', '[SERVER] => Hi from server', function (msg){
    console.log(msg);
  });

  spark.on('news', function (msg, fn){
    console.log(msg);
    fn('[SERVER ACK] => Message received');
  });

});

// Start server listening
server.listen(process.env.PORT || 8082, function(){
  console.log('\033[96mlistening on localhost:8082 \033[39m');
});

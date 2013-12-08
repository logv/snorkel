var Primus = require('../../')
  , http = require('http')
  , fs = require('fs');

var server = http.createServer(function server(req, res) {
  res.setHeader('Content-Type', 'text/html');
  fs.createReadStream(__dirname + '/index.html').pipe(res);
});


// Primus server.
var primus = new Primus(server, { transformer: 'websockets', parser: 'JSON' });


// Listen for new connections
primus.on('connection', function connection(spark) {
  console.log('new connection');

  spark.send('hello', 'world');

  spark.on('join', function(room){
    spark.join.apply(this, arguments);
  });

  spark.on('leave', function(room){
    spark.leave.apply(this, arguments);
  });

  setInterval(function(){
    spark.room('sport').send('sport', '[SPORT] Brazil Champion!');
  }, 3500);

  setInterval(function(){
    spark.room('news').send('news', '[NEWS] Breaking news!');
  }, 5000);
});

// Start server listening
server.listen(process.env.PORT || 8081, function(){
  console.log('\033[96mlistening on localhost:8081 \033[39m');
});

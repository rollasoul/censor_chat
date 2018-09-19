// HTTP Portion
var http = require('http');
var fs = require('fs'); // Using the filesystem module
var httpServer = http.createServer(requestHandler);
var url = require('url');
var clients =[];
var Analyzer = require('natural').SentimentAnalyzer;
var stemmer = require('natural').PorterStemmer;
var analyzer = new Analyzer("English", stemmer, "afinn");

httpServer.listen(8000);

function requestHandler(req, res) {

	var parsedUrl = url.parse(req.url);
	console.log("The Request is: " + parsedUrl.pathname);

	fs.readFile(__dirname + parsedUrl.pathname,
		// Callback function for reading
		function (err, data) {
			// if there is an error
			if (err) {
				res.writeHead(500);
				return res.end('Error loading ' + parsedUrl.pathname);
			}
			// Otherwise, send the data, the contents of the file
			res.writeHead(200);
			res.end(data);
  		}
  	);

  	/*
  	res.writeHead(200);
  	res.end("Life is wonderful");
  	*/
}


// WebSocket Portion
// WebSockets work with the HTTP server
var io = require('socket.io').listen(httpServer);

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on('connection',
	// We are given a websocket object in our function
	function (socket) {

		console.log("We have a new client: " + socket.id);

		socket.on('storeClientInfo', function (data) {

			var clientInfo = new Object();
      clientInfo.customId = data.customId;
      clientInfo.clientId = socket.id;
      clients.push(clientInfo);
    });

		// When this user emits, client side: socket.emit('otherevent',some data);
		socket.on('chatmessage', function(data) {
			// Data comes in as whatever was sent, including objects
			console.log("Received: 'chatmessage' " + data);
			var str = data;
			var stringArray = str.split(/(\s+)/);
			// getSentiment expects an array of strings
			var color = mapRange(analyzer.getSentiment(stringArray), -3, 3, 0, 255);
			// Send it to all of the clients
			for( var i=0, len = clients.length; i < len; ++i ){
				var c = clients[i];

				if(c.clientId == socket.id){
					var user = c.customId;
					break;
				}
			}

			var message = {
				username : user,
				text : data,
				bgroundColor : color
			}

			io.emit('chatmessage', message);
		});

		//number/3*100
		function mapRange (value, a, b, c, d) {
		    // first map value from (a..b) to (0..1)
		    value = (value - a) / (b - a);
		    // then map it from (0..1) to (c..d) and return it
		    return c + value * (d - c);
		}

		socket.on('disconnect', function (data) {

			for( var i=0, len = clients.length; i < len; ++i ){
				var c = clients[i];

				if(c.clientId == socket.id){
					clients.splice(i,1);
					break;
				}
			}
		});
	}
);

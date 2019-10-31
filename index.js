var app = require('express')();
var http = require('http');
var server = http.createServer(app);

var WebSocket = require('ws');
var wss = new WebSocket.Server({ server });

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

// Set some defaults
db.defaults({ posts: [] })
  .write();

wss.on('connection', function(socket) {
  console.log('a user connected');

  socket.on("message", function(message) {

    var incoming = JSON.parse(message);

    let entry = db.get('posts')
                  .find({ index: incoming.index })
                  .value();

    if (incoming.score == undefined) {
      // request
      if (entry != undefined && socket.readyState === WebSocket.OPEN) {
        let msg = {
          index: incoming.index,
          score: entry.score
        };
        socket.send(JSON.stringify(msg));
      }
    }
    else {
      if (entry == undefined) {
        // initialize
        db.get('posts')
          .push({ index: incoming.index, score: incoming.score })
          .write();
      }
      else {
        // update
        db.get('posts')
          .find({ index: incoming.index })
          .assign({ score: incoming.score })
          .write();
      }
      // send to other connected clients
      let msg = {
        index: incoming.index,
        score: incoming.score
      };
      wss.clients.forEach(function(client) {       
        if (client !== socket && client.readyState === WebSocket.OPEN ) {
            client.send(JSON.stringify(msg));
        }
      });
    }
  });
  socket.on('close', function() {
    console.log('user disconnected');
  });
});

server.listen(63244, function() {
  console.log('listening on *:63244');
});

'use strict';

var StaticServer = require('static-server');
var PORT = process.env.PORT || 8080;

var server = new StaticServer({
  rootPath: '.',
  port: PORT,
  host: '127.0.0.1',
  cors: '*',
  templetes: {
    index: 'index.html'
  }
});

server.start(function() {
  console.log('Server listening to', server.port);
});

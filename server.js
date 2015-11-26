var express = require('express')
  , fs = require('fs')
  , ws = require('ws')
  , app = express()

  , messages = []
  , clients = {}
  , names = {};

// Создаем простой статический сервер для запуска приложения.
app.use('/static', express.static('static'));

app.get('/', function (req, res) {
  res.set('Content-Type', 'text/html');
  res.send(fs.readFileSync(__dirname + '/static/index.html'));
});

var server = app.listen(3000, function () {
  var host = server.address().address
    , port = server.address().port;

  console.log('Chat app listening at http://%s:%s', host, port);
});

// Вебсокет-сервер для общения с фронтом.
var port = 8080
  , WebSocketServer = ws.Server
  , wss = new WebSocketServer({ port: port });

var getOnline = function (current) {
    var online = [];
    for (var key in names) {
      if (names.hasOwnProperty(key)) {
        if (current) {
          if (current != key)
            online.push(key);
        } else {
          online.push(key);
        }
      }
    }

    return online;
  };

wss.on('connection', function (ws) {
  console.log('Client connected...');

  var id = Math.random();
  clients[id] = { ws: ws, username: null };


// Абстрактный уровень подключения.
  var EventEmitter = new require('events').EventEmitter
    , front = new EventEmitter();

  front.on('send', function (message) {
    ws.send(JSON.stringify(message));
  });

  front.on('broadcast', function (message) {
    for (var key in clients) {
      if (key != id) {
        clients[key].ws.send(JSON.stringify(message));
      }
    }
  });

  front.on('login', function (username) {
    if (!names[username]) {
      names[username] = id;
      clients[id].username = username;

      front.emit('send', {type: 'login', data: 1});
    } else {
      front.emit('send', {type: 'login', data: 0});
    }
  });

  front.on('online', function () {
    front.emit('send', {type: 'online', data: getOnline()});
    front.emit('broadcast', {type: 'online', data: getOnline()});
  });

  front.on('messages', function () {
    front.emit('send', {type: 'messages', data: messages});
  });

  front.on('message', function (message) {
    messages.push({
      username: message.username,
      text: message.text
    });

    front.emit('messages');
    front.emit('broadcast', {type: 'messages', data: messages});
  });

  front.on('logout', function () {
    front.emit('broadcast', {type: 'online', data: getOnline(clients[id].username)});
    front.emit('send', {type: 'close'});
  });



// Уровень вебсокетов.
  ws.on('message', function (message) {
    try {
      message = JSON.parse(message);
    } catch (e) {
      return;
    }

    front.emit(message.type, message.data);
  });

  ws.on('close', function () {
    delete names[clients[id].username];
    delete clients[id];
  });
});

console.log('Websocket server listening at ws://localhost:%s', port);


"use strict";

// Реализуем наследование классов.
var extend = function(child, parent) {
  for (var key in parent) {
    if (parent.hasOwnProperty(key)) child[key] = parent[key];
  }

  function ctor() { this.constructor = child; }

  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
  child.__super__ = parent.prototype;
  return child;
};

// Вспомогательные функции для добавления/удаления классов у DOM элементов.
function addClass(el, name) {
  el.className = el.className + ' ' + name;
}

function removeClass(el, name) {
  el.className = el.className.replace(new RegExp('\s*'+name+'\s*', 'g'), '');
}

// ----------------------------------------------------------------------------
// Класс для генерации событий
function EventEmitter() {
  this._listeners = {};
};

EventEmitter.prototype.on = function (event, listener) {
  if (!this._listeners[event])
    this._listeners[event] = {};

  this._listeners[event][listener.toString()] = listener;
};

EventEmitter.prototype.off = function (event, listener) {
  if (!this._listeners[event])
    return;

  if (!listener) {
    delete this._listeners[event];
    return;
  }

  if (this._listeners[event][listener.toString()])
    delete this._listeners[event][listener.toString()];
};

EventEmitter.prototype.emit = function (event, data) {
  if (!this._listeners[event])
    return;

  // Поскольку порядок вызова слушателей неважен, можно делать это пробеганием
  // по ключам.
  for (var key in this._listeners[event]) {
    this._listeners[event][key].call(this, data);
  }
}

// ----------------------------------------------------------------------------
// Основной класс с которого начинается запуск приложения.
function App() {
  App.__super__.constructor.apply(this, arguments);

  this.$greetings = document.getElementById('greetings');
  this.$username = document.getElementById('username');
  this.$login = document.getElementById('login');
  this.$info = document.getElementById('info');

  this.$chat = document.getElementById('chat');
  this.$send = document.getElementById('send');
  this.$input = document.getElementById('input');
  this.$reset = document.getElementById('reset');
  this.$online = document.getElementById('online');
  this.$messages = document.getElementById('messages');

  this.username = '';
}

extend(App, EventEmitter);

// Инициализация транспорта.
App.prototype.initTransport = function (callback) {
  console.log('transport');

  this.transport = new App.Transport({
    open: callback.bind(this),

    message: function(message) {
      message = message.data;

      try {
        message = JSON.parse(message);
      } catch (e) {
        return;
      }

      this.emit(message.type, message.data);
    }.bind(this),

    error: function(e) {
      console.log('Ошибка соединения %s', e.message || e.code);
    }
  });

  this.on('send', function(message) {
    this.transport.send(JSON.stringify(message));
  });

  this.on('logout', function() {
    this.emit('send', {type: 'logout'});
  });

  this.on('close', function() {
    this.transport.close();
  });

  this.transport.connect();
};

// Приветствие с формой ввода псевдонима.
App.prototype.greetings = function () {
  console.log('show greetings message');

  this.$login.addEventListener('click', function(e) {
    e.preventDefault();

    this.on('login', function(data) {
      if (data) {
        addClass(this.$greetings, 'hidden');
        removeClass(this.$chat, 'hidden');
        this.chat();
      } else {
        this.username = '';
        removeClass(this.$info, 'invisible');
      }
    });

    this.username = this.$username.value;
    this.emit('send', {type: 'login', data: this.$username.value});
  }.bind(this), false);
};


// Вешаем события и грузим информацию для чата.
App.prototype.chat = function () {

  // Получаем информацию о всех пользователях в сети.
  this.on('online', function(users) {
    var username = this.username;
    users = users.map(function(user) {
      if (user == username)
        return '<li class="text-danger">' + user + '</li>';

      else
        return '<li class="text-info">' + user + '</li>';

    });
    this.$online.innerHTML = users.join("\n");
  });

  // Получаем все сообщения от сервера.
  this.on('messages', function (messages) {
    var username = this.username;
    messages = messages.map(function(message) {
      var msg = '';
      if (message.username == username) {
        msg += '<span class="text-danger">'+ message.username +'</span>';
      } else {
        msg += '<span class="text-info">'+ message.username +'</span>';
      }

      msg += '<p>' + message.text + '</p>';

      return msg;
    });

    this.$messages.innerHTML = messages.join("\n");
  });

  // Обрабатываем нажатие на кнопку отправки сообщений.
  this.$send.addEventListener('click', function () {
    this.emit('send', {
      type: 'message',
      data: {
        username: this.username,
        text: this.$input.value
      }
    });

    this.$input.value = '';

  }.bind(this), false);

  // Кнопка очистки поля ввода.
  this.$reset.addEventListener('click', function () {
    this.$input.value = '';

  }.bind(this), false);

  // Запрашиваем у сервера список пользователей в сети и все сообщения.
  this.emit('send', {type: 'online'});
  this.emit('send', {type: 'messages'});
};

// Уничтожение приложения.
App.prototype.destroy = function () {
  // Отправляем информацию о том, что пользователь с `this.username` вышел из чата.
  this.emit('logout');
};

// ----------------------------------------------------------------------------
// Класс транспорта между фронтенд частью и бэкендом.
App.Transport = function(params) {
  this.host = params.host || 'localhost';
  this.port = params.port || 8080;
  this.onOpen = params.open || function() { console.log('open connection'); };
  this.onClose = params.close || function() { console.log('close connection');};
  this.onError = params.error || function() { console.log('connection failed');};
  this.onMessage = params.message || function(m) { console.log('message: ', m.data); };

  this.ws = null;
}

// Подключение по протоколу WebSocket к хосту.
App.Transport.prototype.connect = function() {
  this.ws = new WebSocket('ws://' + this.host + ':' + this.port);

  this.ws.onopen = this.onOpen.bind(this);

  this.ws.onclose = function(e) {
    if (e.wasClean) {
      this.onClose();
    } else {
      this.onError(e);
    }
  }.bind(this);

  this.ws.onmessage = this.onMessage.bind(this);
  this.ws.onerror = this.onError.bind(this);
};

// Отправка сообщений.
App.Transport.prototype.send = function (message) {
  this.ws.send(message);
};

// Закрываем соединение.
App.Transport.prototype.close = function () {
  this.ws.close();
};
// ----------------------------------------------------------------------------


var app = new App();

app.initTransport(function() {
  app.greetings();

  // Перед закрытием вкладки браузера убираем за собой.
  window.addEventListener('beforeunload', function() {
    app.destroy();
  }, false);
});

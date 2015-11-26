# Просто чат

Чат для простого общения.

## Установка

Для установку нужно всего лишь поставить **Nodejs**, а далее выполнить простую
комманду:

```
$ npm install
```

После чего выполнить:

```
$ npm start
> chat@1.0.0 start /home/vetal/chat
> node server.js

Websocket server listening at ws://localhost:8080
Chat app listening at http://0.0.0.0:3000
```

По умолчанию веб-сокет сервер будет открыт на порте `8080`, а сервер статической
отдачи контента на порте `3000`.

Чтобы запустить чат достаточно открыть вкладку браузера и перейти по адресу
`http://localhost:3000`

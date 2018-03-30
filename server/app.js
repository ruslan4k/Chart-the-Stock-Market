var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var appRoot = require('app-root-path');
const mongoose = require('mongoose');
var Symbols = require('./model/symbols');
const cors = require('./cors');

const EventEmitter = require('events');
class MyEmitter extends EventEmitter { }
const myEmitter = new MyEmitter();

var WebSocketServer = require('ws').Server,
  wss = new WebSocketServer({ port: 40510 })


myEmitter.on('addStock', function (symbol) {
  console.log('add event triggered')
  wss.clients.forEach(function (wssclient) {
    wssclient.send(JSON.stringify({ type: 'add', symbol: symbol }), function ack(error) {
      if (error) console.log(error)
    })
  })
})


myEmitter.on('removeStock', function (symbol) {
  console.log('delete event triggered')
  wss.clients.forEach(function (wssclient) {
    wssclient.send(JSON.stringify({ type: 'delete', symbol: symbol }), function ack(error) {
      if (error) console.log(error)
    })
  })
});



function noop() { }

function heartbeat() {
  this.isAlive = true;
}


wss.on('connection', function connection(ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
});


const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);




require('dotenv').load();
var app = express();
mongoose.connect(process.env.URI);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('connected to mongoDB');
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(favicon(path.join(appRoot.path, 'dist/favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());



app.options('*', cors.corsWithOptions)

app.post('/symbols', cors.corsWithOptions, function (req, res, next) {
  Symbols.findOne({}, function (err, symbol) {
    if (err) {
      console.log(err);
      return next(err);
    }
    if (!symbol.symbols.includes(req.body.symbol)) {
      symbol.symbols.push(req.body.symbol)
    }
    symbol.save()
      .then((stocks) => {
        myEmitter.emit('addStock', req.body.symbol)
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(stocks.symbols)
        return
      }, (err) => {
        console.log(err);
        return next(err);
      });
  });
})


app.get('/symbols', cors.corsWithOptions, function (req, res, next) {
  Symbols.find({}, function (err, symbol) {
    if (err) {
      console.log(err);
      return next(err);
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.json(symbol[0].symbols)
  });
})


app.delete('/symbols/:symbol', cors.corsWithOptions, function (req, res, next) {
  Symbols.findOne({}, function (err, symbol) {
    if (err) {
      console.log(err);
      return next(err);
    }
    for (let i = 0; i < symbol.symbols.length; i++) {

      if (symbol.symbols[i] == req.params.symbol) {
        symbol.symbols.splice(i, 1)
        return symbol.save()
          .then((stocks) => {
            myEmitter.emit("removeStock", req.params.symbol)
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(stocks.symbols)
            return
          }, (err) => {
            console.log(err);
            return next(err);
          });
      }
    }
  });
})

app.use(express.static(path.join(appRoot.path, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(appRoot.path, 'dist/index.html'));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
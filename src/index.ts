// Standard library
import * as util from 'util';
import * as http from 'http';
import {IncomingMessage} from 'http';
import {Socket} from 'net';

// Third party modules
import * as express from 'express';
import * as WebSocket from 'ws';
import * as dotenv from 'dotenv';
dotenv.config();

// Project modules
import {app as authProviderApp} from './auth-provider';
import {app as smartHomeApp} from './fulfillment';
import {handleDeviceMessage, removeOldDevices} from './device-iface';

// Consts
const PORT = process.env.PORT || 3000;

// Servers
const app = express();
const server = http.createServer(app);

// Middlewares
app.use(express.urlencoded({extended: true}));
app.use(express.json());

if (process.env.DEBUG) {
  app.use((req, _res, next) => {
    const logObj = {
      headers: req.headers,
      url: req.url,
      method: req.method,
      params: req.params,
      query: req.query,
      body: req.body,
    };
    console.log(util.inspect(logObj, false, null, true));
    next();
  });
}

// Routes
app.get('/ping', (req, res) => {
  res.send('pong');
});
app.use('/auth', authProviderApp);
app.post('/fulfillment', smartHomeApp);

// WebSocket connection from home devices
// https://devcenter.heroku.com/articles/node-websockets#option-1-websocket
const wss = new WebSocket.Server({path: '/device-manager', noServer: true});

function authorize(
  request: IncomingMessage,
  socket: Socket,
  head: Buffer,
  callback: (err: null, client: Socket) => void
) {
  const err = null; // TODO: authorization here
  callback(err, socket);
}

server.on('upgrade', (request, socket, head) => {
  console.log(`upgrade from ${socket.remoteAddress}`);
  authorize(request, socket, head, (err, client) => {
    if (err || !client) {
      console.log('unauthorized');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws, request) => {
      wss.emit('connection', ws, request, client);
    });
  });
});

wss.on('connection', (ws, request) => {
  console.log(`new connection accepted from ${request.socket.remoteAddress}`);
  ws.on('message', data => handleDeviceMessage(ws, data));
});

// https://www.npmjs.com/package/ws#how-to-detect-and-close-broken-connections
const interval = setInterval(() => removeOldDevices(wss), 5 * 60 * 1000);
wss.on('close', () => clearInterval(interval));

// Run
server.listen(PORT, () => console.log(`Listening to port ${PORT}...`));

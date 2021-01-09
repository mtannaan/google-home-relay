// dotenv.config needs to be called first
import * as dotenv from 'dotenv';
dotenv.config();

// Standard library
import * as http from 'http';
import {IncomingMessage} from 'http';
import {Socket} from 'net';

// Third party modules
import * as express from 'express';

// Middlewares
import {dumpRequestMW} from './middlewares/dump-request';

// Routes & Sub-Apps
import {app as authProviderApp} from './routes/auth-provider';
import {app as smartHomeApp} from './routes/smart-home';
import {wss} from './routes/websocket';

// ----------------------------------------------------------------------------
// Consts and globals
// ----------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;

// Servers
const app = express();
const server = http.createServer(app);

// ----------------------------------------------------------------------------
// Express.js Middlewares
// ----------------------------------------------------------------------------
app.use(express.urlencoded({extended: false}));
app.use(express.json());
if (process.env.DEBUG) {
  app.use(dumpRequestMW);
}

// ----------------------------------------------------------------------------
// Express.js routes
// ----------------------------------------------------------------------------
app.get('/ping', (req, res) => {
  res.send('pong');
});
app.use('/auth', authProviderApp);
app.post('/fulfillment', smartHomeApp);

// ----------------------------------------------------------------------------
// Accept WebSocket Connection
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// Run Server
// ----------------------------------------------------------------------------
server.listen(PORT, () => console.log(`Listening to port ${PORT}...`));

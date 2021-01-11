// dotenv.config needs to be called first
import * as dotenv from 'dotenv';
dotenv.config();

// Initialize log4js
import {log4js, customConnectLogger} from './log';

// Standard library
import * as http from 'http';
import * as net from 'net';

// Third party modules
import * as express from 'express';
import * as expressSession from 'express-session';
import * as passport from 'passport';
import * as errorHandler from 'errorhandler';

// Project Modules
import {getSessionSecret} from './util';

// Routes & Sub-Apps
// import {app as authProviderApp} from './routes/auth-provider';
// import {app as smartHomeApp} from './routes/smart-home';
// import {wss} from './routes/websocket';
import {apps} from './services';

// ----------------------------------------------------------------------------
// Consts and globals
// ----------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;

// Servers
const app = express();
const server = http.createServer(app);

// ----------------------------------------------------------------------------
// Express Settings
// ----------------------------------------------------------------------------
// app.engine('ejs', ejs.__express);
app.set('view engine', 'ejs');
app.set('views', './views');

// ----------------------------------------------------------------------------
// Express.js Middlewares
// ----------------------------------------------------------------------------
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(
  expressSession({
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(customConnectLogger);
app.use(errorHandler());

// Passport configuration
import './auth';

// ----------------------------------------------------------------------------
// Express.js routes
// ----------------------------------------------------------------------------
app.get('/ping', (req, res) => {
  res.send('pong');
});
// app.use('/auth', authProviderApp);
app.post('/fulfillment', [
  passport.authenticate('bearer', {session: false}),
  apps.smartHomeApp,
]);

const site = require('./routes/site');
app.get('/', site.index);
app.get('/login', site.loginForm);
app.post('/login', site.login);
app.get('/logout', site.logout);
app.get('/account', site.account);

const oauth2 = require('./routes/oauth2');
app.get('/dialog/authorize', oauth2.authorization);
app.post('/dialog/authorize/decision', oauth2.decision);
app.post('/oauth/token', oauth2.token);

// ----------------------------------------------------------------------------
// Accept WebSocket Connection
// ----------------------------------------------------------------------------
function authorize(
  request: http.IncomingMessage,
  socket: net.Socket,
  head: Buffer,
  callback: (err: null, client: net.Socket) => void
) {
  const err = null; // TODO: authorization here
  callback(err, socket);
}

const wsLogger = log4js.getLogger('ws');
server.on('upgrade', (request, socket, head) => {
  wsLogger.debug(`upgrade from ${socket.remoteAddress}`);
  authorize(request, socket, head, (err, client) => {
    if (err || !client) {
      wsLogger.warn('unauthorized');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    apps.wss.handleUpgrade(request, socket, head, (ws, request) => {
      apps.wss.emit('connection', ws, request, client);
    });
  });
});

// ----------------------------------------------------------------------------
// Run Server
// ----------------------------------------------------------------------------
server.listen(PORT, () =>
  log4js.getLogger().info(`Listening to port ${PORT}...`)
);

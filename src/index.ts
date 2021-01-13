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
import * as connectPgSimple from 'connect-pg-simple';
const pgSession = connectPgSimple(expressSession);

// Project Modules
import {getSessionSecret} from './util';
import * as db from './db';

// Routes & Sub-Apps
import * as siteRoutes from './routes/site';
import * as oauth2Routes from './routes/oauth2';
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
app.set('x-powered-by', false);

// ----------------------------------------------------------------------------
// Express.js Middlewares
// ----------------------------------------------------------------------------
app.use(express.urlencoded({extended: false}));
app.use(express.json());
log4js.getLogger().debug(`using DATABASE_URL ${process.env.DATABASE_URL}`);
app.use(
  expressSession({
    store: new pgSession({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        // https://devcenter.heroku.com/articles/heroku-postgresql#connecting-in-node-js
        // Heroku seems to use self-signed cert
        ssl: {rejectUnauthorized: false},
      },
    }),
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 60 * 60 * 1000 /* 1h */},
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

app.get('/', siteRoutes.index);
app.get('/login', siteRoutes.loginForm);
app.post('/login', siteRoutes.login);
app.get('/logout', siteRoutes.logout);
app.get('/account', siteRoutes.account);

app.get('/dialog/authorize', oauth2Routes.authorization);
app.post('/dialog/authorize/decision', oauth2Routes.decision);
app.post('/oauth/token', oauth2Routes.token);

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
db.init()
  .then(sequelize => sequelize.sync())
  .then(() =>
    server.listen(PORT, () =>
      log4js.getLogger('http').info(`Listening to port ${PORT}...`)
    )
  );

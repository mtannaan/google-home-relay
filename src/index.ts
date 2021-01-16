// dotenv.config needs to be called first
import * as dotenv from 'dotenv';
dotenv.config();

// Initialize log4js
import {log4js, customConnectLogger} from './log';

// Standard library
import * as http from 'http';

// Third party modules
import * as express from 'express';
import * as expressSession from 'express-session';
import * as ejsLayouts from 'express-ejs-layouts';
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
app.use(ejsLayouts);

// Passport configuration
import './auth';

// ----------------------------------------------------------------------------
// Express.js routes
// ----------------------------------------------------------------------------
app.get('/ping', (req, res) => {
  res.send('pong');
});

app.post('/fulfillment', [
  passport.authenticate('bearer', {session: false, scope: 'smart-home-api'}),
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

const wsLogger = log4js.getLogger('ws');
server.on('upgrade', (req, socket, head) => {
  wsLogger.debug(`upgrade from ${socket.remoteAddress}`);

  let token: string | null = null;
  if (req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2) {
      const scheme = parts[0],
        credentials = parts[1];

      if (/^Bearer$/i.test(scheme)) {
        token = credentials;
      }
    }
  }

  db.accessTokens.find(token || '#nonsense#', (err, tokenInfo) => {
    if (err || !tokenInfo) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    db.scopes
      .findByUserAndClient(tokenInfo.userId, tokenInfo.clientId)
      .then(scopes => {
        if (
          !scopes ||
          (!scopes.includes('*') && !scopes.includes('device-manager'))
        ) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        apps.wss.handleUpgrade(req, socket, head, (ws, request) => {
          apps.wss.emit('connection', ws, request, socket);
        });
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

import {env} from 'process';
import * as util from 'util';

import * as express from 'express';

import {app as authProviderApp} from './auth-provider';
import {app as smartHomeApp} from './fulfillment';

const PORT = env.PORT || 3000;

const app = express();

// Middlewares
app.use(express.urlencoded({extended: true}));
app.use(express.json());

if (env.DEBUG) {
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

// Run
console.log(`Listening to port ${PORT}...`);
app.listen(PORT);

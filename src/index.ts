import {env} from 'process';

import * as express from 'express';

import {smartHomeApp} from './fulfillment';

const PORT = env.PORT || 3000;

const app = express();
app.use('/fulfillment', express.json());

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.post('/fulfillment', smartHomeApp);

console.log(`Listening to port ${PORT}...`);
app.listen(PORT);

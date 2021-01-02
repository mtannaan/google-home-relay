import * as express from 'express';
import {env} from 'process';
const PORT = env.PORT || 3000;

const app = express();
app.get('/ping', (req, res) => {
  res.send('pong');
});
console.log(`Listening to port ${PORT}...`);
app.listen(PORT);

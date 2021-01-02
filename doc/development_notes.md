# Development Notes (Internal)

- [x] Express.js w/ TypeScript
- [x] Deploy to Heroku
- [x] Add OAuth (toy)
- [ ] Add dummy fulfillment
- [ ] Add relay
- [ ] Add OAuth (secure)

## Create Project

```sh
$ npm init
```

## Use TypeScript

https://github.com/actions-on-google/smart-home-nodejs/blob/master/package.json

```sh
$ npm install --save-dev typescript gts
```

https://github.com/google/gts

```sh
$ npx gts init
```

## Simple Express.js Web App

```sh
$ npm install express
$ npm install --save-dev @types/express
```

index.ts -->

```typescript
import * as express from 'express';
import {env} from 'process';
const PORT = env.PORT || 3000;

const app = express();
app.get('/ping', (req, res) => {
  res.send('pong');
});
console.log(`Listening to port ${PORT}...`);
app.listen(PORT);
```

## Install actions-on-google

https://www.npmjs.com/package/actions-on-google#self-hosted-express-server

```sh
$ npm install actions-on-google
```

When installing, following vulnerabilities were found, and `npm audit fix` did not work, saying `3 vulnerabilities require manual review`.

- axios: Critical security vulnerability fixed in v0.21.1
- node-forge: high severity vulnerabilities

To solve this, I used [npm-force-resolutions](https://www.npmjs.com/package/npm-force-resolutions#how-to-use).

## Fake OAuth authorization

Update https://github.com/actions-on-google/smart-home-nodejs/blob/450b3216e0630373afdbc036230c2086c96f64e9/src/auth-provider.ts to fit express.js (3ff5fad64504b47e6fd35ea287e785bb446967de)

## Deploy to Heroku

```sh
$ heroku create
```

Add /Procfile:

```
web: node build/index.js
```

Deploy with

```sh
$ git push heroku main
```

View real-time logs with

```sh
$ heroku logs --tail
```

Scale down/up with

```sh
$ heroku ps:scale web=0
$ heroku ps:scale web=1
```


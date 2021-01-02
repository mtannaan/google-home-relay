# Development Notes (Internal)

- [x] Express.js w/ TypeScript
- [ ] Add OAuth
- [ ] Add dummy fulfillment
- [ ] Add relay

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
import * as express from "express";
import { env } from "process";
const PORT = env.PORT || 3000;

const app = express();
app.get('/ping', (req, res) => { res.send('pong'); });
console.log(`Listening to port ${PORT}...`);
app.listen(PORT);
```

## Plug in Smart Home App

### Install actions-on-google

https://www.npmjs.com/package/actions-on-google#self-hosted-express-server

```sh
$ npm install actions-on-google
```

When installing, following vulnerabilities were found, and `npm audit fix` did not work, saying `3 vulnerabilities require manual review`.

- axios: Critical security vulnerability fixed in v0.21.1
- node-forge: high severity vulnerabilities

To solve this, I used [npm-force-resolutions](https://www.npmjs.com/package/npm-force-resolutions#how-to-use).


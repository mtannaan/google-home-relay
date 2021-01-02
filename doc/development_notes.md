# Development Notes (Internal)
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


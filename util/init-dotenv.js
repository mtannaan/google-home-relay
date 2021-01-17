/**
 * Generate .env file containing some random secrets
 */

const fs = require('fs');
const nanoid = require('nanoid').nanoid;
const bcrypt = require('bcryptjs');

const params = {
  SESSION_SECRET: nanoid(24),
  postgresPW: nanoid(24),
  TOKEN_SALT: null,
  jwtHex: null,
};

fs.promises
  .readdir('jwt')
  .catch(err => {
    if (err.code === 'ENOENT') {
      console.error('ERROR: Place a .json file in jwt directory.\n');
    }
    throw err;
  })
  .then(files => {
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    if (!jsonFiles || jsonFiles.length === 0) {
      throw new Error('No .json file found in jwt directory.');
    } else if (jsonFiles.length > 1) {
      throw new Error(
        'Multiple .json files found in jwt directory. Expect only one.'
      );
    }
    const jsonFile = jsonFiles[0];
    return fs.promises.readFile(`jwt/${jsonFile}`);
  })
  .then(jwtBuffer => {
    params.jwtHex = jwtBuffer.toString('hex');
    return bcrypt.genSalt(10);
  })
  .then(salt => {
    params.TOKEN_SALT = salt;
    return fs.promises.readFile('dotenv-template');
  })
  .then(buf => {
    const dotenvTemplate = buf.toString();
    const newDotEnv = dotenvTemplate
      .replace(/^SESSION_SECRET=.*/m, `SESSION_SECRET=${params.SESSION_SECRET}`)
      .replace(/^TOKEN_SALT=.*/m, `TOKEN_SALT=${params.TOKEN_SALT}`)
      .replace(/^TOKEN_CREATOR_JWT=.*/m, `TOKEN_CREATOR_JWT=${params.jwtHex}`)
      .replace(
        /^DATABASE_URL=postgres:\/\/postgres:pw@/m,
        `DATABASE_URL=postgres://postgres:${params.postgresPW}@`
      );
    return fs.promises.writeFile('.env', newDotEnv, {flag: 'wx'});
  })
  .then(() => {
    console.log('Generated .env file.');
  });

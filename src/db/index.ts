import * as log4js from 'log4js';
import {Sequelize} from 'sequelize';

const logger = log4js.getLogger('db');

const sequelize = new Sequelize(process.env.DATABASE_URL as string, {
  ssl: true,
  dialectOptions: {ssl: {rejectUnauthorized: false}},
  logging: (sql, _timing) => logger.debug(sql),
});

// const setupArgs = {sequelize, logger, DataTypes};

//import * as users_ from './users';
//export const users = users_.init(sequelize);
import * as users from './users';
users.init(sequelize);

import * as clients from './clients';
import * as accessTokens from './access_tokens';
import * as refreshTokens from './refresh_tokens';
import * as authorizationCodes from './authorization_codes';

export {
  users,
  clients,
  accessTokens,
  authorizationCodes,
  refreshTokens,
  sequelize,
};

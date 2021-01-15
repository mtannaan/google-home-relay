import * as log4js from 'log4js';
import {Sequelize} from 'sequelize';

import * as users from './users';
import * as clients from './clients';
import * as accessTokens from './access_tokens';
import * as refreshTokens from './refresh_tokens';
import * as authorizationCodes from './authorization_codes';

const init = async () =>
  new Promise<Sequelize>(resolve => {
    const logger = log4js.getLogger('db');
    logger.debug('db.init called');

    const sequelize = new Sequelize(process.env.DATABASE_URL as string, {
      ssl: true,
      dialectOptions: {ssl: {rejectUnauthorized: false}},
      logging: (sql, _timing) => logger.debug(sql),
    });

    logger.debug('init models start');
    [users, clients, refreshTokens, accessTokens].forEach(m =>
      m.init(sequelize)
    );
    logger.debug('init models end');

    resolve(sequelize);
  });

export {tokenLifetimeInSeconds} from './util';
export {users, clients, accessTokens, authorizationCodes, refreshTokens, init};

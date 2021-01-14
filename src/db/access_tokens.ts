import {Sequelize, Model, DataTypes, Op} from 'sequelize';
import * as log4js from 'log4js';

import {inspect} from '../util';

const tokenLifetime = 3 * 24 * 60 * 60 * 1000;
const logger = log4js.getLogger('db');

export class AccessToken extends Model {
  token!: string;
  userId!: number | null;
  clientId!: string;
  expiresAt!: Date;
}

export function init(sequelize: Sequelize) {
  AccessToken.init(
    {
      token: {
        type: DataTypes.STRING(256),
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      clientId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'access_tokens',
    }
  );
  setInterval(removeExpiredTokens, tokenLifetime);
}

function removeExpiredTokens() {
  logger.debug('access_tokens.removeExpiredTokens called');
  AccessToken.destroy({where: {expiresAt: {[Op.gt]: new Date()}}})
    .then(n => logger.debug(`${n} tokens removed.`))
    .catch(err => {
      logger.error(inspect(err));
    });
}

export function find(
  key: string,
  done: (err: Error | null, tokenInfo?: AccessToken) => void
) {
  logger.debug('access_tokens.find called:', key);
  AccessToken.findOne({where: {token: key}}).then(tokenInfo => {
    if (!tokenInfo) {
      logger.warn('access token not found');
      return done(new Error('access token not found'));
    }
    done(null, tokenInfo);
  });
}

export function findByUserIdAndClientId(
  userId: number | null,
  clientId: string,
  done: (err: Error | null, tokenInfo?: AccessToken) => void
) {
  logger.debug(
    `access_tokens.findByUserIdAndClientId called for user id ${userId} and clientId ${clientId}`
  );
  AccessToken.findOne({where: {userId, clientId}}).then(tokenInfo => {
    if (!tokenInfo) {
      logger.warn('access token not found');
      return done(new Error('access token not found'));
    }
    done(null, tokenInfo);
  });
}

export function save(
  token: string,
  userId: number | null,
  clientId: string,
  done: (err: Error | null) => void
) {
  logger.debug(
    `access_tokens.save called for user id ${userId} and clientId ${clientId}`
  );
  const expiresAt = new Date(Date.now() + tokenLifetime);
  AccessToken.create({token, userId, clientId, expiresAt})
    .then(() => done(null))
    .catch(err => {
      logger.error(`error creating access token: ${inspect(err)}`);
      done(err);
    });
}

export function removeByUserIdAndClientId(
  userId: number | null,
  clientId: string,
  done: (err: Error | null) => void
) {
  logger.debug(
    `access_tokens.removeByUserIdAndClientId called for user id ${userId} and clientId ${clientId}`
  );
  AccessToken.destroy({where: {userId, clientId}})
    .then(() => done(null))
    .catch(err => {
      logger.error(`error deleting access token: ${inspect(err)}`);
      done(err);
    });
}

import {Sequelize, Model, DataTypes, Op} from 'sequelize';
import * as log4js from 'log4js';

import {inspect} from '../util';

const tokenLifetime = 3 * 24 * 60 * 60 * 1000;
const logger = log4js.getLogger('db');

export class RefreshToken extends Model {
  token!: string;
  userId!: number | null;
  clientId!: string;
  expiresAt!: Date;
}

export function init(sequelize: Sequelize) {
  RefreshToken.init(
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
      tableName: 'refresh_tokens',
    }
  );
  setInterval(removeExpiredTokens, tokenLifetime);
}

function removeExpiredTokens() {
  logger.debug('refresh_tokens.removeExpiredTokens called');
  RefreshToken.destroy({where: {expiresAt: {[Op.gt]: new Date()}}})
    .then(n => logger.debug(`${n} tokens removed.`))
    .catch(err => {
      logger.error(inspect(err));
    });
}

export function find(
  key: string,
  done: (err: Error | null, tokenInfo?: RefreshToken) => void
) {
  logger.debug('refresh_tokens.find called:', key);
  RefreshToken.findOne({where: {token: key}}).then(tokenInfo => {
    if (!tokenInfo) {
      logger.warn('refresh token not found');
      return done(new Error('refresh token not found'));
    }
    done(null, tokenInfo);
  });
}

export function findByUserIdAndClientId(
  userId: number | null,
  clientId: string,
  done: (err: Error | null, tokenInfo?: RefreshToken) => void
) {
  logger.debug(
    `refresh_tokens.findByUserIdAndClientId called for user id ${userId} and clientId ${clientId}`
  );
  RefreshToken.findOne({where: {userId, clientId}}).then(tokenInfo => {
    if (!tokenInfo) {
      logger.warn('refresh token not found');
      return done(new Error('refresh token not found'));
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
    `refresh_tokens.save called for user id ${userId} and clientId ${clientId}`
  );
  const expiresAt = new Date(Date.now() + tokenLifetime);
  RefreshToken.create({token, userId, clientId, expiresAt})
    .then(() => done(null))
    .catch(err => {
      logger.error(`error creating refresh token: ${inspect(err)}`);
      done(err);
    });
}

export function removeByUserIdAndClientId(
  userId: number | null,
  clientId: string,
  done: (err: Error | null) => void
) {
  logger.debug(
    `refresh_tokens.removeByUserIdAndClientId called for user id ${userId} and clientId ${clientId}`
  );
  RefreshToken.destroy({where: {userId, clientId}})
    .then(() => done(null))
    .catch(err => {
      logger.error(`error deleting refresh token: ${inspect(err)}`);
      done(err);
    });
}

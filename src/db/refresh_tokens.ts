import {Sequelize} from 'sequelize';

import {inspect} from '../util';
import {
  tokenLifetimeInSeconds,
  logger,
  removeExpiredTokens,
  tokenInitObj,
  TokenBase,
} from './util';

export class RefreshToken extends TokenBase {}

export function init(sequelize: Sequelize) {
  RefreshToken.init(tokenInitObj, {
    sequelize,
    tableName: 'refresh_tokens',
  });
  setInterval(removeExpiredTokens, tokenLifetimeInSeconds * 1000, RefreshToken);
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
  const expiresAt = new Date(Date.now() + tokenLifetimeInSeconds * 1000);
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

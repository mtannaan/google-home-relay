import {Sequelize} from 'sequelize';

import {inspect} from '../util';
import {
  tokenLifetimeInSeconds,
  logger,
  removeExpiredTokens,
  tokenInitObj,
  TokenBase,
} from './util';

export class AccessToken extends TokenBase {}

export function init(sequelize: Sequelize) {
  AccessToken.init(tokenInitObj, {
    sequelize,
    tableName: 'access_tokens',
  });
  setInterval(removeExpiredTokens, tokenLifetimeInSeconds * 1000, AccessToken);
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
  const expiresAt = new Date(Date.now() + tokenLifetimeInSeconds * 1000);
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

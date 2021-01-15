import {Sequelize, Op} from 'sequelize';
import * as bcrypt from 'bcryptjs';

import {inspect} from '../util';
import {
  logger,
  removeExpiredTokens,
  tokenInitObj,
  TokenBase,
  tokenSalt,
} from './util';

const refreshTokenLifetime = 100 * 24 * 60 * 60 * 1000;
const refreshTokenPruningInterval = 1 * 60 * 60 * 1000;

export class RefreshToken extends TokenBase {}

export function init(sequelize: Sequelize) {
  RefreshToken.init(tokenInitObj, {
    sequelize,
    tableName: 'refresh_tokens',
  });
  setInterval(removeExpiredTokens, refreshTokenPruningInterval, RefreshToken);
}

export function find(
  key: string,
  done: (err: Error | null, tokenInfo?: RefreshToken) => void
) {
  logger.debug('refresh_tokens.find called:', key);
  bcrypt
    .hash(key, tokenSalt)
    .then(hash =>
      RefreshToken.findOne({
        where: {token: hash, expiresAt: {[Op.gt]: new Date()}},
      })
    )
    .then(tokenInfo => {
      if (!tokenInfo) {
        logger.warn('refresh token not found');
        return done(new Error('refresh token not found'));
      }
      done(null, tokenInfo);
    });
}

export async function save(
  token: string,
  userId: number | null,
  clientId: string
) {
  logger.debug(
    `refresh_tokens.save called for user id ${userId} and clientId ${clientId}`
  );
  const expiresAt = new Date(Date.now() + refreshTokenLifetime);
  const hash = await bcrypt.hash(token, tokenSalt);
  return await RefreshToken.create({token: hash, userId, clientId, expiresAt});
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

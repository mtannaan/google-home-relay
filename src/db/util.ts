import * as log4js from 'log4js';
import {Model, Op} from 'sequelize';

import {inspect} from '../util';
export const logger = log4js.getLogger('db');

export const tokenLifetimeInSeconds = 60 * 60; // 1h

export const tokenSalt = process.env.TOKEN_SALT as string;
if (!tokenSalt) {
  throw new Error('TOKEN_SALT is not specified');
}

export class TokenBase extends Model {
  id!: number;
  token!: string;
  userId!: number | null;
  clientId!: string;
  expiresAt!: Date;
}

export function removeExpiredTokens(TokenType: typeof TokenBase) {
  logger.debug(`removeExpiredTokens called for ${TokenType}`);
  TokenType.destroy({where: {expiresAt: {[Op.gt]: new Date()}}})
    .then(n => logger.debug(`${n} tokens removed.`))
    .catch(err => {
      logger.error(inspect(err));
    });
}

import * as log4js from 'log4js';
import {Model, DataTypes, Op} from 'sequelize';

import {inspect} from '../util';
export const logger = log4js.getLogger('db');

export const tokenLifetimeInSeconds = 60 * 60; // 1h

export class TokenBase extends Model {
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

export const tokenInitObj = {
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
};
import {Sequelize, Op, DataTypes} from 'sequelize';
import * as bcrypt from 'bcryptjs';

import {inspect} from '../util';
import {
  tokenLifetimeInSeconds,
  logger,
  removeExpiredTokens,
  TokenBase,
  tokenSalt,
} from './util';

// foreign keys
import {User} from './users';
import {Client} from './clients';

export class AccessToken extends TokenBase {}

export function init(sequelize: Sequelize) {
  AccessToken.init(
    {
      token: {type: DataTypes.STRING(256), allowNull: false},
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {model: User, key: 'id'},
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      clientId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {model: Client, key: 'clientId'},
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
  setInterval(removeExpiredTokens, tokenLifetimeInSeconds * 1000, AccessToken);
}

export function find(
  key: string,
  done: (err: Error | null, tokenInfo?: AccessToken) => void
) {
  logger.debug('access_tokens.find called:', key);
  bcrypt
    .hash(key, tokenSalt)
    .then(hash =>
      AccessToken.findOne({
        where: {token: hash, expiresAt: {[Op.gt]: new Date()}},
      })
    )
    .then(tokenInfo => {
      if (!tokenInfo) {
        logger.warn('access token not found');
        return done(new Error('access token not found'));
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
    `access_tokens.save called for user id ${userId} and clientId ${clientId}`
  );
  const expiresAt = new Date(Date.now() + tokenLifetimeInSeconds * 1000);
  const hash = await bcrypt.hash(token, tokenSalt);
  return await AccessToken.create({token: hash, userId, clientId, expiresAt});
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

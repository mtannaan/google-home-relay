import {Sequelize, Op, DataTypes} from 'sequelize';
import * as bcrypt from 'bcryptjs';

import {inspect} from '../util';
import {logger, removeExpiredTokens, TokenBase, tokenSalt} from './util';

// foreign keys
import {User} from './users';
import {Client} from './clients';

const refreshTokenLifetime = 100 * 24 * 60 * 60 * 1000;
const refreshTokenPruningInterval = 1 * 60 * 60 * 1000;

export class RefreshToken extends TokenBase {}

export function init(sequelize: Sequelize) {
  RefreshToken.init(
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
      tableName: 'refresh_tokens',
    }
  );
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

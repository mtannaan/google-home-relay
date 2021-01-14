import {Sequelize, Model, DataTypes} from 'sequelize';
import * as log4js from 'log4js';

import {inspect} from '../util';

const logger = log4js.getLogger('db');

/**
 * user model.
 *
 * Example user creation sql:
 * ```sql
 *  insert into
 *  users(username, password, name, "createdAt", "updatedAt")
 *  values ('yourusername', '%YOUR_PASSWORD_HASH%', 'readable user name', now(), now());
 * ```
 */
export class User extends Model {
  id!: number;
  username!: string;
  /**
   * password hashed by bcrypt.hashSync
   */
  password!: string;
  name!: string;
}

export function init(sequelize: Sequelize) {
  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      password: {type: DataTypes.STRING, allowNull: false},
      name: {type: DataTypes.STRING, allowNull: false},
    },
    {
      sequelize,
      tableName: 'users',
    }
  );
}

export function findById(
  id: number | null,
  done: (err: Error | null, user?: User) => void
) {
  if (id === null) {
    return done(new Error('User ID is null'));
  }
  User.findByPk(id)
    .then(user => {
      if (user === null) {
        throw new Error('User ID not found');
      }
      logger.debug('user id found', inspect(user?.get()));
      return done(null, user);
    })
    .catch(err => {
      logger.error('error:', inspect(err));
      return done(err);
    });
}
export function findByUsername(
  username: string,
  done: (err: Error | null, user?: User) => void
) {
  logger.debug('findByUsername called with', username);
  User.findOne({where: {username}})
    .then(user => {
      if (user === null) {
        throw new Error('username not found');
      }
      logger.debug('username found', inspect(user?.get()));
      return done(null, user);
    })
    .catch(err => {
      logger.error('error:', inspect(err));
      return done(err);
    });
}

import {DataTypes, Sequelize} from 'sequelize';
import * as log4js from 'log4js';

import {inspect} from '../util';

const logger = log4js.getLogger('db');

const sequelize = new Sequelize(process.env.DATABASE_URL as string, {
  ssl: true,
  dialectOptions: {ssl: {rejectUnauthorized: false}},
  logging: (sql, _timing) => logger.debug(sql),
});

/**
 * user model.
 *
 * Example user creation sql:
 * ```sql
 *  insert into
 *  "user"(username, password, name, "createdAt", "updatedAt")
 *  values ('yourusername', '%YOUR_PASSWORD_HASH%', 'readable user name', now(), now());
 * ```
 */
const User = sequelize.define(
  'user',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
    },
    /**
     * password hashed by bcrypt.hashSync
     */
    password: DataTypes.STRING,
    name: DataTypes.STRING,
  },
  {
    freezeTableName: true, // Model tableName will be the same as the model name
  }
);

sequelize.sync({alter: true});

module.exports.findById = (id: string, done: Function) => {
  User.findByPk(id)
    .then(user => {
      logger.debug('user id found', inspect(user?.get()));
      return done(null, user);
    })
    .catch(err => {
      logger.error('error:', inspect(err));
      return done(new Error('User Not Found'));
    });
};

module.exports.findByUsername = (username: string, done: Function) => {
  logger.debug('findByUsername called with', username);
  User.findOne({where: {username}})
    .then(user => {
      logger.debug('username found', inspect(user?.get()));
      return done(null, user);
    })
    .catch(err => {
      logger.error('error:', inspect(err));
      return done(err);
    });
};

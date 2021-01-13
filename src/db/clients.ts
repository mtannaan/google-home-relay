import {Sequelize, Model, DataTypes} from 'sequelize';
import * as log4js from 'log4js';

import {inspect} from '../util';

const logger = log4js.getLogger('db');

/**
 * client model.
 *
 * Example client creation sql:
 * ```sql
 *  insert into
 *  clients ("clientId", "clientSecret", name, "isTrusted", "createdAt", "updatedAt")
 *  values ('yourclientname', '%YOUR_PASSWORD_HASH%', 'readable client name', FALSE, now(), now());
 * ```
 */
export class Client extends Model {
  id!: number;
  clientId!: string;
  clientSecret!: string;
  name!: string;
  /**
   * if true, skip user permission
   */
  isTrusted!: boolean;
}

export function init(sequelize: Sequelize) {
  Client.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      clientId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      /**
       * clientSecret hashed by bcrypt.hashSync
       */
      clientSecret: {type: DataTypes.STRING, allowNull: false},
      name: {type: DataTypes.STRING, allowNull: false},
      isTrusted: {type: DataTypes.BOOLEAN, allowNull: false},
    },
    {
      sequelize,
      tableName: 'clients',
    }
  );
}

export function findById(
  id: number,
  done: (err: Error | null, client?: Client) => void
) {
  Client.findByPk(id)
    .then(client => {
      if (client === null) {
        throw new Error('client ID not found');
      }
      logger.debug('client id found', inspect(client?.get()));
      return done(null, client);
    })
    .catch(err => {
      logger.error('error:', inspect(err));
      return done(err);
    });
}

export function findByClientId(
  clientId: string,
  done: (err: Error | null, client?: Client) => void
) {
  logger.debug('findByClientId called with', clientId);
  Client.findOne({where: {clientId}})
    .then(client => {
      if (client === null) {
        throw new Error('clientId not found');
      }
      logger.debug('clientId found', inspect(client?.get()));
      return done(null, client);
    })
    .catch(err => {
      logger.error('error:', inspect(err));
      return done(err);
    });
}

/*

('use strict');

const clients = [
  {
    id: '1',
    name: 'Samplr',
    clientId: 'ididid',
    clientSecret: 'sec12341234',
    isTrusted: false,
  },
  {
    id: '2',
    name: 'Samplr2',
    clientId: 'xyz123',
    clientSecret: 'ssh-password',
    isTrusted: true,
  },
];

module.exports.findById = (id, done) => {
  for (let i = 0, len = clients.length; i < len; i++) {
    if (clients[i].id === id) return done(null, clients[i]);
  }
  return done(new Error('Client Not Found'));
};

module.exports.findByClientId = (clientId, done) => {
  for (let i = 0, len = clients.length; i < len; i++) {
    if (clients[i].clientId === clientId) return done(null, clients[i]);
  }
  return done(new Error('Client Not Found'));
};
*/

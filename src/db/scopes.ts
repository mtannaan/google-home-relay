import {Sequelize, Model, DataTypes} from 'sequelize';
import * as log4js from 'log4js';

// foreign keys
import {User} from './users';
import {Client} from './clients';

const logger = log4js.getLogger('db');

/**
 * scope model.
 *
 * Example user creation sql:
 * ```sql
 *  insert into
 *  scopes("userId", "clientId", scopes, "createdAt", "updatedAt")
 *  values (%id%, '%clientId%', '%scope-name%', now(), now());
 * ```
 */
export class Scope extends Model {
  userId!: number | null;
  clientId!: string;
  scopes!: string;
}

export function init(sequelize: Sequelize) {
  Scope.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {model: User, key: 'id'},
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        unique: 'userAndClient',
      },
      clientId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {model: Client, key: 'clientId'},
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        unique: 'userAndClient',
      },
      scopes: {type: DataTypes.STRING, allowNull: false},
    },
    {
      sequelize,
      tableName: 'scopes',
    }
  );
}

export async function findByUserAndClient(
  userId: number | null,
  clientId: string
) {
  logger.debug(
    `scopes.findByUserAndClient called with userId ${userId} and clientId ${clientId}`
  );
  const scopeInfo = await Scope.findOne({where: {userId, clientId}});
  if (!scopeInfo) {
    logger.warn(
      `no scope found with userId ${userId} and clientId ${clientId}`
    );
    return null;
  }
  return scopeInfo.scopes.split(' ');
}

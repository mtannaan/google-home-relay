import {Sequelize, Model, DataTypes} from 'sequelize';
import * as log4js from 'log4js';
import {SmartHomeV1SyncDevices} from 'actions-on-google';

const logger = log4js.getLogger('db');

export class DeviceSet extends Model {
  deviceSetId!: string;
  deviceDefinitions!: SmartHomeV1SyncDevices[];
}

export function init(sequelize: Sequelize) {
  DeviceSet.init(
    {
      deviceSetId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      deviceDefinitions: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'device_sets',
    }
  );
}

export async function findByDeviceSetId(deviceSetId: string) {
  logger.debug(
    `device_sets.findByDeviceSetId called with deviceSetId ${deviceSetId}`
  );
  const deviceSet = await DeviceSet.findOne({where: {deviceSetId}});
  if (!deviceSet) {
    logger.warn(`no device set found with deviceSetId ${deviceSetId}`);
    return null;
  }
  return deviceSet;
}

export async function getAllDeviceSets() {
  logger.debug('device_sets.getAllDeviceSets called');
  return await DeviceSet.findAll();
}

export async function addMod(
  deviceSetId: string,
  deviceDefinitions: SmartHomeV1SyncDevices[]
) {
  await DeviceSet.upsert({deviceSetId, deviceDefinitions});
}

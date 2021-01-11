import * as WebSocket from 'ws';
import * as log4js from 'log4js';
import {SmartHomeV1SyncDevices} from 'actions-on-google';

import {smartHomeIface} from '../services';
import {inspect} from '../util';

type DeviceSetId = string;

type DeviceSet = {
  deviceDefinitions: SmartHomeV1SyncDevices[];
  lastRegistration: number;
  connection: WebSocket;
};

const logger = log4js.getLogger('device-mgr');

export class DeviceManager {
  private static _singleton: DeviceManager;
  deviceSets: Map<DeviceSetId, DeviceSet>;
  connectionToDeviceSet: Map<WebSocket, DeviceSetId>;

  private constructor() {
    this.deviceSets = new Map();
    this.connectionToDeviceSet = new Map();
  }

  static get instance() {
    if (!this._singleton) {
      this._singleton = new DeviceManager();
    }
    return this._singleton;
  }

  getDeviceDefinitions(): SmartHomeV1SyncDevices[] {
    const devsets = [...this.deviceSets.values()];
    const ret = devsets.reduce(
      (acc, devset) => acc.concat(devset.deviceDefinitions),
      [] as SmartHomeV1SyncDevices[]
    );
    logger.debug(`getDeviceDefinitions return ${inspect(ret)}`);
    return ret;
  }

  addMod(
    connection: WebSocket,
    deviceSetId: string,
    deviceDefinitions: SmartHomeV1SyncDevices[]
  ) {
    if (this.deviceSets.has(deviceSetId)) {
      logger.debug(
        `update devset ${deviceSetId}: ${deviceDefinitions.map(d => d.id)}`
      );
    } else {
      logger.debug(
        `create devset ${deviceSetId}: ${deviceDefinitions.map(d => d.id)}`
      );
    }

    this.deviceSets.set(deviceSetId, {
      deviceDefinitions,
      connection,
      lastRegistration: new Date().getTime(),
    });
    this.connectionToDeviceSet.set(connection, deviceSetId);
    smartHomeIface.requestSync();
  }

  remove(connection: WebSocket) {
    const maybeOldDevSetId = this.connectionToDeviceSet.get(connection);
    if (maybeOldDevSetId) {
      this.deviceSets.delete(maybeOldDevSetId);
    }
    this.connectionToDeviceSet.delete(connection);
  }

  getConnectionForDeviceId(deviceId: string) {
    const found = [...this.deviceSets.values()].find(deviceSet =>
      deviceSet.deviceDefinitions.some(def => def.id === deviceId)
    );
    return found?.connection;
  }
}

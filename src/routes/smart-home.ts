import * as log4js from 'log4js';
import {
  smarthome,
  SmartHomeV1ExecuteRequestExecution,
  SmartHomeV1ExecuteResponseCommands,
  SmartHomeV1QueryRequestDevices,
} from 'actions-on-google';

import {DeviceManager} from '../services';
// import {DeviceManager} from '../device/device-manager';
import {deviceIface} from '../services';
// import {sendExecuteMessage} from '../device/device-iface';
import {inspect} from '../util';

const agentUserId = 'user9999';

const jwt =
  typeof process.env.TOKEN_CREATOR_JWT === 'string'
    ? JSON.parse(Buffer.from(process.env.TOKEN_CREATOR_JWT, 'hex').toString())
    : null;

const logger = log4js.getLogger('smart-home');

export const app = smarthome({jwt});

// https://developers.google.com/assistant/smarthome/develop/process-intents#list-devices
// https://developers.google.com/assistant/smarthome/reference/intent/sync
app.onSync(body => {
  // TODO: get user ID from headers
  logger.debug('SYNC received');
  const deviceDefinitions = DeviceManager.instance.getDeviceDefinitions();
  logger.debug(
    `will return devices: ${inspect(deviceDefinitions.map(d => d.id))}`
  );
  return {
    requestId: body.requestId,
    payload: {
      agentUserId,
      devices: deviceDefinitions,
    },
  };
});

// https://developers.google.com/assistant/smarthome/develop/process-intents#queries-commands
// https://developers.google.com/assistant/smarthome/reference/intent/query
app.onQuery(body => {
  // TODO: get user ID from headers
  logger.debug('QUERY received');
  const ret = {
    requestId: body.requestId,
    payload: {
      devices: new Map(
        DeviceManager.instance.getDeviceDefinitions().map(def => [
          def.id,
          {
            online: DeviceManager.instance.isDeviceOnline(def.id),
            status: 'SUCCESS',
          },
        ])
      ),
    },
  };
  logger.debug(`will return: ${inspect(ret)}`);
  return ret;
});

app.onExecute(body => {
  logger.debug('EXECUTE received');
  const results: SmartHomeV1ExecuteResponseCommands[] = [];
  body.inputs.forEach(input => {
    input.payload.commands.forEach(command => {
      command.devices.forEach(device => {
        const result = handleExecutePerDevice(device, command.execution);
        results.push(result);
      });
    });
  });

  return {
    requestId: body.requestId,
    payload: {
      commands: results,
    },
  };
});

function handleExecutePerDevice(
  device: SmartHomeV1QueryRequestDevices,
  executions: SmartHomeV1ExecuteRequestExecution[]
): SmartHomeV1ExecuteResponseCommands {
  logger.debug(`handleExecutePerDevice: ${device.id}`);
  const conn = DeviceManager.instance.getConnectionForDeviceId(device.id);

  if (!conn) {
    return {ids: [device.id], status: 'OFFLINE'};
  }

  deviceIface.sendExecuteMessage(conn, device, executions);
  return {ids: [device.id], status: 'SUCCESS'};
}

export function requestSync() {
  if (process.env.LOCAL) {
    logger.info('env.LOCAL enabled. requestSync skipped.');
  } else {
    app.requestSync(agentUserId);
  }
}

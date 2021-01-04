import {
  smarthome,
  SmartHomeV1ExecuteRequestExecution,
  SmartHomeV1ExecuteResponseCommands,
  SmartHomeV1QueryRequestDevices,
} from 'actions-on-google';

import {DeviceManager} from './device-manager';
import {sendExecuteMessage} from './device-iface';
import {inspect} from './util';

const deviceManager = DeviceManager.instance;
const agentUserId = 'user9999';

const jwt =
  typeof process.env.TOKEN_CREATOR_JWT === 'string'
    ? JSON.parse(Buffer.from(process.env.TOKEN_CREATOR_JWT, 'hex').toString())
    : null;

export const app = smarthome({jwt});

// https://developers.google.com/assistant/smarthome/develop/process-intents#list-devices
// https://developers.google.com/assistant/smarthome/reference/intent/sync
app.onSync(body => {
  // TODO: get user ID from headers
  console.log('SYNC received');
  const deviceDefinitions = deviceManager.getDeviceDefinitions();
  console.log(
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
  return {
    requestId: body.requestId,
    payload: {
      devices: new Map(
        deviceManager
          .getDeviceDefinitions()
          .map(def => [def.id, {online: true, status: 'SUCCESS'}])
      ),
    },
  };
});

app.onExecute(body => {
  console.log('EXECUTE received');
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
  console.log(`handleExecutePerDevice: ${device.id}`);
  const conn = deviceManager.getConnectionForDeviceId(device.id);

  if (!conn) {
    return {ids: [device.id], status: 'OFFLINE'};
  }

  sendExecuteMessage(conn, device, executions);
  return {ids: [device.id], status: 'SUCCESS'};
}

export function requestSync() {
  if (process.env.LOCAL) {
    console.log('requestSync skipped');
  } else {
    app.requestSync(agentUserId);
  }
}

import * as WebSocket from 'ws';
import * as log4js from 'log4js';
import {
  SmartHomeV1SyncDevices,
  SmartHomeV1QueryRequestDevices,
  SmartHomeV1ExecuteRequestExecution,
} from 'actions-on-google';

// import {DeviceManager} from './device-manager';
import {DeviceManager, smartHomeIface} from '../services';

const MilliSecInHour = 60 * 60 * 1000;
const RegistrationInterval = 12 * MilliSecInHour;
const GCMarginRatio = 0.1;

type RegisterMessage = {
  messageType: 'register';
  requestId: string;
  deviceSetId: string;
  deviceDefinitions: SmartHomeV1SyncDevices[];
};

type ExecuteMessage = {
  messageType: 'execute';
  requestId: string;
  device: SmartHomeV1QueryRequestDevices;
  executions: SmartHomeV1ExecuteRequestExecution[];
};

type ResponseMessage = {
  messageType: 'response';
  requestId: string;
  requestMessageType: string;
  success: boolean;
  diagnostics?: Object;
};

type Message = RegisterMessage | ExecuteMessage | ResponseMessage;

const deviceManager = DeviceManager.instance;
const logger = log4js.getLogger('device-iface');

export function handleDeviceMessage(socket: WebSocket, data: WebSocket.Data) {
  logger.debug(`recieved: ${data}`);
  const message: Message = JSON.parse(data.toString());
  switch (message.messageType) {
    case 'register':
      handleRegisterMessage(socket, message);
      break;

    case 'response':
      logger.debug(`response ${message}`);
      break;

    default:
      logger.error(`unknown ${message}`);
      break;
  }
}

function handleRegisterMessage(socket: WebSocket, message: RegisterMessage) {
  logger.info('register');
  deviceManager.addMod(socket, message.deviceSetId, message.deviceDefinitions);
  sendResponseMessage(socket, message, true);
}

function sendResponseMessage(
  socket: WebSocket,
  requestMessage: Message,
  success: boolean,
  diagnostics?: Object
) {
  const payload: ResponseMessage = {
    messageType: 'response',
    requestId: requestMessage.requestId,
    requestMessageType: requestMessage.messageType,
    success: success,
    diagnostics: diagnostics,
  };
  socket.send(JSON.stringify(payload));
}

export function sendExecuteMessage(
  socket: WebSocket,
  device: SmartHomeV1QueryRequestDevices,
  executions: SmartHomeV1ExecuteRequestExecution[]
) {
  const message: ExecuteMessage = {
    messageType: 'execute',
    requestId: Math.random().toString(),
    device,
    executions,
  };
  socket.send(JSON.stringify(message));
}

export function checkConnectionHealth(wss: WebSocket.Server) {
  let needsRequestSync = false;

  wss.clients.forEach(conn => {
    const devSetId = deviceManager.connectionToDeviceSet.get(conn);
    if (!devSetId) {
      return;
    }
    const devSet = deviceManager.deviceSets.get(devSetId);
    if (!devSet || !devSet.connection) {
      return;
    }
    if (
      new Date().getTime() - devSet.lastRegistration >
      RegistrationInterval * (1 - GCMarginRatio)
    ) {
      logger.debug(`checkConnectionHealth: ${conn.url}`);
      conn.terminate();
      deviceManager.setToOffline(conn);
      needsRequestSync = true;
    }
  });

  if (needsRequestSync) {
    smartHomeIface.requestSync();
  }
}

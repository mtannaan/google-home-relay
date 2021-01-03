import * as WebSocket from 'ws';
import {
  SmartHomeV1SyncDevices,
  SmartHomeV1QueryRequestDevices,
  SmartHomeV1ExecuteRequestExecution,
} from 'actions-on-google';

import {DeviceManager} from './device-manager';

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

export function handleDeviceMessage(socket: WebSocket, data: WebSocket.Data) {
  console.log(`recieved: ${data}`);
  const message: Message = JSON.parse(data.toString());
  switch (message.messageType) {
    case 'register':
      handleRegisterMessage(socket, message);
      break;

    case 'response':
      console.log(`response ${message}`);
      break;

    default:
      console.log(`unknown ${message}`);
      break;
  }
}

function handleRegisterMessage(socket: WebSocket, message: RegisterMessage) {
  console.log('register');
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

export function removeOldDevices(wss: WebSocket.Server) {
  wss.clients.forEach(conn => {
    const devSetId = deviceManager.connectionToDeviceSet.get(conn);
    if (!devSetId) {
      return;
    }
    const devSet = deviceManager.deviceSets.get(devSetId);
    if (!devSet) {
      return;
    }
    if (
      new Date().getTime() - devSet.lastRegistration >
      RegistrationInterval * (1 - GCMarginRatio)
    ) {
      console.log(`gc ${conn.url}`);
      conn.terminate();
      deviceManager.remove(conn);
    }
  });
}

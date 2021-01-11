import * as WebSocket from 'ws';
import * as log4js from 'log4js';
import {nanoid} from 'nanoid';

// import {handleDeviceMessage, removeOldDevices} from '../device/device-iface';
import {deviceIface} from '../services';

// ----------------------------------------------------------------------------
// Consts and globals
// ----------------------------------------------------------------------------
const wsPingInterval = 50 * 1000;
const deviceAutoRemoveInterval = 5 * 60 * 1000;
const logger = log4js.getLogger('ws');

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface WebSocketWithIsAlive extends WebSocket {
  isAlive: boolean;
  id: string;
}

// ----------------------------------------------------------------------------
// WebSocket connection from home devices
//
// https://devcenter.heroku.com/articles/node-websockets#option-1-websocket
// ----------------------------------------------------------------------------
export const wss = new WebSocket.Server({
  path: '/device-manager',
  noServer: true, // connections are initiated on http server "upgrade" event
});

// https://www.npmjs.com/package/ws#how-to-detect-and-close-broken-connections
const checkConnectivity = (conn: WebSocketWithIsAlive) => {
  if (!conn.isAlive) {
    logger.warn(`Terminating connection ${conn.id} due to isAlive = false.`);
    conn.terminate();
    return;
  }
  conn.isAlive = false;
  conn.ping(() => logger.debug(`ping has sent to connection ${conn.id}`));
};

wss.on('connection', (ws: WebSocketWithIsAlive, request) => {
  ws.isAlive = true;
  ws.id = nanoid(16);
  logger.info(
    `new connection ${ws.id} has been accepted from ${request.socket.remoteAddress}`
  );

  const intervalTimers: NodeJS.Timeout[] = [];
  intervalTimers.push(setInterval(checkConnectivity, wsPingInterval, ws));
  ws.on('pong', () => {
    logger.debug(`pong received from connection ${ws.id}`);
    ws.isAlive = true;
  })
    .on('message', data => deviceIface.handleDeviceMessage(ws, data))
    .on('close', () => {
      logger.debug(`Closing connection ${ws.id}`);
      while (Array.isArray(intervalTimers) && intervalTimers.length > 0) {
        clearInterval(intervalTimers.pop() as NodeJS.Timeout);
      }
    });
});

const autoRemoveTimer = setInterval(
  () => deviceIface.removeOldDevices(wss),
  deviceAutoRemoveInterval
);
wss.on('close', () => clearInterval(autoRemoveTimer));

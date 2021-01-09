import * as WebSocket from 'ws';

import {handleDeviceMessage, removeOldDevices} from '../device/device-iface';

// ----------------------------------------------------------------------------
// Consts and globals
// ----------------------------------------------------------------------------
const wsPingInterval = 50 * 1000;

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface WebSocketWithIsAlive extends WebSocket {
  isAlive: boolean;
}

// ----------------------------------------------------------------------------
// WebSocket connection from home devices
//
// https://devcenter.heroku.com/articles/node-websockets#option-1-websocket
// ----------------------------------------------------------------------------

export const wss = new WebSocket.Server({
  path: '/device-manager',
  noServer: true,
});

// https://www.npmjs.com/package/ws#how-to-detect-and-close-broken-connections
const checkConnectivity = (conn: WebSocketWithIsAlive) => {
  if (!conn.isAlive) {
    conn.terminate();
    return;
  }
  conn.isAlive = false;
  conn.ping();
};

wss.on('connection', (ws: WebSocketWithIsAlive, request) => {
  ws.isAlive = true;
  console.log(`new connection accepted from ${request.socket.remoteAddress}`);

  const intervalTimers = [];
  ws.on('open', () => {
    intervalTimers.push(setInterval(checkConnectivity, wsPingInterval, ws));
  })
    .on('pong', () => {
      ws.isAlive = true;
    })
    .on('message', data => handleDeviceMessage(ws, data));
});

const interval = setInterval(() => removeOldDevices(wss), 5 * 60 * 1000);
wss.on('close', () => clearInterval(interval));

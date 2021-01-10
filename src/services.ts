import * as smartHome from './routes/smart-home';
import {DeviceManager} from './device/device-manager';
import * as deviceIface from './device/device-iface';
import {wss} from './routes/websocket';

export const apps = {
  wss,
  smartHomeApp: smartHome.app,
};
export const smartHomeIface = {
  requestSync: smartHome.requestSync,
};
export {DeviceManager, deviceIface};

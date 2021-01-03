import {smarthome} from 'actions-on-google';

import {devices} from './devices';

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
  return {
    requestId: body.requestId,
    payload: {
      agentUserId,
      devices,
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
        devices.map(device => [device.id, {online: true, status: 'SUCCESS'}])
      ),
    },
  };
});

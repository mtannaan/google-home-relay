import {smarthome} from 'actions-on-google';

import {devices} from './devices';

const agentUserId = 'user9999';

const jwt =
  typeof process.env.TOKEN_CREATOR_JWT === 'string'
    ? JSON.parse(Buffer.from(process.env.TOKEN_CREATOR_JWT, 'hex').toString())
    : null;

export const app = smarthome({jwt});

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

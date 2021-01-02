import {smarthome} from 'actions-on-google';

const jwt =
  typeof process.env.TOKEN_CREATOR_JWT === 'string'
    ? JSON.parse(Buffer.from(process.env.TOKEN_CREATOR_JWT, 'hex').toString())
    : null;

export const app = smarthome({jwt});

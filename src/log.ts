import {Response} from 'express';
import * as log4js from 'log4js';

import {inspect} from './util';

const categories = [
  'default',
  'http',
  'ws',
  'device-iface',
  'device-mgr',
  'smart-home',
  'sequelize',
  'oauth2',
];
const defaultCategoryConfig = {appenders: ['default'], level: 'trace'};
const config = {
  appenders: {
    console: {type: 'console'},
    default: {
      type: 'logLevelFilter',
      appender: 'console',
      level: process.env.DEBUG ? 'debug' : 'info',
    },
  },
  categories: categories.reduce(
    (o, i) => ({...o, [i]: defaultCategoryConfig}),
    {}
  ),
};
log4js.configure(config);

log4js
  .getLogger()
  .info(
    `Initialized log4js config with default level ${config.appenders.default.level}`
  );

const customConnectLogger = log4js.connectLogger(log4js.getLogger('http'), {
  level: 'auto',
  format: (req, res, format) => {
    return format(
      `:remote-addr - ":method :url HTTP/:http-version" :status ${res.statusMessage} len=:content-length \n` +
        `REQUEST: ${formatRequest(req)}\n` +
        `RESPONSE HEADERS: ${formatResponse(res)}`
    );
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatRequest(req: any) {
  const logObj = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    params: req.params,
    query: req.query,
    body: req.body,
    session: req.session,
  };
  return inspect(logObj);
}

function formatResponse(res: Response) {
  return inspect(res.getHeaders());
}

export {log4js, customConnectLogger};

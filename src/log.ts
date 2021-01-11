import * as log4js from 'log4js';

const categories = [
  'default',
  'ws',
  'device-iface',
  'device-mgr',
  'smart-home',
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

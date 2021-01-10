import {RequestHandler} from 'express';

import {inspect} from '../util';

export const dumpRequestMW: RequestHandler = (req, _res, next) => {
  const logObj = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    params: req.params,
    query: req.query,
    body: req.body,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session: (req as any).session,
  };
  console.log('=== Request ===');
  console.log(inspect(logObj));
  next();
};

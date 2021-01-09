import {RequestHandler} from 'express';

import {inspect} from '../util';

export const dumpRequestMW: RequestHandler = (req, _res, next) => {
  const logObj = {
    headers: req.headers,
    url: req.url,
    method: req.method,
    params: req.params,
    query: req.query,
    body: req.body,
  };
  console.log(inspect(logObj));
  next();
};

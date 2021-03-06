/**
 * Misc functions etc.
 */

import * as util from 'util';

/**
 * Convert object into an console.log friendly form.
 * @param object Object to be inspected
 * @return console.log friendly string
 */
export function inspect(object: unknown) {
  return util.inspect(object, false, null, true);
}

export function getSessionSecret() {
  const envvar = process.env.SESSION_SECRET;
  if (typeof envvar !== 'string' || envvar.length < 16) {
    throw new Error(`invalid SESSION_SECRET: ${envvar}`);
  }
  return envvar.split(',');
}

// Originally from https://github.com/actions-on-google/smart-home-nodejs/blob/450b3216e0630373afdbc036230c2086c96f64e9/src/auth-provider.ts
// Under http://www.apache.org/licenses/LICENSE-2.0

/**
 * Dummy auth provider implementation.
 *
 * See:
 * https://developers.google.com/assistant/smarthome/develop/implement-oauth
 * for more details about implementing OAuth account linking.
 */
import * as util from 'util';

import * as express from 'express';

export const app = express();

app.get('/login', (req, res) => {
  res.send(`<html>
<body>
<form action="/login" method="post">
<input type="hidden" name="responseurl" value="${req.query.responseurl}" />
<button type="submit" style="font-size:14pt">Link this service to Google</button>
</form>
</body>
</html>
`);
});

app.post('/login', async (req, res) => {
  // Here, you should validate the user account.
  // In this sample, we do not do that.
  const responseurl = decodeURIComponent(req.body.responseurl as string);
  console.log(`Redirect to ${responseurl}`);
  return res.redirect(responseurl);
});

app.get('/fakeauth', async (req, res) => {
  const responseurl = util.format(
    '%s?code=%s&state=%s',
    decodeURIComponent(req.query.redirect_uri as string),
    'xxxxxx',
    req.query.state
  );
  console.log(`Set redirect as ${responseurl}`);
  return res.redirect(`/login?responseurl=${encodeURIComponent(responseurl)}`);
});

app.all('/faketoken', async (req, res) => {
  const grantType = req.query.grant_type
    ? req.query.grant_type
    : req.body.grant_type;
  const secondsInDay = 86400; // 60 * 60 * 24
  const HTTP_STATUS_OK = 200;
  console.log(`Grant type ${grantType}`);

  let obj;
  if (grantType === 'authorization_code') {
    obj = {
      token_type: 'bearer',
      access_token: '123access',
      refresh_token: '123refresh',
      expires_in: secondsInDay,
    };
  } else if (grantType === 'refresh_token') {
    obj = {
      token_type: 'bearer',
      access_token: '123access',
      expires_in: secondsInDay,
    };
  }
  res.status(HTTP_STATUS_OK).json(obj);
});

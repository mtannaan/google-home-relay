import * as oauth2orize from 'oauth2orize';
import {ExchangeDoneFunction} from 'oauth2orize';
import {nanoid} from 'nanoid';
import * as log4js from 'log4js';

import {inspect} from '../src/util';

type GrantTokenDoneFunction = (
  err: Error | null,
  code?: string,
  params?: unknown
) => void;

type UserInfo = {
  userId: string;
  name: string;
  password: string;
  scopes: string[];
};
type ClientInfo = {
  clientId: string;
  name: string;
  clientSecret: string;
  scopes: string[];
};
type AuthorizationCodeInfo = {
  code: string;
  clientId: string;
  redirectUri: string;
  userId: string;
};
type TokenInfo = {userId: string; clientId: string; token: string};

const db = {
  users: [
    {
      userId: 'id-aaa',
      name: 'aaa',
      password: 'aaaaaa',
      scopes: ['scope-a', 'scope-b'],
    },
    {
      userId: 'id-bbb',
      name: 'bbb',
      password: 'bbbbbb',
      scopes: ['scope-b', 'scope-c'],
    },
  ] as UserInfo[],
  clients: [
    {
      clientId: 'id-111',
      name: 'c111',
      clientSecret: '111111',
      scopes: [],
    },
  ] as ClientInfo[],
  authorizationCodes: [] as AuthorizationCodeInfo[],
  accessTokens: [] as TokenInfo[],
  refreshTokens: [] as TokenInfo[],
};

const logger = log4js.getLogger('auth-debug');
logger.level = 'debug';

const server = oauth2orize.createServer();

// Register serialization and deserialization functions.
//
// When a client redirects a user to user authorization endpoint, an
// authorization transaction is initiated. To complete the transaction, the
// user must authenticate and approve the authorization request. Because this
// may involve multiple HTTP request/response exchanges, the transaction is
// stored in the session.
//
// An application must supply serialization functions, which determine how the
// client object is serialized into the session. Typically this will be a
// simple matter of serializing the client's ID, and deserializing by finding
// the client by ID from the database.

server.serializeClient((client, done) => {
  logger.debug('serializeClient called:');
  logger.debug(inspect(client));
  return done(null, client.id);
});

server.deserializeClient((id, done) => {
  logger.debug('deserializeClient called:');
  logger.debug(inspect(id));
  const client = db.clients.find(c => c?.clientId === id);
  logger.debug(`client: ${inspect(client)}`);
  if (!client) {
    return done(new Error('client not found'));
  }
  return done(null, client);
});

function issueTokens(
  userId: string,
  clientId: string,
  needRefreshToken: false,
  done: GrantTokenDoneFunction
): void;
function issueTokens(
  userId: string,
  clientId: string,
  needRefreshToken: true,
  done: ExchangeDoneFunction
): void;
function issueTokens(
  userId: string,
  clientId: string,
  needRefreshToken: boolean,
  done: GrantTokenDoneFunction | ExchangeDoneFunction
): void {
  logger.debug('issueTokens called:');
  logger.debug(inspect({userId, clientId}));
  const user = db.users.find(user => user?.id === userId);
  logger.debug(`user: ${inspect(user)}`);
  if (!user) {
    return done(new Error('user not found'));
  }

  const customParams = {myParam1: 'asdf', myParam2: 'qwer'};

  const accessToken = nanoid(256);
  db.accessTokens = db.accessTokens.filter(
    t => t.userId === userId && t.clientId === clientId
  );
  db.accessTokens.push({userId, clientId, token: accessToken});

  if (!needRefreshToken) {
    const grantTokenDone = done as GrantTokenDoneFunction;
    return grantTokenDone(null, accessToken, customParams);
  }

  const refreshToken = nanoid(256);
  db.refreshTokens = db.refreshTokens.filter(
    t => t.userId === userId && t.clientId === clientId
  );
  db.refreshTokens.push({userId, clientId, token: refreshToken});
  done(null, accessToken, refreshToken, customParams);
}

// Register supported grant types.
//
// OAuth 2.0 specifies a framework that allows users to grant client
// applications limited access to their protected resources. It does this
// through a process of the user granting access, and the client exchanging
// the grant for an access token.

// Grant authorization codes. The callback takes the `client` requesting
// authorization, the `redirectUri` (which is used as a verifier in the
// subsequent exchange), the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application. The application issues a code, which is bound to these
// values, and will be exchanged for an access token.
server.grant(
  oauth2orize.grant.code((client, redirectURI, user, ares, done) => {
    logger.debug('grant.code called with args:');
    logger.debug(inspect({client, redirectURI, user, ares}));

    const codeInfo: AuthorizationCodeInfo = {
      clientId: client.id,
      redirectUri: redirectURI,
      userId: user.id,
      code: nanoid(64),
    };

    db.authorizationCodes.push(codeInfo);

    const error = null;
    done(error, codeInfo.code);
  })
);

// Grant implicit authorization. The callback takes the `client` requesting
// authorization, the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application. The application issues a token, which is bound to these
// values.
server.grant(
  oauth2orize.grant.token((client, user, ares, done) => {
    issueTokens(user.id, client.clientId, done);
  })
);

// Exchange authorization codes for access tokens. The callback accepts the
// `client`, which is exchanging `code` and any `redirectUri` from the
// authorization request for verification. If these values are validated, the
// application issues an access token on behalf of the user who authorized the
// code. The issued access token response can include a refresh token and
// custom parameters by adding these to the `done()` call

server.exchange(
  oauth2orize.exchange.code((client, code, redirectUri, done) => {
    logger.debug('exchange.code called:');
    logger.debug(inspect({client, code, redirectUri}));
    const codeInfo = db.authorizationCodes.find(c => c?.code === code);
    logger.debug(`codeInfo: ${codeInfo}`);
    if (!codeInfo) return done(new Error('code not found'));

    if (redirectUri !== codeInfo.redirectUri) return done(null, false);

    issueTokens(codeInfo.userId, client.clientId, done);
  })
);

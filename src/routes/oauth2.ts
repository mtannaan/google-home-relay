import * as bcrypt from 'bcryptjs';
import * as oauth2orize from 'oauth2orize';
import * as passport from 'passport';
import * as login from 'connect-ensure-login';
import {getLogger} from 'log4js';
import {nanoid} from 'nanoid';
import {Request, Response} from 'express';

import * as db from '../db';
import {inspect} from '../util';

const logger = getLogger('oauth2');

// Create OAuth 2.0 server
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

server.serializeClient((client: db.clients.Client, done) => {
  logger.trace(`serializeClient called for id ${client.id}`);
  done(null, client.id.toString());
});

server.deserializeClient((id, done) => {
  logger.trace(`deserializeClient called for id ${id}`);
  db.clients.findById(parseInt(id), (error, client) => {
    if (error) return done(error);
    done(null, client);
  });
});

type IssueTokensDoneFunction = (
  error: Error | null,
  accessToken?: string,
  refreshToken?: string,
  params?: Object
) => void;
function issueTokens(
  userId: number | null,
  clientId: string,
  done: IssueTokensDoneFunction
) {
  logger.debug(`issueTokens called for user ${userId} and client ${clientId}`);
  db.users.findById(userId, (error, user) => {
    const accessToken = nanoid(256); // utils.getUid(256);
    const refreshToken = nanoid(256); // utils.getUid(256);
    db.accessTokens.save(accessToken, userId, clientId, (error: Error) => {
      if (error) return done(error);
      logger.debug(`access token saved: ${accessToken}`);
      db.refreshTokens.save(refreshToken, userId, clientId, (error: Error) => {
        if (error) return done(error);
        logger.debug(`refresh token saved: ${refreshToken}`);
        // Add custom params, e.g. the username
        const params = {username: user?.name};
        return done(null, accessToken, refreshToken, params);
      });
    });
  });
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
  oauth2orize.grant.code(
    (
      client: db.clients.Client,
      redirectUri,
      user: db.users.User,
      ares,
      done
    ) => {
      const code = nanoid(16); // utils.getUid(16);
      logger.debug('grant.code called');
      logger.debug(
        'params:',
        inspect({
          user: user?.username,
          client: client?.clientId,
          redirectUri,
          ares,
          code,
        })
      );
      db.authorizationCodes.save(
        code,
        client.id,
        redirectUri,
        user.id,
        user.username,
        (error: Error | null) => {
          if (error) return done(error);
          return done(null, code);
        }
      );
    }
  )
);

// Grant implicit authorization. The callback takes the `client` requesting
// authorization, the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application. The application issues a token, which is bound to these
// values.

server.grant(
  oauth2orize.grant.token((client, user, ares, done) => {
    logger.debug('grant.token called');
    logger.debug(
      'params:',
      inspect({
        user: user?.username,
        client: client?.clientId,
        ares,
      })
    );
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
    logger.debug('exchange.code called');
    logger.debug(
      'params:',
      inspect({
        client: client?.clientId,
        redirectUri,
        code,
      })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.authorizationCodes.find(code, (error: Error, authCode: any) => {
      if (error) return done(error);
      if (client.id !== authCode.clientId) {
        logger.warn(`client id unmatch: ${client.id} !== ${authCode.clientId}`);
        return done(null, false);
      }
      if (redirectUri !== authCode.redirectUri) {
        logger.warn(
          `redirectUri unmatch: ${redirectUri} !== ${authCode.redirectUri}`
        );
        return done(null, false);
      }

      logger.debug('auth code ok');
      issueTokens(authCode.userId, client.clientId, done);
    });
  })
);

// Exchange user id and password for access tokens. The callback accepts the
// `client`, which is exchanging the user's name and password from the
// authorization request for verification. If these values are validated, the
// application issues an access token on behalf of the user who authorized the code.

server.exchange(
  oauth2orize.exchange.password(
    (client: db.clients.Client, username, password, scope, done) => {
      logger.debug('exchange.password called');
      logger.debug(
        'params:',
        inspect({
          client: client?.clientId,
          username,
          password,
          scope,
        })
      );

      // Validate the client
      db.clients.findByClientId(client.clientId, (error, localClient) => {
        if (error) return done(error);
        if (!localClient) return done(null, false);

        bcrypt.compare(client.clientId, localClient.clientSecret).then(ok => {
          if (!ok) {
            logger.warn('client secret unmatch');
            return done(null, false);
          }
          // Validate the user
          db.users.findByUsername(username, (error, user) => {
            if (error) return done(error);
            if (!user) return done(null, false);
            bcrypt.compare(password, user.password).then(ok => {
              if (!ok) {
                logger.warn('password unmatch');
                return done(null, false);
              }
              // Everything validated, return the token
              issueTokens(user.id, client.clientId, done);
            });
          });
        });
      });
    }
  )
);

// Exchange the client id and password/secret for an access token. The callback accepts the
// `client`, which is exchanging the client's id and password/secret from the
// authorization request for verification. If these values are validated, the
// application issues an access token on behalf of the client who authorized the code.

server.exchange(
  oauth2orize.exchange.clientCredentials(
    (client: db.clients.Client, scope, done) => {
      logger.debug('exchange.clientCredentials called');
      logger.debug(
        'params:',
        inspect({
          client: client?.clientId,
          scope,
        })
      );

      // Validate the client
      db.clients.findByClientId(client.clientId, (error, localClient) => {
        if (error) return done(error);
        if (!localClient) return done(null, false);
        bcrypt
          .compare(client.clientSecret, localClient.clientSecret)
          .then(ok => {
            if (!ok) {
              logger.warn('client secret unmatch');
              return done(null, false);
            }
            // Everything validated, return the token
            // Pass in a null for user id since there is no user with this grant type
            issueTokens(null, client.clientId, done);
          });
      });
    }
  )
);

// issue new tokens and remove the old ones
server.exchange(
  oauth2orize.exchange.refreshToken(
    (client: db.clients.Client, refreshToken, scope, done) => {
      logger.debug('exchange.refreshToken called');
      logger.debug(
        'params:',
        inspect({
          client: client?.clientId,
          refreshToken,
          scope,
        })
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db.refreshTokens.find(refreshToken, (error: Error | null, token: any) => {
        if (error) return done(error);

        logger.debug('refreshToken found');
        issueTokens(
          token.id,
          client.clientId,
          (err, accessToken, refreshToken) => {
            if (err) {
              done(err);
            }
            db.accessTokens.removeByUserIdAndClientId(
              token.userId,
              token.clientId,
              (err: Error | null) => {
                if (err) {
                  done(err);
                }
                db.refreshTokens.removeByUserIdAndClientId(
                  token.userId,
                  token.clientId,
                  (err: Error | null) => {
                    if (err) {
                      done(err);
                    }
                    done(null, accessToken, refreshToken);
                  }
                );
              }
            );
          }
        );
      });
    }
  )
);

// User authorization endpoint.
//
// `authorization` middleware accepts a `validate` callback which is
// responsible for validating the client making the authorization request. In
// doing so, is recommended that the `redirectUri` be checked against a
// registered value, although security requirements may vary across
// implementations. Once validated, the `done` callback must be invoked with
// a `client` instance, as well as the `redirectUri` to which the user will be
// redirected after an authorization decision is obtained.
//
// This middleware simply initializes a new authorization transaction. It is
// the application's responsibility to authenticate the user and render a dialog
// to obtain their approval (displaying details about the client requesting
// authorization). We accomplish that here by routing through `ensureLoggedIn()`
// first, and rendering the `dialog` view.

export const authorization = [
  login.ensureLoggedIn(),
  server.authorization(
    (clientId, redirectUri, done) => {
      logger.debug('server.authorization called');
      logger.debug(
        inspect({
          clientId,
          redirectUri,
        })
      );
      db.clients.findByClientId(clientId, (error, client) => {
        if (error) return done(error);
        // WARNING: For security purposes, it is highly advisable to check that
        //          redirectUri provided by the client matches one registered with
        //          the server. For simplicity, this example does not. You have
        //          been warned.
        return done(null, client, redirectUri);
      });
    },
    (
      client: db.clients.Client,
      user: db.users.User,
      scope,
      type,
      areq,
      done
    ) => {
      // Check if grant request qualifies for immediate approval
      logger.debug('checking immediate approval');
      logger.debug(
        inspect({
          clientId: client.clientId,
          username: user.username,
          scope,
          type,
          areq,
        })
      );

      // Auto-approve
      if (client.isTrusted) {
        logger.debug('trusted -> approved');
        return done(null, true, undefined, undefined);
      }

      db.accessTokens.findByUserIdAndClientId(
        user.id,
        client.clientId,
        (error: Error | null, token?: string) => {
          // Auto-approve
          if (token) {
            logger.debug('token found for user/client id. approved.');
            return done(null, true, undefined, undefined);
          }

          logger.debug('not trusted and token not found. asking user.');
          // Otherwise ask user
          return done(null, false, undefined, undefined);
        }
      );
    }
  ),
  (request: Request, response: Response) => {
    response.render('dialog', {
      transactionId: request.oauth2?.transactionID,
      user: request.user,
      client: request.oauth2?.client,
    });
  },
];

// User decision endpoint.
//
// `decision` middleware processes a user's decision to allow or deny access
// requested by a client application. Based on the grant type requested by the
// client, the above grant middleware configured above will be invoked to send
// a response.

export const decision = [login.ensureLoggedIn(), server.decision()];

// Token endpoint.
//
// `token` middleware handles client requests to exchange authorization grants
// for access tokens. Based on the grant type being exchanged, the above
// exchange middleware will be invoked to handle the request. Clients must
// authenticate when making requests to this endpoint.

export const token = [
  passport.authenticate(['basic', 'oauth2-client-password'], {session: false}),
  server.token(),
  server.errorHandler(),
];

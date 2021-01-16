import * as log4js from 'log4js';
import * as bcrypt from 'bcryptjs';
import * as passport from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';
import {BasicStrategy} from 'passport-http';
import {Strategy as ClientPasswordStrategy} from 'passport-oauth2-client-password';
import {Strategy as BearerStrategy} from 'passport-http-bearer';

import * as db from '../db';

const logger = log4js.getLogger('authenticator');

/**
 * LocalStrategy
 *
 * This strategy is used to authenticate users based on a username and password.
 * Anytime a request is made to authorize an application, we must ensure that
 * a user is logged in before asking them to approve the request.
 */
passport.use(
  new LocalStrategy((username, password, done) => {
    db.users.findByUsername(username, (error, user) => {
      if (error) return done(error);
      if (!user) return done(null, false);
      bcrypt
        .compare(password, user.password)
        .then(success => done(null, success ? user : false));
      // if (user.password !== password) return done(null, false);
      // return done(null, user);
    });
  })
);

passport.serializeUser((user, done) => done(null, (user as db.users.User).id));

passport.deserializeUser((id: number, done) => {
  db.users.findById(id, (error, user) => done(error, user));
});

/**
 * BasicStrategy & ClientPasswordStrategy
 *
 * These strategies are used to authenticate registered OAuth clients. They are
 * employed to protect the `token` endpoint, which consumers use to obtain
 * access tokens. The OAuth 2.0 specification suggests that clients use the
 * HTTP Basic scheme to authenticate. Use of the client password strategy
 * allows clients to send the same credentials in the request body (as opposed
 * to the `Authorization` header). While this approach is not recommended by
 * the specification, in practice it is quite common.
 */
function verifyClient(
  clientId: string,
  clientSecret: string,
  done: (err: Error | null, client?: db.clients.Client | boolean) => void
) {
  db.clients.findByClientId(clientId, (error, client) => {
    if (error) return done(error);
    if (!client) return done(null, false);
    bcrypt
      .compare(clientSecret, client.clientSecret)
      .then(ok => (ok ? done(null, client) : done(null, false)));
  });
}

passport.use(new BasicStrategy(verifyClient));

passport.use(new ClientPasswordStrategy(verifyClient));

/**
 * BearerStrategy
 *
 * This strategy is used to authenticate either users or clients based on an access token
 * (aka a bearer token). If a user, they must have previously authorized a client
 * application, which is issued an access token to make requests on behalf of
 * the authorizing user.
 */
passport.use(
  new BearerStrategy((accessToken, done) => {
    logger.debug('BearerStrategy invoked');
    db.accessTokens.find(accessToken, async (error, token) => {
      if (error) return done(error);
      if (!token) return done(null, false);

      db.clients.findByClientId(token.clientId, async (error, client) => {
        if (error) return done(error);
        if (!client) return done(null, false);

        if (token.userId) {
          db.users.findById(token.userId, async (error, user) => {
            if (error) return done(error);
            if (!user) return done(null, false);

            const scopes = await db.scopes.findByUserAndClient(
              user.id,
              client.clientId
            );
            if (!scopes) return done(null, false);
            return done(null, user, {scope: scopes});
          });
        } else {
          const scopes = await db.scopes.findByUserAndClient(
            null,
            client.clientId
          );
          if (!scopes) return done(null, false);
          return done(null, null, {scope: scopes});
        }
      });
    });
  })
);

# google-home-relay

Relays requests from Google Smart Home API to WebSocket clients.

## How to use

### Create and set up project in Actions Console

1. Use the [Actions on Google Console](https://console.actions.google.com/) to add a new project with a name of your choosing and click *Create Project*.
1. Select *Home Control*, then click *Smart Home*.

### Add Request Sync and Report State

The Request Sync feature allows a cloud integration to send a request to the Home Graph to send a new SYNC request. The Report State feature allows a cloud integration to proactively provide the current state of devices to the Home Graph without a `QUERY` request. These are done securely through [JWT (JSON web tokens)](https://jwt.io/).

1. Navigate to the [Google Cloud Console API Manager](https://console.developers.google.com/apis) for your project id.
2. Enable the [HomeGraph API](https://console.cloud.google.com/apis/api/homegraph.googleapis.com/overview).
3. Navigate to the [Google Cloud Console API & Services page](https://console.cloud.google.com/apis/credentials)
4. Select **Create Credentials** and create a **Service account key**
5. Create a new Service account
6. Use the role Service Account > Service Account Token Creator
7. Create the account and download a JSON file. Save this to `jwt` directory.
    - Please note that `/jwt` is not under git control (by virtue of `.gitignore`)

### Set up Environment Variables

1. Run `npm run init-dotenv` to generate the .env file.
2. (Optional) Similarly, configure similar environment variables for your cloud environment.
    - If you use Heroku, run `heroku config:set TOKEN_CREATOR_JWT=...` etc.

### Set up Postgres database

This program uses a Postgres database to store information related to users, clients, tokens, and sessions.

To set up one in a local Docker environment, run `local-postgres/run.sh` . The script reads password and port from .env file and configures the container accordingly.

To use other Postgres database, set `DATABASE_URL` enviroment variable (or .env variable). If you are using Heroku Postgres, the platform will automatically set the `DATABASE_URL` enviromnet variable.

Once the database is created, to initialize tables, run following command with `$DATABASE_URL` set to your database.

```sh
psql $DATABASE_URL < node_modules/connect-pg-simple/table.sql
```

### Register users and clients

Registrations can be made by directly INSERTing required information to the database e.g. via psql.

Before registering yout passwords, they have to be hashed by executing:

```sh
node -e "console.log(require('bcryptjs').hashSync('your-password'))"
```

#### Register an User

You have to register an user to connect Google Smart Home API with this app. You can set the password as you like.

```sql
insert into
users (username, password, name, "createdAt", "updatedAt")
values ('%yourusername%', '%YOUR_PASSWORD_HASH%', '%readable user name%', now(), now());
```

#### Register Clients

You need at least two clients.

##### 1. Google API

Set `isTrusted` to `FALSE`.

```sql
insert into
clients ("clientId", "clientSecret", name, "isTrusted", "createdAt", "updatedAt")
values ('yourclientname', '%YOUR_PASSWORD_HASH%', 'readable client name', FALSE, now(), now());
```

##### 2. Relay Client

Set `isTrusted` to `TRUE`.

```sql
insert into
clients ("clientId", "clientSecret", name, "isTrusted", "createdAt", "updatedAt")
values ('yourclientname', '%YOUR_PASSWORD_HASH%', 'readable client name', TRUE, now(), now());
```

#### Register scopes


- Google API Client
  - userId: the `id` of user created before. Check by `select * from users;`
  - scopes: `'smart-home-api'`
- Relay Clients
  - userId: `NULL`
  - scopes: `'device-manager'`

```sql
insert into
scopes ("userId", "clientId", scopes, "createdAt", "updatedAt")
values (%id%, '%clientId%', '%scope-name%', now(), now());
```

### Register to Actions on Google

1. Go to [Action on Google console](https://console.actions.google.com/u/1/) and navigate to your project page.
1. Go to Develop > Account Linking.
1. Fill in the form as follows:
    - Client ID and Client Secret: Those of Google API client registered to Postgres database. Here _raw_ client secret, i.e. before hashing, is needed.
    - Authorization URL: `https://%YOUR_DEPLOYMENT_URL%/dialog/authorize`
    - Token URL: `https://%YOUR_DEPLOYMENT_URL%/oauth/token`
1. Click _Save_.

### Link with Google Home App
1. Run your server and relay client.
1. Lauch Google Home App.
1. Add devices. Choose a service provider whose name starts with `[test]`.
1. You will be asked your username and password. Here _raw_ password, i.e. before hashing, is needed.

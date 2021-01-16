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
   1. Create a new Service account
   2. Use the role Service Account > Service Account Token Creator
5. Create the account and download a JSON file. Save this to `jwt` directory.
   - Please note that `/jwt` is not under git control (by virtue of `.gitignore`)
6. Run `npm run jwt-to-env` to encode JSON Web Token into environment variable format.
7. Paste the `TOKEN_CREATOR_JWT=...` string to `.env` file for run the app locally.
8. (Optional) Similarly, set `TOKEN_CREATOR_JWT` environment variable for your cloud environment.
   - If you use Heroku, run `heroku config:set TOKEN_CREATOR_JWT=...`


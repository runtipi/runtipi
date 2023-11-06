import Provider from 'oidc-provider';

const configuration = {
  // Define your OIDC provider configuration here.
  clients: [
    {
      client_id: 'dashboard-client',
      client_secret: 'your-secret',
      grant_types: ['refresh_token', 'authorization_code'],
      redirect_uris: ['https://your-redirect-uri/callback'],
    },
  ],
  // ...other configuration settings
};

export const oidc = new Provider('http://localhost:3000', configuration);

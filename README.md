# usage
with this middleware you can verify the access tokens against your oidc provider with the introspection endpoint and logout your session from the oidc provider. 

Also this middleware sets a `x-userinfo`-header with a few information from the introspection endpoint and encode it with base64. For more inforation which fields are set see in `src/server.js:70`

# requirements
- traefik
- external-auth-server: https://github.com/travisghansen/external-auth-server

# installation
### traefik middleware
```yaml
jwt-verifier:
  forwardAuth:
    address: "http://jwt-verifier:8080/"
    authResponseHeadersRegex: "^X-"
    trustForwardHeader: true
```

### docker-compose.yml example
```yaml
version: '3.9'

services:
  traefik:
    image: traefik:v2.4
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro

  jwt-verifier:
    image: docker.pkg.github.com/electrofenster/jwt-verifier/jwt-verifier:latest
    environment:
      DISCOVERY_URL: https://my-oidc-provider/.well-known/openid-configuration
      CLIENT_ID: my-client-id
      CLIENT_SECRET: my-client-secret
      LOG_LEVEL: debug
      LOGOUT_QUERY_PARAM: __my-fancy-logout-param
      LOGOUT_REDIRECT_URL: https://google.de
```

when visiting `/?__my-fancy-logout-param=true` the middleware redirects to the oidc logout endpoint which invalidates your session and starts a redirect to `https://google.de`

# options
you need to setup these environment variables:
  - `DISCOVERY_URL` -> is for the openid-client to get the endpoints from the oidc discovery endpoint
  - `CLIENT_ID` -> client id from the oidc client
  - `CLIENT_SECRET` -> client secret from the oidc client
  - `LOG_LEVEL` -> configure the logs from this middleware available level: info, debug
  - `LOGOUT_QUERY_PARAM` -> query param to listen for logout, default `__jwt-logout`
  - `LOGOUT_REDIRECT_URL` -> redirect after successful logout, needs to start with `https://`
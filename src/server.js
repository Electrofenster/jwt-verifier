import express from 'express'
import bodyParser from 'body-parser'
import URI from 'uri-js'
import utils from './utils.js'

// setup express app
const app = express()

// logger
const logger = utils.getLogger()

// apply middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.all('/', async (req, res) => {
  let accessToken = null

  // get open-id client
  const client = await utils.getClient()

  // check headers for access token
  if (req.headers['authorization']) {
    const header = req.headers['authorization'].split(' ')
    accessToken = header[1]
  } else if (req.headers['x-access-token']) {
    accessToken = req.headers['x-access-token']
  }

  // check if we got the handler to logout from our oidc provider
  let uri = null
  if (req.headers['referer']) {
    uri = req.headers['referer']
  } else if (req.headers['x-forwarded-uri']) {
    uri = req.headers['x-forwarded-uri']
  }

  const parsedUri = URI.parse(uri)
  if (parsedUri.query === `${utils.LOGOUT_QUERY_PARAM}=true`) {
    logger.info('try to logout from oidc provider')
    utils.logout(client, accessToken).then(() => {
      res.clearCookie('_eas_oauth_csrf').clearCookie('_eas_oauth_session')
      res.redirect(
          client.endSessionUrl({
            post_logout_redirect_uri: utils.LOGOUT_REDIRECT_URL,
          })
      )
    })
    return false
  }

  // start verification with openid-client
  if (accessToken && client) {
    await utils.introspect(client, accessToken).then((resp) => {
      logger.debug('introspection response', resp)

      const {
        jti,
        iss,
        sub,
        name,
        given_name,
        family_name,
        preferred_username,
        email,
        email_verified,
        username,
      } = resp

      const userInfo = {
        jti,
        iss,
        sub,
        name,
        given_name,
        family_name,
        preferred_username,
        email,
        email_verified,
        username,
      }

      const buffer = new Buffer.from(JSON.stringify(userInfo))
      res.setHeader('x-userinfo', buffer.toString('base64'))

      logger.debug('userinfo', userInfo)
    })
  }

  res.status(200).send()
})

logger.info('starting server on port 0.0.0.0:8080')
app.listen(8080, '0.0.0.0')
logger.info('Running on http://0.0.0.0:8080')

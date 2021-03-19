import express from 'express'
import bodyParser from 'body-parser'
import URI from 'uri-js'
import utils from './utils.js'
import cookieParser from 'cookie-parser'

// setup express app
const app = express()

// logger
const logger = utils.getLogger()

// define userinfo default fields
const defaultFields = ['jti', 'iss', 'sub']
const extraFields = utils.EXTRA_USERINFO_FIELDS

// apply middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())

app.get('/', async (req, res, next) => {
  let status = 200
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
      logger.debug('req cookies: ', req.cookies)

      const { active } = resp

      //
      if (!active) {
        // change statuscode to 301 -> moved permanently
        status = 301
        logger.debug('introspection failed, deleting eas cookie')

        // clear eas cookies
        res.clearCookie('_eas_oauth_csrf')
        res.clearCookie('_eas_oauth_session')

        // build redirect uri
        parsedUri.path = utils.PROTECTED_URL_PATH
        const redirectUri = URI.serialize(parsedUri)

        // set header for redirect
        res.setHeader('Location', redirectUri)
      } else {
        let userInfo = {}

        // set defaults
        defaultFields.forEach((field) => {
          userInfo[field] = resp[field]
        })

        // set extra fields
        extraFields.forEach((field) => {
          userInfo[field] = resp[field]
        })

        const buffer = new Buffer.from(JSON.stringify(userInfo))
        res.setHeader('x-userinfo', buffer.toString('base64'))

        // set header from eas service
        if (req.headers['x-access-token']) {
          res.setHeader('x-access-token', req.headers['x-access-token'])
        }
        if (req.headers['x-id-token']) {
          res.setHeader('x-id-token', req.headers['x-id-token'])
        }

        logger.debug('userinfo', userInfo)
      }
    })
  }

  // set default header from request
  res.setHeader('x-forwarded-for', req.headers['x-forwarded-for'])
  res.setHeader('x-forwarded-host', req.headers['x-forwarded-host'])
  res.setHeader('x-forwarded-method', req.headers['x-forwarded-method'])
  res.setHeader('x-forwarded-proto', req.headers['x-forwarded-proto'])
  res.setHeader('x-forwarded-uri', req.headers['x-forwarded-uri'])

  // send response with given status
  res.status(status).send()
})

logger.info('starting server on port 0.0.0.0:8080')
app.listen(8080, '0.0.0.0')
logger.info('Running on http://0.0.0.0:8080')

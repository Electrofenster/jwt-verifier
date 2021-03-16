import { Issuer } from 'openid-client'
import dotenv from 'dotenv'
import winston from 'winston'

// load envs
dotenv.config()

// check envs
const DISCOVERY_URL = process.env.DISCOVERY_URL || false
const CLIENT_ID = process.env.CLIENT_ID || false
const CLIENT_SECRET = process.env.CLIENT_SECRET || false
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
const LOGOUT_QUERY_PARAM = process.env.LOGOUT_QUERY_PARAM || '__jwt-logout'
const LOGOUT_REDIRECT_URL = process.env.LOGOUT_REDIRECT_URL || ''
const PROTECTED_URL_PATH = process.env.PROTECTED_URL_PATH || '/'
const EXTRA_USERINFO_FIELDS = process.env.EXTRA_USERINFO_FIELDS.split(',') || []

if (!DISCOVERY_URL || !CLIENT_ID || !CLIENT_SECRET || !LOGOUT_REDIRECT_URL) {
  getLogger().info('ENVs not set!')
  process.exit()
}

if (!LOGOUT_REDIRECT_URL.startsWith('https://')) {
  getLogger().info('redirect uri needs to start with https://')
  process.exit()
}

async function getClient() {
  return await Issuer.discover(DISCOVERY_URL).then((issuer) => {
    return new issuer.Client({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    })
  })
}

async function introspect(client, accessToken) {
  return client.introspect(accessToken).then((resp) => {
    return resp
  })
}

async function logout(client, accessToken) {
  return client.revoke(accessToken).then((resp) => {
    return resp
  })
}

function getLogger() {
  return winston.createLogger({
    level: LOG_LEVEL,
    format: winston.format.combine(
      winston.format.splat(),
      winston.format.colorize(),
      winston.format.simple()
    ),
    transports: [new winston.transports.Console()],
  })
}

export default {
  getClient,
  introspect,
  getLogger,
  logout,
  LOGOUT_QUERY_PARAM,
  LOGOUT_REDIRECT_URL,
  PROTECTED_URL_PATH,
  EXTRA_USERINFO_FIELDS,
}

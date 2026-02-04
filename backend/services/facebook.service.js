import crypto from 'crypto'
import FacebookEventLog from '../models/FacebookEventLog.model.js'
import TrackingConfig from '../models/TrackingConfig.model.js'

const API_VERSION = process.env.FACEBOOK_API_VERSION || 'v18.0'

// Get config from database (with fallback to env vars for backward compatibility)
async function getConfig() {
  try {
    const config = await TrackingConfig.getConfig()
    return {
      pixelId: config.facebookPixelId || process.env.FACEBOOK_PIXEL_ID || '',
      accessToken: config.facebookAccessToken || process.env.FACEBOOK_ACCESS_TOKEN || '',
      activeEvents: Array.isArray(config.activeFacebookEvents) ? config.activeFacebookEvents : []
    }
  } catch (error) {
    console.error('Error loading TrackingConfig:', error)
    return {
      pixelId: process.env.FACEBOOK_PIXEL_ID || '',
      accessToken: process.env.FACEBOOK_ACCESS_TOKEN || '',
      activeEvents: []
    }
  }
}

function hashSha256(value) {
  if (!value || typeof value !== 'string') return ''
  const normalized = value.toLowerCase().trim()
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

async function buildUserData(user) {
  if (!user) return {}
  const u = typeof user.toObject === 'function' ? user.toObject() : user
  const userData = {}
  if (u.phone) userData.ph = hashSha256(u.phone.replace(/\D/g, '').slice(-9))
  if (u.username) userData.em = hashSha256(u.username + '@user.local') // optional external_id
  if (u._id) userData.external_id = hashSha256(String(u._id))
  return userData
}

async function sendEvent(eventName, userData, customData = {}, eventId = null, userId = null) {
  const logEntry = {
    eventName,
    eventId: eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    userId: userId || undefined,
    payload: { event_name: eventName, user_data: userData, custom_data: customData },
    status: 'sent',
    sentAt: new Date()
  }

  // Get config from database
  const config = await getConfig()
  const PIXEL_ID = config.pixelId
  const ACCESS_TOKEN = config.accessToken
  const activeEvents = config.activeEvents || []

  // Check if event is active (if activeEvents is empty, allow all events for backward compatibility)
  if (activeEvents.length > 0 && !activeEvents.includes(eventName)) {
    await FacebookEventLog.create({
      ...logEntry,
      status: 'skipped',
      errorMessage: `Evento ${eventName} não está ativo na configuração`,
      response: null
    })
    return { success: false, reason: 'event_not_active' }
  }

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    await FacebookEventLog.create({
      ...logEntry,
      status: 'error',
      errorMessage: 'Facebook Pixel ID ou Access Token não configurados',
      response: null
    })
    return { success: false, reason: 'not_configured' }
  }

  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: logEntry.eventId,
    user_data: userData,
    action_source: 'website'
  }
  if (Object.keys(customData).length) event.custom_data = customData

  try {
    const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [event] })
    })
    const data = await res.json().catch(() => ({}))
    const success = res.ok && !data.error

    await FacebookEventLog.create({
      ...logEntry,
      payload: { event_name: eventName, user_data: userData, custom_data: customData },
      response: data,
      status: success ? 'success' : 'error',
      errorMessage: data.error?.message || (res.ok ? null : `HTTP ${res.status}`)
    })

    return { success, data }
  } catch (err) {
    await FacebookEventLog.create({
      ...logEntry,
      response: null,
      status: 'error',
      errorMessage: err.message
    })
    return { success: false, error: err.message }
  }
}

export async function sendLead(user) {
  const userData = await buildUserData(user)
  const uid = user && (user._id || user.id)
  return sendEvent('Lead', userData, { content_name: 'Cadastro' }, null, uid)
}

export async function sendCompleteRegistration(user) {
  const userData = await buildUserData(user)
  const uid = user && (user._id || user.id)
  return sendEvent('CompleteRegistration', userData, { status: true }, null, uid)
}

export async function sendFirstDeposit(user, amount, currency = 'BRL') {
  const userData = await buildUserData(user)
  const uid = user && (user._id || user.id)
  return sendEvent('Purchase', userData, {
    currency,
    value: parseFloat(amount),
    content_name: 'First Deposit'
  }, null, uid)
}

const facebookService = {
  sendLead,
  sendCompleteRegistration,
  sendFirstDeposit,
  sendEvent,
  buildUserData
}

export default facebookService

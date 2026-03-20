import GatewayConfig from '../models/GatewayConfig.model.js'
import gateboxService from './gatebox.service.js'
import nxgateService from './nxgate.service.js'
import escalecyberService from './escalecyber.service.js'

/**
 * Retorna o serviço do gateway configurado (gatebox, nxgate ou escalecyber).
 * @returns {Promise<{ generatePix: Function, withdrawPix: Function }>}
 */
export async function getGatewayService() {
  const config = await GatewayConfig.getConfig()
  const provider = (config?.provider || 'gatebox').toLowerCase()

  if (provider === 'nxgate') return nxgateService
  if (provider === 'escalecyber') return escalecyberService
  return gateboxService
}

export default { getGatewayService }

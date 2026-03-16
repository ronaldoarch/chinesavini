import GatewayConfig from '../models/GatewayConfig.model.js'
import gateboxService from './gatebox.service.js'
import nxgateService from './nxgate.service.js'

/**
 * Retorna o serviço do gateway configurado (gatebox ou nxgate).
 * @returns {Promise<{ generatePix: Function, withdrawPix: Function }>}
 */
export async function getGatewayService() {
  const config = await GatewayConfig.getConfig()
  const provider = (config?.provider || 'gatebox').toLowerCase()

  if (provider === 'nxgate') {
    return nxgateService
  }
  return gateboxService
}

export default { getGatewayService }

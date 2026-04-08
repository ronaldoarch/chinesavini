import GatewayConfig from '../models/GatewayConfig.model.js'
import gateboxService from './gatebox.service.js'
import nxgateService from './nxgate.service.js'
import escalecyberService from './escalecyber.service.js'
import sarrixpayService from './sarrixpay.service.js'

/**
 * Retorna o serviço do gateway configurado.
 * @returns {Promise<{ generatePix: Function, withdrawPix: Function }>}
 */
export async function getGatewayService() {
  const config = await GatewayConfig.getConfig()
  const provider = (config?.provider || 'gatebox').toLowerCase()

  if (provider === 'nxgate') return nxgateService
  if (provider === 'escalecyber') return escalecyberService
  if (provider === 'sarrixpay') return sarrixpayService
  return gateboxService
}

export default { getGatewayService }

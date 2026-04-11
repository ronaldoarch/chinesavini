import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { protect } from '../middleware/auth.middleware.js'
import { isAdmin } from '../middleware/admin.middleware.js'
import Banner from '../models/Banner.model.js'
import Logo from '../models/Logo.model.js'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Uploads - use UPLOADS_PATH if set (para volume persistente no Colify)
const uploadsDir = process.env.UPLOADS_PATH || path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log('📁 [Banners] Criado diretório uploads:', uploadsDir)
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to public folder in frontend
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const publicAssetsDir = path.join(__dirname, '../../chinesa-main/public')
const MAX_OG_IMAGE_BYTES = 6 * 1024 * 1024

function setOgImageResponseHeaders(res) {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin')
  res.set('Access-Control-Allow-Origin', '*')
  // Cache curto: crawlers podem guardar; ainda permite trocar logo sem esperar dias
  res.set('Cache-Control', 'public, max-age=120, s-maxage=120')
}

async function tryProxyImageToResponse(imageUrl, res) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 15000)
  try {
    const r = await fetch(imageUrl, {
      redirect: 'follow',
      signal: ac.signal,
      headers: {
        'User-Agent':
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        Accept: 'image/*'
      }
    })
    clearTimeout(timer)
    if (!r.ok) return false
    const cl = r.headers.get('content-length')
    if (cl && parseInt(cl, 10) > MAX_OG_IMAGE_BYTES) return false
    const ct = r.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) return false
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length > MAX_OG_IMAGE_BYTES) return false
    setOgImageResponseHeaders(res)
    res.set('Content-Type', ct)
    res.send(buf)
    return true
  } catch {
    clearTimeout(timer)
    return false
  }
}

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, gif, webp)'))
    }
  }
})

// ============ BANNERS ============

// @route   GET /api/banners
// @desc    Get all active banners (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true })
      .sort({ order: 1 })
      .select('-__v')

    res.json({
      success: true,
      data: { banners }
    })
  } catch (error) {
    console.error('Get banners error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar banners',
      error: error.message
    })
  }
})

// @route   GET /api/banners/admin/all
// @desc    Get all banners (admin)
// @access  Private/Admin
router.get('/admin/all', protect, isAdmin, async (req, res) => {
  try {
    const banners = await Banner.find()
      .sort({ order: 1 })
      .select('-__v')

    res.json({
      success: true,
      data: { banners }
    })
  } catch (error) {
    console.error('Get all banners error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar banners',
      error: error.message
    })
  }
})

// @route   POST /api/banners/admin
// @desc    Create new banner (admin)
// @access  Private/Admin
router.post('/admin', protect, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, linkUrl, description, order, isActive } = req.body

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Imagem é obrigatória'
      })
    }

    // Store only path so frontend can build correct URL (evita URL quebrada tipo .dominio/uploads/...)
    const imageUrl = `/uploads/${req.file.filename}`

    const banner = await Banner.create({
      title: title || 'Banner',
      imageUrl,
      linkUrl: linkUrl || null,
      description: description || '',
      order: order ? parseInt(order) : 0,
      isActive: isActive === 'true' || isActive === true
    })

    res.json({
      success: true,
      message: 'Banner criado com sucesso',
      data: { banner }
    })
  } catch (error) {
    console.error('Create banner error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao criar banner',
      error: error.message
    })
  }
})

// @route   PUT /api/banners/admin/:id
// @desc    Update banner (admin)
// @access  Private/Admin
router.put('/admin/:id', protect, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, linkUrl, description, order, isActive } = req.body
    const banner = await Banner.findById(req.params.id)

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner não encontrado'
      })
    }

    const updateData = {}
    if (title !== undefined) updateData.title = title
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl
    if (description !== undefined) updateData.description = description
    if (order !== undefined) updateData.order = parseInt(order)
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true

    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`
    }

    const updatedBanner = await Banner.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )

    res.json({
      success: true,
      message: 'Banner atualizado com sucesso',
      data: { banner: updatedBanner }
    })
  } catch (error) {
    console.error('Update banner error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar banner',
      error: error.message
    })
  }
})

// @route   DELETE /api/banners/admin/:id
// @desc    Delete banner (admin)
// @access  Private/Admin
router.delete('/admin/:id', protect, isAdmin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner não encontrado'
      })
    }

    await Banner.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Banner deletado com sucesso'
    })
  } catch (error) {
    console.error('Delete banner error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar banner',
      error: error.message
    })
  }
})

// ============ LOGO ============

// @route   GET /api/banners/logo-opengraph
// @desc    Imagem da logo para og:image. Responde 200 com bytes (WhatsApp costuma ignorar 302 cross-domain).
// @access  Public
router.get('/logo-opengraph', async (req, res) => {
  try {
    const logo = await Logo.getActiveLogo()
    const fe = (process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || '').replace(/\/$/, '')
    const p = logo?.imageUrl ? String(logo.imageUrl).trim() : ''

    const sendLocalIfExists = (absPath) => {
      const resolved = path.resolve(absPath)
      if (!resolved.startsWith(path.resolve(uploadsDir)) && !resolved.startsWith(path.resolve(publicAssetsDir))) {
        return false
      }
      if (!fs.existsSync(resolved)) return false
      setOgImageResponseHeaders(res)
      res.sendFile(resolved)
      return true
    }

    // Arquivo em /uploads no disco da API
    if (p.startsWith('/uploads')) {
      const safe = path.basename(p.replace(/^\/uploads\/?/, ''))
      if (safe && safe !== '.' && safe !== '..') {
        if (sendLocalIfExists(path.join(uploadsDir, safe))) return
      }
    }

    // URL absoluta: proxy 200 (fallback 302)
    if (p.startsWith('http://') || p.startsWith('https://')) {
      if (await tryProxyImageToResponse(p, res)) return
      return res.redirect(302, p)
    }

    // Caminho tipo /logo_plataforma.png — repo (dev) ou cópia no servidor
    if (p.startsWith('/')) {
      const rel = p.replace(/^\//, '')
      if (rel && !rel.includes('..')) {
        if (sendLocalIfExists(path.join(publicAssetsDir, rel))) return
      }
      if (fe) {
        if (await tryProxyImageToResponse(`${fe}${p}`, res)) return
        return res.redirect(302, `${fe}${p}`)
      }
      return res.redirect(302, p)
    }

    // Só nome de arquivo
    if (p) {
      const safe = path.basename(p)
      if (safe && sendLocalIfExists(path.join(uploadsDir, safe))) return
    }

    if (fe) {
      if (await tryProxyImageToResponse(`${fe}/logo_plataforma.png`, res)) return
      return res.redirect(302, `${fe}/logo_plataforma.png`)
    }

    return res.status(404).type('text/plain').send('Logo não configurada. Defina FRONTEND_URL no backend ou cadastre uma logo.')
  } catch (error) {
    console.error('logo-opengraph error:', error)
    res.status(500).type('text/plain').send('Erro ao resolver logo')
  }
})

// @route   GET /api/banners/logo
// @desc    Get active logo (public)
// @access  Public
router.get('/logo', async (req, res) => {
  try {
    const logo = await Logo.getActiveLogo()
    res.json({
      success: true,
      data: { logo }
    })
  } catch (error) {
    console.error('Get logo error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar logo',
      error: error.message
    })
  }
})

// @route   PUT /api/banners/admin/logo
// @desc    Definir logo por URL absoluta (https://...) — alternativa ao upload
// @access  Private/Admin
router.put('/admin/logo', protect, isAdmin, async (req, res) => {
  try {
    const imageUrl = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : ''
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Informe imageUrl (URL https:// da imagem)'
      })
    }
    if (!/^https?:\/\//i.test(imageUrl)) {
      return res.status(400).json({
        success: false,
        message: 'A URL da logo deve começar com http:// ou https://'
      })
    }
    if (imageUrl.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'URL muito longa'
      })
    }
    const altText = typeof req.body?.altText === 'string' ? req.body.altText.trim().slice(0, 120) : 'Logo'

    await Logo.updateMany({}, { isActive: false })
    const logo = await Logo.create({
      imageUrl,
      altText: altText || 'Logo',
      isActive: true
    })

    res.json({
      success: true,
      message: 'Logo atualizada (URL)',
      data: { logo }
    })
  } catch (error) {
    console.error('Set logo URL error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar logo por URL',
      error: error.message
    })
  }
})

// @route   POST /api/banners/admin/logo
// @desc    Upload/Update logo (admin)
// @access  Private/Admin
router.post('/admin/logo', protect, isAdmin, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Imagem é obrigatória'
      })
    }

    const imageUrl = `/uploads/${req.file.filename}`

    // Deactivate all existing logos
    await Logo.updateMany({}, { isActive: false })

    // Create new active logo
    const logo = await Logo.create({
      imageUrl,
      altText: req.body.altText || 'Logo',
      isActive: true
    })

    res.json({
      success: true,
      message: 'Logo atualizado com sucesso',
      data: { logo }
    })
  } catch (error) {
    console.error('Upload logo error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer upload da logo',
      error: error.message
    })
  }
})

// @route   GET /api/banners/admin/logo
// @desc    Get logo (admin - can see inactive too)
// @access  Private/Admin
router.get('/admin/logo', protect, isAdmin, async (req, res) => {
  try {
    const logo = await Logo.findOne({ isActive: true })
    res.json({
      success: true,
      data: { logo: logo || null }
    })
  } catch (error) {
    console.error('Get logo admin error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar logo',
      error: error.message
    })
  }
})

export default router

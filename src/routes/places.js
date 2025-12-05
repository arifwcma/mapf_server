import express from 'express'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const router = express.Router()

// Load API key from sensitive_resources (gitignored)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const apiKeysPath = join(__dirname, '../../sensitive_resources/api_keys.json')

let GOOGLE_PLACES_API_KEY = ''
try {
    const apiKeys = JSON.parse(readFileSync(apiKeysPath, 'utf8'))
    GOOGLE_PLACES_API_KEY = apiKeys.GOOGLE_PLACES_API_KEY || ''
} catch (e) {
    console.warn('Warning: Could not load API keys from sensitive_resources/api_keys.json')
}

// Proxy for Places Autocomplete
router.get('/autocomplete', async (req, res) => {
    const { input } = req.query
    
    if (!input) {
        return res.status(400).json({ error: 'Missing input parameter' })
    }
    
    try {
        const params = new URLSearchParams({
            input,
            key: GOOGLE_PLACES_API_KEY,
            components: 'country:au',
            location: '-36.65,142.0',
            radius: '200000',
        })
        
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
        )
        
        const data = await response.json()
        res.json(data)
    } catch (error) {
        console.error('Places autocomplete error:', error)
        res.status(500).json({ error: 'Failed to fetch autocomplete results' })
    }
})

// Proxy for Place Details
router.get('/details', async (req, res) => {
    const { place_id } = req.query
    
    if (!place_id) {
        return res.status(400).json({ error: 'Missing place_id parameter' })
    }
    
    try {
        const params = new URLSearchParams({
            place_id,
            key: GOOGLE_PLACES_API_KEY,
            fields: 'geometry,name,formatted_address',
        })
        
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?${params}`
        )
        
        const data = await response.json()
        res.json(data)
    } catch (error) {
        console.error('Places details error:', error)
        res.status(500).json({ error: 'Failed to fetch place details' })
    }
})

export default router


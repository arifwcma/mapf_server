import express from 'express'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const router = express.Router()

let boundaryData = null

try {
    const boundaryPath = join(__dirname, '../../data/boundary.geojson')
    boundaryData = JSON.parse(readFileSync(boundaryPath, 'utf8'))
    console.log('Boundary data loaded successfully')
} catch (error) {
    console.error('Error loading boundary data:', error)
}

router.get('/', (req, res) => {
    if (!boundaryData) {
        return res.status(500).json({ error: 'Boundary data not loaded' })
    }
    res.json(boundaryData)
})

router.get('/bounds', (req, res) => {
    if (!boundaryData) {
        return res.status(500).json({ error: 'Boundary data not loaded' })
    }
    
    try {
        const feature = boundaryData.features[0]
        const coordinates = feature.geometry.coordinates
        
        let minLng = Infinity, maxLng = -Infinity
        let minLat = Infinity, maxLat = -Infinity
        
        for (const polygon of coordinates) {
            for (const ring of polygon) {
                for (const coord of ring) {
                    const [lng, lat] = coord
                    minLng = Math.min(minLng, lng)
                    maxLng = Math.max(maxLng, lng)
                    minLat = Math.min(minLat, lat)
                    maxLat = Math.max(maxLat, lat)
                }
            }
        }
        
        res.json({
            bounds: [[minLat, minLng], [maxLat, maxLng]],
            center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2]
        })
    } catch (error) {
        console.error('Error calculating bounds:', error)
        res.status(500).json({ error: 'Error calculating bounds' })
    }
})

export default router


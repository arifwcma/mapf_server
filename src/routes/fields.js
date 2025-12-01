import express from 'express'
import { WFS_BASE_URL, FIELD_SELECTION_MIN_ZOOM } from '../lib/config.js'

const router = express.Router()

router.get('/geojson', async (req, res) => {
    console.log('[API] GET /api/fields/geojson - Request received')
    const { bbox, zoom } = req.query
    
    const zoomNum = zoom ? parseFloat(zoom) : null
    
    if (zoomNum !== null && zoomNum < FIELD_SELECTION_MIN_ZOOM) {
        return res.json({
            type: 'FeatureCollection',
            features: []
        })
    }
    
    if (!bbox) {
        console.log('[API] No bbox parameter provided')
        return res.json({
            type: 'FeatureCollection',
            features: []
        })
    }
    
    try {
        const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(parseFloat)
        console.log('[API] Parsed bbox values:', { minLng, minLat, maxLng, maxLat })
        
        if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
            console.log('[API] Invalid bbox values (NaN detected)')
            return res.json({
                type: 'FeatureCollection',
                features: []
            })
        }
        
        const bboxParam = `${minLng},${minLat},${maxLng},${maxLat},EPSG:4326`
        const wfsUrl = `${WFS_BASE_URL}&SERVICE=WFS&VERSION=1.1.0&REQUEST=GetFeature&TYPENAME=PARCEL_VIEW&OUTPUTFORMAT=application/vnd.geo+json&SRSNAME=EPSG:4326&BBOX=${bboxParam}`
        
        console.log('[API] Fetching from WFS:', wfsUrl)
        
        const wfsResponse = await fetch(wfsUrl)
        
        if (!wfsResponse.ok) {
            console.error('[API] WFS request failed:', wfsResponse.status, wfsResponse.statusText)
            throw new Error(`WFS request failed: ${wfsResponse.status} ${wfsResponse.statusText}`)
        }
        
        const geoJsonData = await wfsResponse.json()
        console.log('[API] WFS response received', { 
            type: geoJsonData?.type, 
            featureCount: geoJsonData?.features?.length || 0 
        })
        
        res.json(geoJsonData)
    } catch (error) {
        console.error('[API] Error fetching from WFS:', error)
        res.status(500).json({ 
            error: 'Failed to fetch parcels from WFS', 
            details: error.message || String(error) 
        })
    }
})

export default router


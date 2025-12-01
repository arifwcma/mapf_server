import express from 'express'
import { getAverageIndexForArea, getAverageIndexTile, getAverageIndexThumbnail } from '../lib/earthengineUtils.js'
import { getMonthDateRange } from '../lib/dateUtils.js'
import { DEFAULT_CLOUD_TOLERANCE } from '../lib/config.js'
import { DEFAULT_INDEX, isValidIndex } from '../lib/indexConfig.js'

const router = express.Router()

router.get('/area/month', handleAreaMonth)
router.post('/area/month', handleAreaMonth)

async function handleAreaMonth(req, res) {
    let year, month, bbox, cloudParam, geometryParam, indexParam
    
    if (req.method === 'POST') {
        const body = req.body
        year = body.year
        month = body.month
        bbox = body.bbox
        cloudParam = body.cloud
        geometryParam = body.geometry
        indexParam = body.index
    } else {
        year = req.query.year
        month = req.query.month
        bbox = req.query.bbox
        cloudParam = req.query.cloud
        geometryParam = req.query.geometry
        indexParam = req.query.index
    }
    
    const indexName = indexParam || DEFAULT_INDEX

    if (!year || !month || !bbox) {
        return res.status(400).json({
            error: 'Missing required parameters: year, month, or bbox'
        })
    }

    if (!isValidIndex(indexName)) {
        return res.status(400).json({
            error: `Invalid index: ${indexName}`
        })
    }

    const yearNum = typeof year === 'number' ? year : parseInt(year, 10)
    const monthNum = typeof month === 'number' ? month : parseInt(month, 10)
    const cloudNum = cloudParam ? (typeof cloudParam === 'number' ? cloudParam : parseFloat(cloudParam)) : DEFAULT_CLOUD_TOLERANCE

    if (isNaN(yearNum) || isNaN(monthNum)) {
        return res.status(400).json({
            error: 'Invalid year or month parameter'
        })
    }

    if (cloudParam && (isNaN(cloudNum) || cloudNum < 0 || cloudNum > 100)) {
        return res.status(400).json({
            error: 'Invalid cloud parameter. Must be a number between 0 and 100'
        })
    }

    let geometry = null
    if (geometryParam) {
        if (typeof geometryParam === 'string') {
            try {
                geometry = JSON.parse(geometryParam)
            } catch (e) {
                return res.status(400).json({
                    error: 'Invalid geometry parameter. Must be valid JSON'
                })
            }
        } else {
            geometry = geometryParam
        }
    }

    const dateRange = getMonthDateRange(yearNum, monthNum)

    try {
        const value = await getAverageIndexForArea(dateRange.start, dateRange.end, bbox, cloudNum, geometry, indexName)
        res.json({
            year: yearNum,
            month: monthNum,
            value: value !== null && value !== undefined ? value : null,
            index: indexName
        })
    } catch (error) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error'
        if (errorMessage.includes('No images found') || errorMessage.includes('No value found')) {
            return res.json({
                year: yearNum,
                month: monthNum,
                value: null,
                index: indexName
            })
        }
        res.json({
            year: yearNum,
            month: monthNum,
            value: null,
            index: indexName
        })
    }
}

router.get('/average', handleAverage)
router.post('/average', handleAverage)

async function handleAverage(req, res) {
    let start, end, bbox, cloudParam, geometryParam, thumbnailParam, dimensions, indexParam
    
    if (req.method === 'POST') {
        const body = req.body
        start = body.start
        end = body.end
        bbox = body.bbox
        cloudParam = body.cloud
        geometryParam = body.geometry
        thumbnailParam = body.thumbnail
        dimensions = body.dimensions
        indexParam = body.index
    } else {
        start = req.query.start
        end = req.query.end
        bbox = req.query.bbox
        cloudParam = req.query.cloud
        geometryParam = req.query.geometry
        thumbnailParam = req.query.thumbnail
        dimensions = req.query.dimensions
        indexParam = req.query.index
    }
    
    const cloud = cloudParam ? parseFloat(cloudParam) : DEFAULT_CLOUD_TOLERANCE
    const indexName = indexParam || DEFAULT_INDEX

    if (!start || !end || !bbox) {
        return res.status(400).json({
            error: 'Missing required parameters: start, end, or bbox'
        })
    }

    if (!isValidIndex(indexName)) {
        return res.status(400).json({
            error: `Invalid index: ${indexName}`
        })
    }

    if (cloudParam && (isNaN(cloud) || cloud < 0 || cloud > 100)) {
        return res.status(400).json({
            error: 'Invalid cloud parameter. Must be a number between 0 and 100'
        })
    }

    let geometry = null
    if (geometryParam) {
        if (typeof geometryParam === 'string') {
            try {
                geometry = JSON.parse(geometryParam)
            } catch (e) {
                return res.status(400).json({
                    error: 'Invalid geometry parameter. Must be valid JSON'
                })
            }
        } else {
            geometry = geometryParam
        }
    }

    try {
        if (thumbnailParam === 'true' || thumbnailParam === true) {
            const dims = dimensions ? parseInt(dimensions, 10) : 1024
            const thumbUrl = await getAverageIndexThumbnail(start, end, bbox, cloud, geometry, dims, indexName)
            res.json({ thumbUrl, index: indexName })
        } else {
            const tileUrl = await getAverageIndexTile(start, end, bbox, cloud, geometry, indexName)
            res.json({ tileUrl, index: indexName })
        }
    } catch (error) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error'
        if (errorMessage.includes('No images found')) {
            return res.json({ tileUrl: null, thumbUrl: null, index: indexName, error: 'No images found' })
        }
        res.status(500).json({ error: errorMessage })
    }
}

export default router


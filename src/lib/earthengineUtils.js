import { ee, initEarthEngine } from './earthengine.js'
import { DEFAULT_CLOUD_TOLERANCE } from './config.js'
import { getMonthDateRange, getPreviousMonth } from './dateUtils.js'
import { bboxToArray, createPointBbox } from './bboxUtils.js'
import { getSentinel2Formula, getModisConfig, INDEX_VIS_CONFIG, DEFAULT_INDEX } from './indexConfig.js'

const SENTINEL2_START_DATE = '2019-01-01'

function shouldUseMODIS(startDate) {
    return startDate < SENTINEL2_START_DATE
}

function geoJsonToEeGeometry(geoJson) {
    if (!geoJson || !geoJson.geometry) {
        return null
    }

    const geom = geoJson.geometry
    const coords = geom.coordinates

    if (geom.type === 'Polygon') {
        const rings = coords.map(ring => 
            ring.map(([lng, lat]) => [lng, lat])
        )
        return ee.Geometry.Polygon(rings)
    } else if (geom.type === 'MultiPolygon') {
        const polygons = coords.map(polygon => 
            polygon.map(ring => 
                ring.map(([lng, lat]) => [lng, lat])
            )
        )
        return ee.Geometry.MultiPolygon(polygons)
    }

    return null
}

function parseBbox(bbox) {
    const bboxArray = Array.isArray(bbox) ? bboxToArray(bbox) : bbox.split(',').map(parseFloat)
    const [minLng, minLat, maxLng, maxLat] = bboxArray || []
    
    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
        throw new Error('Invalid bbox format')
    }
    
    return { minLng, minLat, maxLng, maxLat }
}

function createDateRange(start, end) {
    return {
        startDate: ee.Date(start),
        endDate: ee.Date(end).advance(1, 'day')
    }
}

async function getCollectionSize(collection) {
    return await new Promise((resolve, reject) => {
        collection.size().getInfo((size, err) => {
            if (err) {
                const errorMsg = err.message || err.toString() || 'Unknown Earth Engine error'
                reject(new Error(errorMsg))
                return
            }
            resolve(size)
        })
    })
}

async function getValue(eeValue) {
    return await new Promise((resolve, reject) => {
        eeValue.getInfo((value, err) => {
            if (err) {
                const errorMsg = err.message || err.toString() || 'Unknown Earth Engine error'
                reject(new Error(errorMsg))
                return
            }
            resolve(value)
        })
    })
}

async function getTileUrl(image, vis, region) {
    return await new Promise((resolve, reject) => {
        image.getMap({
            ...vis,
            region: region
        }, (mapObj, err) => {
            if (err) {
                reject(err)
                return
            }
            const tileUrl = `https://earthengine.googleapis.com/v1/${mapObj.mapid}/tiles/{z}/{x}/{y}`
            resolve(tileUrl)
        })
    })
}

async function getThumbUrl(image, vis, region, dimensions) {
    return await new Promise((resolve, reject) => {
        image.getThumbURL({
            dimensions: [dimensions, dimensions],
            region: region,
            format: 'png',
            min: vis.min,
            max: vis.max,
            palette: vis.palette
        }, (thumbUrl, err) => {
            if (err) {
                reject(new Error(err?.message || err?.toString() || 'Failed to generate thumbnail'))
                return
            }
            if (!thumbUrl) {
                reject(new Error('Thumbnail URL is null'))
                return
            }
            resolve(thumbUrl)
        })
    })
}

function createSentinel2Collection(rectangle, startDate, endDate, cloud, indexName) {
    const formula = getSentinel2Formula(indexName)
    return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(rectangle)
        .filterDate(startDate, endDate)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloud))
        .map(img => formula(img).rename(indexName))
}

function createModisCollection(rectangle, startDate, endDate, indexName) {
    const config = getModisConfig(indexName)
    
    if (config.type === 'precalculated') {
        return ee.ImageCollection(config.collection)
            .filterBounds(rectangle)
            .filterDate(startDate, endDate)
            .map(img => {
                const qa = img.select('SummaryQA')
                const mask = qa.eq(0)
                return img.select(config.band).multiply(config.scale).updateMask(mask).rename(indexName)
            })
    } else {
        return ee.ImageCollection(config.collection)
            .filterBounds(rectangle)
            .filterDate(startDate, endDate)
            .map(img => {
                const stateQA = img.select('StateQA')
                const cloudMask = stateQA.bitwiseAnd(3).eq(0)
                return config.formula(img).updateMask(cloudMask).rename(indexName)
            })
    }
}

export async function getAverageIndexForArea(start, end, bbox, cloud = DEFAULT_CLOUD_TOLERANCE, geometry = null, indexName = DEFAULT_INDEX) {
    if (shouldUseMODIS(start)) {
        return await getAverageIndexForAreaMODIS(start, end, bbox, geometry, indexName)
    }

    await initEarthEngine()

    const { minLng, minLat, maxLng, maxLat } = parseBbox(bbox)
    const { startDate, endDate } = createDateRange(start, end)
    const rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
    const clipGeometry = geometry ? geoJsonToEeGeometry(geometry) : rectangle

    if (!clipGeometry) {
        throw new Error('Invalid geometry format')
    }

    const collection = createSentinel2Collection(rectangle, startDate, endDate, cloud, indexName)
    const collectionSize = await getCollectionSize(collection)

    if (collectionSize === 0) {
        throw new Error('No images found')
    }

    const mean = collection.mean().clip(clipGeometry)
    const indexValue = mean.select(indexName).reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: clipGeometry,
        scale: 10,
        maxPixels: 1e9
    }).get(indexName)

    return await getValue(indexValue)
}

async function getAverageIndexForAreaMODIS(start, end, bbox, geometry = null, indexName = DEFAULT_INDEX) {
    await initEarthEngine()

    const { minLng, minLat, maxLng, maxLat } = parseBbox(bbox)
    const { startDate, endDate } = createDateRange(start, end)
    const rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
    const clipGeometry = geometry ? geoJsonToEeGeometry(geometry) : rectangle

    if (!clipGeometry) {
        throw new Error('Invalid geometry format')
    }

    const collection = createModisCollection(rectangle, startDate, endDate, indexName)
    const collectionSize = await getCollectionSize(collection)

    if (collectionSize === 0) {
        throw new Error('No images found')
    }

    const mean = collection.mean().clip(clipGeometry)
    const config = getModisConfig(indexName)
    const scale = config.type === 'precalculated' ? 250 : 500

    const indexValue = mean.select(indexName).reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: clipGeometry,
        scale: scale,
        maxPixels: 1e9
    }).get(indexName)

    return await getValue(indexValue)
}

export async function getAverageIndexTile(start, end, bbox, cloud = DEFAULT_CLOUD_TOLERANCE, geometry = null, indexName = DEFAULT_INDEX) {
    if (shouldUseMODIS(start)) {
        return await getAverageIndexTileMODIS(start, end, bbox, geometry, indexName)
    }

    await initEarthEngine()

    let { minLng, minLat, maxLng, maxLat } = parseBbox(bbox)
    const { startDate, endDate } = createDateRange(start, end)
    const originalRectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
    
    let rectangle
    let clipGeometry
    
    if (geometry === null) {
        const latDiff = maxLat - minLat
        const lngDiff = maxLng - minLng
        const buffer = Math.max(latDiff, lngDiff) * 0.2
        
        minLat -= buffer
        maxLat += buffer
        minLng -= buffer
        maxLng += buffer
        
        rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
        clipGeometry = originalRectangle
    } else {
        rectangle = originalRectangle
        clipGeometry = geoJsonToEeGeometry(geometry)
    }

    if (!clipGeometry) {
        throw new Error('Invalid geometry format')
    }

    const collection = createSentinel2Collection(rectangle, startDate, endDate, cloud, indexName)
    const collectionSize = await getCollectionSize(collection)

    if (collectionSize === 0) {
        throw new Error('No images found')
    }

    const mean = collection.sort('system:time_start', false).mosaic().clip(clipGeometry)
    return await getTileUrl(mean, INDEX_VIS_CONFIG, rectangle)
}

async function getAverageIndexTileMODIS(start, end, bbox, geometry = null, indexName = DEFAULT_INDEX) {
    await initEarthEngine()

    let { minLng, minLat, maxLng, maxLat } = parseBbox(bbox)
    const { startDate, endDate } = createDateRange(start, end)
    const originalRectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
    
    let rectangle
    let clipGeometry
    
    if (geometry === null) {
        const latDiff = maxLat - minLat
        const lngDiff = maxLng - minLng
        const buffer = Math.max(latDiff, lngDiff) * 0.2
        
        minLat -= buffer
        maxLat += buffer
        minLng -= buffer
        maxLng += buffer
        
        rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
        clipGeometry = originalRectangle
    } else {
        rectangle = originalRectangle
        clipGeometry = geoJsonToEeGeometry(geometry)
    }

    if (!clipGeometry) {
        throw new Error('Invalid geometry format')
    }

    const collection = createModisCollection(rectangle, startDate, endDate, indexName)
    const collectionSize = await getCollectionSize(collection)

    if (collectionSize === 0) {
        throw new Error('No images found')
    }

    const mean = collection.sort('system:time_start', false).mosaic().clip(clipGeometry)
    return await getTileUrl(mean, INDEX_VIS_CONFIG, rectangle)
}

export async function getAverageIndexThumbnail(start, end, bbox, cloud = DEFAULT_CLOUD_TOLERANCE, geometry = null, dimensions = 1024, indexName = DEFAULT_INDEX) {
    if (shouldUseMODIS(start)) {
        return await getAverageIndexThumbnailMODIS(start, end, bbox, geometry, dimensions, indexName)
    }

    await initEarthEngine()

    const { minLng, minLat, maxLng, maxLat } = parseBbox(bbox)
    const { startDate, endDate } = createDateRange(start, end)
    const rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
    const clipGeometry = geometry ? geoJsonToEeGeometry(geometry) : rectangle

    if (!clipGeometry) {
        throw new Error('Invalid geometry format')
    }

    const collection = createSentinel2Collection(rectangle, startDate, endDate, cloud, indexName)
    const collectionSize = await getCollectionSize(collection)

    if (collectionSize === 0) {
        throw new Error('No images found')
    }

    const mean = collection.mean().clip(clipGeometry)
    return await getThumbUrl(mean, INDEX_VIS_CONFIG, rectangle, dimensions)
}

async function getAverageIndexThumbnailMODIS(start, end, bbox, geometry = null, dimensions = 1024, indexName = DEFAULT_INDEX) {
    await initEarthEngine()

    const { minLng, minLat, maxLng, maxLat } = parseBbox(bbox)
    const { startDate, endDate } = createDateRange(start, end)
    const rectangle = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat])
    const clipGeometry = geometry ? geoJsonToEeGeometry(geometry) : rectangle

    if (!clipGeometry) {
        throw new Error('Invalid geometry format')
    }

    const collection = createModisCollection(rectangle, startDate, endDate, indexName)
    const collectionSize = await getCollectionSize(collection)

    if (collectionSize === 0) {
        throw new Error('No images found')
    }

    const mean = collection.mean().clip(clipGeometry)
    return await getThumbUrl(mean, INDEX_VIS_CONFIG, rectangle, dimensions)
}


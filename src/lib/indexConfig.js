import { ee } from './earthengine.js'

export const INDEX_LIST = [
    'NDVI', 'EVI', 'SAVI', 'OSAVI', 'GNDVI', 'NDSI', 'ARVI', 'NDWI', 'MNDWI'
]

export const DEFAULT_INDEX = 'NDVI'

export const INDEX_VIS_CONFIG = {
    min: -1,
    max: 1,
    palette: ['darkred', 'orangered', 'red', 'yellow', 'darkgreen']
}

export function getSentinel2Formula(indexName) {
    const formulas = {
        NDVI: (img) => img.normalizedDifference(['B8', 'B4']),
        EVI: (img) => img.expression(
            '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))',
            {
                NIR: img.select('B8'),
                RED: img.select('B4'),
                BLUE: img.select('B2')
            }
        ),
        SAVI: (img) => img.expression(
            '1.5 * ((NIR - RED) / (NIR + RED + 0.5))',
            {
                NIR: img.select('B8'),
                RED: img.select('B4')
            }
        ),
        OSAVI: (img) => img.expression(
            '(NIR - RED) / (NIR + RED + 0.16)',
            {
                NIR: img.select('B8'),
                RED: img.select('B4')
            }
        ),
        GNDVI: (img) => img.normalizedDifference(['B8', 'B3']),
        NDSI: (img) => img.normalizedDifference(['B3', 'B11']),
        ARVI: (img) => img.expression(
            '(NIR - (2 * RED - BLUE)) / (NIR + (2 * RED - BLUE))',
            {
                NIR: img.select('B8'),
                RED: img.select('B4'),
                BLUE: img.select('B2')
            }
        ),
        NDWI: (img) => img.normalizedDifference(['B8', 'B11']),
        MNDWI: (img) => img.normalizedDifference(['B3', 'B11'])
    }
    
    const formula = formulas[indexName]
    if (!formula) {
        throw new Error(`Unknown index: ${indexName}`)
    }
    return formula
}

export function getModisConfig(indexName) {
    const preCalculated = {
        NDVI: { band: 'NDVI', scale: 0.0001 },
        EVI: { band: 'EVI', scale: 0.0001 }
    }
    
    if (preCalculated[indexName]) {
        return {
            type: 'precalculated',
            collection: 'MODIS/061/MOD13Q1',
            ...preCalculated[indexName]
        }
    }
    
    const formulas = {
        SAVI: (img) => img.expression(
            '1.5 * ((NIR - RED) / (NIR + RED + 0.5))',
            {
                NIR: img.select('sur_refl_b02'),
                RED: img.select('sur_refl_b01')
            }
        ),
        OSAVI: (img) => img.expression(
            '(NIR - RED) / (NIR + RED + 0.16)',
            {
                NIR: img.select('sur_refl_b02'),
                RED: img.select('sur_refl_b01')
            }
        ),
        GNDVI: (img) => img.expression(
            '(NIR - GREEN) / (NIR + GREEN)',
            {
                NIR: img.select('sur_refl_b02'),
                GREEN: img.select('sur_refl_b04')
            }
        ),
        NDSI: (img) => img.expression(
            '(GREEN - SWIR) / (GREEN + SWIR)',
            {
                GREEN: img.select('sur_refl_b04'),
                SWIR: img.select('sur_refl_b06')
            }
        ),
        ARVI: (img) => img.expression(
            '(NIR - (2 * RED - BLUE)) / (NIR + (2 * RED - BLUE))',
            {
                NIR: img.select('sur_refl_b02'),
                RED: img.select('sur_refl_b01'),
                BLUE: img.select('sur_refl_b03')
            }
        ),
        NDWI: (img) => img.expression(
            '(NIR - SWIR) / (NIR + SWIR)',
            {
                NIR: img.select('sur_refl_b02'),
                SWIR: img.select('sur_refl_b06')
            }
        ),
        MNDWI: (img) => img.expression(
            '(GREEN - SWIR) / (GREEN + SWIR)',
            {
                GREEN: img.select('sur_refl_b04'),
                SWIR: img.select('sur_refl_b06')
            }
        )
    }
    
    if (formulas[indexName]) {
        return {
            type: 'calculated',
            collection: 'MODIS/061/MOD09A1',
            formula: formulas[indexName]
        }
    }
    
    throw new Error(`Unknown index for MODIS: ${indexName}`)
}

export function isValidIndex(indexName) {
    return INDEX_LIST.includes(indexName)
}


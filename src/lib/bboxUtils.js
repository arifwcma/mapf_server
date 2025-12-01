export function bboxToString(bbox) {
    if (!bbox || !Array.isArray(bbox) || bbox.length !== 2) {
        return null
    }
    return `${bbox[0][1]},${bbox[0][0]},${bbox[1][1]},${bbox[1][0]}`
}

export function bboxToArray(bbox) {
    if (!bbox || !Array.isArray(bbox) || bbox.length !== 2) {
        return null
    }
    return [bbox[0][1], bbox[0][0], bbox[1][1], bbox[1][0]]
}

export function getAreaCenter(area) {
    if (area.bounds) {
        const centerLat = (area.bounds[0][0] + area.bounds[1][0]) / 2
        const centerLon = (area.bounds[0][1] + area.bounds[1][1]) / 2
        return { lat: centerLat, lon: centerLon }
    }
    if (area.geometry?.geometry?.type === 'Polygon' && area.geometry.geometry.coordinates?.[0]) {
        const coords = area.geometry.geometry.coordinates[0]
        let sumLat = 0, sumLon = 0
        for (let i = 0; i < coords.length - 1; i++) {
            sumLon += coords[i][0]
            sumLat += coords[i][1]
        }
        return {
            lat: sumLat / (coords.length - 1),
            lon: sumLon / (coords.length - 1)
        }
    }
    return null
}

export function createPointBbox(lat, lon, bufferDegrees = 0.01) {
    return [
        [lat - bufferDegrees, lon - bufferDegrees],
        [lat + bufferDegrees, lon + bufferDegrees]
    ]
}


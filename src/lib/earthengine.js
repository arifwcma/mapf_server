import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ee from '@google/earthengine'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let initialized = false

export async function initEarthEngine() {
    if (initialized) return

    const serviceAccountPath = path.join(__dirname, '..', '..', 'sensitive_resources', 'service-account.json')
    
    if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(`Service account file not found at: ${serviceAccountPath}`)
    }
    
    const privateKey = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

    await new Promise((resolve, reject) => {
        ee.data.authenticateViaPrivateKey(privateKey, () => {
            ee.initialize(null, null, () => {
                console.log('✅ Earth Engine initialized')
                initialized = true
                resolve()
            }, reject)
        })
    })
}

export { ee }


import express from 'express'
import cors from 'cors'
import { initEarthEngine } from './lib/earthengine.js'

import fieldsRouter from './routes/fields.js'
import indexRouter from './routes/index.js'
import shareRouter from './routes/share.js'
import boundaryRouter from './routes/boundary.js'
import placesRouter from './routes/places.js'

const app = express()
const PORT = process.env.PORT || 3003

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api/fields', fieldsRouter)
app.use('/api/index', indexRouter)
app.use('/api/share', shareRouter)
app.use('/api/boundary', boundaryRouter)
app.use('/api/places', placesRouter)

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

async function startServer() {
    try {
        console.log('Initializing Earth Engine...')
        await initEarthEngine()
        console.log('Earth Engine initialized successfully')
        
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })
    } catch (error) {
        console.error('Failed to start server:', error)
        process.exit(1)
    }
}

startServer()


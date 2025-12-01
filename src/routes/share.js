import express from 'express'
import { randomUUID } from 'crypto'
import { saveShare, getShare } from '../lib/db.js'

const router = express.Router()

router.post('/save', async (req, res) => {
    try {
        const state = req.body
        const token = randomUUID()
        saveShare(token, state)
        
        res.json({ token })
    } catch (error) {
        console.error('Error saving share:', error)
        res.status(500).json({ error: 'Failed to save share' })
    }
})

router.get('/:token', async (req, res) => {
    try {
        const { token } = req.params
        const state = getShare(token)
        
        if (!state) {
            return res.status(404).json({ error: 'Share not found' })
        }
        
        res.json({ state })
    } catch (error) {
        console.error('Error loading share:', error)
        res.status(500).json({ error: 'Failed to load share' })
    }
})

export default router


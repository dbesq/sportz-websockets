import { Router } from 'express'
import { createMatchSchema, listMatchesQuerySchema } from '../validation/matches.js'
import { matches } from '../db/schema.js'
import { db } from '../db/db.js'
import { getMatchStatus } from '../utils/match-status.js'
import { desc } from 'drizzle-orm'

export const matchRouter = Router()

const MAX_LIMIT = 100

matchRouter.get('/', async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query)

    if(!parsed.success) {
        return res.status(400).json({
            error: 'Invalid query',
            details: JSON.stringify(parsed.error)
        })
    }
    
    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT)

    try {
        const data = await db
            .select()
            .from(matches)
            .orderBy((desc(matches.createdAt)))
            .limit(limit)

        res.json({ data })
    } catch (error) {
        res.status(500).json({ error: 'Failed to list matches.' })
    }
})

matchRouter.post('/', async (req, res) => {
    // Frontend sends over req.body
    const parsed = createMatchSchema.safeParse(req.body)
    const { data: { startTime, endTime, homeScore, awayScore }} = parsed

    if(!parsed.success) {
        return res.status(400).json({
            error: 'Invalid payload',
            details: JSON.stringify(parsed.error)
        })
    }

    try {
        // Insert into the matches table
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            awayScore: awayScore ?? 0,
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            startTime: new Date(startTime),
            status: getMatchStatus(startTime, endTime), 
        }).returning()

        res.status(201).json({ data: event })
    } catch (error) {
        res.status(500).json({ error: 'Failed to create match.', details: JSON.stringify(error) })
    }
})
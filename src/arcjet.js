// Protects REST through middleware in src/index
// Protects WS through ws/server

import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node"

const arcjetKey = process.env.ARCJET_KEY
const arcjetMode = process.env.ARCJET_MODE === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE'

if(!arcjetKey) throw new Error('ARCJECT_KEY environment variable is missing.')

export const httpArcjet = arcjetKey ?
    arcjet({
        key: arcjetKey,
        rules: [
            shield({ mode: arcjetMode }),  // Protects against most common threats
            detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'] }), // Permit search engines to crawl
            slidingWindow({ mode: arcjetMode, interval: '10s', max: 50 })  // Allow 50 requests every 10s f/ IP address
        ]
    }) : null 

export const wsArcjet = arcjetKey ?
    arcjet({
        key: arcjetKey,
        rules: [
            shield({ mode: arcjetMode }),  // Protects against most common threats
            detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'] }), // Permit search engines to crawl
            slidingWindow({ mode: arcjetMode, interval: '2s', max: 5 })  // Allow 5 requests every 2s f/ IP address
        ]
    }) : null

// Wrapper function to protect REST 
export function securityMiddleware() {
    return async (req, res, next) => {
        if(!httpArcjet) return next()

        try {
            const decision = await httpArcjet.protect(req)

            if(decision.isDenied) {
                if(decision.reason.isRateLimit) {
                    return res.status(429).json({ error: 'Too many requests' })
                }

                return res.status(403).json({ error: 'Forbidden' })
            }
        } catch (error) {
            console.error('Arcjet middleware error')
            console.error(error)
            return res.status(502).json({ error: 'Service unavailable' })
        }

        next()  // Allowed, go to next step            
    }
}


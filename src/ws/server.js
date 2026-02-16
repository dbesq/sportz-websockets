import { WebSocket, WebSocketServer } from 'ws'

/**
 * Send a JSON-serializable payload over a WebSocket if the socket is open.
 *
 * Does nothing when the socket is not in the OPEN state.
 * @param {WebSocket} socket - The WebSocket to send the message on.
 * @param {*} payload - The value to JSON-stringify and transmit.
 */
function sendJson(socket, payload) {
    if(socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

/**
 * Broadcasts a JSON-serializable payload to every client currently connected and open on the given WebSocketServer.
 *
 * Skips clients that are not in the `OPEN` ready state.
 * @param {import('ws').WebSocketServer} wss - The WebSocketServer whose connected clients will receive the message.
 * @param {*} payload - The value to serialize with `JSON.stringify` and send to each open client.
 */
function broadcast(wss, payload) {
    for (const client of wss.clients)  {
        if(client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }
}

/**
 * Attach a WebSocketServer at path `/ws` to an existing HTTP/Express server and expose a helper to broadcast match creation events.
 *
 * @param {import('http').Server} server - The HTTP or Express server instance to attach the WebSocketServer to.
 * @returns {{ broadcastMatchCreated: (match: any) => void }} An object with `broadcastMatchCreated(match)` which broadcasts a `{ type: 'match_created', data: match }` message to all connected clients.
 */
export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server,  // attach wss to express server
        path: '/ws',  // Separate websocket from other info
        maxPayload: 1024 * 1024, // 1MB
    })

    wss.on('connection', (socket) => {
        sendJson(socket, { type: 'welcome' })

        socket.on('error', console.error)
    })

    // Broadcast match_created events to entire app
    function broadcastMatchCreated(match) {
        broadcast(wss, { type: 'match_created', data: match })
    }

    return { broadcastMatchCreated }
}


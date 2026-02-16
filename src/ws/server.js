
import { WebSocket, WebSocketServer } from 'ws'

function sendJson(socket, payload) {
    if(socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
    for (const client of wss.clients)  {
        if(client.readyState !== WebSocket.OPEN) continue;  // Use continue to skip clients not open

        client.send(JSON.stringify(payload));
    }
}

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server,  // attach wss to express server
        path: '/ws',  // Separate websocket from other info
        maxPayload: 1024 * 1024, // 1MB
    })

    wss.on('connection', (socket) => {
        socket.isAlive = true  // Attach isAlive to socket
        socket.on('pong', () => { socket.isAlive = true })  // Confirm isAlive still true

        sendJson(socket, { type: 'welcome' })

        socket.on('error', console.error)
    })

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if(ws.isAlive === false) return ws.terminate()
                ws.isAlive = false
                ws.ping()  // Ping it and if it does not respond w/i interval, it dies
    })}, 30000)

        wss.on('close', () => clearInterval(interval))

        // Broadcast match_created events to entire app
        function broadcastMatchCreated(match) {
            broadcast(wss, { type: 'match_created', data: match })
        }

    return { broadcastMatchCreated }
}
    





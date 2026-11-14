/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import { WebSocketServer, WebSocket } from 'ws'

function buraWebSocketPlugin(): Plugin {
  return {
    name: 'bura-websocket-signaling',
    configureServer(server) {
      setupSignaling(server.httpServer)
    },
    configurePreviewServer(server) {
      setupSignaling(server.httpServer)
    },
  }
}

function setupSignaling(httpServer: any) {
  if (!httpServer) return
  const wss = new WebSocketServer({ noServer: true })
  const rooms = new Map<string, Set<WebSocket>>()

  httpServer.on('upgrade', (req: any, socket: any, head: any) => {
    if (req.url === '/ws-bura' || req.url?.startsWith('/ws-bura')) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req)
      })
    }
  })

  wss.on('connection', (ws) => {
    let currentRoom: string | null = null

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString())
        if (data.type === 'JOIN_ROOM') {
          currentRoom = data.roomCode
          if (!rooms.has(currentRoom!)) {
            rooms.set(currentRoom!, new Set())
          }
          rooms.get(currentRoom!)!.add(ws)

          // If 2 or more peers in room, notify all that peer is connected
          const roomSockets = rooms.get(currentRoom!)!
          if (roomSockets.size >= 2) {
            for (const client of roomSockets) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'PEER_CONNECTED' }))
              }
            }
          }
        } else if (data.type === 'RELAY') {
          if (currentRoom && rooms.has(currentRoom)) {
            for (const client of rooms.get(currentRoom)!) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'RELAY_MSG', msg: data.msg }))
              }
            }
          }
        }
      } catch (e) {
        // ignore parse error
      }
    })

    ws.on('close', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        const set = rooms.get(currentRoom)!
        set.delete(ws)
        if (set.size === 0) {
          rooms.delete(currentRoom)
        } else {
          for (const client of set) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'PEER_DISCONNECTED' }))
            }
          }
        }
      }
    })
  })
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), buraWebSocketPlugin()],
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  test: {
    environment: 'jsdom',
  },
})

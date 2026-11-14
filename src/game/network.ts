import { Peer, type DataConnection } from 'peerjs'
import type {
  BuildSanitizedStateParams,
  Card,
  ChainBattleState,
  Combination,
  ConnectionStatus,
  GameRuleType,
  MatchScore,
  NetworkMessage,
  OnlineRole,
  PlayerId,
  RoundResult,
  SanitizedGameState,
  Suit,
  Trick,
} from './types'
import { calculateCardsPoints } from './rules'

const PEER_PREFIX = 'bura-v1-'
const SESSION_STORAGE_KEY = 'bura_active_online_session'

export interface SavedSession {
  roomCode: string
  role: OnlineRole
  ruleType?: GameRuleType
}

export function saveOnlineSession(roomCode: string, role: OnlineRole, ruleType?: GameRuleType) {
  if (typeof window === 'undefined') return
  try {
    const data: SavedSession = { roomCode, role, ruleType }
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data))
    syncUrlRoom(roomCode)
  } catch {}
}

export function getSavedOnlineSession(): SavedSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedSession
  } catch {
    return null
  }
}

export function clearOnlineSession() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    syncUrlRoom(null)
  } catch {}
}

export function syncUrlRoom(roomCode: string | null) {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    if (roomCode) {
      url.searchParams.set('room', roomCode)
    } else {
      url.searchParams.delete('room')
    }
    window.history.replaceState({}, '', url.toString())
  } catch {}
}

export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return `BURA-${result}`
}

export function normalizeRoomCode(raw: string): string {
  const cleaned = raw.trim().toUpperCase()
  if (cleaned.startsWith('BURA-')) return cleaned
  return `BURA-${cleaned}`
}

export class BuraNetworkManager {
  private peer: Peer | null = null
  private connection: DataConnection | null = null
  private ws: WebSocket | null = null
  private broadcastChannel: BroadcastChannel | null = null

  public role: OnlineRole = null
  public status: ConnectionStatus = 'idle'
  public roomCode: string = ''
  public opponentName: string = ''
  public error: string | null = null

  private messageListeners: Array<(msg: NetworkMessage) => void> = []
  private statusListeners: Array<(status: ConnectionStatus) => void> = []
  private seenMessageIds = new Set<string>()

  public onMessage(cb: (msg: NetworkMessage) => void) {
    this.messageListeners.push(cb)
    return () => {
      this.messageListeners = this.messageListeners.filter((l) => l !== cb)
    }
  }

  public onStatusChange(cb: (status: ConnectionStatus) => void) {
    this.statusListeners.push(cb)
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== cb)
    }
  }

  private setStatus(status: ConnectionStatus, err: string | null = null) {
    this.status = status
    this.error = err
    this.statusListeners.forEach((l) => l(status))
  }

  private handleIncomingData(raw: unknown) {
    if (!raw || typeof raw !== 'object') return
    const envelope = raw as Record<string, unknown>
    const mid = envelope._mid as string | undefined
    if (mid) {
      if (this.seenMessageIds.has(mid)) return
      this.seenMessageIds.add(mid)
      if (this.seenMessageIds.size > 200) {
        const first = this.seenMessageIds.values().next().value
        if (first) this.seenMessageIds.delete(first)
      }
    }

    const msg = raw as NetworkMessage
    // If we received any valid message from peer, we are connected!
    if (this.status !== 'connected') {
      this.setStatus('connected')
    }

    this.messageListeners.forEach((l) => l(msg))
  }

  /**
   * Host creates an online room (Immediate resolution: 0ms delay!)
   */
  public createRoom(code?: string, ruleType?: GameRuleType): Promise<string> {
    this.disconnect()
    this.role = 'host'

    const roomCode = code ? normalizeRoomCode(code) : generateRoomCode()
    this.roomCode = roomCode
    this.setStatus('connecting')

    saveOnlineSession(roomCode, 'host', ruleType)

    // 1. Channel A: BroadcastChannel (Instant local same-browser synchronization)
    this.initBroadcastChannel(roomCode)

    // 2. Channel B: Local/LAN WebSocket server
    this.initWebSocket(roomCode)

    // 3. Channel C: WebRTC PeerJS (non-blocking background connect)
    this.initPeerHost(roomCode)

    return Promise.resolve(roomCode)
  }

  /**
   * Client joins an existing room (Immediate resolution)
   */
  public joinRoom(rawCode: string): Promise<void> {
    this.disconnect()
    this.role = 'client'

    const roomCode = normalizeRoomCode(rawCode)
    this.roomCode = roomCode
    this.setStatus('connecting')

    saveOnlineSession(roomCode, 'client')

    // 1. Channel A: BroadcastChannel
    this.initBroadcastChannel(roomCode)

    // 2. Channel B: WebSocket
    this.initWebSocket(roomCode)

    // 3. Channel C: WebRTC PeerJS client
    this.initPeerClient(roomCode)

    // Send initial join ping
    setTimeout(() => {
      this.send({ type: 'HEARTBEAT' })
    }, 100)

    return Promise.resolve()
  }

  private initBroadcastChannel(roomCode: string) {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return
    try {
      this.broadcastChannel = new BroadcastChannel(`bura_room_${roomCode.toLowerCase()}`)
      this.broadcastChannel.onmessage = (event) => {
        const { msg, role } = event.data || {}
        if (msg) {
          if (role !== this.role) {
            if (this.status !== 'connected') {
              this.setStatus('connected')
            }
            this.handleIncomingData(msg)
          }
        }
      }

      // Announce presence
      this.broadcastChannel.postMessage({
        type: 'HELLO',
        role: this.role,
        roomCode,
      })
    } catch {
      // ignore
    }
  }

  private initWebSocket(roomCode: string) {
    if (typeof window === 'undefined') return
    try {
      const isHttps = window.location.protocol === 'https:'
      const wsProtocol = isHttps ? 'wss:' : 'ws:'
      const wsUrl = `${wsProtocol}//${window.location.host}/ws-bura`

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        if (!this.ws) return
        this.ws.send(
          JSON.stringify({
            type: 'JOIN_ROOM',
            roomCode,
            role: this.role,
          })
        )
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'PEER_CONNECTED') {
            this.setStatus('connected')
          } else if (data.type === 'PEER_DISCONNECTED') {
            if (this.status === 'connected') {
              this.setStatus('disconnected')
            }
          } else if (data.type === 'RELAY_MSG' && data.msg) {
            this.handleIncomingData(data.msg)
          }
        } catch {
          // ignore
        }
      }

      this.ws.onerror = () => {
        // WebSocket local fallback gracefully allows BroadcastChannel & PeerJS to handle
      }
    } catch {
      // ignore
    }
  }

  private initPeerHost(roomCode: string) {
    try {
      const peerId = `${PEER_PREFIX}${roomCode.toLowerCase()}`
      this.peer = new Peer(peerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      })

      this.peer.on('connection', (conn) => {
        this.connection = conn
        this.setupConnectionListeners(conn)
        this.setStatus('connected')
      })

      this.peer.on('error', (err) => {
        console.warn('WebRTC peer note:', err.type)
      })
    } catch {
      // ignore
    }
  }

  private initPeerClient(roomCode: string) {
    try {
      const hostPeerId = `${PEER_PREFIX}${roomCode.toLowerCase()}`
      this.peer = new Peer({
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      })

      this.peer.on('open', () => {
        if (!this.peer) return
        const conn = this.peer.connect(hostPeerId, { reliable: true })
        this.connection = conn
        this.setupConnectionListeners(conn)
      })

      this.peer.on('error', (err) => {
        console.warn('WebRTC client note:', err.type)
      })
    } catch {
      // ignore
    }
  }

  private setupConnectionListeners(conn: DataConnection) {
    conn.on('data', (data) => {
      this.handleIncomingData(data)
    })

    conn.on('open', () => {
      this.setStatus('connected')
    })

    conn.on('close', () => {
      if (this.status === 'connected') {
        this.setStatus('disconnected')
      }
    })
  }

  public send(msg: NetworkMessage) {
    const stamped = {
      ...msg,
      _mid: `${this.role}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      _ts: Date.now(),
    }

    // 1. Send to BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          msg: stamped,
          role: this.role,
          roomCode: this.roomCode,
        })
      } catch {}
    }

    // 2. Send to WebSocket server
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: 'RELAY',
            roomCode: this.roomCode,
            msg: stamped,
          })
        )
      } catch {}
    }

    // 3. Send to WebRTC DataConnection
    if (this.connection && this.connection.open) {
      try {
        this.connection.send(stamped)
      } catch {}
    }
  }

  public disconnect(clearSession = false) {
    if (clearSession) {
      clearOnlineSession()
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close()
      } catch {}
      this.broadcastChannel = null
    }

    if (this.ws) {
      try {
        this.ws.close()
      } catch {}
      this.ws = null
    }

    if (this.connection) {
      try {
        this.connection.close()
      } catch {}
      this.connection = null
    }

    if (this.peer) {
      try {
        this.peer.destroy()
      } catch {}
      this.peer = null
    }

    this.role = null
    this.setStatus('idle')
    this.roomCode = ''
  }

  public leaveRoom() {
    this.disconnect(true)
  }
}

export const networkManager = new BuraNetworkManager()

/**
 * Sanitizes the host authoritative state to safely send to the online client.
 * Hides host's cards to ensure strict fog-of-war secrecy.
 * Accepts either an options object or positional arguments.
 */
export function buildSanitizedStateForClient(
  firstArg: BuildSanitizedStateParams | 'lead' | 'response' | 'evaluating' | 'round_ended' | 'match_ended',
  ...restArgs: any[]
): SanitizedGameState {
  if (typeof firstArg === 'object' && firstArg !== null) {
    const p = firstArg
    const hostHandCards = Array.isArray(p.hostHand) ? p.hostHand : []
    const clientHandCards = Array.isArray(p.clientHand) ? p.clientHand : []
    const hostTricksCards = Array.isArray(p.hostTricks) ? p.hostTricks : []
    const clientTricksCards = Array.isArray(p.clientTricks) ? p.clientTricks : []

    return {
      phase: p.phase,
      ruleType: p.ruleType || 'duel_classic_4',
      activePlayer: p.activePlayer,
      leadPlayer: p.leadPlayer,
      deckCount: typeof p.deckCount === 'number' ? p.deckCount : 0,
      trumpCard: p.trumpCard,
      trumpSuit: p.trumpSuit,
      tableLeadCards: Array.isArray(p.tableLeadCards) ? p.tableLeadCards : [],
      tableResponseCards: Array.isArray(p.tableResponseCards) ? p.tableResponseCards : [],
      chainBattle: p.chainBattle || null,
      trickResolutionText: p.trickResolutionText,
      roundResult: p.roundResult,
      matchScore: p.matchScore,
      lastTrick: p.lastTrick,
      combinationNotice: p.combinationNotice,
      myHand: clientHandCards,
      opponentHandCount: hostHandCards.length,
      myTricks: clientTricksCards,
      opponentTricksCount: hostTricksCards.length,
      myTricksPoints: calculateCardsPoints(clientTricksCards),
      hostName: p.hostName,
      clientName: p.clientName,
    }
  }

  const phase = firstArg
  let ruleType: GameRuleType = 'duel_classic_4'
  let activePlayer: PlayerId = 'player'
  let leadPlayer: PlayerId | null = null
  let deckCount = 0
  let trumpCard: Card | null = null
  let trumpSuit: Suit = 'spades'
  let tableLeadCards: Card[] = []
  let tableResponseCards: Card[] = []
  let chainBattle: ChainBattleState | null = null
  let trickResolutionText: string | null = null
  let roundResult: RoundResult | null = null
  let matchScore: MatchScore = { player: 0, opponent: 0, target: 11 }
  let lastTrick: Trick | null = null
  let combinationNotice: Combination | null = null
  let hostHand: Card[] = []
  let clientHand: Card[] = []
  let hostTricks: Card[] = []
  let clientTricks: Card[] = []
  let hostName = 'Хост'
  let clientName = 'Гость'

  if (
    typeof restArgs[0] === 'string' &&
    (restArgs[0].startsWith('duel_') || restArgs[0] === 'ffa_3' || restArgs[0] === 'ffa_4' || restArgs[0] === 'teams_4')
  ) {
    ruleType = restArgs[0] as GameRuleType
    activePlayer = restArgs[1]
    leadPlayer = restArgs[2]
    deckCount = restArgs[3]
    trumpCard = restArgs[4]
    trumpSuit = restArgs[5]
    tableLeadCards = restArgs[6] || []
    tableResponseCards = restArgs[7] || []
    chainBattle = restArgs[8] || null
    trickResolutionText = restArgs[9]
    roundResult = restArgs[10]
    matchScore = restArgs[11]
    lastTrick = restArgs[12]
    combinationNotice = restArgs[13]
    hostHand = restArgs[14] || []
    clientHand = restArgs[15] || []
    hostTricks = restArgs[16] || []
    clientTricks = restArgs[17] || []
    hostName = restArgs[18] || ''
    clientName = restArgs[19] || ''
  } else {
    activePlayer = restArgs[0]
    leadPlayer = restArgs[1]
    deckCount = restArgs[2]
    trumpCard = restArgs[3]
    trumpSuit = restArgs[4]
    tableLeadCards = restArgs[5] || []
    tableResponseCards = restArgs[6] || []
    trickResolutionText = restArgs[7]
    roundResult = restArgs[8]
    matchScore = restArgs[9]
    lastTrick = restArgs[10]
    combinationNotice = restArgs[11]
    hostHand = restArgs[12] || []
    clientHand = restArgs[13] || []
    hostTricks = restArgs[14] || []
    clientTricks = restArgs[15] || []
    hostName = restArgs[16] || ''
    clientName = restArgs[17] || ''
  }

  const hostHandCards = Array.isArray(hostHand) ? hostHand : []
  const clientHandCards = Array.isArray(clientHand) ? clientHand : []
  const hostTricksCards = Array.isArray(hostTricks) ? hostTricks : []
  const clientTricksCards = Array.isArray(clientTricks) ? clientTricks : []

  return {
    phase,
    ruleType,
    activePlayer,
    leadPlayer,
    deckCount: typeof deckCount === 'number' ? deckCount : 0,
    trumpCard,
    trumpSuit,
    tableLeadCards: Array.isArray(tableLeadCards) ? tableLeadCards : [],
    tableResponseCards: Array.isArray(tableResponseCards) ? tableResponseCards : [],
    chainBattle,
    trickResolutionText,
    roundResult,
    matchScore,
    lastTrick,
    combinationNotice,
    myHand: clientHandCards,
    opponentHandCount: hostHandCards.length,
    myTricks: clientTricksCards,
    opponentTricksCount: hostTricksCards.length,
    myTricksPoints: calculateCardsPoints(clientTricksCards),
    hostName,
    clientName,
  }
}

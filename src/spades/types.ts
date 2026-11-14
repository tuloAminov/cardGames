export type SpadesSuit = '♠' | '♥' | '♦' | '♣'

export type SpadesRank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface SpadesCard {
  id: string
  suit: SpadesSuit
  rank: SpadesRank
  name: string
  suitNameRu: string
  isTrump: boolean
}

export type SpadesPlayerId = 0 | 1 | 2 | 3
// 0: You (South, Team 0)
// 1: Opponent 1 (West, Team 1)
// 2: Partner (North, Team 0)
// 3: Opponent 2 (East, Team 1)

export interface SpadesPlayer {
  id: SpadesPlayerId
  name: string
  teamId: 0 | 1
  isAI: boolean
  hand: SpadesCard[]
  bid: number | null // null before bid, 0 for Nil, 1..13
  tricksWon: number
  avatar: string
}

export interface PlayedTrickCard {
  playerId: SpadesPlayerId
  playerName: string
  card: SpadesCard
}

export interface SpadesTrick {
  trickNumber: number
  plays: PlayedTrickCard[]
  leadSuit: SpadesSuit | null
  winnerId: SpadesPlayerId | null
  winningCard: SpadesCard | null
}

export interface PlayerRoundRecord {
  playerId: SpadesPlayerId
  name: string
  bid: number
  tricksWon: number
  isNil: boolean
  nilSuccess: boolean | null
  nilPoints: number
}

export interface TeamRoundScore {
  teamId: 0 | 1
  teamName: string
  playerRecords: PlayerRoundRecord[]
  contractBid: number
  tricksWon: number
  contractMade: boolean
  contractPoints: number
  overtricks: number
  nilPointsTotal: number
  bagsBefore: number
  bagsAdded: number
  bagPenalty: number
  bagsAfter: number
  totalRoundPoints: number
  scoreBefore: number
  scoreAfter: number
}

export interface SpadesRoundSummary {
  roundNumber: number
  team0Score: TeamRoundScore
  team1Score: TeamRoundScore
  winnerTeamId: (0 | 1) | null
}

export interface SpadesGameConfig {
  playerName: string
  targetScore: 250 | 500
  scoringMode: 'short' | 'standard'
  bagsLimit: number
  bagPenalty: number
  nilPoints: number
  soundEnabled: boolean
  animSpeed: 'fast' | 'normal'
}

export interface SpadesGameState {
  phase: 'bidding' | 'playing' | 'evaluating' | 'round_end' | 'game_over'
  roundNumber: number
  trickNumber: number
  spadesBroken: boolean
  dealerIdx: SpadesPlayerId
  currentTurn: SpadesPlayerId
  players: SpadesPlayer[]
  currentTrick: SpadesTrick
  lastTrick: SpadesTrick | null
  team0Score: number
  team1Score: number
  team0Bags: number
  team1Bags: number
  lastRoundSummary: SpadesRoundSummary | null
  history: SpadesRoundSummary[]
  winnerTeamId: (0 | 1) | null
  message: string
}

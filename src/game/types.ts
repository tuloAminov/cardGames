export type Suit = 'spades' | 'clubs' | 'diamonds' | 'hearts'
export type Rank = '6' | '7' | '8' | '9' | 'J' | 'Q' | 'K' | '10' | 'A'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
  points: number
  power: number
  faceDown?: boolean
}

export type PlayerId = 'player' | 'opponent' | 'p3' | 'p4'

export type CombinationType = 'bura' | 'moscow' | 'little_moscow' | 'molodka'

export interface Combination {
  type: CombinationType
  name: string
  description: string
  cards: Card[]
  isImmediateWin: boolean
}

export interface Trick {
  leadPlayer: PlayerId
  leadCards: Card[]
  responseCards: Card[]
  winner: PlayerId
  points: number
  beaten: boolean
}

export type GamePhase =
  | 'dealing'
  | 'turn'
  | 'round_ended'
  | 'match_ended'

export type TurnSubPhase = 'lead' | 'response'

export type AIDifficulty = 'easy' | 'medium' | 'hard'

export type GameMode = 'vs_ai' | 'hotseat' | 'online'

export type GameRuleType =
  | 'duel_classic_4' // 1v1 Classic Bura (4 cards per hand)
  | 'duel_chain_6'   // 1v1 Chain Battling / Перепалка (6 cards per hand, beat & counter-attack)
  | 'ffa_3'          // 3 players FFA (4 cards per hand)
  | 'ffa_4'          // 4 players FFA (4 cards per hand)
  | 'teams_4'        // 4 players 2v2 Teams (4 cards per hand, partners opposite each other)

export type PlayerSeat = 'bottom' | 'top' | 'left' | 'right'

export interface TablePlayer {
  id: string
  name: string
  seat: PlayerSeat
  team?: 1 | 2
  isAI: boolean
  difficulty?: AIDifficulty
  hand: Card[]
  tricks: Card[]
  tricksPoints: number
  handCount: number
}

export interface ChainCardPlay {
  playerId: PlayerId
  playerName: string
  card: Card
  isDefense: boolean // true = beaten previous target; false = new attack card
}

export interface ChainBattleState {
  active: boolean
  pile: ChainCardPlay[]
  currentTargetCards: Card[]
  currentTargetCard: Card | null
  currentAttackerId: PlayerId | null
  currentDefenderId: PlayerId | null
  requiredSurrenderCount: number
  stage: 'defend' | 'attack'
  lastBeatenCards?: {
    leadCards: Card[]
    defenseCards: Card[]
    defenderName: string
  } | null
}

export interface BuildSanitizedStateParams {
  phase: 'lead' | 'response' | 'evaluating' | 'round_ended' | 'match_ended'
  ruleType: GameRuleType
  activePlayer: PlayerId
  leadPlayer: PlayerId | null
  deckCount: number
  trumpCard: Card | null
  trumpSuit: Suit
  tableLeadCards: Card[]
  tableResponseCards: Card[]
  chainBattle?: ChainBattleState | null
  trickResolutionText: string | null
  roundResult: RoundResult | null
  matchScore: MatchScore
  lastTrick: Trick | null
  combinationNotice: Combination | null
  hostHand: Card[]
  clientHand: Card[]
  hostTricks: Card[]
  clientTricks: Card[]
  hostName: string
  clientName: string
}

export type OnlineRole = 'host' | 'client' | null

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'

export interface ChatMessage {
  id: string
  sender: PlayerId
  senderName: string
  text: string
  time: number
}

export interface SanitizedGameState {
  phase: 'lead' | 'response' | 'evaluating' | 'round_ended' | 'match_ended'
  ruleType: GameRuleType
  activePlayer: PlayerId
  leadPlayer: PlayerId | null
  deckCount: number
  trumpCard: Card | null
  trumpSuit: Suit
  tableLeadCards: Card[]
  tableResponseCards: Card[]
  chainBattle: ChainBattleState | null
  trickResolutionText: string | null
  roundResult: RoundResult | null
  matchScore: MatchScore
  lastTrick: Trick | null
  combinationNotice: Combination | null
  // Client's own cards (only decrypted for this player)
  myHand: Card[]
  // Opponent card count (cards face down)
  opponentHandCount: number
  myTricks: Card[]
  opponentTricksCount: number
  myTricksPoints: number
  hostName: string
  clientName: string
}

export type NetworkMessage =
  | { type: 'SYNC_STATE'; payload: SanitizedGameState }
  | { type: 'ACTION_LEAD'; cards: Card[] }
  | { type: 'ACTION_RESPOND'; cards: Card[]; faceDown: boolean }
  | { type: 'ACTION_CHAIN_DEFEND'; defenseCards: Card[] }
  | { type: 'ACTION_CHAIN_ATTACK'; attackCards: Card[] }
  | {
      type: 'ACTION_CHAIN_PLAY'
      defenseCards?: Card[]
      attackCards?: Card[]
      defenseCard?: Card
      attackCard?: Card
    }
  | { type: 'ACTION_CHAIN_PASS'; surrenderCards?: Card[] }
  | { type: 'ACTION_COMBO'; combo: Combination }
  | { type: 'ACTION_NEXT_ROUND' }
  | { type: 'ACTION_RESTART_MATCH' }
  | { type: 'CHAT'; text: string; senderName: string }
  | { type: 'NAME_ANNOUNCE'; name: string }
  | { type: 'HEARTBEAT' }

export interface RoundResult {
  winner: PlayerId | 'draw'
  winnerTeam?: 1 | 2
  reason: string
  scorePlayer: number
  scoreOpponent: number
  team1Score?: number
  team2Score?: number
  pointsAwarded: number
  combination?: Combination
}

export interface MatchScore {
  player: number
  opponent: number
  team1?: number
  team2?: number
  target: number
}

export interface GameSettings {
  difficulty: AIDifficulty
  mode: GameMode
  ruleType: GameRuleType
  matchTarget: number
  showScoreHelper: boolean
  soundEnabled: boolean
  darkFelt: boolean
  fastAnimations: boolean
}

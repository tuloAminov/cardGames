import type { Card, Combination, GameRuleType, PlayerId, Rank, Suit } from './types'

export const SUITS: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts']

export const SUIT_NAMES: Record<Suit, { ru: string; symbol: string; color: 'black' | 'red' }> = {
  spades: { ru: 'Пики', symbol: '♠', color: 'black' },
  clubs: { ru: 'Трефы', symbol: '♣', color: 'black' },
  diamonds: { ru: 'Бубны', symbol: '♦', color: 'red' },
  hearts: { ru: 'Черви', symbol: '♥', color: 'red' },
}

export const RANKS: Rank[] = ['6', '7', '8', '9', 'J', 'Q', 'K', '10', 'A']

export const RANK_NAMES: Record<Rank, string> = {
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  'J': 'В',
  'Q': 'Д',
  'K': 'К',
  '10': '10',
  'A': 'Т',
}

export const RANK_POINTS: Record<Rank, number> = {
  '6': 0,
  '7': 0,
  '8': 0,
  '9': 0,
  'J': 2,
  'Q': 3,
  'K': 4,
  '10': 10,
  'A': 11,
}

// 10 is higher than King, Queen, Jack!
export const RANK_POWERS: Record<Rank, number> = {
  '6': 1,
  '7': 2,
  '8': 3,
  '9': 4,
  'J': 5,
  'Q': 6,
  'K': 7,
  '10': 8,
  'A': 9,
}

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}_${rank}`,
        suit,
        rank,
        points: RANK_POINTS[rank],
        power: RANK_POWERS[rank],
      })
    }
  }
  return deck
}

export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Checks if a single card `responder` can beat `lead` given trump suit.
 */
export function canBeatCard(lead: Card, responder: Card, trumpSuit: Suit): boolean {
  if (lead.suit === trumpSuit) {
    // Both must be trump and responder must have higher power
    return responder.suit === trumpSuit && responder.power > lead.power
  }
  // Lead is non-trump: responder can beat with trump OR higher card of same suit
  if (responder.suit === trumpSuit) {
    return true
  }
  return responder.suit === lead.suit && responder.power > lead.power
}

/**
 * Checks if `leadCards` are a valid lead.
 * In standard Bura, you can lead with 1, 2, 3 or 4 cards of the SAME SUIT.
 * In 6-card Chain Battling mode (duel_chain_6), players can lead any number of cards (1 to 6).
 */
export function isValidLead(cards: Card[], ruleType?: GameRuleType): boolean {
  if (cards.length < 1) return false
  if (ruleType === 'duel_chain_6') {
    return cards.length <= 6
  }
  if (cards.length > 4) return false
  if (cards.length === 1) return true
  const firstSuit = cards[0].suit
  return cards.every((c) => c.suit === firstSuit)
}

/**
 * Checks whether responseCards beat ALL leadCards.
 * When leading multiple cards of the same suit, the responder must beat EACH card individually.
 * We find if there exists a 1-to-1 matching where responder[pi(i)] beats lead[i].
 */
export function doesResponseBeatLead(leadCards: Card[], responseCards: Card[], trumpSuit: Suit): boolean {
  if (leadCards.length !== responseCards.length) return false
  const n = leadCards.length
  if (n === 0) return false
  if (n === 1) return canBeatCard(leadCards[0], responseCards[0], trumpSuit)

  // Find bipartite matching (n <= 3 so permutation search is trivial and exact)
  const used = new Array(n).fill(false)

  function match(leadIndex: number): boolean {
    if (leadIndex === n) return true
    for (let r = 0; r < n; r++) {
      if (!used[r] && canBeatCard(leadCards[leadIndex], responseCards[r], trumpSuit)) {
        used[r] = true
        if (match(leadIndex + 1)) return true
        used[r] = false
      }
    }
    return false
  }

  return match(0)
}

export interface CardPairMatch {
  lead: Card
  response: Card
  beats: boolean
}

/**
 * Finds the best 1-to-1 pairing of lead cards to response cards,
 * prioritizing pairs where response beats lead.
 */
export function matchResponseToLead(
  leadCards: Card[],
  responseCards: Card[],
  trumpSuit: Suit
): CardPairMatch[] {
  const n = leadCards.length
  if (n === 0 || n !== responseCards.length) return []

  const indices = Array.from({ length: n }, (_, i) => i)
  const perms: number[][] = []

  function permute(arr: number[], m: number[] = []) {
    if (arr.length === 0) {
      perms.push(m)
    } else {
      for (let i = 0; i < arr.length; i++) {
        const curr = arr.slice()
        const next = curr.splice(i, 1)
        permute(curr.slice(), m.concat(next))
      }
    }
  }
  permute(indices)

  let bestPairing: CardPairMatch[] = []
  let maxBeaten = -1

  for (const p of perms) {
    const candidate: CardPairMatch[] = []
    let beatenCount = 0
    for (let i = 0; i < n; i++) {
      const l = leadCards[i]
      const r = responseCards[p[i]]
      const beats = canBeatCard(l, r, trumpSuit)
      if (beats) beatenCount++
      candidate.push({ lead: l, response: r, beats })
    }
    if (beatenCount > maxBeaten) {
      maxBeaten = beatenCount
      bestPairing = candidate
    }
    if (beatenCount === n) break
  }

  return bestPairing
}

/**
 * Determine winner of the trick.
 * If response beats all lead cards, responder wins. Otherwise leader wins.
 */
export function resolveTrickWinner(
  leadPlayer: PlayerId,
  leadCards: Card[],
  responseCards: Card[],
  trumpSuit: Suit
): { winner: PlayerId; beaten: boolean; points: number } {
  const beaten = doesResponseBeatLead(leadCards, responseCards, trumpSuit)
  const otherPlayer: PlayerId = leadPlayer === 'player' ? 'opponent' : 'player'
  const winner = beaten ? otherPlayer : leadPlayer
  const points = [...leadCards, ...responseCards].reduce((sum, c) => sum + c.points, 0)
  return { winner, beaten, points }
}

/**
 * Check hand for special combinations (Бура, Москва, Молодка, Малая Москва)
 * In standard Bura with 4 cards, combinations require 4 cards (or 3 if 3-card hand).
 */
export function detectCombinations(hand: Card[], trumpSuit: Suit): Combination[] {
  if (hand.length < 3) return []
  const combs: Combination[] = []

  const targetCount = hand.length >= 4 ? 4 : 3

  // 1. Москва (4 Туза / 3 Туза)
  const aces = hand.filter((c) => c.rank === 'A')
  if (aces.length >= targetCount) {
    combs.push({
      type: 'moscow',
      name: 'Москва',
      description: `${targetCount === 4 ? 'Четыре' : 'Три'} туза — моментальная победа!`,
      cards: aces.slice(0, targetCount),
      isImmediateWin: true,
    })
  }

  // 2. Бура (4 козыря / 3 козыря)
  const trumps = hand.filter((c) => c.suit === trumpSuit)
  if (trumps.length >= targetCount) {
    combs.push({
      type: 'bura',
      name: 'Бура',
      description: `${targetCount === 4 ? 'Четыре' : 'Три'} козыря — безоговорочная победа в раздаче!`,
      cards: trumps.slice(0, targetCount),
      isImmediateWin: true,
    })
  }

  // 3. Молодка / Письмо (4 или 3 карты одной не козырной масти)
  const nonTrumps = hand.filter((c) => c.suit !== trumpSuit)
  const suitCounts: Record<Suit, Card[]> = { spades: [], clubs: [], diamonds: [], hearts: [] }
  for (const c of nonTrumps) {
    suitCounts[c.suit].push(c)
  }
  for (const s of Object.keys(suitCounts) as Suit[]) {
    if (suitCounts[s].length >= targetCount) {
      combs.push({
        type: 'molodka',
        name: 'Молодка',
        description: `${targetCount === 4 ? 'Четыре' : 'Три'} карты одной масти — право внеочередного хода!`,
        cards: suitCounts[s].slice(0, targetCount),
        isImmediateWin: false,
      })
      break
    }
  }

  // 4. Малая Москва (4 или 3 десятки)
  const tens = hand.filter((c) => c.rank === '10')
  if (tens.length >= targetCount) {
    combs.push({
      type: 'little_moscow',
      name: 'Малая Москва',
      description: `${targetCount === 4 ? 'Четыре' : 'Три'} десятки — старшинство над молодкой!`,
      cards: tens.slice(0, targetCount),
      isImmediateWin: false,
    })
  }

  return combs
}

export function getHandSize(ruleType: GameRuleType): number {
  if (ruleType === 'duel_chain_6') return 6
  return 4
}

export function getPlayerCount(ruleType: GameRuleType): number {
  if (ruleType === 'ffa_3') return 3
  if (ruleType === 'ffa_4' || ruleType === 'teams_4') return 4
  return 2
}

export function calculateCardsPoints(cards: Card[]): number {
  if (!Array.isArray(cards)) return 0
  return cards.reduce((sum, c) => sum + (c?.points || 0), 0)
}

export interface PlayerTrickPlay {
  playerId: PlayerId
  cards: Card[]
}

/**
 * Resolves trick winner among multiple players (2, 3, or 4 players).
 * Clockwise players attempt to beat the current winning cards.
 */
export function resolveMultiplayerTrickWinner(
  plays: PlayerTrickPlay[],
  trumpSuit: Suit
): { winner: PlayerId; points: number } {
  if (plays.length === 0) {
    return { winner: 'player', points: 0 }
  }

  let winningPlayer = plays[0].playerId
  let winningCards = plays[0].cards
  let totalPoints = calculateCardsPoints(plays[0].cards)

  for (let i = 1; i < plays.length; i++) {
    const candidate = plays[i]
    totalPoints += calculateCardsPoints(candidate.cards)
    if (doesResponseBeatLead(winningCards, candidate.cards, trumpSuit)) {
      winningPlayer = candidate.playerId
      winningCards = candidate.cards
    }
  }

  return { winner: winningPlayer, points: totalPoints }
}

export function getActivePlayerIds(ruleType?: GameRuleType): PlayerId[] {
  if (ruleType === 'ffa_3') return ['player', 'opponent', 'p3']
  if (ruleType === 'ffa_4' || ruleType === 'teams_4') return ['player', 'opponent', 'p3', 'p4']
  return ['player', 'opponent']
}

export function getPlayerTeam(playerId: PlayerId): 1 | 2 {
  if (playerId === 'player' || playerId === 'p3') return 1
  return 2
}

/**
 * In 6-card Chain Battling mode (duel_chain_6):
 * Checks whether selectedCards contain a subset of size targetCards.length
 * that beats all targetCards, and uses the remaining cards as the counter-attack!
 */
export function findChainDefenseAndAttack(
  targetCards: Card[],
  selectedCards: Card[],
  trumpSuit: Suit
): { defenseCards: Card[]; attackCards: Card[] } | null {
  const req = targetCards.length
  if (selectedCards.length < req) return null

  if (selectedCards.length === req) {
    if (doesResponseBeatLead(targetCards, selectedCards, trumpSuit)) {
      return { defenseCards: selectedCards, attackCards: [] }
    }
    return null
  }

  // Find all combinations of size req from selectedCards
  const winningSubsets: Card[][] = []
  function getSubsets(start: number, current: Card[]) {
    if (current.length === req) {
      if (doesResponseBeatLead(targetCards, current, trumpSuit)) {
        winningSubsets.push([...current])
      }
      return
    }
    for (let i = start; i < selectedCards.length; i++) {
      current.push(selectedCards[i])
      getSubsets(i + 1, current)
      current.pop()
    }
  }
  getSubsets(0, [])

  if (winningSubsets.length === 0) return null

  // Pick the defense subset that spends the least valuable cards
  winningSubsets.sort((a, b) => {
    const trumpsA = a.filter((c) => c.suit === trumpSuit).length
    const trumpsB = b.filter((c) => c.suit === trumpSuit).length
    if (trumpsA !== trumpsB) return trumpsA - trumpsB
    const ptsA = a.reduce((sum, c) => sum + c.points, 0)
    const ptsB = b.reduce((sum, c) => sum + c.points, 0)
    if (ptsA !== ptsB) return ptsA - ptsB
    const powA = a.reduce((sum, c) => sum + c.power, 0)
    const powB = b.reduce((sum, c) => sum + c.power, 0)
    return powA - powB
  })

  const bestDefense = winningSubsets[0]
  const defIds = new Set(bestDefense.map((c) => c.id))
  const counterAttack = selectedCards.filter((c) => !defIds.has(c.id))

  return { defenseCards: bestDefense, attackCards: counterAttack }
}

/**
 * Chooses `count` lowest value cards from hand to surrender/discard
 */
export function chooseSurrenderCards(
  hand: Card[],
  count: number,
  trumpSuit: Suit,
  preferredCards?: Card[]
): Card[] {
  const needed = Math.min(count, hand.length)
  if (preferredCards && preferredCards.length === needed) {
    const handIds = new Set(hand.map((c) => c.id))
    if (preferredCards.every((c) => handIds.has(c.id))) {
      return preferredCards
    }
  }

  // Sort hand from lowest value to highest: non-trumps first, 0 points first, lowest power
  const sorted = [...hand].sort((a, b) => {
    const isTrumpA = a.suit === trumpSuit ? 1 : 0
    const isTrumpB = b.suit === trumpSuit ? 1 : 0
    if (isTrumpA !== isTrumpB) return isTrumpA - isTrumpB
    if (a.points !== b.points) return a.points - b.points
    return a.power - b.power
  })

  return sorted.slice(0, needed)
}

import type {
  PlayerRoundRecord,
  PlayedTrickCard,
  SpadesCard,
  SpadesGameConfig,
  SpadesPlayerId,
  SpadesRank,
  SpadesSuit,
  SpadesTrick,
  TeamRoundScore,
} from './types'

export const SPADES_SUITS: SpadesSuit[] = ['♣', '♦', '♥', '♠']

export const SUIT_NAMES_RU: Record<SpadesSuit, string> = {
  '♠': 'Пики',
  '♥': 'Червы',
  '♦': 'Бубны',
  '♣': 'Трефы',
}

export const SUIT_COLORS: Record<SpadesSuit, 'black' | 'red'> = {
  '♠': 'black',
  '♣': 'black',
  '♥': 'red',
  '♦': 'red',
}

export const RANK_NAMES_RU: Record<SpadesRank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'В',
  12: 'Д',
  13: 'К',
  14: 'Т',
}

export function createSpadesDeck(): SpadesCard[] {
  const deck: SpadesCard[] = []
  const suits: SpadesSuit[] = ['♣', '♦', '♥', '♠']
  const ranks: SpadesRank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        id: `${suit}_${rank}`,
        suit,
        rank,
        name: `${RANK_NAMES_RU[rank]}${suit}`,
        suitNameRu: SUIT_NAMES_RU[suit],
        isTrump: suit === '♠',
      })
    }
  }
  return deck
}

export function shuffleSpadesDeck(deck: SpadesCard[]): SpadesCard[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function sortSpadesHand(hand: SpadesCard[]): SpadesCard[] {
  const suitOrder: Record<SpadesSuit, number> = {
    '♣': 0,
    '♦': 1,
    '♥': 2,
    '♠': 3,
  }
  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit]
    }
    return a.rank - b.rank
  })
}

/**
 * Validates which cards from hand are legal to play according to Spades rules:
 * 1. Leading trick: Spades cannot be led until spades are broken, UNLESS hand has only spades.
 * 2. Following suit: If hand has cards of ledSuit, player MUST play a card of that suit.
 * 3. Void in ledSuit: Can play any card (including Spades to break spades!).
 */
export function getValidSpadesMoves(
  hand: SpadesCard[],
  ledSuit: SpadesSuit | null,
  spadesBroken: boolean
): SpadesCard[] {
  if (hand.length === 0) return []

  if (ledSuit === null) {
    // Leading trick
    if (spadesBroken) {
      return [...hand]
    }
    const nonSpades = hand.filter((c) => c.suit !== '♠')
    if (nonSpades.length > 0) {
      return nonSpades
    }
    // Only spades remaining in hand -> allowed to lead spades
    return [...hand]
  }

  // Following trick: must follow led suit if possible
  const sameSuit = hand.filter((c) => c.suit === ledSuit)
  if (sameSuit.length > 0) {
    return sameSuit
  }

  // Void in led suit: can play any card (spades or off-suit)
  return [...hand]
}

/**
 * Resolves trick winner among played cards:
 * 1. If any spades played, highest spade wins.
 * 2. Else highest card of led suit wins.
 */
export function resolveSpadesTrickWinner(plays: PlayedTrickCard[]): {
  winnerId: SpadesPlayerId
  winningCard: SpadesCard
} {
  if (plays.length === 0) {
    throw new Error('Cannot resolve empty trick')
  }

  const ledSuit = plays[0].card.suit
  let best = plays[0]

  for (let i = 1; i < plays.length; i++) {
    const play = plays[i]
    if (best.card.suit === '♠') {
      if (play.card.suit === '♠' && play.card.rank > best.card.rank) {
        best = play
      }
    } else {
      if (play.card.suit === '♠') {
        best = play
      } else if (play.card.suit === ledSuit && play.card.rank > best.card.rank) {
        best = play
      }
    }
  }

  return { winnerId: best.playerId, winningCard: best.card }
}

/**
 * AI bidding evaluation algorithm matching hearts/spades/core/players.py
 */
export function calculateAIBid(
  hand: SpadesCard[],
  partnerBid: number | null = null
): number {
  const spades = hand.filter((c) => c.suit === '♠')
  const nonSpades = hand.filter((c) => c.suit !== '♠')

  // Check for Nil possibility: no high spades (Ace/King), very few high cards
  const hasSpadeAce = spades.some((c) => c.rank === 14)
  const hasSpadeKing = spades.some((c) => c.rank === 13)
  const highAces = hand.filter((c) => c.rank === 14).length
  const highCards = hand.filter((c) => c.rank >= 12).length

  if (!hasSpadeAce && !hasSpadeKing && highAces === 0 && highCards <= 1 && spades.length <= 3) {
    if (partnerBid !== null && partnerBid >= 4) {
      return 0 // Bid Nil!
    }
  }

  let expected = 0

  // High card points
  for (const card of nonSpades) {
    if (card.rank === 14) expected += 1.0 // Ace
    else if (card.rank === 13) expected += 0.6 // King
    else if (card.rank === 12) expected += 0.3 // Queen
  }

  // Trump length points
  if (spades.length >= 4) {
    expected += (spades.length - 3) * 0.9
  }
  for (const s of spades) {
    if (s.rank === 14) expected += 1.0
    else if (s.rank === 13) expected += 0.8
    else if (s.rank === 12) expected += 0.5
  }

  // Distributional ruffing potential: short non-trump suits
  const suitCounts: Record<SpadesSuit, number> = { '♣': 0, '♦': 0, '♥': 0, '♠': spades.length }
  for (const c of nonSpades) {
    suitCounts[c.suit]++
  }
  for (const s of ['♣', '♦', '♥'] as SpadesSuit[]) {
    if (suitCounts[s] === 0 && spades.length >= 3) expected += 0.8 // void
    else if (suitCounts[s] === 1 && spades.length >= 4) expected += 0.4 // singleton
  }

  const finalBid = Math.max(1, Math.min(13, Math.round(expected)))
  return finalBid
}

/**
 * AI card play algorithm matching hearts/spades/core/players.py
 */
export function chooseAICard(
  hand: SpadesCard[],
  currentTrick: SpadesTrick,
  spadesBroken: boolean,
  playerId: SpadesPlayerId,
  partnerBid: number | null
): SpadesCard {
  const validMoves = getValidSpadesMoves(hand, currentTrick.leadSuit, spadesBroken)
  if (validMoves.length === 1) {
    return validMoves[0]
  }

  const partnerId: SpadesPlayerId = (playerId === 0 ? 2 : playerId === 2 ? 0 : playerId === 1 ? 3 : 1)
  const isLeading = currentTrick.leadSuit === null

  // 1. AI is Leading
  if (isLeading) {
    const nonSpades = validMoves.filter((c) => c.suit !== '♠')
    // Cash high non-trump Aces early
    const aces = nonSpades.filter((c) => c.rank === 14)
    if (aces.length > 0 && Math.random() < 0.8) {
      return aces[0]
    }

    // Lead low card of a non-trump suit
    if (nonSpades.length > 0) {
      nonSpades.sort((a, b) => a.rank - b.rank)
      return nonSpades[0]
    }

    // Only spades available
    validMoves.sort((a, b) => a.rank - b.rank)
    return validMoves[0]
  }

  // 2. AI is Following
  const plays = currentTrick.plays
  const currentLeader = resolveSpadesTrickWinner(plays)
  const partnerIsWinning = currentLeader.winnerId === partnerId

  // If partner is already winning with a high card or trump
  if (partnerIsWinning && partnerBid !== 0) {
    // Slough lowest possible valid card to save high cards
    validMoves.sort((a, b) => {
      const isTrumpA = a.suit === '♠' ? 1 : 0
      const isTrumpB = b.suit === '♠' ? 1 : 0
      if (isTrumpA !== isTrumpB) return isTrumpA - isTrumpB // dump non-trump first
      return a.rank - b.rank
    })
    return validMoves[0]
  }

  // Try to win the trick if possible
  const winningCandidates = validMoves.filter((card) => {
    const hypothetical = [...plays, { playerId, playerName: '', card }]
    const res = resolveSpadesTrickWinner(hypothetical)
    return res.winnerId === playerId
  })

  if (winningCandidates.length > 0) {
    // Pick the lowest winning card to conserve high cards
    winningCandidates.sort((a, b) => {
      const isTrumpA = a.suit === '♠' ? 1 : 0
      const isTrumpB = b.suit === '♠' ? 1 : 0
      if (isTrumpA !== isTrumpB) return isTrumpA - isTrumpB
      return a.rank - b.rank
    })
    return winningCandidates[0]
  }

  // Cannot win trick -> dump lowest card
  validMoves.sort((a, b) => {
    const isTrumpA = a.suit === '♠' ? 1 : 0
    const isTrumpB = b.suit === '♠' ? 1 : 0
    if (isTrumpA !== isTrumpB) return isTrumpA - isTrumpB // dump non-trumps
    return a.rank - b.rank
  })
  return validMoves[0]
}

/**
 * Calculates end-of-round score for a team according to official Spades rules
 */
export function calculateTeamRoundScore(
  teamId: 0 | 1,
  teamName: string,
  playerRecords: PlayerRoundRecord[],
  bagsBefore: number,
  scoreBefore: number,
  config: SpadesGameConfig
): TeamRoundScore {
  const contractBid = playerRecords.reduce((sum, p) => (p.isNil ? sum : sum + p.bid), 0)
  const tricksWon = playerRecords.reduce((sum, p) => sum + p.tricksWon, 0)

  // Nil bonuses / penalties
  let nilPointsTotal = 0
  for (const p of playerRecords) {
    if (p.isNil) {
      nilPointsTotal += p.nilPoints
    }
  }

  let contractMade = false
  let contractPoints = 0
  let overtricks = 0

  if (contractBid === 0) {
    // Both players bid Nil: all points come from Nil bonuses
    contractMade = true
    contractPoints = 0
    overtricks = 0
  } else if (tricksWon >= contractBid) {
    contractMade = true
    contractPoints = contractBid * 10
    overtricks = tricksWon - contractBid
  } else {
    contractMade = false
    contractPoints = -contractBid * 10
    overtricks = 0
  }

  // Bags accumulation & penalty
  const bagsAdded = overtricks
  const totalBags = bagsBefore + bagsAdded
  let bagPenalty = 0
  let bagsAfter = totalBags

  if (totalBags >= config.bagsLimit) {
    const penaltyMultiplier = Math.floor(totalBags / config.bagsLimit)
    bagPenalty = penaltyMultiplier * config.bagPenalty
    bagsAfter = totalBags % config.bagsLimit
  }

  const totalRoundPoints = contractPoints + overtricks + nilPointsTotal - bagPenalty
  const scoreAfter = scoreBefore + totalRoundPoints

  return {
    teamId,
    teamName,
    playerRecords,
    contractBid,
    tricksWon,
    contractMade,
    contractPoints,
    overtricks,
    nilPointsTotal,
    bagsBefore,
    bagsAdded,
    bagPenalty,
    bagsAfter,
    totalRoundPoints,
    scoreBefore,
    scoreAfter,
  }
}

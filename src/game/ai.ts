import type { Card, Suit, AIDifficulty } from './types'
import {
  doesResponseBeatLead,
  findChainDefenseAndAttack,
  chooseSurrenderCards,
} from './rules'

export interface AIDecisionLead {
  type: 'lead'
  cards: Card[]
}

export interface AIDecisionResponse {
  type: 'response'
  cards: Card[]
  faceDown: boolean
}

export interface AIDecisionCombination {
  type: 'combination'
  combinationType: 'bura' | 'moscow' | 'molodka' | 'little_moscow'
}

export type AIDecision =
  | AIDecisionLead
  | AIDecisionResponse
  | AIDecisionCombination

/**
 * Choose AI lead cards (supports 1, 2, 3, or 4 cards of the same suit).
 */
export function getAILeadCards(
  hand: Card[],
  trumpSuit: Suit,
  difficulty: AIDifficulty,
  opponentTricksPointsEstimate: number
): Card[] {
  if (hand.length === 0) return []
  if (hand.length === 1) return [hand[0]]

  // Group hand by suit
  const suitGroups: Record<Suit, Card[]> = {
    spades: [],
    clubs: [],
    diamonds: [],
    hearts: [],
  }
  for (const c of hand) {
    suitGroups[c.suit].push(c)
  }

  // Check 4-card lead of same suit (Molodka / Bura!)
  for (const suit of Object.keys(suitGroups) as Suit[]) {
    if (suitGroups[suit].length >= 4) {
      return suitGroups[suit].slice(0, 4)
    }
  }

  // Check 3-card lead of same suit
  for (const suit of Object.keys(suitGroups) as Suit[]) {
    if (suitGroups[suit].length >= 3) {
      return suitGroups[suit].slice(0, 3)
    }
  }

  // Check 2-card lead of same suit
  const twoCardLeads: Card[][] = []
  for (const suit of Object.keys(suitGroups) as Suit[]) {
    if (suitGroups[suit].length >= 2) {
      twoCardLeads.push(suitGroups[suit].slice(0, 2))
    }
  }

  if (twoCardLeads.length > 0 && (difficulty !== 'easy' || Math.random() < 0.6)) {
    twoCardLeads.sort((a, b) => {
      const ptsA = a.reduce((s, c) => s + c.points, 0)
      const ptsB = b.reduce((s, c) => s + c.points, 0)
      const isTrumpA = a[0].suit === trumpSuit ? 10 : 0
      const isTrumpB = b[0].suit === trumpSuit ? 10 : 0
      return ptsB + isTrumpB - (ptsA + isTrumpA)
    })

    if (difficulty === 'hard' || Math.random() < 0.7) {
      return twoCardLeads[0]
    }
  }

  // Single card leads
  const nonTrumps = hand.filter((c) => c.suit !== trumpSuit)
  const trumps = hand.filter((c) => c.suit === trumpSuit)

  if (difficulty === 'easy') {
    return [hand[Math.floor(Math.random() * hand.length)]]
  }

  const opponentDanger = opponentTricksPointsEstimate >= 20

  if (nonTrumps.length > 0) {
    const zeros = nonTrumps.filter((c) => c.points === 0)
    if (zeros.length > 0 && (opponentDanger || Math.random() < 0.65)) {
      return [zeros[0]]
    }

    const highPoints = nonTrumps.filter((c) => c.points >= 10)
    if (!opponentDanger && highPoints.length > 0 && Math.random() < 0.5) {
      return [highPoints[0]]
    }

    nonTrumps.sort((a, b) => a.power - b.power)
    return [nonTrumps[0]]
  }

  trumps.sort((a, b) => a.power - b.power)
  return [trumps[0]]
}

export interface AIDecisionChainPlay {
  type: 'play'
  defenseCards: Card[]
  attackCards: Card[]
  defenseCard: Card
  attackCard: Card
}

export interface AIDecisionChainPass {
  type: 'pass'
  surrenderCards: Card[]
}

/**
 * AI logic for 6-card Chain Battling mode (Beat & Counter-attack).
 * Supports beating multiple cards and counter-attacking with any number of cards!
 */
export function getAIChainBattlePlay(
  targetCardsInput: Card[] | Card,
  hand: Card[],
  trumpSuit: Suit,
  difficulty: AIDifficulty
): AIDecisionChainPlay | AIDecisionChainPass {
  const targets = Array.isArray(targetCardsInput) ? targetCardsInput : [targetCardsInput]
  const req = targets.length

  if (hand.length < req) {
    return {
      type: 'pass',
      surrenderCards: chooseSurrenderCards(hand, req, trumpSuit),
    }
  }

  const matchResult = findChainDefenseAndAttack(targets, hand, trumpSuit)
  if (!matchResult) {
    return {
      type: 'pass',
      surrenderCards: chooseSurrenderCards(hand, req, trumpSuit),
    }
  }

  const { defenseCards, attackCards } = matchResult

  // Hard AI decision: if targetCards have 0 total points and only defense uses high trumps, consider passing
  const targetsPts = targets.reduce((sum, c) => sum + c.points, 0)
  const defPts = defenseCards.reduce((sum, c) => sum + c.points, 0)
  const defTrumps = defenseCards.filter((c) => c.suit === trumpSuit).length

  if (
    difficulty === 'hard' &&
    targetsPts === 0 &&
    defPts >= 10 &&
    defTrumps >= 1 &&
    hand.length > req &&
    Math.random() < 0.35
  ) {
    return {
      type: 'pass',
      surrenderCards: chooseSurrenderCards(hand, req, trumpSuit),
    }
  }

  // If no cards left to counter-attack (defended using all remaining cards in hand)
  if (attackCards.length === 0) {
    return {
      type: 'play',
      defenseCards,
      attackCards: [],
      defenseCard: defenseCards[0],
      attackCard: defenseCards[0],
    }
  }

  // AI chooses how many cards to throw in counter-attack: can throw 1, 2, or more!
  const chosenAttack = getAILeadCards(attackCards, trumpSuit, difficulty, 0)
  const finalAttack = chosenAttack.length > 0 ? chosenAttack : [attackCards[0]]

  return {
    type: 'play',
    defenseCards,
    attackCards: finalAttack,
    defenseCard: defenseCards[0],
    attackCard: finalAttack[0],
  }
}

/**
 * Choose AI response cards to defend against leadCards.
 */
export function getAIResponseCards(
  leadCards: Card[],
  hand: Card[],
  trumpSuit: Suit,
  difficulty: AIDifficulty
): { cards: Card[]; faceDown: boolean } {
  const reqCount = leadCards.length
  if (hand.length < reqCount) {
    return { cards: hand.slice(0, reqCount), faceDown: true }
  }

  // Generate all possible combinations of reqCount cards from hand
  const combinations: Card[][] = []
  function getCombos(start: number, chosen: Card[]) {
    if (chosen.length === reqCount) {
      combinations.push([...chosen])
      return
    }
    for (let i = start; i < hand.length; i++) {
      chosen.push(hand[i])
      getCombos(i + 1, chosen)
      chosen.pop()
    }
  }
  getCombos(0, [])

  const winningCombos: Card[][] = []
  const losingCombos: Card[][] = []

  for (const combo of combinations) {
    if (doesResponseBeatLead(leadCards, combo, trumpSuit)) {
      winningCombos.push(combo)
    } else {
      losingCombos.push(combo)
    }
  }

  const leadPoints = leadCards.reduce((s, c) => s + c.points, 0)

  if (winningCombos.length > 0) {
    winningCombos.sort((a, b) => {
      const trumpsA = a.filter((c) => c.suit === trumpSuit).length
      const trumpsB = b.filter((c) => c.suit === trumpSuit).length
      const pointsA = a.reduce((s, c) => s + c.points, 0)
      const pointsB = b.reduce((s, c) => s + c.points, 0)

      if (trumpsA !== trumpsB) return trumpsA - trumpsB
      return pointsA - pointsB
    })

    if (difficulty === 'easy' && Math.random() < 0.25) {
      // Slough
    } else {
      const chosen = winningCombos[0]
      const spendPoints = chosen.reduce((s, c) => s + c.points, 0)
      if (difficulty === 'hard' && leadPoints === 0 && spendPoints >= 10 && winningCombos.length === 1) {
        // Slough if only option burns top card for 0 pts
      } else {
        return { cards: chosen, faceDown: false }
      }
    }
  }

  // Discard lowest point cards
  const candidates = losingCombos.length > 0 ? losingCombos : combinations
  candidates.sort((a, b) => {
    const ptsA = a.reduce((s, c) => s + c.points, 0)
    const ptsB = b.reduce((s, c) => s + c.points, 0)
    const trumpsA = a.filter((c) => c.suit === trumpSuit).length
    const trumpsB = b.filter((c) => c.suit === trumpSuit).length

    if (trumpsA !== trumpsB) return trumpsA - trumpsB
    return ptsA - ptsB
  })

  const chosen = candidates[0]
  const hasValuableCard = chosen.some((c) => c.points > 0 || c.suit === trumpSuit)
  const faceDown = difficulty !== 'easy' && (hasValuableCard || Math.random() < 0.8)

  return { cards: chosen, faceDown }
}

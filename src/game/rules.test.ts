import { describe, it, expect } from 'vitest'
import {
  createDeck,
  canBeatCard,
  doesResponseBeatLead,
  detectCombinations,
  isValidLead,
  resolveTrickWinner,
  calculateCardsPoints,
  matchResponseToLead,
  RANK_POINTS,
  RANK_POWERS,
} from './rules'
import {
  getAILeadCards,
  getAIResponseCards,
} from './ai'
import type { Card } from './types'

describe('Bura Card Rules & Mechanics', () => {
  it('creates 36 cards deck with correct total points of 120', () => {
    const deck = createDeck()
    expect(deck.length).toBe(36)
    const totalPoints = calculateCardsPoints(deck)
    expect(totalPoints).toBe(120)
  })

  it('correctly ranks card values and power (10 is higher than King, Queen, Jack)', () => {
    expect(RANK_POINTS['A']).toBe(11)
    expect(RANK_POINTS['10']).toBe(10)
    expect(RANK_POINTS['K']).toBe(4)
    expect(RANK_POINTS['Q']).toBe(3)
    expect(RANK_POINTS['J']).toBe(2)
    expect(RANK_POINTS['9']).toBe(0)
    expect(RANK_POINTS['8']).toBe(0)
    expect(RANK_POINTS['7']).toBe(0)
    expect(RANK_POINTS['6']).toBe(0)

    // Power ranking
    expect(RANK_POWERS['A']).toBeGreaterThan(RANK_POWERS['10'])
    expect(RANK_POWERS['10']).toBeGreaterThan(RANK_POWERS['K'])
    expect(RANK_POWERS['K']).toBeGreaterThan(RANK_POWERS['Q'])
    expect(RANK_POWERS['Q']).toBeGreaterThan(RANK_POWERS['J'])
    expect(RANK_POWERS['J']).toBeGreaterThan(RANK_POWERS['9'])
  })

  it('evaluates single card trick beating correctly', () => {
    const trumpSuit = 'spades'

    const spadeAce: Card = { id: 'spades_A', suit: 'spades', rank: 'A', points: 11, power: 9 }
    const spade10: Card = { id: 'spades_10', suit: 'spades', rank: '10', points: 10, power: 8 }
    const heartKing: Card = { id: 'hearts_K', suit: 'hearts', rank: 'K', points: 4, power: 7 }
    const heart10: Card = { id: 'hearts_10', suit: 'hearts', rank: '10', points: 10, power: 8 }
    const heart7: Card = { id: 'hearts_7', suit: 'hearts', rank: '7', points: 0, power: 2 }
    const clubAce: Card = { id: 'clubs_A', suit: 'clubs', rank: 'A', points: 11, power: 9 }

    // 10 of hearts beats King of hearts
    expect(canBeatCard(heartKing, heart10, trumpSuit)).toBe(true)

    // King of hearts does not beat 10 of hearts
    expect(canBeatCard(heart10, heartKing, trumpSuit)).toBe(false)

    // Trump (spades) beats non-trump (hearts)
    expect(canBeatCard(heartKing, spade10, trumpSuit)).toBe(true)

    // Non-trump (clubs) does not beat hearts when lead was hearts
    expect(canBeatCard(heart7, clubAce, trumpSuit)).toBe(false)

    // Higher trump beats lower trump
    expect(canBeatCard(spade10, spadeAce, trumpSuit)).toBe(true)
    expect(canBeatCard(spadeAce, spade10, trumpSuit)).toBe(false)
  })

  it('validates multi-card leads (must be same suit)', () => {
    const h1: Card = { id: 'hearts_A', suit: 'hearts', rank: 'A', points: 11, power: 9 }
    const h2: Card = { id: 'hearts_K', suit: 'hearts', rank: 'K', points: 4, power: 7 }
    const s1: Card = { id: 'spades_7', suit: 'spades', rank: '7', points: 0, power: 2 }

    expect(isValidLead([h1])).toBe(true)
    expect(isValidLead([h1, h2])).toBe(true)
    expect(isValidLead([h1, s1])).toBe(false) // Different suits cannot be led together
  })

  it('evaluates multi-card response beating (all cards must be beaten)', () => {
    const trumpSuit = 'clubs'

    // Leader plays 2 hearts: Heart King and Heart 7
    const lead1: Card = { id: 'hearts_K', suit: 'hearts', rank: 'K', points: 4, power: 7 }
    const lead2: Card = { id: 'hearts_7', suit: 'hearts', rank: '7', points: 0, power: 2 }

    // Responder plays Heart 10 (beats King) and Heart 8 (beats 7)
    const resp1: Card = { id: 'hearts_10', suit: 'hearts', rank: '10', points: 10, power: 8 }
    const resp2: Card = { id: 'hearts_8', suit: 'hearts', rank: '8', points: 0, power: 3 }
    expect(doesResponseBeatLead([lead1, lead2], [resp1, resp2], trumpSuit)).toBe(true)

    // If responder plays Heart 10 and Spades 6 (spades is not trump and not hearts) -> fails to beat all
    const failResp: Card = { id: 'spades_6', suit: 'spades', rank: '6', points: 0, power: 1 }
    expect(doesResponseBeatLead([lead1, lead2], [resp1, failResp], trumpSuit)).toBe(false)

    // Responder plays Heart 10 and Club 6 (Club is trump!) -> Club 6 beats Heart 7!
    const trump6: Card = { id: 'clubs_6', suit: 'clubs', rank: '6', points: 0, power: 1 }
    expect(doesResponseBeatLead([lead1, lead2], [resp1, trump6], trumpSuit)).toBe(true)
  })

  it('correctly matches and pairs response cards with lead cards', () => {
    const trumpSuit = 'diamonds'
    const lead1: Card = { id: 'spades_K', suit: 'spades', rank: 'K', points: 4, power: 7 }
    const lead2: Card = { id: 'spades_7', suit: 'spades', rank: '7', points: 0, power: 2 }

    const resp1: Card = { id: 'spades_10', suit: 'spades', rank: '10', points: 10, power: 8 }
    const resp2: Card = { id: 'diamonds_6', suit: 'diamonds', rank: '6', points: 0, power: 1 }

    const pairs = matchResponseToLead([lead1, lead2], [resp1, resp2], trumpSuit)
    expect(pairs.length).toBe(2)
    expect(pairs.every((p) => p.beats)).toBe(true)
  })

  it('resolves trick winner correctly', () => {
    const trumpSuit = 'diamonds'
    const leadCard: Card = { id: 'hearts_10', suit: 'hearts', rank: '10', points: 10, power: 8 }
    const responseCard: Card = { id: 'hearts_A', suit: 'hearts', rank: 'A', points: 11, power: 9 }

    const res = resolveTrickWinner('player', [leadCard], [responseCard], trumpSuit)
    expect(res.winner).toBe('opponent')
    expect(res.beaten).toBe(true)
    expect(res.points).toBe(21)
  })

  it('detects combinations: Бура, Москва, Молодка', () => {
    const trumpSuit = 'spades'

    // Бура: 3 trumps
    const buraHand: Card[] = [
      { id: 'spades_6', suit: 'spades', rank: '6', points: 0, power: 1 },
      { id: 'spades_10', suit: 'spades', rank: '10', points: 10, power: 8 },
      { id: 'spades_A', suit: 'spades', rank: 'A', points: 11, power: 9 },
    ]
    const buraCombos = detectCombinations(buraHand, trumpSuit)
    expect(buraCombos.some((c) => c.type === 'bura')).toBe(true)

    // Москва: 3 Aces
    const moscowHand: Card[] = [
      { id: 'spades_A', suit: 'spades', rank: 'A', points: 11, power: 9 },
      { id: 'hearts_A', suit: 'hearts', rank: 'A', points: 11, power: 9 },
      { id: 'clubs_A', suit: 'clubs', rank: 'A', points: 11, power: 9 },
    ]
    const moscowCombos = detectCombinations(moscowHand, trumpSuit)
    expect(moscowCombos.some((c) => c.type === 'moscow')).toBe(true)

    // Молодка: 3 cards of same non-trump suit
    const molodkaHand: Card[] = [
      { id: 'hearts_7', suit: 'hearts', rank: '7', points: 0, power: 2 },
      { id: 'hearts_J', suit: 'hearts', rank: 'J', points: 2, power: 5 },
      { id: 'hearts_K', suit: 'hearts', rank: 'K', points: 4, power: 7 },
    ]
    const molodkaCombos = detectCombinations(molodkaHand, trumpSuit)
    expect(molodkaCombos.some((c) => c.type === 'molodka')).toBe(true)
  })

  it('verifies AI logic: lead validation and response card count matching', () => {
    const trumpSuit = 'clubs'
    const hand: Card[] = [
      { id: 'hearts_K', suit: 'hearts', rank: 'K', points: 4, power: 7 },
      { id: 'hearts_10', suit: 'hearts', rank: '10', points: 10, power: 8 },
      { id: 'spades_7', suit: 'spades', rank: '7', points: 0, power: 2 },
    ]

    const lead = getAILeadCards(hand, trumpSuit, 'hard', 0)
    expect(lead.length).toBeGreaterThanOrEqual(1)
    expect(lead.length).toBeLessThanOrEqual(3)
    expect(isValidLead(lead)).toBe(true)

    // Test AI defense response
    const opponentLead: Card[] = [
      { id: 'diamonds_7', suit: 'diamonds', rank: '7', points: 0, power: 2 },
    ]
    const response = getAIResponseCards(opponentLead, hand, trumpSuit, 'hard')
    expect(response.cards.length).toBe(1)
  })
})

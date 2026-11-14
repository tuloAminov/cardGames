import { describe, it, expect } from 'vitest'
import {
  generateRoomCode,
  normalizeRoomCode,
  buildSanitizedStateForClient,
} from './network'
import type { Card } from './types'

describe('Online Multiplayer Network & State Sanitization', () => {
  it('generates valid formatted room codes', () => {
    const code = generateRoomCode()
    expect(code).toMatch(/^BURA-[2-9A-Z]{4}$/)
  })

  it('normalizes room code inputs correctly', () => {
    expect(normalizeRoomCode('8k3p')).toBe('BURA-8K3P')
    expect(normalizeRoomCode('bura-8k3p')).toBe('BURA-8K3P')
    expect(normalizeRoomCode('  BURA-1234  ')).toBe('BURA-1234')
  })

  it('strictly preserves fog-of-war secrecy when sanitizing state for client', () => {
    const hostHand: Card[] = [
      { id: 'spades_A', suit: 'spades', rank: 'A', points: 11, power: 9 },
      { id: 'hearts_10', suit: 'hearts', rank: '10', points: 10, power: 8 },
      { id: 'clubs_K', suit: 'clubs', rank: 'K', points: 4, power: 7 },
    ]

    const clientHand: Card[] = [
      { id: 'diamonds_7', suit: 'diamonds', rank: '7', points: 0, power: 2 },
      { id: 'diamonds_8', suit: 'diamonds', rank: '8', points: 0, power: 3 },
      { id: 'diamonds_9', suit: 'diamonds', rank: '9', points: 0, power: 4 },
    ]

    const sanitized = buildSanitizedStateForClient(
      'lead',
      'player',
      null,
      26,
      null,
      'spades',
      [],
      [],
      null,
      null,
      { player: 0, opponent: 0, target: 11 },
      null,
      null,
      hostHand,
      clientHand,
      [],
      [],
      'Алиса (Хост)',
      'Боб (Гость)'
    )

    // Client must receive their own cards
    expect(sanitized.myHand).toEqual(clientHand)

    // Client must ONLY receive the count of host's cards, NOT the actual card objects/values
    expect(sanitized.opponentHandCount).toBe(3)
    // Ensure host cards are nowhere in sanitized object
    const serialized = JSON.stringify(sanitized)
    expect(serialized).not.toContain('spades_A')
    expect(serialized).not.toContain('hearts_10')
    expect(serialized).not.toContain('clubs_K')
  })
})

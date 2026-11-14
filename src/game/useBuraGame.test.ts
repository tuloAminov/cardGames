import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBuraGame } from './useBuraGame'

describe('useBuraGame End-to-End Simulation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes game with hands of 4 cards, open trump and 27 cards in deck', () => {
    const { result } = renderHook(() => useBuraGame())

    expect(result.current.playerHand.length).toBe(4)
    expect(result.current.opponentHand.length).toBe(4)
    expect(result.current.trumpCard).not.toBeNull()
    expect(result.current.deck.length).toBe(27)
    expect(result.current.phase).toBe('lead')
  })

  it('handles player lead -> AI automatic response -> trick resolution -> refill loop without freezing', () => {
    const { result } = renderHook(() => useBuraGame())

    // Ensure player is the active leader for this test
    if (result.current.activePlayer !== 'player') {
      act(() => {
        result.current.startNewRound('player')
      })
    }

    expect(result.current.activePlayer).toBe('player')
    expect(result.current.phase).toBe('lead')

    const firstCard = result.current.playerHand[0]
    expect(firstCard).toBeDefined()

    // 1. Player selects a card
    act(() => {
      result.current.toggleSelectCard(firstCard.id)
    })
    expect(result.current.selectedCardIds).toContain(firstCard.id)

    // 2. Player plays the card (Leads)
    act(() => {
      result.current.playerLead()
    })

    // Player hand should now have 3 cards, table has 1 lead card
    expect(result.current.playerHand.length).toBe(3)
    expect(result.current.tableLeadCards.length).toBe(1)
    expect(result.current.tableLeadCards[0].id).toBe(firstCard.id)
    expect(result.current.activePlayer).toBe('opponent')
    expect(result.current.phase).toBe('response')

    // 3. Fast-forward timer for AI response thinking (800ms)
    act(() => {
      vi.advanceTimersByTime(850)
    })

    // AI should have played a response card!
    expect(result.current.tableResponseCards.length).toBe(1)
    expect(result.current.phase).toBe('evaluating')

    // 4. Fast-forward timer for trick collection and hand refilling (1300ms)
    act(() => {
      vi.advanceTimersByTime(1400)
    })

    // Table should now be cleared
    expect(result.current.tableLeadCards.length).toBe(0)
    expect(result.current.tableResponseCards.length).toBe(0)

    // Total tricks between both players should be 2 cards (1 trick)
    const totalTricks =
      result.current.playerTricks.length + result.current.opponentTricks.length
    expect(totalTricks).toBe(2)

    // Hands should be refilled back to 4 cards each!
    expect(result.current.playerHand.length).toBe(4)
    expect(result.current.opponentHand.length).toBe(4)

    // Deck decreased from 27 to 25 cards
    expect(result.current.deck.length).toBe(25)

    // The game must be in 'lead' phase ready for the next trick!
    expect(result.current.phase).toBe('lead')

    // Active player is either player or opponent (the winner of the trick)
    expect(['player', 'opponent']).toContain(result.current.activePlayer)

    // If opponent won, opponent should automatically lead after 800ms
    if (result.current.activePlayer === 'opponent') {
      act(() => {
        vi.advanceTimersByTime(850)
      })
      // Opponent leads, now table has lead cards and it is player's turn to respond
      expect(result.current.tableLeadCards.length).toBeGreaterThanOrEqual(1)
      expect(result.current.activePlayer).toBe('player')
      expect(result.current.phase).toBe('response')
    }
  })

  it('awards exactly 1 point on round victory with default match target of 6', () => {
    const { result } = renderHook(() => useBuraGame())

    expect(result.current.settings.matchTarget).toBe(6)

    // Declare immediate combination (e.g. Bura)
    act(() => {
      result.current.declareCombination('player', {
        type: 'bura',
        name: 'Бура',
        description: '4 козыря',
        cards: [],
        isImmediateWin: true,
      })
    })

    // Should award exactly 1 match point!
    expect(result.current.phase).toBe('round_ended')
    expect(result.current.roundResult?.winner).toBe('player')
    expect(result.current.roundResult?.pointsAwarded).toBe(1)
    expect(result.current.matchScore.player).toBe(1)
  })
})

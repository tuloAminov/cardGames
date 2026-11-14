import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBuraGame } from './useBuraGame'

describe('Bura Exhaustion and Endgame Scenarios', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('plays through to deck exhaustion and awards final round victory', () => {
    const { result } = renderHook(() => useBuraGame())

    // Set fast animations
    act(() => {
      result.current.setSettings((s) => ({ ...s, fastAnimations: true }))
    })

    // Simulate tricks until round finishes
    let safetyCounter = 0
    while (
      result.current.phase !== 'round_ended' &&
      result.current.phase !== 'match_ended' &&
      safetyCounter < 100
    ) {
      safetyCounter++

      if (result.current.phase === 'lead') {
        if (result.current.activePlayer === 'player') {
          const cardToPlay = result.current.playerHand[0]
          if (!cardToPlay) break
          act(() => {
            result.current.playerLead([cardToPlay])
          })
        } else {
          // AI lead
          act(() => {
            vi.advanceTimersByTime(400)
          })
        }
      } else if (result.current.phase === 'response') {
        if (result.current.activePlayer === 'player') {
          const required = result.current.tableLeadCards.length
          const cardsToPlay = result.current.playerHand.slice(0, required)
          if (cardsToPlay.length < required) break
          act(() => {
            result.current.playerRespond(cardsToPlay)
          })
        } else {
          // AI response
          act(() => {
            vi.advanceTimersByTime(400)
          })
        }
      } else if (result.current.phase === 'evaluating') {
        act(() => {
          vi.advanceTimersByTime(800)
        })
      }
    }

    // After deck and hands are exhausted or someone called 31 or combo, round ends!
    expect(['round_ended', 'match_ended']).toContain(result.current.phase)
    expect(result.current.roundResult).not.toBeNull()
  })
})

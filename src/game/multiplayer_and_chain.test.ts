import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBuraGame } from './useBuraGame'
import { getPlayerTeam, getActivePlayerIds, getHandSize } from './rules'
import { buildSanitizedStateForClient } from './network'
import type { Card } from './types'

describe('Bura New Features & Modes (Multiplayer, Chain Battling & Score Secrecy)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('verifies rules helpers for 2, 3, and 4 players and team partnerships', () => {
    // Hand sizes
    expect(getHandSize('duel_classic_4')).toBe(4)
    expect(getHandSize('duel_chain_6')).toBe(6)
    expect(getHandSize('ffa_3')).toBe(4)
    expect(getHandSize('ffa_4')).toBe(4)
    expect(getHandSize('teams_4')).toBe(4)

    // Active player IDs
    expect(getActivePlayerIds('duel_classic_4')).toEqual(['player', 'opponent'])
    expect(getActivePlayerIds('duel_chain_6')).toEqual(['player', 'opponent'])
    expect(getActivePlayerIds('ffa_3')).toEqual(['player', 'opponent', 'p3'])
    expect(getActivePlayerIds('ffa_4')).toEqual(['player', 'opponent', 'p3', 'p4'])
    expect(getActivePlayerIds('teams_4')).toEqual(['player', 'opponent', 'p3', 'p4'])

    // Team partnerships: players sitting opposite each other are in the same team!
    // Team 1: Bottom ('player') and Top ('p3')
    expect(getPlayerTeam('player')).toBe(1)
    expect(getPlayerTeam('p3')).toBe(1)

    // Team 2: Left ('opponent') and Right ('p4')
    expect(getPlayerTeam('opponent')).toBe(2)
    expect(getPlayerTeam('p4')).toBe(2)
  })

  it('supports 1v1 Mode 2: 6 cards hand size and chain battling mechanics', () => {
    const { result } = renderHook(() => useBuraGame())

    // Switch to 6-card Chain Battling mode
    act(() => {
      result.current.startNewRound('player', 'duel_chain_6')
    })

    // Both players should receive exactly 6 cards!
    expect(result.current.playerHand.length).toBe(6)
    expect(result.current.opponentHand.length).toBe(6)
    // 36 total cards - (6*2 + 1 trump) = 23 in deck
    expect(result.current.deck.length).toBe(23)
    expect(result.current.trumpCard).not.toBeNull()
    expect(result.current.phase).toBe('lead')

    const firstCard = result.current.playerHand[0]
    expect(firstCard).toBeDefined()

    // 1. Leader leads 1 card to start the chain attack
    act(() => {
      result.current.toggleSelectCard(firstCard.id)
    })
    act(() => {
      result.current.playerLead()
    })

    // Player hand has 5 cards remaining
    expect(result.current.playerHand.length).toBe(5)
    // Chain battle is now active!
    expect(result.current.chainBattle).not.toBeNull()
    expect(result.current.chainBattle?.active).toBe(true)
    expect(result.current.chainBattle?.currentTargetCard?.id).toBe(firstCard.id)
    expect(result.current.chainBattle?.currentAttackerId).toBe('player')
    expect(result.current.chainBattle?.currentDefenderId).toBe('opponent')
    expect(result.current.activePlayer).toBe('opponent')
    expect(result.current.phase).toBe('response')

    // 2. Defender surrenders: attacker takes all cards in the exchange
    act(() => {
      // Opponent calls surrender
      result.current.chainBattleSurrender()
    })

    expect(result.current.phase).toBe('evaluating')

    // Advance time for trick collection and hand refill
    act(() => {
      vi.advanceTimersByTime(1400)
    })

    // Player (attacker) won the surrender and gets the trick!
    // Defender surrendered 1 card (giving up as many cards as attacker threw) + attacker threw 1 card = 2 cards!
    expect(result.current.playerTricks.length).toBe(2)
    // Chain battle is cleared
    expect(result.current.chainBattle).toBeNull()
    // Hands are refilled back up to 6 cards!
    expect(result.current.playerHand.length).toBe(6)
    expect(result.current.opponentHand.length).toBe(6)
    // Winner has the lead for the next trick
    expect(result.current.activePlayer).toBe('player')
    expect(result.current.phase).toBe('lead')
  })

  it('supports 3 players FFA: 4 cards dealt to each of 3 players', () => {
    const { result } = renderHook(() => useBuraGame())

    act(() => {
      result.current.startNewRound('player', 'ffa_3')
    })

    // 3 players get 4 cards each
    expect(result.current.playerHand.length).toBe(4)
    expect(result.current.opponentHand.length).toBe(4)
    expect(result.current.p3Hand.length).toBe(4)
    // 36 - (3*4 + 1) = 23 in deck
    expect(result.current.deck.length).toBe(23)
  })

  it('supports 4 players Teams (2v2): 4 cards each, and pooled team points', () => {
    const { result } = renderHook(() => useBuraGame())

    act(() => {
      result.current.startNewRound('player', 'teams_4')
    })

    // 4 players get 4 cards each
    expect(result.current.playerHand.length).toBe(4)
    expect(result.current.opponentHand.length).toBe(4)
    expect(result.current.p3Hand.length).toBe(4)
    expect(result.current.p4Hand.length).toBe(4)
    // 36 - (4*4 + 1) = 19 in deck
    expect(result.current.deck.length).toBe(19)

    // Team 1 points pool player + p3
    expect(result.current.team1Points).toBe(
      result.current.playerTricksPoints + result.current.p3TricksPoints
    )
    // Team 2 points pool opponent + p4
    expect(result.current.team2Points).toBe(
      result.current.opponentTricksPoints + result.current.p4TricksPoints
    )
  })

  it('supports 1v1 Mode 2: leading multiple cards, beating and counter-attacking with multiple cards', () => {
    const { result } = renderHook(() => useBuraGame())

    act(() => {
      result.current.startNewRound('player', 'duel_chain_6')
    })

    // Player hand has 6 cards
    expect(result.current.playerHand.length).toBe(6)

    // 1. Player leads 2 cards to start the attack
    const leadCards = result.current.playerHand.slice(0, 2)
    act(() => {
      result.current.playerLead(leadCards)
    })

    // Player hand has 4 cards remaining
    expect(result.current.playerHand.length).toBe(4)
    expect(result.current.chainBattle?.active).toBe(true)
    expect(result.current.chainBattle?.currentTargetCards.length).toBe(2)
    expect(result.current.chainBattle?.requiredSurrenderCount).toBe(2)
    expect(result.current.activePlayer).toBe('opponent')

    // 2. Opponent surrenders: gives up 2 cards (as many as Player 1 threw!)
    const oppCardsBefore = result.current.opponentHand.length
    expect(oppCardsBefore).toBe(6)

    act(() => {
      result.current.chainBattleSurrender('opponent')
    })

    expect(result.current.phase).toBe('evaluating')

    // Advance timer for collection and refill
    act(() => {
      vi.advanceTimersByTime(1400)
    })

    // Player won: took 2 lead cards + 2 surrendered cards = 4 cards in tricks!
    expect(result.current.playerTricks.length).toBe(4)
    // Hands refilled back up to 6 cards!
    expect(result.current.playerHand.length).toBe(6)
    expect(result.current.opponentHand.length).toBe(6)
    expect(result.current.activePlayer).toBe('player')
  })

  it('verifies two-step chain battling: first defend, then choose cards to counter-attack', () => {
    const { result } = renderHook(() => useBuraGame())

    act(() => {
      result.current.startNewRound('player', 'duel_chain_6')
    })

    const trump = result.current.trumpSuit

    // 1. Player leads 1 card (non-trump)
    const p1LeadCard: Card = { id: 'test_lead_7', suit: trump === 'hearts' ? 'clubs' : 'hearts', rank: '7', points: 0, power: 2 }
    act(() => {
      result.current.playerLead([p1LeadCard])
    })

    expect(result.current.chainBattle?.active).toBe(true)
    expect(result.current.chainBattle?.stage).toBe('defend')
    expect(result.current.activePlayer).toBe('opponent')

    // 2. Opponent beats first (Step 1: Defend) with a higher card (Trump Ace)
    const oppDefendCard: Card = { id: 'test_def_A', suit: trump, rank: 'A', points: 11, power: 9 }
    act(() => {
      result.current.chainBattleDefend([oppDefendCard])
    })

    // Now opponent has beaten the card, and is in the 'attack' stage!
    expect(result.current.chainBattle?.stage).toBe('attack')
    expect(result.current.activePlayer).toBe('opponent')
    expect(result.current.phase).toBe('lead')

    // 3. Opponent now chooses cards for their own counter-attack (Step 2: Attack)
    const oppAttackCard: Card = { id: 'test_atk_10', suit: trump, rank: '10', points: 10, power: 8 }
    act(() => {
      result.current.chainBattleAttack([oppAttackCard])
    })

    // Now turn flips to Player who is now the defender in 'defend' stage!
    expect(result.current.chainBattle?.stage).toBe('defend')
    expect(result.current.chainBattle?.currentDefenderId).toBe('player')
    expect(result.current.activePlayer).toBe('player')
    expect(result.current.phase).toBe('response')
  })

  it('preserves secrecy: opponent trick points are completely hidden in sanitized online state', () => {
    const hostTricks: Card[] = [
      { id: 'spades_A', suit: 'spades', rank: 'A', points: 11, power: 9 },
      { id: 'hearts_10', suit: 'hearts', rank: '10', points: 10, power: 8 },
    ]

    const sanitized = buildSanitizedStateForClient({
      phase: 'lead',
      ruleType: 'duel_classic_4',
      activePlayer: 'player',
      leadPlayer: null,
      deckCount: 20,
      trumpCard: null,
      trumpSuit: 'spades',
      tableLeadCards: [],
      tableResponseCards: [],
      chainBattle: null,
      trickResolutionText: null,
      roundResult: null,
      matchScore: { player: 0, opponent: 0, target: 11 },
      lastTrick: null,
      combinationNotice: null,
      hostHand: [],
      clientHand: [],
      hostTricks,
      clientTricks: [],
      hostName: 'Хост',
      clientName: 'Гость',
    })

    // Opponent points are NEVER exposed in sanitized client state!
    expect((sanitized as any).opponentTricksPoints).toBeUndefined()
    expect((sanitized as any).opponentTricks).toBeUndefined()
    // Only the count of cards is exposed
    expect(sanitized.opponentTricksCount).toBe(2)
  })

  it('guarantees all 3 players move in 3-player mode (Player 1 -> Player 2 -> Player 3)', () => {
    const { result } = renderHook(() => useBuraGame())

    act(() => {
      result.current.startNewRound('player', 'ffa_3')
    })

    expect(result.current.activePlayer).toBe('player')
    expect(result.current.phase).toBe('lead')

    // 1. Player leads 1 card
    const p1Card = result.current.playerHand[0]
    act(() => {
      result.current.playerLead([p1Card])
    })

    // Now active player is opponent (Player 2)
    expect(result.current.activePlayer).toBe('opponent')
    expect(result.current.phase).toBe('response')

    // 2. Advance timer for Player 2 (opponent AI) to respond
    act(() => {
      vi.advanceTimersByTime(850)
    })

    // Now active player MUST be p3 (Player 3)!
    expect(result.current.activePlayer).toBe('p3')
    expect(result.current.phase).toBe('response')

    // 3. Advance timer for Player 3 (p3 AI) to respond
    act(() => {
      vi.advanceTimersByTime(850)
    })

    // All 3 players have played! Trick is evaluating!
    expect(result.current.phase).toBe('evaluating')
    expect(result.current.evaluatingWinner).not.toBeNull()

    // 4. Advance timer for collection and refill
    act(() => {
      vi.advanceTimersByTime(1400)
    })

    // All 3 players have hands refilled to 4 cards
    expect(result.current.playerHand.length).toBe(4)
    expect(result.current.opponentHand.length).toBe(4)
    expect(result.current.p3Hand.length).toBe(4)
    expect(['player', 'opponent', 'p3']).toContain(result.current.activePlayer)
  })

  it('ensures 4-player FFA has strictly individual scores without team grouping', () => {
    const { result } = renderHook(() => useBuraGame())

    act(() => {
      result.current.startNewMatch(6, 'ffa_4')
    })

    // In 4-player FFA, team1 and team2 MUST be undefined in matchScore!
    expect(result.current.matchScore.team1).toBeUndefined()
    expect(result.current.matchScore.team2).toBeUndefined()
    expect(result.current.matchScore.target).toBe(6)

    // Declare combination as player
    act(() => {
      result.current.declareCombination('player', {
        type: 'bura',
        name: 'Бура',
        description: '4 козыря',
        cards: [],
        isImmediateWin: true,
      })
    })

    // Round ended: winnerTeam MUST be undefined! Individual victory only!
    expect(result.current.roundResult?.winnerTeam).toBeUndefined()
    expect(result.current.roundResult?.winner).toBe('player')
    expect(result.current.matchScore.player).toBe(1)
    expect(result.current.matchScore.opponent).toBe(0)
  })
})

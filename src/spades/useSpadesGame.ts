import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  PlayerRoundRecord,
  SpadesCard,
  SpadesGameConfig,
  SpadesPlayer,
  SpadesPlayerId,
  SpadesRoundSummary,
  SpadesTrick,
} from './types'
import {
  createSpadesDeck,
  shuffleSpadesDeck,
  sortSpadesHand,
  getValidSpadesMoves,
  resolveSpadesTrickWinner,
  calculateAIBid,
  chooseAICard,
  calculateTeamRoundScore,
} from './engine'
import { spadesSound } from './audio'

export function useSpadesGame() {
  const [config, setConfig] = useState<SpadesGameConfig>(() => {
    return {
      playerName: 'Вы',
      targetScore: 250,
      scoringMode: 'short',
      bagsLimit: 6,
      bagPenalty: 50,
      nilPoints: 50,
      soundEnabled: true,
      animSpeed: 'normal',
    }
  })

  const [phase, setPhase] = useState<'bidding' | 'playing' | 'evaluating' | 'round_end' | 'game_over'>('bidding')
  const [roundNumber, setRoundNumber] = useState<number>(1)
  const [trickNumber, setTrickNumber] = useState<number>(1)
  const [dealerIdx, setDealerIdx] = useState<SpadesPlayerId>(3)
  const [currentTurn, setCurrentTurn] = useState<SpadesPlayerId>(0)
  const [spadesBroken, setSpadesBroken] = useState<boolean>(false)

  const [players, setPlayers] = useState<SpadesPlayer[]>(() => [
    { id: 0, name: 'Вы', teamId: 0, isAI: false, hand: [], bid: null, tricksWon: 0, avatar: '👤' },
    { id: 1, name: 'Игрок 3 (Запад)', teamId: 1, isAI: true, hand: [], bid: null, tricksWon: 0, avatar: '🧔' },
    { id: 2, name: 'Игрок 2 (Партнёр)', teamId: 0, isAI: true, hand: [], bid: null, tricksWon: 0, avatar: '👨‍✈️' },
    { id: 3, name: 'Игрок 4 (Восток)', teamId: 1, isAI: true, hand: [], bid: null, tricksWon: 0, avatar: '🎩' },
  ])

  const [currentTrick, setCurrentTrick] = useState<SpadesTrick>({
    trickNumber: 1,
    plays: [],
    leadSuit: null,
    winnerId: null,
    winningCard: null,
  })

  const [lastTrick, setLastTrick] = useState<SpadesTrick | null>(null)
  const [team0Score, setTeam0Score] = useState<number>(0)
  const [team1Score, setTeam1Score] = useState<number>(0)
  const [team0Bags, setTeam0Bags] = useState<number>(0)
  const [team1Bags, setTeam1Bags] = useState<number>(0)

  const [lastRoundSummary, setLastRoundSummary] = useState<SpadesRoundSummary | null>(null)
  const [history, setHistory] = useState<SpadesRoundSummary[]>([])
  const [winnerTeamId, setWinnerTeamId] = useState<(0 | 1) | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('Добро пожаловать в игру «Пики»!')

  // Selected card in player hand
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  // Modals state
  const [isRulesOpen, setIsRulesOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Keep a ref to avoid stale closures in timeouts
  const stateRef = useRef({
    phase,
    roundNumber,
    trickNumber,
    dealerIdx,
    currentTurn,
    spadesBroken,
    players,
    currentTrick,
    lastTrick,
    team0Score,
    team1Score,
    team0Bags,
    team1Bags,
    config,
  })

  useEffect(() => {
    stateRef.current = {
      phase,
      roundNumber,
      trickNumber,
      dealerIdx,
      currentTurn,
      spadesBroken,
      players,
      currentTrick,
      lastTrick,
      team0Score,
      team1Score,
      team0Bags,
      team1Bags,
      config,
    }
  })

  useEffect(() => {
    spadesSound.setEnabled(config.soundEnabled)
  }, [config.soundEnabled])

  // Start new round
  const startNewRound = useCallback(
    (nextDealer: SpadesPlayerId = 3, roundNum: number = 1) => {
      const fullDeck = shuffleSpadesDeck(createSpadesDeck())
      // Deal 13 cards to each of the 4 players
      const hands: SpadesCard[][] = [
        sortSpadesHand(fullDeck.slice(0, 13)),
        sortSpadesHand(fullDeck.slice(13, 26)),
        sortSpadesHand(fullDeck.slice(26, 39)),
        sortSpadesHand(fullDeck.slice(39, 52)),
      ]

      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          hand: hands[p.id],
          bid: null,
          tricksWon: 0,
        }))
      )

      setRoundNumber(roundNum)
      setTrickNumber(1)
      setDealerIdx(nextDealer)
      setSpadesBroken(false)
      setSelectedCardId(null)

      // First bidder is clockwise from dealer
      const firstBidder = ((nextDealer + 1) % 4) as SpadesPlayerId
      setCurrentTurn(firstBidder)
      setPhase('bidding')

      setCurrentTrick({
        trickNumber: 1,
        plays: [],
        leadSuit: null,
        winnerId: null,
        winningCard: null,
      })

      spadesSound.playDeal()
      setStatusMessage(`Раунд ${roundNum}: фаза ставок! Торговлю начинает ${firstBidder === 0 ? 'Вы' : `Игрок ${firstBidder + 1}`}.`)
    },
    []
  )

  // Start entirely new match
  const startNewMatch = useCallback(
    (newConfig?: Partial<SpadesGameConfig>) => {
      if (newConfig) {
        setConfig((prev) => ({ ...prev, ...newConfig }))
      }
      setTeam0Score(0)
      setTeam1Score(0)
      setTeam0Bags(0)
      setTeam1Bags(0)
      setHistory([])
      setLastRoundSummary(null)
      setWinnerTeamId(null)
      startNewRound(3, 1)
    },
    [startNewRound]
  )

  // Mount effect to start round
  useEffect(() => {
    startNewMatch()
  }, [startNewMatch])

  // Player submits bid
  const submitBid = useCallback((bid: number, playerId: SpadesPlayerId = 0) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, bid } : p))
    )
    spadesSound.playCardSnap()

    // Determine next bidder or transition to play
    const nextBidder = ((playerId + 1) % 4) as SpadesPlayerId
    const currentDealer = stateRef.current.dealerIdx

    if (playerId === currentDealer) {
      // All 4 bids are complete! Transition to playing phase
      setPhase('playing')
      // First leader is player left of dealer
      const firstLeader = ((currentDealer + 1) % 4) as SpadesPlayerId
      setCurrentTurn(firstLeader)
      setStatusMessage(`Ставки сделаны! Первый ход делает ${firstLeader === 0 ? 'Вы' : `Игрок ${firstLeader + 1}`}.`)
    } else {
      setCurrentTurn(nextBidder)
      setStatusMessage(`Ход ставок: ${nextBidder === 0 ? 'Ваша очередь' : `Игрок ${nextBidder + 1}`}.`)
    }
  }, [])

  // Execute card play
  const playCard = useCallback((playerId: SpadesPlayerId, card: SpadesCard) => {
    spadesSound.playCardSnap()

    const player = stateRef.current.players[playerId]
    const currentTrickData = stateRef.current.currentTrick

    // If spade is played and not broken yet -> spades broken!
    if (card.suit === '♠' && !stateRef.current.spadesBroken) {
      setSpadesBroken(true)
    }

    // Remove card from player hand
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, hand: p.hand.filter((c) => c.id !== card.id) } : p
      )
    )

    const newPlay = {
      playerId,
      playerName: player.name,
      card,
    }

    const nextPlays = [...currentTrickData.plays, newPlay]
    const ledSuit = currentTrickData.leadSuit || card.suit

    setSelectedCardId(null)

    // Check if trick is complete (4 cards played)
    if (nextPlays.length === 4) {
      const { winnerId, winningCard } = resolveSpadesTrickWinner(nextPlays)
      const finishedTrick: SpadesTrick = {
        trickNumber: stateRef.current.trickNumber,
        plays: nextPlays,
        leadSuit: ledSuit,
        winnerId,
        winningCard,
      }

      setCurrentTrick(finishedTrick)
      setPhase('evaluating')
      spadesSound.playCollectTrick()

      const winnerPlayer = stateRef.current.players[winnerId]
      setStatusMessage(`Взятку забирает ${winnerPlayer.name} с картой ${winningCard.name}!`)

      const delay = stateRef.current.config.animSpeed === 'fast' ? 700 : 1200

      setTimeout(() => {
        // Collect trick to winner
        setPlayers((prev) =>
          prev.map((p) => (p.id === winnerId ? { ...p, tricksWon: p.tricksWon + 1 } : p))
        )
        setLastTrick(finishedTrick)

        const nextTrickNum = stateRef.current.trickNumber + 1

        if (nextTrickNum > 13) {
          // Round finished! Calculate scoring
          const updatedPlayers = stateRef.current.players.map((p) =>
            p.id === winnerId ? { ...p, tricksWon: p.tricksWon + 1 } : p
          )

          const team0Records: PlayerRoundRecord[] = [
            {
              playerId: 0,
              name: updatedPlayers[0].name,
              bid: updatedPlayers[0].bid || 0,
              tricksWon: updatedPlayers[0].tricksWon,
              isNil: updatedPlayers[0].bid === 0,
              nilSuccess: updatedPlayers[0].bid === 0 ? updatedPlayers[0].tricksWon === 0 : null,
              nilPoints:
                updatedPlayers[0].bid === 0
                  ? updatedPlayers[0].tricksWon === 0
                    ? stateRef.current.config.nilPoints
                    : -stateRef.current.config.nilPoints
                  : 0,
            },
            {
              playerId: 2,
              name: updatedPlayers[2].name,
              bid: updatedPlayers[2].bid || 0,
              tricksWon: updatedPlayers[2].tricksWon,
              isNil: updatedPlayers[2].bid === 0,
              nilSuccess: updatedPlayers[2].bid === 0 ? updatedPlayers[2].tricksWon === 0 : null,
              nilPoints:
                updatedPlayers[2].bid === 0
                  ? updatedPlayers[2].tricksWon === 0
                    ? stateRef.current.config.nilPoints
                    : -stateRef.current.config.nilPoints
                  : 0,
            },
          ]

          const team1Records: PlayerRoundRecord[] = [
            {
              playerId: 1,
              name: updatedPlayers[1].name,
              bid: updatedPlayers[1].bid || 0,
              tricksWon: updatedPlayers[1].tricksWon,
              isNil: updatedPlayers[1].bid === 0,
              nilSuccess: updatedPlayers[1].bid === 0 ? updatedPlayers[1].tricksWon === 0 : null,
              nilPoints:
                updatedPlayers[1].bid === 0
                  ? updatedPlayers[1].tricksWon === 0
                    ? stateRef.current.config.nilPoints
                    : -stateRef.current.config.nilPoints
                  : 0,
            },
            {
              playerId: 3,
              name: updatedPlayers[3].name,
              bid: updatedPlayers[3].bid || 0,
              tricksWon: updatedPlayers[3].tricksWon,
              isNil: updatedPlayers[3].bid === 0,
              nilSuccess: updatedPlayers[3].bid === 0 ? updatedPlayers[3].tricksWon === 0 : null,
              nilPoints:
                updatedPlayers[3].bid === 0
                  ? updatedPlayers[3].tricksWon === 0
                    ? stateRef.current.config.nilPoints
                    : -stateRef.current.config.nilPoints
                  : 0,
            },
          ]

          const team0RoundScore = calculateTeamRoundScore(
            0,
            'Ваша команда',
            team0Records,
            stateRef.current.team0Bags,
            stateRef.current.team0Score,
            stateRef.current.config
          )

          const team1RoundScore = calculateTeamRoundScore(
            1,
            'Соперники',
            team1Records,
            stateRef.current.team1Bags,
            stateRef.current.team1Score,
            stateRef.current.config
          )

          setTeam0Score(team0RoundScore.scoreAfter)
          setTeam1Score(team1RoundScore.scoreAfter)
          setTeam0Bags(team0RoundScore.bagsAfter)
          setTeam1Bags(team1RoundScore.bagsAfter)

          let matchWinner: (0 | 1) | null = null
          const target = stateRef.current.config.targetScore
          if (team0RoundScore.scoreAfter >= target || team1RoundScore.scoreAfter >= target) {
            if (team0RoundScore.scoreAfter > team1RoundScore.scoreAfter) matchWinner = 0
            else if (team1RoundScore.scoreAfter > team0RoundScore.scoreAfter) matchWinner = 1
          }

          const summary: SpadesRoundSummary = {
            roundNumber: stateRef.current.roundNumber,
            team0Score: team0RoundScore,
            team1Score: team1RoundScore,
            winnerTeamId: matchWinner,
          }

          setLastRoundSummary(summary)
          setHistory((prev) => [...prev, summary])

          if (matchWinner !== null) {
            setWinnerTeamId(matchWinner)
            setPhase('game_over')
            if (matchWinner === 0) spadesSound.playWin()
            else spadesSound.playLose()
          } else {
            setPhase('round_end')
          }
        } else {
          // Prepare next trick
          setTrickNumber(nextTrickNum)
          setCurrentTrick({
            trickNumber: nextTrickNum,
            plays: [],
            leadSuit: null,
            winnerId: null,
            winningCard: null,
          })
          setCurrentTurn(winnerId)
          setPhase('playing')
          setStatusMessage(`Ход делает победитель взятки — ${winnerPlayer.name}.`)
        }
      }, delay)
    } else {
      // Trick not complete: turn passes clockwise to next player
      const nextTurn = ((playerId + 1) % 4) as SpadesPlayerId
      setCurrentTrick({
        ...currentTrickData,
        plays: nextPlays,
        leadSuit: ledSuit,
      })
      setCurrentTurn(nextTurn)
      setStatusMessage(`Ход переходит к ${nextTurn === 0 ? 'Вам' : `Игроку ${nextTurn + 1}`}.`)
    }
  }, [])

  // AI execution runner
  useEffect(() => {
    if (currentTurn === 0) return // Human turn
    if (phase !== 'bidding' && phase !== 'playing') return

    const delay = config.animSpeed === 'fast' ? 350 : 650

    const timer = setTimeout(() => {
      const curTurn = stateRef.current.currentTurn
      if (curTurn === 0) return

      const player = stateRef.current.players[curTurn]

      if (stateRef.current.phase === 'bidding') {
        const partnerId = (curTurn === 1 ? 3 : curTurn === 2 ? 0 : 1) as SpadesPlayerId
        const partnerBid = stateRef.current.players[partnerId].bid
        const aiBid = calculateAIBid(player.hand, partnerBid)
        submitBid(aiBid, curTurn)
      } else if (stateRef.current.phase === 'playing') {
        const partnerId = (curTurn === 1 ? 3 : curTurn === 2 ? 0 : 1) as SpadesPlayerId
        const partnerBid = stateRef.current.players[partnerId].bid
        const chosenCard = chooseAICard(
          player.hand,
          stateRef.current.currentTrick,
          stateRef.current.spadesBroken,
          curTurn,
          partnerBid
        )
        playCard(curTurn, chosenCard)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [currentTurn, phase, config.animSpeed, submitBid, playCard])

  // Human player valid moves
  const humanPlayer = players[0]
  const validHumanMoves = getValidSpadesMoves(
    humanPlayer.hand,
    currentTrick.leadSuit,
    spadesBroken
  )

  const handleHumanPlayCard = useCallback(
    (card: SpadesCard) => {
      if (phase !== 'playing' || currentTurn !== 0) return
      const isLegal = validHumanMoves.some((c) => c.id === card.id)
      if (!isLegal) return
      playCard(0, card)
    },
    [phase, currentTurn, validHumanMoves, playCard]
  )

  const handleNextRound = useCallback(() => {
    const nextDealer = ((dealerIdx + 1) % 4) as SpadesPlayerId
    startNewRound(nextDealer, roundNumber + 1)
  }, [dealerIdx, roundNumber, startNewRound])

  // Contract calculation for UI
  const team0Contract = (players[0].bid || 0) + (players[2].bid || 0)
  const team0Tricks = players[0].tricksWon + players[2].tricksWon

  const team1Contract = (players[1].bid || 0) + (players[3].bid || 0)
  const team1Tricks = players[1].tricksWon + players[3].tricksWon

  return {
    config,
    setConfig,
    phase,
    roundNumber,
    trickNumber,
    dealerIdx,
    currentTurn,
    spadesBroken,
    players,
    humanPlayer,
    validHumanMoves,
    currentTrick,
    lastTrick,
    team0Score,
    team1Score,
    team0Bags,
    team1Bags,
    team0Contract,
    team0Tricks,
    team1Contract,
    team1Tricks,
    lastRoundSummary,
    history,
    winnerTeamId,
    statusMessage,
    selectedCardId,
    setSelectedCardId,
    isRulesOpen,
    setIsRulesOpen,
    isHistoryOpen,
    setIsHistoryOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    submitBid,
    playCard: handleHumanPlayCard,
    startNewMatch,
    startNextRound: handleNextRound,
  }
}

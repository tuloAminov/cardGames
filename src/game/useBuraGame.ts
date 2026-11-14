import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  Card,
  ChainBattleState,
  ChatMessage,
  Combination,
  ConnectionStatus,
  GameRuleType,
  GameSettings,
  MatchScore,
  NetworkMessage,
  OnlineRole,
  PlayerId,
  RoundResult,
  Suit,
  Trick,
} from './types'
import {
  createDeck,
  shuffleDeck,
  isValidLead,
  resolveTrickWinner,
  doesResponseBeatLead,
  detectCombinations,
  calculateCardsPoints,
  matchResponseToLead,
  SUIT_NAMES,
  getHandSize,
  getActivePlayerIds,
  getPlayerTeam,
  resolveMultiplayerTrickWinner,
  chooseSurrenderCards,
  type PlayerTrickPlay,
} from './rules'
import {
  getAILeadCards,
  getAIResponseCards,
  getAIChainBattlePlay,
} from './ai'
import { soundManager } from './audio'
import {
  networkManager,
  buildSanitizedStateForClient,
  normalizeRoomCode,
  getSavedOnlineSession,
} from './network'

export type BuraPhase =
  | 'lead'
  | 'response'
  | 'evaluating'
  | 'round_ended'
  | 'match_ended'

export function useBuraGame() {
  const [settings, setSettings] = useState<GameSettings>(() => {
    return {
      difficulty: 'medium',
      mode: 'vs_ai',
      ruleType: 'duel_classic_4',
      matchTarget: 6,
      showScoreHelper: true,
      soundEnabled: true,
      darkFelt: false,
      fastAnimations: false,
    }
  })

  // Online Multiplayer States
  const [onlineRole, setOnlineRole] = useState<OnlineRole>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const [roomCode, setRoomCode] = useState<string>('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [myNickname, setMyNickname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bura_nickname') || 'Игрок 1'
    }
    return 'Игрок 1'
  })
  const [opponentNickname, setOpponentNickname] = useState<string>('Соперник')
  const [p3Nickname] = useState<string>('Игрок 3')
  const [p4Nickname] = useState<string>('Игрок 4')

  // Core gameplay states
  const [phase, setPhase] = useState<BuraPhase>('lead')
  const [activePlayer, setActivePlayer] = useState<PlayerId>('player')
  const [leadPlayer, setLeadPlayer] = useState<PlayerId | null>(null)

  const [deck, setDeck] = useState<Card[]>([])
  const [trumpCard, setTrumpCard] = useState<Card | null>(null)
  const [trumpSuit, setTrumpSuit] = useState<Suit>('spades')

  const [playerHand, setPlayerHand] = useState<Card[]>([])
  const [opponentHand, setOpponentHand] = useState<Card[]>([])
  const [p3Hand, setP3Hand] = useState<Card[]>([])
  const [p4Hand, setP4Hand] = useState<Card[]>([])

  const [playerTricks, setPlayerTricks] = useState<Card[]>([])
  const [opponentTricks, setOpponentTricks] = useState<Card[]>([])
  const [p3Tricks, setP3Tricks] = useState<Card[]>([])
  const [p4Tricks, setP4Tricks] = useState<Card[]>([])

  const [tableLeadCards, setTableLeadCards] = useState<Card[]>([])
  const [tableResponseCards, setTableResponseCards] = useState<Card[]>([])
  const [multiplayerPlays, setMultiplayerPlays] = useState<PlayerTrickPlay[]>([])
  const [chainBattle, setChainBattle] = useState<ChainBattleState | null>(null)

  const [trickResolutionText, setTrickResolutionText] = useState<string | null>(null)
  const [lastTrick, setLastTrick] = useState<Trick | null>(null)

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([])
  const [discardFaceDown, setDiscardFaceDown] = useState<boolean>(false)

  // Hotseat privacy curtain toggle
  const [isHotseatCurtainActive, setIsHotseatCurtainActive] = useState<boolean>(false)

  // Trick viewer modal toggle
  const [isTricksViewerOpen, setIsTricksViewerOpen] = useState<boolean>(false)
  const [viewingPlayerTricks, setViewingPlayerTricks] = useState<PlayerId>('player')

  const [roundResult, setRoundResult] = useState<RoundResult | null>(null)
  const [matchScore, setMatchScore] = useState<MatchScore>({
    player: 0,
    opponent: 0,
    target: 6,
  })
  const [evaluatingWinner, setEvaluatingWinner] = useState<PlayerId | null>(null)
  const [evaluatingPoints, setEvaluatingPoints] = useState<number>(0)

  const [statusMessage, setStatusMessage] = useState<string>('Добро пожаловать в Буру!')
  const [combinationNotice, setCombinationNotice] = useState<Combination | null>(null)

  // Audio synchronization
  useEffect(() => {
    soundManager.setEnabled(settings.soundEnabled)
  }, [settings.soundEnabled])

  // Points calculation
  const playerTricksPoints = calculateCardsPoints(playerTricks)
  const opponentTricksPoints = calculateCardsPoints(opponentTricks)
  const p3TricksPoints = calculateCardsPoints(p3Tricks)
  const p4TricksPoints = calculateCardsPoints(p4Tricks)
  const team1Points = playerTricksPoints + p3TricksPoints
  const team2Points = opponentTricksPoints + p4TricksPoints

  const isOnline = settings.mode === 'online'
  const isOnlineClient = isOnline && onlineRole === 'client'

  // Pure derived flags
  const isAITurn =
    settings.mode === 'vs_ai' &&
    activePlayer === 'opponent' &&
    (phase === 'lead' || phase === 'response')

  const canInteract =
    phase !== 'evaluating' &&
    phase !== 'round_ended' &&
    phase !== 'match_ended' &&
    (settings.mode === 'hotseat' ||
      (isOnlineClient ? activePlayer === 'opponent' : activePlayer === 'player'))

  // Ref to hold live state for timer callbacks, eliminating stale closure bugs!
  const stateRef = useRef({
    deck,
    trumpCard,
    trumpSuit,
    playerHand,
    opponentHand,
    p3Hand,
    p4Hand,
    playerTricks,
    opponentTricks,
    p3Tricks,
    p4Tricks,
    tableLeadCards,
    tableResponseCards,
    multiplayerPlays,
    chainBattle,
    leadPlayer,
    activePlayer,
    phase,
    settings,
    matchScore,
    lastTrick,
    combinationNotice,
    trickResolutionText,
    roundResult,
    onlineRole,
    myNickname,
    opponentNickname,
    p3Nickname,
    p4Nickname,
  })

  useEffect(() => {
    stateRef.current = {
      deck,
      trumpCard,
      trumpSuit,
      playerHand,
      opponentHand,
      p3Hand,
      p4Hand,
      playerTricks,
      opponentTricks,
      p3Tricks,
      p4Tricks,
      tableLeadCards,
      tableResponseCards,
      multiplayerPlays,
      chainBattle,
      leadPlayer,
      activePlayer,
      phase,
      settings,
      matchScore,
      lastTrick,
      combinationNotice,
      trickResolutionText,
      roundResult,
      onlineRole,
      myNickname,
      opponentNickname,
      p3Nickname,
      p4Nickname,
    }
  })

  // Broadcast sanitized state to online client whenever host updates state
  const broadcastHostState = useCallback(() => {
    if (stateRef.current.settings.mode !== 'online' || stateRef.current.onlineRole !== 'host') {
      return
    }

    const s = stateRef.current
    const sanitized = buildSanitizedStateForClient({
      phase: s.phase,
      ruleType: s.settings.ruleType || 'duel_classic_4',
      activePlayer: s.activePlayer,
      leadPlayer: s.leadPlayer,
      deckCount: s.deck.length,
      trumpCard: s.trumpCard,
      trumpSuit: s.trumpSuit,
      tableLeadCards: s.tableLeadCards,
      tableResponseCards: s.tableResponseCards,
      chainBattle: s.chainBattle,
      trickResolutionText: s.trickResolutionText,
      roundResult: s.roundResult,
      matchScore: s.matchScore,
      lastTrick: s.lastTrick,
      combinationNotice: s.combinationNotice,
      hostHand: s.playerHand,
      clientHand: s.opponentHand,
      hostTricks: s.playerTricks,
      clientTricks: s.opponentTricks,
      hostName: s.myNickname,
      clientName: s.opponentNickname,
    })

    networkManager.send({ type: 'SYNC_STATE', payload: sanitized })
  }, [])

  // Get player name helper
  const getPlayerName = useCallback(
    (id: PlayerId): string => {
      if (id === 'player') return myNickname
      if (id === 'opponent') return opponentNickname
      if (id === 'p3') return settings.ruleType === 'teams_4' ? 'Партнёр (Игрок 3)' : p3Nickname
      return p4Nickname
    },
    [myNickname, opponentNickname, p3Nickname, p4Nickname, settings.ruleType]
  )

  // Start new deal / round
  const startNewRound = useCallback((firstLeader?: PlayerId, overrideRuleType?: GameRuleType) => {
    const curRule = overrideRuleType || stateRef.current.settings.ruleType || 'duel_classic_4'
    if (overrideRuleType && stateRef.current.settings.ruleType !== overrideRuleType) {
      setSettings((s) => ({ ...s, ruleType: overrideRuleType }))
    }
    const handSize = getHandSize(curRule)
    const activeIds = getActivePlayerIds(curRule)

    const fullDeck = shuffleDeck(createDeck())
    let cursor = 0

    const pHand = fullDeck.slice(cursor, cursor + handSize); cursor += handSize
    const oHand = fullDeck.slice(cursor, cursor + handSize); cursor += handSize
    const thirdHand = activeIds.includes('p3') ? fullDeck.slice(cursor, cursor + handSize) : []
    if (activeIds.includes('p3')) cursor += handSize
    const fourthHand = activeIds.includes('p4') ? fullDeck.slice(cursor, cursor + handSize) : []
    if (activeIds.includes('p4')) cursor += handSize

    const trump = fullDeck[cursor]; cursor += 1
    const remainingDeck = fullDeck.slice(cursor)

    setPlayerHand(pHand)
    setOpponentHand(oHand)
    setP3Hand(thirdHand)
    setP4Hand(fourthHand)

    setTrumpCard(trump)
    setTrumpSuit(trump.suit)
    setDeck(remainingDeck)

    setPlayerTricks([])
    setOpponentTricks([])
    setP3Tricks([])
    setP4Tricks([])

    setTableLeadCards([])
    setTableResponseCards([])
    setMultiplayerPlays([])
    setChainBattle(null)

    setTrickResolutionText(null)
    setLastTrick(null)
    setSelectedCardIds([])
    setDiscardFaceDown(false)
    setRoundResult(null)
    setCombinationNotice(null)
    setIsHotseatCurtainActive(false)

    const leader = firstLeader || (activeIds.includes('player') ? 'player' : activeIds[0])
    setActivePlayer(leader)
    setLeadPlayer(null)
    setPhase('lead')

    soundManager.playDeal()

    const trumpName = SUIT_NAMES[trump.suit]
    setStatusMessage(
      leader === 'player'
        ? `Козырь — ${trumpName.ru} ${trumpName.symbol}. Ваш ход!`
        : `Козырь — ${trumpName.ru} ${trumpName.symbol}. Ход соперника.`
    )
  }, [])

  // Start entire match
  const startNewMatch = useCallback(
    (customTarget?: number, customRuleType?: GameRuleType) => {
      const target = customTarget || settings.matchTarget
      const rule = customRuleType || settings.ruleType || 'duel_classic_4'
      if (customRuleType && customRuleType !== settings.ruleType) {
        setSettings((s) => ({ ...s, ruleType: customRuleType }))
      }
      const isTeam = rule === 'teams_4'
      setMatchScore({
        player: 0,
        opponent: 0,
        team1: isTeam ? 0 : undefined,
        team2: isTeam ? 0 : undefined,
        target,
      })
      startNewRound('player', rule)
    },
    [settings.matchTarget, settings.ruleType, startNewRound]
  )

  useEffect(() => {
    startNewMatch()
  }, [startNewMatch])

  // Host state sync trigger on relevant state changes
  useEffect(() => {
    if (settings.mode === 'online' && onlineRole === 'host') {
      broadcastHostState()
    }
  }, [
    settings.mode,
    onlineRole,
    phase,
    activePlayer,
    leadPlayer,
    deck.length,
    trumpCard,
    trumpSuit,
    tableLeadCards,
    tableResponseCards,
    playerHand,
    opponentHand,
    playerTricks,
    opponentTricks,
    chainBattle,
    roundResult,
    matchScore,
    lastTrick,
    broadcastHostState,
  ])

  // Finish round and award match points
  const finishRound = useCallback((result: RoundResult) => {
    setRoundResult(result)
    setPhase('round_ended')

    const isTeamMode = stateRef.current.settings.ruleType === 'teams_4'

    if (result.winner === 'player' || (isTeamMode && result.winnerTeam === 1)) {
      soundManager.playWin()
    } else if (result.winner === 'opponent' || (isTeamMode && result.winnerTeam === 2)) {
      soundManager.playLose()
    }

    setMatchScore((prev) => {
      let next: MatchScore
      if (isTeamMode) {
        const team1Won = result.winnerTeam === 1 || result.winner === 'player' || result.winner === 'p3'
        const team2Won = result.winnerTeam === 2 || result.winner === 'opponent' || result.winner === 'p4'
        next = {
          ...prev,
          player: prev.player + (team1Won ? result.pointsAwarded : 0),
          opponent: prev.opponent + (team2Won ? result.pointsAwarded : 0),
          team1: (prev.team1 || 0) + (team1Won ? result.pointsAwarded : 0),
          team2: (prev.team2 || 0) + (team2Won ? result.pointsAwarded : 0),
        }
        if ((next.team1 || 0) >= next.target || (next.team2 || 0) >= next.target) {
          setPhase('match_ended')
        }
      } else {
        next = {
          ...prev,
          player: prev.player + (result.winner === 'player' ? result.pointsAwarded : 0),
          opponent: prev.opponent + (result.winner === 'opponent' ? result.pointsAwarded : 0),
        }
        if (next.player >= next.target || next.opponent >= next.target) {
          setPhase('match_ended')
        }
      }
      return next
    })
  }, [])

  // Card replenishment helper
  const refillHandsHelper = useCallback(
    (
      currentDeck: Card[],
      currentTrump: Card | null,
      hands: { player: Card[]; opponent: Card[]; p3: Card[]; p4: Card[] },
      winner: PlayerId,
      ruleType: GameRuleType
    ) => {
      let d = [...currentDeck]
      let t = currentTrump
      const p = [...hands.player]
      const o = [...hands.opponent]
      const p3 = [...hands.p3]
      const p4 = [...hands.p4]

      const handMap: Record<PlayerId, Card[]> = {
        player: p,
        opponent: o,
        p3,
        p4,
      }

      const handSize = getHandSize(ruleType)
      const activeIds = getActivePlayerIds(ruleType)
      const winIdx = activeIds.indexOf(winner)
      const drawOrder: PlayerId[] = []
      for (let i = 0; i < activeIds.length; i++) {
        drawOrder.push(activeIds[(winIdx + i) % activeIds.length])
      }

      for (let round = 0; round < handSize; round++) {
        for (const recipient of drawOrder) {
          const h = handMap[recipient]
          if (h && h.length < handSize) {
            let drawn: Card | null = null
            if (d.length > 0) {
              drawn = d[0]
              d = d.slice(1)
            } else if (t) {
              drawn = t
              t = null
            }
            if (drawn) {
              h.push(drawn)
              soundManager.playDeal()
            }
          }
        }
      }

      return {
        nextDeck: d,
        nextTrump: t,
        nextPHand: p,
        nextOHand: o,
        nextP3Hand: p3,
        nextP4Hand: p4,
      }
    },
    []
  )

  // 6-card Chain Battling: Step 1 - Defend against attack cards
  const chainBattleDefend = useCallback(
    (playerId: PlayerId, defenseCards: Card[]) => {
      const curBattle = stateRef.current.chainBattle
      if (!curBattle || !curBattle.active) return
      if (curBattle.currentDefenderId !== playerId) return
      const curTrump = stateRef.current.trumpSuit
      const targetCards =
        curBattle.currentTargetCards && curBattle.currentTargetCards.length > 0
          ? curBattle.currentTargetCards
          : curBattle.currentTargetCard
          ? [curBattle.currentTargetCard]
          : []
      if (targetCards.length === 0) return

      // Validate that defenseCards beat ALL targetCards
      if (!doesResponseBeatLead(targetCards, defenseCards, curTrump)) {
        return
      }

      soundManager.playCardSnap()
      const cardIdsToRemove = new Set(defenseCards.map((c) => c.id))

      let nextHand: Card[] = []
      if (playerId === 'player') {
        nextHand = stateRef.current.playerHand.filter((c) => !cardIdsToRemove.has(c.id))
        setPlayerHand(nextHand)
      } else {
        nextHand = stateRef.current.opponentHand.filter((c) => !cardIdsToRemove.has(c.id))
        setOpponentHand(nextHand)
      }

      const newDefensePlays = defenseCards.map((c) => ({
        playerId,
        playerName: getPlayerName(playerId),
        card: c,
        isDefense: true,
      }))

      const updatedPile = [...curBattle.pile, ...newDefensePlays]
      setTableResponseCards(defenseCards)
      setSelectedCardIds([])

      // If defender defended using all cards and has 0 cards left:
      // Defender successfully defended and wins the bout immediately!
      if (nextHand.length === 0) {
        const trickAll = updatedPile.map((p) => p.card)
        const points = calculateCardsPoints(trickAll)
        const winnerName = getPlayerName(playerId)

        setEvaluatingWinner(playerId)
        setEvaluatingPoints(points)
        setPhase('evaluating')
        soundManager.playCollectTrick()
        setTrickResolutionText(
          `${winnerName} успешно побил все карты и забирает раздачу (+${points} очков)!`
        )

        const delay = stateRef.current.settings.fastAnimations ? 700 : 1300
        setTimeout(() => {
          setEvaluatingWinner(null)
          setEvaluatingPoints(0)
          let newPTricks = stateRef.current.playerTricks
          let newOTricks = stateRef.current.opponentTricks

          if (playerId === 'player') newPTricks = [...newPTricks, ...trickAll]
          else newOTricks = [...newOTricks, ...trickAll]

          setPlayerTricks(newPTricks)
          setOpponentTricks(newOTricks)
          setTableLeadCards([])
          setTableResponseCards([])
          setChainBattle(null)
          setTrickResolutionText(null)
          setLeadPlayer(null)

          const { nextDeck, nextTrump, nextPHand, nextOHand } = refillHandsHelper(
            stateRef.current.deck,
            stateRef.current.trumpCard,
            {
              player: stateRef.current.playerHand,
              opponent: stateRef.current.opponentHand,
              p3: [],
              p4: [],
            },
            playerId,
            'duel_chain_6'
          )

          setDeck(nextDeck)
          setTrumpCard(nextTrump)
          setPlayerHand(nextPHand)
          setOpponentHand(nextOHand)

          if (
            nextPHand.length === 0 &&
            nextOHand.length === 0 &&
            nextDeck.length === 0 &&
            !nextTrump
          ) {
            const pScore = calculateCardsPoints(newPTricks)
            const oScore = calculateCardsPoints(newOTricks)
            if (pScore > oScore) {
              finishRound({
                winner: 'player',
                reason: `Все карты разыграны! Игрок набрал ${pScore} очков против ${oScore}.`,
                scorePlayer: pScore,
                scoreOpponent: oScore,
                pointsAwarded: 1,
              })
            } else if (oScore > pScore) {
              finishRound({
                winner: 'opponent',
                reason: `Все карты разыграны! Соперник набрал ${oScore} очков против ${pScore}.`,
                scorePlayer: pScore,
                scoreOpponent: oScore,
                pointsAwarded: 1,
              })
            } else {
              finishRound({
                winner: 'draw',
                reason: `Ничья (свара)! Оба игрока набрали ровно по 60 очков.`,
                scorePlayer: pScore,
                scoreOpponent: oScore,
                pointsAwarded: 0,
              })
            }
          } else {
            setActivePlayer(playerId)
            setPhase('lead')
            if (stateRef.current.settings.mode === 'hotseat') {
              setIsHotseatCurtainActive(true)
            }
            setStatusMessage(
              playerId === 'player'
                ? 'Ваш ход! Скиньте карты для новой атаки.'
                : 'Ход соперника...'
            )
          }
        }, delay)
        return
      }

      // Defender still has cards! Defender is now in attack stage!
      const otherPlayer: PlayerId = playerId === 'player' ? 'opponent' : 'player'
      setChainBattle({
        active: true,
        pile: updatedPile,
        currentTargetCards: [],
        currentTargetCard: null,
        currentAttackerId: playerId,
        currentDefenderId: otherPlayer,
        requiredSurrenderCount: 0,
        stage: 'attack',
        lastBeatenCards: {
          leadCards: targetCards,
          defenseCards,
          defenderName: getPlayerName(playerId),
        },
      })

      setActivePlayer(playerId)
      setPhase('lead')

      setStatusMessage(
        playerId === 'player'
          ? 'Вы отбились! Теперь выберите карты из руки для своего хода и нажмите «Сходить в атаку».'
          : `${getPlayerName(playerId)} отбился и обдумывает ход...`
      )
    },
    [finishRound, getPlayerName, refillHandsHelper]
  )

  // 6-card Chain Battling: Step 2 - Play counter-attack cards
  const chainBattleAttack = useCallback(
    (playerId: PlayerId, attackCards: Card[]) => {
      const curBattle = stateRef.current.chainBattle
      if (!curBattle || !curBattle.active) return
      if (curBattle.currentAttackerId !== playerId || curBattle.stage !== 'attack') return
      if (attackCards.length === 0) return

      soundManager.playCardSnap()
      const cardIdsToRemove = new Set(attackCards.map((c) => c.id))

      if (playerId === 'player') {
        setPlayerHand((prev) => prev.filter((c) => !cardIdsToRemove.has(c.id)))
      } else {
        setOpponentHand((prev) => prev.filter((c) => !cardIdsToRemove.has(c.id)))
      }

      const newAttackPlays = attackCards.map((c) => ({
        playerId,
        playerName: getPlayerName(playerId),
        card: c,
        isDefense: false,
      }))

      const nextDefender =
        curBattle.currentDefenderId || (playerId === 'player' ? 'opponent' : 'player')

      setTableLeadCards(attackCards)
      setTableResponseCards([])
      setSelectedCardIds([])

      setChainBattle({
        active: true,
        pile: [...curBattle.pile, ...newAttackPlays],
        currentTargetCards: attackCards,
        currentTargetCard: attackCards[0],
        currentAttackerId: playerId,
        currentDefenderId: nextDefender,
        requiredSurrenderCount: attackCards.length,
        stage: 'defend',
        lastBeatenCards: null,
      })

      setActivePlayer(nextDefender)
      setPhase('response')

      if (stateRef.current.settings.mode === 'hotseat') {
        setIsHotseatCurtainActive(true)
      }

      setStatusMessage(
        `${getPlayerName(playerId)} атаковал (${attackCards.length} ${
          attackCards.length === 1 ? 'картой' : 'картами'
        })! Покройте все карты и ответьте, либо сдайтесь (отдав ${attackCards.length} ${
          attackCards.length === 1 ? 'карту' : 'карт'
        }).`
      )
    },
    [getPlayerName]
  )

  // 6-card Chain Battling: Combined play for backwards compatibility
  const chainBattlePlay = useCallback(
    (playerId: PlayerId, defenseCards: Card[], attackCards: Card[]) => {
      chainBattleDefend(playerId, defenseCards)
      if (attackCards.length > 0) {
        setTimeout(() => {
          chainBattleAttack(playerId, attackCards)
        }, 50)
      }
    },
    [chainBattleDefend, chainBattleAttack]
  )

  // 6-card Chain Battling: Surrender trick
  const chainBattleSurrender = useCallback(
    (playerId?: PlayerId, surrenderCards?: Card[]) => {
      const curBattle = stateRef.current.chainBattle
      if (!curBattle || !curBattle.active) return
      const defender = playerId || curBattle.currentDefenderId || 'opponent'
      if (curBattle.currentDefenderId !== defender) return

      const curTrump = stateRef.current.trumpSuit
      const winner: PlayerId =
        curBattle.currentAttackerId || (defender === 'player' ? 'opponent' : 'player')
      const surrenderCount =
        curBattle.requiredSurrenderCount ||
        (curBattle.currentTargetCards ? curBattle.currentTargetCards.length : 1)

      const defHand =
        defender === 'player'
          ? stateRef.current.playerHand
          : stateRef.current.opponentHand
      const chosenSurrender = chooseSurrenderCards(
        defHand,
        surrenderCount,
        curTrump,
        surrenderCards
      )
      const surrenderIds = new Set(chosenSurrender.map((c) => c.id))

      // Remove surrendered cards from defender's hand
      if (defender === 'player') {
        setPlayerHand((prev) => prev.filter((c) => !surrenderIds.has(c.id)))
      } else {
        setOpponentHand((prev) => prev.filter((c) => !surrenderIds.has(c.id)))
      }

      const surrenderedPlays = chosenSurrender.map((c) => ({
        playerId: defender,
        playerName: getPlayerName(defender),
        card: c,
        isDefense: false,
      }))

      const pileAll = [...curBattle.pile, ...surrenderedPlays]
      const pileCards = pileAll.map((p) => p.card)
      const points = calculateCardsPoints(pileCards)
      const winnerName = getPlayerName(winner)
      const surrendererName = getPlayerName(defender)

      setEvaluatingWinner(winner)
      setEvaluatingPoints(points)
      setPhase('evaluating')
      soundManager.playCollectTrick()
      setTrickResolutionText(
        `${surrendererName} сдаётся, отдав ${chosenSurrender.length} ${
          chosenSurrender.length === 1 ? 'карту' : 'карт'
        }! ${winnerName} забирает всю раздачу (+${points} очков)!`
      )

      const delay = stateRef.current.settings.fastAnimations ? 700 : 1300

      setTimeout(() => {
        setEvaluatingWinner(null)
        setEvaluatingPoints(0)
        let newPTricks = stateRef.current.playerTricks
        let newOTricks = stateRef.current.opponentTricks

        if (winner === 'player') newPTricks = [...newPTricks, ...pileCards]
        else newOTricks = [...newOTricks, ...pileCards]

        setPlayerTricks(newPTricks)
        setOpponentTricks(newOTricks)
        setTableLeadCards([])
        setTableResponseCards([])
        setChainBattle(null)
        setTrickResolutionText(null)
        setLeadPlayer(null)

        const { nextDeck, nextTrump, nextPHand, nextOHand } = refillHandsHelper(
          stateRef.current.deck,
          stateRef.current.trumpCard,
          {
            player: stateRef.current.playerHand,
            opponent: stateRef.current.opponentHand,
            p3: [],
            p4: [],
          },
          winner,
          'duel_chain_6'
        )

        setDeck(nextDeck)
        setTrumpCard(nextTrump)
        setPlayerHand(nextPHand)
        setOpponentHand(nextOHand)

        if (
          nextPHand.length === 0 &&
          nextOHand.length === 0 &&
          nextDeck.length === 0 &&
          !nextTrump
        ) {
          const pScore = calculateCardsPoints(newPTricks)
          const oScore = calculateCardsPoints(newOTricks)
          if (pScore > oScore) {
            finishRound({
              winner: 'player',
              reason: `Все карты разыграны! Игрок набрал ${pScore} очков против ${oScore}.`,
              scorePlayer: pScore,
              scoreOpponent: oScore,
              pointsAwarded: 1,
            })
          } else if (oScore > pScore) {
            finishRound({
              winner: 'opponent',
              reason: `Все карты разыграны! Соперник набрал ${oScore} очков против ${pScore}.`,
              scorePlayer: pScore,
              scoreOpponent: oScore,
              pointsAwarded: 1,
            })
          } else {
            finishRound({
              winner: 'draw',
              reason: `Ничья (свара)! Оба игрока набрали ровно по 60 очков.`,
              scorePlayer: pScore,
              scoreOpponent: oScore,
              pointsAwarded: 0,
            })
          }
        } else {
          setActivePlayer(winner)
          setPhase('lead')
          if (stateRef.current.settings.mode === 'hotseat') {
            setIsHotseatCurtainActive(true)
          }
          setStatusMessage(
            winner === 'player'
              ? 'Ваш ход! Скиньте карты для новой атаки.'
              : 'Ход соперника...'
          )
        }
      }, delay)
    },
    [finishRound, getPlayerName, refillHandsHelper]
  )

  // Evaluate trick resolution
  const evaluateTrick = useCallback(
    (
      leadP: PlayerId,
      leadCards: Card[],
      responseCards: Card[],
      updatedHands: { player: Card[]; opponent: Card[]; p3: Card[]; p4: Card[] },
      allPlays?: PlayerTrickPlay[]
    ) => {
      setPhase('evaluating')

      const curTrumpSuit = stateRef.current.trumpSuit
      const curRule = stateRef.current.settings.ruleType || 'duel_classic_4'
      const isMulti = curRule === 'ffa_3' || curRule === 'ffa_4' || curRule === 'teams_4'
      const isTeamMode = curRule === 'teams_4'

      let winner: PlayerId
      let beaten: boolean
      let points: number
      let allTrickCards: Card[] = []

      if (isMulti && allPlays && allPlays.length > 0) {
        const res = resolveMultiplayerTrickWinner(allPlays, curTrumpSuit)
        winner = res.winner
        beaten = winner !== leadP
        points = res.points
        allTrickCards = allPlays.flatMap((p) => p.cards)
      } else {
        const res = resolveTrickWinner(leadP, leadCards, responseCards, curTrumpSuit)
        winner = res.winner
        beaten = res.beaten
        points = res.points
        allTrickCards = [...leadCards, ...responseCards]
      }

      setEvaluatingWinner(winner)
      setEvaluatingPoints(points)

      setLastTrick({
        leadPlayer: leadP,
        leadCards: [...leadCards],
        responseCards: [...responseCards],
        winner,
        points,
        beaten,
      })

      soundManager.playCollectTrick()

      const hasHiddenCards = allTrickCards.some((c) => c.faceDown)
      const pointsText = hasHiddenCards ? '' : ` (+${points} очков)`
      const winnerName = getPlayerName(winner)

      setTrickResolutionText(
        beaten
          ? `${winnerName} побил взятку!${pointsText}`
          : `${winnerName} забирает взятку!${pointsText}`
      )

      const delay = stateRef.current.settings.fastAnimations ? 700 : 1300

      setTimeout(() => {
        setEvaluatingWinner(null)
        setEvaluatingPoints(0)

        // Collect cards to trick pile
        let newPlayerTricks = stateRef.current.playerTricks
        let newOpponentTricks = stateRef.current.opponentTricks
        let newP3Tricks = stateRef.current.p3Tricks
        let newP4Tricks = stateRef.current.p4Tricks

        if (isTeamMode) {
          const team = getPlayerTeam(winner)
          if (team === 1) {
            newPlayerTricks = [...newPlayerTricks, ...allTrickCards]
          } else {
            newOpponentTricks = [...newOpponentTricks, ...allTrickCards]
          }
        } else {
          if (winner === 'player') newPlayerTricks = [...newPlayerTricks, ...allTrickCards]
          else if (winner === 'opponent') newOpponentTricks = [...newOpponentTricks, ...allTrickCards]
          else if (winner === 'p3') newP3Tricks = [...newP3Tricks, ...allTrickCards]
          else if (winner === 'p4') newP4Tricks = [...newP4Tricks, ...allTrickCards]
        }

        setPlayerTricks(newPlayerTricks)
        setOpponentTricks(newOpponentTricks)
        setP3Tricks(newP3Tricks)
        setP4Tricks(newP4Tricks)
        setTableLeadCards([])
        setTableResponseCards([])
        setMultiplayerPlays([])
        setTrickResolutionText(null)
        setLeadPlayer(null)

        // Refill hands from deck
        const { nextDeck, nextTrump, nextPHand, nextOHand, nextP3Hand, nextP4Hand } = refillHandsHelper(
          stateRef.current.deck,
          stateRef.current.trumpCard,
          updatedHands,
          winner,
          curRule
        )

        setDeck(nextDeck)
        setTrumpCard(nextTrump)
        setPlayerHand(nextPHand)
        setOpponentHand(nextOHand)
        setP3Hand(nextP3Hand)
        setP4Hand(nextP4Hand)

        // Check if round is over (deck and hands empty)
        const activeIds = getActivePlayerIds(curRule)
        const activeHands = activeIds.map((id) => {
          if (id === 'player') return nextPHand
          if (id === 'opponent') return nextOHand
          if (id === 'p3') return nextP3Hand
          return nextP4Hand
        })
        const allHandsEmpty = activeHands.every((h) => h.length === 0)

        if (allHandsEmpty && nextDeck.length === 0 && !nextTrump) {
          if (isTeamMode) {
            const team1Score = calculateCardsPoints(newPlayerTricks)
            const team2Score = calculateCardsPoints(newOpponentTricks)
            if (team1Score > team2Score) {
              finishRound({
                winner: 'player',
                winnerTeam: 1,
                reason: `Все карты разыграны! Команда 1 победила со счетом ${team1Score} : ${team2Score}.`,
                scorePlayer: team1Score,
                scoreOpponent: team2Score,
                team1Score,
                team2Score,
                pointsAwarded: 1,
              })
            } else if (team2Score > team1Score) {
              finishRound({
                winner: 'opponent',
                winnerTeam: 2,
                reason: `Все карты разыграны! Команда 2 победила со счетом ${team2Score} : ${team1Score}.`,
                scorePlayer: team1Score,
                scoreOpponent: team2Score,
                team1Score,
                team2Score,
                pointsAwarded: 1,
              })
            } else {
              finishRound({
                winner: 'draw',
                reason: `Ничья (свара)! Обе команды набрали по 60 очков.`,
                scorePlayer: team1Score,
                scoreOpponent: team2Score,
                pointsAwarded: 0,
              })
            }
          } else {
            const scores: { id: PlayerId; pts: number }[] = [
              { id: 'player', pts: calculateCardsPoints(newPlayerTricks) },
              { id: 'opponent', pts: calculateCardsPoints(newOpponentTricks) },
            ]
            if (activeIds.includes('p3')) {
              scores.push({ id: 'p3', pts: calculateCardsPoints(newP3Tricks) })
            }
            if (activeIds.includes('p4')) {
              scores.push({ id: 'p4', pts: calculateCardsPoints(newP4Tricks) })
            }
            scores.sort((a, b) => b.pts - a.pts)
            const best = scores[0]
            const second = scores[1]

            if (best.pts > second.pts) {
              finishRound({
                winner: best.id,
                reason: `Все карты разыграны! ${getPlayerName(best.id)} побеждает с ${best.pts} очками!`,
                scorePlayer: scores.find((s) => s.id === 'player')?.pts || 0,
                scoreOpponent: scores.find((s) => s.id === 'opponent')?.pts || 0,
                pointsAwarded: 1,
              })
            } else {
              finishRound({
                winner: 'draw',
                reason: `Ничья! Лидеры набрали по ${best.pts} очков.`,
                scorePlayer: scores.find((s) => s.id === 'player')?.pts || 0,
                scoreOpponent: scores.find((s) => s.id === 'opponent')?.pts || 0,
                pointsAwarded: 0,
              })
            }
          }
        } else {
          // Prepare next trick
          setActivePlayer(winner)
          setPhase('lead')

          if (stateRef.current.settings.mode === 'hotseat') {
            setIsHotseatCurtainActive(true)
          }

          setStatusMessage(
            winner === 'player'
              ? curRule === 'duel_chain_6'
                ? 'Ваш ход! Выберите 1 карту для атаки.'
                : 'Ваш ход! Выберите карты для захода.'
              : `Ход игрока ${winnerName}...`
          )
        }
      }, delay)
    },
    [refillHandsHelper, finishRound, getPlayerName]
  )

  // Toggle card selection
  const toggleSelectCard = useCallback((cardId: string) => {
    soundManager.playClick()
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    )
  }, [])

  // Clear selections
  const clearSelection = useCallback(() => {
    setSelectedCardIds([])
  }, [])

  // Lead action (current active player leads)
  const executeLead = useCallback(
    (playerId: PlayerId, cards: Card[]) => {
      if (cards.length === 0) return
      const curRule = stateRef.current.settings.ruleType || 'duel_classic_4'

      // In chain mode: player can lead any number of cards (1 to 6)
      if (curRule === 'duel_chain_6') {
        const curBattle = stateRef.current.chainBattle
        if (curBattle && curBattle.active && curBattle.stage === 'attack') {
          chainBattleAttack(playerId, cards)
          return
        }

        soundManager.playCardSnap()
        const cardIds = new Set(cards.map((c) => c.id))

        if (playerId === 'player') {
          setPlayerHand((prev) => prev.filter((c) => !cardIds.has(c.id)))
        } else {
          setOpponentHand((prev) => prev.filter((c) => !cardIds.has(c.id)))
        }

        const responder: PlayerId = playerId === 'player' ? 'opponent' : 'player'
        const initialPlays = cards.map((c) => ({
          playerId,
          playerName: getPlayerName(playerId),
          card: c,
          isDefense: false,
        }))

        setTableLeadCards(cards)
        setTableResponseCards([])
        setSelectedCardIds([])
        setLeadPlayer(playerId)
        setChainBattle({
          active: true,
          pile: initialPlays,
          currentTargetCards: cards,
          currentTargetCard: cards[0],
          currentAttackerId: playerId,
          currentDefenderId: responder,
          requiredSurrenderCount: cards.length,
          stage: 'defend',
          lastBeatenCards: null,
        })

        setActivePlayer(responder)
        setPhase('response')

        if (stateRef.current.settings.mode === 'hotseat') {
          setIsHotseatCurtainActive(true)
        }

        setStatusMessage(
          `${getPlayerName(playerId)} атаковал (${cards.length} ${
            cards.length === 1 ? 'картой' : 'картами'
          })! Покройте все карты и ответьте, либо сдайтесь (отдав ${cards.length} ${
            cards.length === 1 ? 'карту' : 'карт'
          }).`
        )
        return
      }

      if (!isValidLead(cards)) return

      soundManager.playCardSnap()
      const cardIds = new Set(cards.map((c) => c.id))

      if (playerId === 'player') {
        setPlayerHand((prev) => prev.filter((c) => !cardIds.has(c.id)))
      } else if (playerId === 'opponent') {
        setOpponentHand((prev) => prev.filter((c) => !cardIds.has(c.id)))
      } else if (playerId === 'p3') {
        setP3Hand((prev) => prev.filter((c) => !cardIds.has(c.id)))
      } else if (playerId === 'p4') {
        setP4Hand((prev) => prev.filter((c) => !cardIds.has(c.id)))
      }

      setTableLeadCards(cards)
      setTableResponseCards([])
      setSelectedCardIds([])
      setLeadPlayer(playerId)

      const activeIds = getActivePlayerIds(curRule)
      const isMulti = activeIds.length > 2

      if (isMulti) {
        setMultiplayerPlays([{ playerId, cards }])
        const pIdx = activeIds.indexOf(playerId)
        const nextP = activeIds[(pIdx + 1) % activeIds.length]
        setActivePlayer(nextP)
      } else {
        const responder: PlayerId = playerId === 'player' ? 'opponent' : 'player'
        setActivePlayer(responder)
      }

      setPhase('response')

      if (stateRef.current.settings.mode === 'hotseat') {
        setIsHotseatCurtainActive(true)
      }

      setStatusMessage(
        `${getPlayerName(playerId)} зашел картами (${cards.length} шт.). Ответ!`
      )
    },
    [getPlayerName]
  )

  // Response action (current responder plays)
  const executeResponse = useCallback(
    (playerId: PlayerId, cards: Card[], faceDown: boolean) => {
      const curRule = stateRef.current.settings.ruleType || 'duel_classic_4'

      // In 6-card Chain Battling: response is the defense step
      if (curRule === 'duel_chain_6') {
        const curBattle = stateRef.current.chainBattle
        if (curBattle && curBattle.active && curBattle.stage === 'defend') {
          chainBattleDefend(playerId, cards)
          return
        }
      }

      const curLeadCards = stateRef.current.tableLeadCards
      if (cards.length !== curLeadCards.length) return
      const activeIds = getActivePlayerIds(curRule)
      const isMulti = activeIds.length > 2

      soundManager.playCardSnap()
      const processed = cards.map((c) => ({ ...c, faceDown }))
      const cardIds = new Set(cards.map((c) => c.id))

      const currentHands = {
        player: [...stateRef.current.playerHand],
        opponent: [...stateRef.current.opponentHand],
        p3: [...stateRef.current.p3Hand],
        p4: [...stateRef.current.p4Hand],
      }
      currentHands[playerId] = currentHands[playerId].filter((c) => !cardIds.has(c.id))

      setPlayerHand(currentHands.player)
      setOpponentHand(currentHands.opponent)
      setP3Hand(currentHands.p3)
      setP4Hand(currentHands.p4)

      setTableResponseCards(processed)
      setSelectedCardIds([])
      setDiscardFaceDown(false)

      const curLeadP = stateRef.current.leadPlayer || 'player'

      if (isMulti) {
        const nextPlays = [...stateRef.current.multiplayerPlays, { playerId, cards: processed }]
        setMultiplayerPlays(nextPlays)

        if (nextPlays.length < activeIds.length) {
          const pIdx = activeIds.indexOf(playerId)
          const nextP = activeIds[(pIdx + 1) % activeIds.length]
          setActivePlayer(nextP)
          setStatusMessage(`Ход переходит к ${getPlayerName(nextP)}. Ответ на заход!`)
          return
        }

        // All active players have played
        evaluateTrick(curLeadP, curLeadCards, processed, currentHands, nextPlays)
      } else {
        evaluateTrick(curLeadP, curLeadCards, processed, currentHands)
      }
    },
    [evaluateTrick, getPlayerName]
  )

  // Declare combination
  const declareCombination = useCallback(
    (playerId: PlayerId, combo: Combination) => {
      setCombinationNotice(combo)

      if (combo.isImmediateWin) {
        soundManager.playBuraFanfare()
        finishRound({
          winner: playerId,
          reason: `${getPlayerName(playerId)} объявил комбинацию «${combo.name}» (${combo.description})!`,
          scorePlayer: calculateCardsPoints(playerTricks),
          scoreOpponent: calculateCardsPoints(opponentTricks),
          pointsAwarded: 1,
          combination: combo,
        })
      } else {
        soundManager.playCardSnap()
        setStatusMessage(
          `${getPlayerName(playerId)} объявил «${combo.name}» и заходит всеми картами!`
        )
        setActivePlayer(playerId)
        setPhase('lead')
      }
    },
    [finishRound, getPlayerName, playerTricks, opponentTricks]
  )

  // Player manual lead trigger (checks if online client sends network action)
  const playerLead = useCallback(
    (cardsToPlay?: Card[]) => {
      const cards = cardsToPlay || playerHand.filter((c) => selectedCardIds.includes(c.id))
      if (isOnlineClient) {
        if (activePlayer !== 'opponent' || phase !== 'lead') return
        if (!isValidLead(cards)) return
        networkManager.send({ type: 'ACTION_LEAD', cards })
        setSelectedCardIds([])
        return
      }

      if (activePlayer !== 'player' || phase !== 'lead') return
      executeLead('player', cards)
    },
    [isOnlineClient, activePlayer, phase, playerHand, selectedCardIds, executeLead]
  )

  // Player manual response trigger (checks if online client sends network action)
  const playerRespond = useCallback(
    (cardsToPlay?: Card[], faceDownOverride?: boolean) => {
      const cards = cardsToPlay || playerHand.filter((c) => selectedCardIds.includes(c.id))
      const isFaceDown = faceDownOverride !== undefined ? faceDownOverride : discardFaceDown

      if (isOnlineClient) {
        if (activePlayer !== 'opponent' || phase !== 'response') return
        if (cards.length !== tableLeadCards.length) return
        networkManager.send({
          type: 'ACTION_RESPOND',
          cards,
          faceDown: isFaceDown,
        })
        setSelectedCardIds([])
        setDiscardFaceDown(false)
        return
      }

      if (activePlayer !== 'player' || phase !== 'response') return
      executeResponse('player', cards, isFaceDown)
    },
    [
      isOnlineClient,
      activePlayer,
      phase,
      playerHand,
      selectedCardIds,
      tableLeadCards.length,
      discardFaceDown,
      executeResponse,
    ]
  )

  // Combination trigger
  const handleDeclareCombination = useCallback(
    (playerId: PlayerId, combo: Combination) => {
      if (isOnlineClient) {
        networkManager.send({ type: 'ACTION_COMBO', combo })
        return
      }
      declareCombination(playerId, combo)
    },
    [isOnlineClient, declareCombination]
  )

  // Next round trigger
  const handleNextRound = useCallback((firstLeader?: PlayerId, overrideRuleType?: GameRuleType) => {
    if (isOnlineClient) {
      networkManager.send({ type: 'ACTION_NEXT_ROUND' })
      return
    }
    const leader = firstLeader || (roundResult?.winner === 'player' ? 'player' : 'opponent')
    startNewRound(leader, overrideRuleType)
  }, [isOnlineClient, startNewRound, roundResult])

  // Restart match trigger
  const handleRestartMatch = useCallback((customTarget?: number, customRuleType?: GameRuleType) => {
    if (isOnlineClient) {
      networkManager.send({ type: 'ACTION_RESTART_MATCH' })
      return
    }
    startNewMatch(customTarget, customRuleType)
  }, [isOnlineClient, startNewMatch])

  // Online Network Setup and Message Routing
  useEffect(() => {
    const unsubStatus = networkManager.onStatusChange((status) => {
      setConnectionStatus(status)
      if (status === 'connected') {
        setStatusMessage('Соперник подключился! Игра начинается.')
      } else if (status === 'disconnected') {
        setStatusMessage('Соперник отключился от игры.')
      }
    })

    const unsubMsg = networkManager.onMessage((msg: NetworkMessage) => {
      if (msg.type === 'CHAT') {
        const chatItem: ChatMessage = {
          id: `${Date.now()}_${Math.random()}`,
          sender: 'opponent',
          senderName: msg.senderName || 'Соперник',
          text: msg.text,
          time: Date.now(),
        }
        setChatMessages((prev) => [...prev.slice(-30), chatItem])
        return
      }

      if (msg.type === 'NAME_ANNOUNCE') {
        setOpponentNickname(msg.name)
        return
      }

      // HOST receives actions from Client
      if (stateRef.current.onlineRole === 'host') {
        if (msg.type === 'HEARTBEAT') {
          broadcastHostState()
        } else if (msg.type === 'ACTION_LEAD') {
          executeLead('opponent', msg.cards)
        } else if (msg.type === 'ACTION_RESPOND') {
          executeResponse('opponent', msg.cards, msg.faceDown)
        } else if (msg.type === 'ACTION_CHAIN_PLAY') {
          const def = msg.defenseCards || (msg.defenseCard ? [msg.defenseCard] : [])
          const atk = msg.attackCards || (msg.attackCard ? [msg.attackCard] : [])
          chainBattlePlay('opponent', def, atk)
        } else if (msg.type === 'ACTION_CHAIN_PASS') {
          chainBattleSurrender('opponent', msg.surrenderCards)
        } else if (msg.type === 'ACTION_COMBO') {
          declareCombination('opponent', msg.combo)
        } else if (msg.type === 'ACTION_NEXT_ROUND') {
          startNewRound()
        } else if (msg.type === 'ACTION_RESTART_MATCH') {
          startNewMatch()
        }
      }

      // CLIENT receives synchronized state from Host
      if (stateRef.current.onlineRole === 'client') {
        if (msg.type === 'SYNC_STATE') {
          const p = msg.payload
          setPhase(p.phase)
          if (p.ruleType) {
            setSettings((s) => ({ ...s, ruleType: p.ruleType }))
          }
          setActivePlayer(p.activePlayer)
          setLeadPlayer(p.leadPlayer)
          setTrumpCard(p.trumpCard)
          setTrumpSuit(p.trumpSuit)
          setTableLeadCards(p.tableLeadCards || [])
          setTableResponseCards(p.tableResponseCards || [])
          setChainBattle(p.chainBattle || null)
          setTrickResolutionText(p.trickResolutionText)
          setRoundResult(p.roundResult)
          setMatchScore(p.matchScore)
          setLastTrick(p.lastTrick)
          setCombinationNotice(p.combinationNotice)

          // Client sees own cards in playerHand
          setPlayerHand(p.myHand)
          // Opponent cards rendered as face-down dummy cards
          const dummyCards: Card[] = Array.from({ length: p.opponentHandCount }, (_, i) => ({
            id: `host_card_${i}`,
            suit: 'spades',
            rank: '6',
            points: 0,
            power: 0,
            faceDown: true,
          }))
          setOpponentHand(dummyCards)

          setPlayerTricks(p.myTricks)
          setOpponentTricks(
            Array.from({ length: p.opponentTricksCount || 0 }, (_, i) => ({
              id: `opp_trick_${i}`,
              suit: 'spades',
              rank: '6',
              points: 0,
              power: 0,
              faceDown: true,
            }))
          )
          setDeck(
            Array.from({ length: p.deckCount }, (_, i) => ({
              id: `stock_${i}`,
              suit: 'spades',
              rank: '6',
              points: 0,
              power: 0,
              faceDown: true,
            }))
          )

          if (p.hostName) setOpponentNickname(p.hostName)

          // Audio triggers on client
          if (p.phase === 'evaluating') {
            soundManager.playCollectTrick()
          } else if (p.roundResult) {
            if (p.roundResult.winner === 'opponent') soundManager.playWin()
            else soundManager.playLose()
          }
        }
      }
    })

    return () => {
      unsubStatus()
      unsubMsg()
    }
  }, [
    broadcastHostState,
    executeLead,
    executeResponse,
    chainBattlePlay,
    chainBattleSurrender,
    declareCombination,
    startNewRound,
    startNewMatch,
  ])

  // AI execution runner for vs_ai mode and multiplayer bot turns
  useEffect(() => {
    if (settings.mode !== 'vs_ai') return
    if (activePlayer === 'player') return
    if (phase !== 'lead' && phase !== 'response') return

    const aiDelay = settings.fastAnimations ? 350 : 750

    const timer = setTimeout(() => {
      const curActiveP = stateRef.current.activePlayer
      if (curActiveP === 'player') return
      const currentPhase = stateRef.current.phase
      if (currentPhase !== 'lead' && currentPhase !== 'response') return

      let curAiHand: Card[] = []
      if (curActiveP === 'opponent') curAiHand = stateRef.current.opponentHand
      else if (curActiveP === 'p3') curAiHand = stateRef.current.p3Hand
      else if (curActiveP === 'p4') curAiHand = stateRef.current.p4Hand
      if (curAiHand.length === 0) return

      const curTrumpSuit = stateRef.current.trumpSuit
      const difficulty = stateRef.current.settings.difficulty
      const curRule = stateRef.current.settings.ruleType || 'duel_classic_4'

      // 1. Check AI immediate winning combinations
      const combos = detectCombinations(curAiHand, curTrumpSuit)
      const bura = combos.find((c) => c.type === 'bura' || c.type === 'moscow')

      if (bura) {
        declareCombination(curActiveP, bura)
        return
      }

      // 2. 6-card Chain Battling Mode
      if (curRule === 'duel_chain_6') {
        const curBattle = stateRef.current.chainBattle
        if (currentPhase === 'lead') {
          const lead = getAILeadCards(curAiHand, curTrumpSuit, difficulty, 0)
          if (lead.length > 0) {
            executeLead(curActiveP, lead)
          }
        } else if (currentPhase === 'response' && curBattle?.active) {
          const targets =
            curBattle.currentTargetCards && curBattle.currentTargetCards.length > 0
              ? curBattle.currentTargetCards
              : curBattle.currentTargetCard
              ? [curBattle.currentTargetCard]
              : []
          if (targets.length > 0) {
            const decision = getAIChainBattlePlay(
              targets,
              curAiHand,
              curTrumpSuit,
              difficulty
            )
            if (decision.type === 'pass') {
              chainBattleSurrender(curActiveP, decision.surrenderCards)
            } else {
              // Two-step flow: AI first plays defense cards only, then in the next tick executes attack!
              chainBattleDefend(curActiveP, decision.defenseCards)
            }
          }
        }
        return
      }

      // 3. Standard / Multiplayer AI Turn
      if (currentPhase === 'lead') {
        const pPts = calculateCardsPoints(stateRef.current.playerTricks)
        const lead = getAILeadCards(curAiHand, curTrumpSuit, difficulty, pPts)
        if (lead.length > 0) {
          executeLead(curActiveP, lead)
        }
      } else if (currentPhase === 'response') {
        const leadCards = stateRef.current.tableLeadCards
        if (!leadCards || leadCards.length === 0) return

        const { cards, faceDown } = getAIResponseCards(
          leadCards,
          curAiHand,
          curTrumpSuit,
          difficulty
        )
        executeResponse(curActiveP, cards, faceDown)
      }
    }, aiDelay)

    return () => clearTimeout(timer)
  }, [
    activePlayer,
    phase,
    settings.mode,
    settings.fastAnimations,
    declareCombination,
    executeLead,
    executeResponse,
    chainBattlePlay,
    chainBattleSurrender,
  ])

  // Online Room Operations
  const createOnlineRoom = useCallback(
    async (code?: string, ruleType?: GameRuleType): Promise<string> => {
      const selectedRule = ruleType || settings.ruleType || 'duel_classic_4'
      setSettings((s) => ({ ...s, mode: 'online', ruleType: selectedRule }))
      setOnlineRole('host')
      const createdCode = await networkManager.createRoom(code, selectedRule)
      setRoomCode(createdCode)
      startNewMatch()
      return createdCode
    },
    [settings.ruleType, startNewMatch]
  )

  const joinOnlineRoom = useCallback(async (code: string): Promise<void> => {
    setSettings((s) => ({ ...s, mode: 'online' }))
    setOnlineRole('client')
    const normalized = normalizeRoomCode(code)
    setRoomCode(normalized)
    await networkManager.joinRoom(normalized)
    networkManager.send({ type: 'NAME_ANNOUNCE', name: myNickname })
  }, [myNickname])

  const leaveOnlineRoom = useCallback(() => {
    networkManager.leaveRoom()
    setOnlineRole(null)
    setConnectionStatus('idle')
    setRoomCode('')
    setSettings((s) => ({ ...s, mode: 'vs_ai' }))
    startNewMatch()
  }, [startNewMatch])

  const sendChatMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return
      const trimmed = text.trim()
      const chatItem: ChatMessage = {
        id: `${Date.now()}_${Math.random()}`,
        sender: 'player',
        senderName: myNickname,
        text: trimmed,
        time: Date.now(),
      }
      setChatMessages((prev) => [...prev.slice(-30), chatItem])
      networkManager.send({ type: 'CHAT', text: trimmed, senderName: myNickname })
    },
    [myNickname]
  )

  const updateNickname = useCallback((name: string) => {
    const trimmed = name.trim() || 'Игрок'
    setMyNickname(trimmed)
    if (typeof window !== 'undefined') {
      localStorage.setItem('bura_nickname', trimmed)
    }
    networkManager.send({ type: 'NAME_ANNOUNCE', name: trimmed })
  }, [])

  // Auto-connect / restore room on page refresh or ?room= link
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = getSavedOnlineSession()
    const params = new URLSearchParams(window.location.search)
    const urlRoom = params.get('room')

    if (saved && saved.roomCode) {
      if (saved.role === 'host') {
        createOnlineRoom(saved.roomCode, saved.ruleType).catch(console.warn)
      } else if (saved.role === 'client') {
        joinOnlineRoom(saved.roomCode).catch(console.warn)
      }
    } else if (urlRoom && !onlineRole) {
      const norm = normalizeRoomCode(urlRoom)
      joinOnlineRoom(norm).catch(console.warn)
    }
  }, [createOnlineRoom, joinOnlineRoom, onlineRole])

  // Current displayed hand for bottom controls (respects Hotseat & Online Client!)
  const activeHand =
    settings.mode === 'hotseat' && activePlayer === 'opponent'
      ? opponentHand
      : playerHand

  const selectedCards = activeHand.filter((c) => selectedCardIds.includes(c.id))

  // Match response to lead for detailed beating preview
  const responseMatchPairs =
    phase === 'response' && selectedCards.length === tableLeadCards.length
      ? matchResponseToLead(tableLeadCards, selectedCards, trumpSuit)
      : []

  const canSelectedCardsBeat =
    phase === 'response' &&
    selectedCards.length === tableLeadCards.length &&
    doesResponseBeatLead(tableLeadCards, selectedCards, trumpSuit)

  const chainTargets =
    settings.ruleType === 'duel_chain_6' && chainBattle?.active
      ? chainBattle.currentTargetCards && chainBattle.currentTargetCards.length > 0
        ? chainBattle.currentTargetCards
        : chainBattle.currentTargetCard
        ? [chainBattle.currentTargetCard]
        : []
      : []

  const canSelectedCardsBeatTarget =
    settings.ruleType === 'duel_chain_6' &&
    chainBattle?.active &&
    chainBattle.stage === 'defend' &&
    chainTargets.length > 0 &&
    selectedCards.length === chainTargets.length &&
    doesResponseBeatLead(chainTargets, selectedCards, trumpSuit)

  const isSelectionValidLead =
    settings.ruleType === 'duel_chain_6'
      ? selectedCards.length >= 1 && selectedCards.length <= activeHand.length
      : phase === 'lead' && isValidLead(selectedCards)

  const isSelectionValidResponse =
    settings.ruleType === 'duel_chain_6'
      ? canSelectedCardsBeatTarget
      : phase === 'response' && selectedCards.length === tableLeadCards.length

  // User-friendly feedback messages
  const getValidationHint = (): string | null => {
    const curRule = settings.ruleType || 'duel_classic_4'
    if (curRule === 'duel_chain_6') {
      if (!chainBattle?.active || chainBattle.stage === 'attack') {
        if (selectedCardIds.length === 0) return 'Выберите любые карты для захода в атаку (1-6 карт)'
        return `Готово к атаке (${selectedCardIds.length} ${selectedCardIds.length === 1 ? 'карта' : 'карты'})`
      }
      if (chainBattle.active && chainBattle.stage === 'defend') {
        const req = chainTargets.length
        if (selectedCardIds.length === 0) {
          return `Атака из ${req} ${req === 1 ? 'карты' : 'карт'}. Выберите ${req} ${
            req === 1 ? 'карту чтобы её побить' : 'карт чтобы их побить'
          }, либо нажмите «Сдаться»`
        }
        if (selectedCards.length < req) {
          return `Нужно выбрать ещё ${req - selectedCards.length} ${
            req - selectedCards.length === 1 ? 'карту' : 'карт'
          } для отбития (требуется ровно ${req})`
        }
        if (selectedCards.length > req) {
          return `Выбрано слишком много карт для отбития (требуется ровно ${req})`
        }
        return canSelectedCardsBeatTarget
          ? 'Карты побивают атаку! Нажмите «Побить»'
          : 'Выбранные карты не побивают атаку! Нужны карты старше или козыри'
      }
      return null
    }

    if (phase === 'lead') {
      if (selectedCardIds.length === 0) return 'Выберите 1, 2, 3 или 4 карты одной масти для захода'
      if (!isSelectionValidLead) return 'Нельзя зайти картами разных мастей!'
      return `Готово к заходу (${selectedCardIds.length} ${selectedCardIds.length === 1 ? 'карта' : 'карты'})`
    }
    if (phase === 'response') {
      const required = tableLeadCards.length
      if (selectedCardIds.length < required) {
        return `Выберите ещё ${required - selectedCardIds.length} карт для ответа (нужно ${required})`
      }
      if (selectedCardIds.length > required) {
        return `Выбрано слишком много карт (нужно ровно ${required})`
      }
      return canSelectedCardsBeat ? 'Карты побивают заход!' : 'Карты не побивают (будет сброс)'
    }
    return null
  }

  // Player chain actions (Two-step flow)
  const handlePlayerChainDefend = useCallback(
    (customDefense?: Card[], playerId?: PlayerId) => {
      const curBattle = chainBattle
      if (!curBattle || !curBattle.active || curBattle.stage !== 'defend') return
      const targetPlayer = playerId || curBattle.currentDefenderId || 'player'
      const defCards = customDefense || selectedCards
      if (defCards.length !== chainTargets.length) return
      if (!doesResponseBeatLead(chainTargets, defCards, trumpSuit)) return

      if (isOnlineClient) {
        networkManager.send({
          type: 'ACTION_CHAIN_DEFEND',
          defenseCards: defCards,
        })
        setSelectedCardIds([])
        return
      }
      chainBattleDefend(targetPlayer, defCards)
    },
    [chainBattle, chainTargets, selectedCards, trumpSuit, isOnlineClient, chainBattleDefend]
  )

  const handlePlayerChainAttack = useCallback(
    (customAttack?: Card[], playerId?: PlayerId) => {
      const curBattle = chainBattle
      if (!curBattle || !curBattle.active || curBattle.stage !== 'attack') return
      const targetPlayer = playerId || curBattle.currentAttackerId || 'player'
      const atkCards = customAttack || selectedCards
      if (atkCards.length === 0) return

      if (isOnlineClient) {
        networkManager.send({
          type: 'ACTION_CHAIN_ATTACK',
          attackCards: atkCards,
        })
        setSelectedCardIds([])
        return
      }
      chainBattleAttack(targetPlayer, atkCards)
    },
    [chainBattle, selectedCards, isOnlineClient, chainBattleAttack]
  )

  const handlePlayerChainSurrender = useCallback(
    (playerId?: PlayerId, customSurrender?: Card[]) => {
      const curBattle = stateRef.current.chainBattle
      const def = playerId || curBattle?.currentDefenderId || 'player'
      const needed =
        curBattle?.requiredSurrenderCount ||
        (curBattle?.currentTargetCards ? curBattle.currentTargetCards.length : 1)
      const chosen =
        customSurrender ||
        (selectedCards.length === needed ? selectedCards : undefined)

      if (isOnlineClient) {
        networkManager.send({ type: 'ACTION_CHAIN_PASS', surrenderCards: chosen })
        setSelectedCardIds([])
        return
      }
      chainBattleSurrender(def, chosen)
    },
    [selectedCards, isOnlineClient, chainBattleSurrender]
  )

  const handlePlayerChainPlay = useCallback(
    (customDefense?: Card[], customAttack?: Card[]) => {
      handlePlayerChainDefend(customDefense)
      if (customAttack && customAttack.length > 0) {
        setTimeout(() => {
          handlePlayerChainAttack(customAttack)
        }, 50)
      }
    },
    [handlePlayerChainDefend, handlePlayerChainAttack]
  )

  return {
    settings,
    setSettings,
    phase,
    activePlayer,
    leadPlayer,
    deck,
    trumpCard,
    trumpSuit,
    playerHand,
    opponentHand,
    p3Hand,
    p4Hand,
    playerTricks,
    opponentTricks,
    p3Tricks,
    p4Tricks,
    tableLeadCards,
    tableResponseCards,
    multiplayerPlays,
    chainBattle,
    trickResolutionText,
    lastTrick,
    selectedCardIds,
    discardFaceDown,
    isHotseatCurtainActive,
    isTricksViewerOpen,
    viewingPlayerTricks,
    roundResult,
    matchScore,
    statusMessage,
    combinationNotice,
    isAITurn,
    canInteract,
    isOnline,
    onlineRole,
    connectionStatus,
    roomCode,
    chatMessages,
    myNickname,
    opponentNickname,
    p3Nickname,
    p4Nickname,
    playerTricksPoints,
    opponentTricksPoints,
    p3TricksPoints,
    p4TricksPoints,
    team1Points,
    team2Points,
    activeHand,
    selectedCards,
    responseMatchPairs,
    canSelectedCardsBeat,
    isSelectionValidLead,
    isSelectionValidResponse,
    validationHint: getValidationHint(),
    playerCombinations: detectCombinations(playerHand, trumpSuit),
    opponentCombinations: detectCombinations(opponentHand, trumpSuit),
    toggleSelectCard,
    clearSelection,
    setDiscardFaceDown,
    setIsHotseatCurtainActive,
    setIsTricksViewerOpen,
    setViewingPlayerTricks,
    playerLead,
    playerRespond,
    chainBattleDefend: handlePlayerChainDefend,
    chainBattleAttack: handlePlayerChainAttack,
    chainBattlePlay: handlePlayerChainPlay,
    chainBattleSurrender: handlePlayerChainSurrender,
    evaluatingWinner,
    evaluatingPoints,
    declareCombination: handleDeclareCombination,
    startNewRound: handleNextRound,
    startNewMatch: handleRestartMatch,
    createOnlineRoom,
    joinOnlineRoom,
    leaveOnlineRoom,
    sendChatMessage,
    updateNickname,
  }
}

import React, { useEffect } from 'react'
import { useSpadesGame } from './useSpadesGame'
import { SpadesCardView } from './SpadesCardView'
import {
  BiddingModal,
  RoundEndModal,
  GameOverModal,
  SpadesRulesModal,
  SpadesHistoryModal,
  SpadesSettingsModal,
} from './SpadesModals'
import type { SpadesPlayer, SpadesPlayerId } from './types'
import {
  Volume2,
  VolumeX,
  HelpCircle,
  History,
  Settings,
  ArrowLeft,
} from 'lucide-react'

interface SpadesTableProps {
  onExitToHub: () => void
}

export const SpadesTable: React.FC<SpadesTableProps> = ({ onExitToHub }) => {
  const {
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
    isRulesOpen,
    setIsRulesOpen,
    isHistoryOpen,
    setIsHistoryOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    submitBid,
    playCard,
    startNewMatch,
    startNextRound,
  } = useSpadesGame()

  const validCardIds = new Set(validHumanMoves.map((c) => c.id))
  const isHumanTurn = currentTurn === 0 && phase === 'playing'

  // Handle card click
  const handleCardClick = (cardId: string) => {
    if (!isHumanTurn) return
    const card = humanPlayer.hand.find((c) => c.id === cardId)
    if (!card || !validCardIds.has(card.id)) return

    // Play card immediately on click for quick intuitive gameplay
    playCard(card)
  }

  // Keyboard shortcut listener for cards (1..9, 0, Q, W, E, R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isHumanTurn) return
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'w', 'e', 'r']
      const keyIdx = keys.indexOf(e.key.toLowerCase())
      if (keyIdx >= 0 && keyIdx < humanPlayer.hand.length) {
        const targetCard = humanPlayer.hand[keyIdx]
        if (targetCard && validCardIds.has(targetCard.id)) {
          playCard(targetCard)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isHumanTurn, humanPlayer.hand, validCardIds, playCard])

  // Player helper renderers
  const renderPlayerBadge = (player: SpadesPlayer, _position: 'top' | 'left' | 'right' | 'bottom') => {
    const isDealer = dealerIdx === player.id
    const isTurn = currentTurn === player.id
    const isPartner = player.teamId === 0 && player.id !== 0

    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all duration-300 backdrop-blur-md ${
          isTurn
            ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 scale-105'
            : isPartner
            ? 'bg-sky-950/40 border-sky-600/40'
            : 'bg-neutral-900/70 border-neutral-800'
        }`}
      >
        <div className="relative">
          <span className="text-2xl select-none">{player.avatar}</span>
          {isDealer && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-neutral-950 font-black text-[9px] flex items-center justify-center shadow"
              title="Дилер раздачи"
            >
              Д
            </span>
          )}
        </div>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-neutral-200">{player.name}</span>
            {isPartner && (
              <span className="text-[10px] text-sky-400 bg-sky-900/60 px-1 rounded font-semibold">Партнёр</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-medium">
            <span>
              Ставка:{' '}
              <b className={player.bid === 0 ? 'text-rose-400' : 'text-amber-400'}>
                {player.bid !== null ? (player.bid === 0 ? 'Nil' : player.bid) : '—'}
              </b>
            </span>
            <span>•</span>
            <span>
              Взятки: <b className="text-emerald-400">{player.tricksWon}</b>
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Get trick card played by a specific player ID
  const getPlayedCard = (playerId: SpadesPlayerId) => {
    return currentTrick.plays.find((p) => p.playerId === playerId)
  }

  return (
    <div className="relative w-full min-h-screen bg-[#07130c] text-neutral-100 flex flex-col justify-between overflow-x-hidden selection:bg-emerald-600 selection:text-white">
      {/* Subtle Felt Pattern Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: 'radial-gradient(#14532d 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* TOP HEADER / NAVIGATION */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-neutral-950/80 border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitToHub}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-bold text-neutral-300 border border-neutral-700 transition cursor-pointer"
            title="Вернуться к выбору игры"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Выбор игры</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">♠️</span>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                Пики (Spades)
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Раунд {roundNumber} • Взятка {Math.min(trickNumber, 13)}/13
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Center Team Scores */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-semibold">
          {/* Team 0 (You + North) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-950/50 border border-sky-500/30">
            <span className="text-sky-300">Вы + Партнёр:</span>
            <span className="text-amber-400 font-black text-sm">{team0Score} очков</span>
            <span className="text-[10px] text-neutral-400">
              ({team0Tricks}/{team0Contract} вз. | {team0Bags} меш.)
            </span>
          </div>

          {/* Team 1 (Opponents) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/60 border border-neutral-700/50">
            <span className="text-neutral-300">Соперники:</span>
            <span className="text-amber-400 font-black text-sm">{team1Score} очков</span>
            <span className="text-[10px] text-neutral-400">
              ({team1Tricks}/{team1Contract} вз. | {team1Bags} меш.)
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5">
          <div
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border ${
              spadesBroken
                ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                : 'bg-neutral-900 border-neutral-700 text-neutral-400'
            }`}
            title={spadesBroken ? 'Пики сломаны: разрешено ходить с пик' : 'Пики не сломаны: нельзя начинать ход с пик'}
          >
            <span>♠️ {spadesBroken ? 'Сломаны' : 'Не сломаны'}</span>
          </div>

          <button
            onClick={() => setConfig({ ...config, soundEnabled: !config.soundEnabled })}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition cursor-pointer"
            title={config.soundEnabled ? 'Выключить звук' : 'Включить звук'}
          >
            {config.soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition cursor-pointer"
            title="История раундов"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsRulesOpen(true)}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition cursor-pointer"
            title="Правила игры"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition cursor-pointer"
            title="Настройки"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN FELT TABLE CONTAINER */}
      <main className="relative z-10 flex-1 flex flex-col justify-between p-3 sm:p-6 max-w-6xl mx-auto w-full">
        {/* TOP SEAT: North (Partner - Player 2) */}
        <div className="flex justify-center">
          {renderPlayerBadge(players[2], 'top')}
        </div>

        {/* MIDDLE ROW: West, Center Trick Arena, East */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 my-2 sm:my-4">
          {/* Left Seat: West (Opponent 1 - Player 1) */}
          <div className="flex flex-col items-start">
            {renderPlayerBadge(players[1], 'left')}
          </div>

          {/* CENTER TRICK ARENA (Green Felt Table) */}
          <div className="relative flex-1 max-w-md h-56 sm:h-64 rounded-3xl bg-emerald-900/40 border-4 border-emerald-800/60 shadow-2xl flex flex-col items-center justify-center p-3">
            {/* Center Felt Logo / Spade Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <span className="text-8xl font-serif">♠</span>
            </div>

            {/* Current Trick Played Cards (4 positions: North, West, East, South) */}
            <div className="relative w-48 h-40 flex items-center justify-center">
              {/* North card */}
              {getPlayedCard(2) && (
                <div className="absolute -top-1 animate-fade-in flex flex-col items-center">
                  <SpadesCardView card={getPlayedCard(2)!.card} isPlayed size="sm" />
                  <span className="text-[9px] text-sky-300 font-bold mt-0.5">Север</span>
                </div>
              )}

              {/* West card */}
              {getPlayedCard(1) && (
                <div className="absolute left-0 animate-fade-in flex flex-col items-center">
                  <SpadesCardView card={getPlayedCard(1)!.card} isPlayed size="sm" />
                  <span className="text-[9px] text-amber-300 font-bold mt-0.5">Запад</span>
                </div>
              )}

              {/* East card */}
              {getPlayedCard(3) && (
                <div className="absolute right-0 animate-fade-in flex flex-col items-center">
                  <SpadesCardView card={getPlayedCard(3)!.card} isPlayed size="sm" />
                  <span className="text-[9px] text-amber-300 font-bold mt-0.5">Восток</span>
                </div>
              )}

              {/* South card (You) */}
              {getPlayedCard(0) && (
                <div className="absolute -bottom-1 animate-fade-in flex flex-col items-center">
                  <SpadesCardView card={getPlayedCard(0)!.card} isPlayed size="sm" />
                  <span className="text-[9px] text-emerald-300 font-bold mt-0.5">Вы</span>
                </div>
              )}

              {/* Empty Trick Prompt */}
              {currentTrick.plays.length === 0 && (
                <div className="text-center text-xs text-emerald-300/60 font-semibold px-4 py-2 rounded-xl bg-black/20">
                  {phase === 'bidding' ? 'Идёт этап ставок...' : `Ожидание хода (${players[currentTurn].name})...`}
                </div>
              )}
            </div>

            {/* Trick Evaluation Winner notification */}
            {currentTrick.winningCard && phase === 'evaluating' && (
              <div className="absolute bottom-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-bold animate-pulse">
                Взятку берёт {players[currentTrick.winnerId!].name} ({currentTrick.winningCard.name})!
              </div>
            )}
          </div>

          {/* Right Seat: East (Opponent 2 - Player 3) */}
          <div className="flex flex-col items-end">
            {renderPlayerBadge(players[3], 'right')}
          </div>
        </div>

        {/* BOTTOM SECTION: Status Bar, South Seat Badge & Player Hand Fan */}
        <div className="flex flex-col items-center gap-2">
          {/* Status Bar */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs text-neutral-300 backdrop-blur-md shadow-lg">
            {isHumanTurn ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Ваш ход! Выберите карту из руки для розыгрыша
              </span>
            ) : (
              <span>{statusMessage}</span>
            )}
          </div>

          {/* South Badge (You) */}
          <div className="flex justify-center">
            {renderPlayerBadge(players[0], 'bottom')}
          </div>

          {/* PLAYER HAND: Interactive Fan of Cards */}
          <div className="relative w-full flex items-center justify-center pt-2 pb-1 overflow-x-auto custom-scrollbar">
            <div className="flex items-center justify-center -space-x-4 sm:-space-x-5 py-3 px-4">
              {humanPlayer.hand.map((card, idx) => {
                const isValid = isHumanTurn ? validCardIds.has(card.id) : false
                const isSelected = selectedCardId === card.id

                return (
                  <div
                    key={card.id}
                    className="transition-transform duration-200"
                    style={{
                      transform: isSelected
                        ? 'translateY(-18px) scale(1.08)'
                        : `rotate(${(idx - (humanPlayer.hand.length - 1) / 2) * 2}deg)`,
                      zIndex: isSelected ? 30 : idx + 1,
                    }}
                  >
                    <SpadesCardView
                      card={card}
                      isValid={!isHumanTurn || isValid}
                      isSelected={isSelected}
                      onClick={() => handleCardClick(card.id)}
                      disabled={!isHumanTurn || !isValid}
                      size="md"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}
      <BiddingModal
        isOpen={phase === 'bidding' && currentTurn === 0}
        hand={humanPlayer.hand}
        partnerBid={players[2].bid}
        opponentsBids={[players[1].bid, players[3].bid]}
        onSubmitBid={submitBid}
        nilPoints={config.nilPoints}
      />

      <RoundEndModal
        isOpen={phase === 'round_end'}
        summary={lastRoundSummary}
        onNextRound={startNextRound}
        isGameOver={phase === 'game_over'}
      />

      <GameOverModal
        isOpen={phase === 'game_over'}
        winnerTeamId={winnerTeamId}
        team0Score={team0Score}
        team1Score={team1Score}
        targetScore={config.targetScore}
        onPlayAgain={startNewMatch}
      />

      <SpadesRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <SpadesHistoryModal isOpen={isHistoryOpen} history={history} onClose={() => setIsHistoryOpen(false)} />
      <SpadesSettingsModal
        isOpen={isSettingsOpen}
        config={config}
        onUpdateConfig={setConfig}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}

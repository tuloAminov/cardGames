import React, { useState } from 'react'
import {
  Volume2,
  VolumeX,
  BookOpen,
  Settings as SettingsIcon,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  Users,
  Share2,
  Check,
  Trophy,
} from 'lucide-react'
import { CardView } from './CardView'
import {
  RulesModal,
  SettingsModal,
  RoundEndModal,
  MatchEndModal,
  TricksViewerModal,
  HotseatCurtainModal,
  LastTrickModal,
} from './Modals'
import { OnlineLobbyModal } from './OnlineLobbyModal'
import { QuickChat } from './QuickChat'
import { useBuraGame } from '../game/useBuraGame'
import { SUIT_NAMES } from '../game/rules'
import type { PlayerId } from '../game/types'

export const Table: React.FC<{ onBackToMenu?: () => void }> = ({ onBackToMenu }) => {
  const {
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
    evaluatingWinner,
    evaluatingPoints,
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
    playerTricksPoints,
    opponentTricksPoints,
    p3TricksPoints,
    p4TricksPoints,
    team1Points,
    activeHand,
    responseMatchPairs,
    canSelectedCardsBeat,
    isSelectionValidLead,
    isSelectionValidResponse,
    validationHint,
    playerCombinations,
    opponentCombinations,
    toggleSelectCard,
    clearSelection,
    setDiscardFaceDown,
    setIsHotseatCurtainActive,
    setIsTricksViewerOpen,
    setViewingPlayerTricks,
    playerLead,
    playerRespond,
    chainBattleDefend,
    chainBattleAttack,
    chainBattleSurrender,
    declareCombination,
    startNewRound,
    startNewMatch,
    isOnline,
    onlineRole,
    connectionStatus,
    roomCode,
    chatMessages,
    myNickname,
    opponentNickname,
    p3Nickname,
    p4Nickname,
    createOnlineRoom,
    joinOnlineRoom,
    leaveOnlineRoom,
    sendChatMessage,
    updateNickname,
  } = useBuraGame()

  const [isRulesOpen, setIsRulesOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isLastTrickOpen, setIsLastTrickOpen] = useState(false)
  const [isOnlineLobbyOpen, setIsOnlineLobbyOpen] = useState(false)
  const [headerCopied, setHeaderCopied] = useState(false)

  const isHotseat = settings.mode === 'hotseat'
  const isPlayer1Active = activePlayer === 'player'
  const isPlayer2Active = activePlayer === 'opponent'

  const curRule = settings.ruleType || 'duel_classic_4'
  const isChainMode = curRule === 'duel_chain_6'
  const isTeamMode = curRule === 'teams_4'
  const is3Player = curRule === 'ffa_3'
  const is4Player = curRule === 'ffa_4' || isTeamMode

  const leadCount = tableLeadCards.length
  const trumpInfo = SUIT_NAMES[trumpSuit]

  // Opponent name & avatar
  const opponentName = isOnline
    ? opponentNickname || (onlineRole === 'host' ? 'Ожидание друга...' : 'Хост')
    : isHotseat
    ? 'Игрок 2'
    : settings.difficulty === 'hard'
    ? 'Шулер Михалыч'
    : settings.difficulty === 'medium'
    ? 'Игрок Иван'
    : 'Новичок Саня'

  const playerName = isOnline
    ? myNickname
    : isHotseat
    ? (isPlayer1Active ? 'Игрок 1' : 'Игрок 2')
    : 'Вы (Игрок)'

  const openTricksViewer = (target: PlayerId) => {
    setViewingPlayerTricks(target)
    setIsTricksViewerOpen(true)
  }

  const getPlayerDisplayName = (id: PlayerId) => {
    if (id === 'player') return playerName
    if (id === 'opponent') return opponentName
    if (id === 'p3') return isTeamMode ? 'Партнёр (Игрок 3)' : p3Nickname
    return p4Nickname
  }

  const getCardFlightClass = () => {
    if (phase !== 'evaluating' || !evaluatingWinner) return 'transition-all duration-500'
    if (evaluatingWinner === 'player') {
      return 'transition-all duration-700 ease-in-out translate-y-36 sm:translate-y-48 scale-75 opacity-10'
    }
    if (evaluatingWinner === 'opponent') {
      return is3Player || is4Player
        ? 'transition-all duration-700 ease-in-out -translate-x-36 sm:-translate-x-48 scale-75 opacity-10'
        : 'transition-all duration-700 ease-in-out -translate-y-36 sm:-translate-y-48 scale-75 opacity-10'
    }
    if (evaluatingWinner === 'p3') {
      return is3Player
        ? 'transition-all duration-700 ease-in-out translate-x-36 sm:translate-x-48 scale-75 opacity-10'
        : 'transition-all duration-700 ease-in-out -translate-y-36 sm:-translate-y-48 scale-75 opacity-10'
    }
    if (evaluatingWinner === 'p4') {
      return 'transition-all duration-700 ease-in-out translate-x-36 sm:translate-x-48 scale-75 opacity-10'
    }
    return 'transition-all duration-500'
  }

  // Active combinations for currently active player
  const currentCombos = isHotseat && isPlayer2Active ? opponentCombinations : playerCombinations

  const copyRoomInvite = () => {
    if (!roomCode || typeof window === 'undefined') return
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`
    navigator.clipboard.writeText(url).then(() => {
      setHeaderCopied(true)
      setTimeout(() => setHeaderCopied(false), 2000)
    })
  }

  return (
    <div className="relative w-full min-h-screen bg-neutral-950 flex flex-col justify-between select-none overflow-x-hidden font-sans">
      {/* Modals */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newS) => setSettings((prev) => ({ ...prev, ...newS }))}
        onRestartMatch={(rule) => startNewMatch(undefined, rule)}
        onOpenOnlineLobby={() => setIsOnlineLobbyOpen(true)}
      />
      <OnlineLobbyModal
        isOpen={isOnlineLobbyOpen}
        onClose={() => setIsOnlineLobbyOpen(false)}
        onlineRole={onlineRole}
        connectionStatus={connectionStatus}
        roomCode={roomCode}
        myNickname={myNickname}
        opponentNickname={opponentNickname}
        onCreateRoom={createOnlineRoom}
        onJoinRoom={joinOnlineRoom}
        onLeaveRoom={leaveOnlineRoom}
        onUpdateNickname={updateNickname}
      />
      <TricksViewerModal
        isOpen={isTricksViewerOpen}
        onClose={() => setIsTricksViewerOpen(false)}
        cards={
          viewingPlayerTricks === 'player'
            ? playerTricks
            : viewingPlayerTricks === 'opponent'
            ? opponentTricks
            : viewingPlayerTricks === 'p3'
            ? p3Tricks
            : p4Tricks
        }
        playerName={
          viewingPlayerTricks === 'player'
            ? 'Игрок 1'
            : viewingPlayerTricks === 'opponent'
            ? opponentName
            : viewingPlayerTricks === 'p3'
            ? p3Nickname
            : p4Nickname
        }
        trumpSuit={trumpSuit}
        totalPoints={
          viewingPlayerTricks === 'player'
            ? playerTricksPoints
            : viewingPlayerTricks === 'opponent'
            ? opponentTricksPoints
            : viewingPlayerTricks === 'p3'
            ? p3TricksPoints
            : p4TricksPoints
        }
        hidePoints={
          viewingPlayerTricks !== 'player' &&
          phase !== 'round_ended' &&
          phase !== 'match_ended'
        }
      />
      <HotseatCurtainModal
        isOpen={isHotseat && isHotseatCurtainActive}
        activePlayer={activePlayer}
        onReady={() => setIsHotseatCurtainActive(false)}
      />
      <LastTrickModal
        isOpen={isLastTrickOpen}
        onClose={() => setIsLastTrickOpen(false)}
        lastTrick={lastTrick}
        trumpSuit={trumpSuit}
        opponentName={opponentName}
      />
      <RoundEndModal
        isOpen={phase === 'round_ended'}
        roundResult={roundResult}
        matchScore={matchScore}
        playerTricks={playerTricks}
        opponentTricks={opponentTricks}
        trumpSuit={trumpSuit}
        onNextRound={() =>
          startNewRound(roundResult?.winner === 'player' ? 'player' : 'opponent')
        }
      />
      <MatchEndModal
        isOpen={phase === 'match_ended'}
        matchScore={matchScore}
        onRestartMatch={() => startNewMatch()}
        isTeamMode={isTeamMode}
      />

      {/* Top App Header */}
      <header className="w-full max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between text-neutral-200 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-serif font-black tracking-wider text-amber-400">
              БУРА
            </span>
            {onBackToMenu && (
              <button
                onClick={onBackToMenu}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-400/50 text-xs font-bold text-amber-300 hover:text-white transition cursor-pointer shadow-sm ml-1"
                title="Вернуться к выбору игры"
              >
                🎮 Меню игр
              </button>
            )}
          </div>

          {/* Match Score Display */}
          <div className="hidden sm:flex items-center gap-2 bg-neutral-900/90 border border-amber-500/30 px-3 py-1 rounded-xl shadow-inner">
            <span className="text-xs text-neutral-400 font-bold">
              {settings.ruleType === 'teams_4' ? 'КОМАНДЫ:' : isHotseat ? 'СЧЁТ:' : 'МАТЧ:'}
            </span>
            <span className="text-sm font-black text-amber-400 font-mono">
              {settings.ruleType === 'teams_4'
                ? `${matchScore.team1 || 0} : ${matchScore.team2 || 0}`
                : `${matchScore.player} : ${matchScore.opponent}`}
            </span>
            <span className="text-[11px] text-neutral-500 font-medium">
              (до {matchScore.target})
            </span>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile match score */}
          <div className="sm:hidden flex items-center gap-1 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-amber-400">
            {settings.ruleType === 'teams_4'
              ? `${matchScore.team1 || 0} : ${matchScore.team2 || 0}`
              : `${matchScore.player} : ${matchScore.opponent}`}
          </div>

          {/* Online Room Info & Share if in room */}
          {isOnline && roomCode && (
            <div className="flex items-center gap-1.5 bg-neutral-900/90 border border-amber-500/40 px-2.5 py-1 rounded-xl shadow">
              <span className="flex h-2 w-2 relative">
                {connectionStatus === 'connected' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </>
                ) : connectionStatus === 'connecting' ? (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 animate-pulse" />
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                )}
              </span>

              <button
                onClick={() => setIsOnlineLobbyOpen(true)}
                title="Нажмите для просмотра комнаты"
                className="text-xs font-mono font-black text-amber-400 hover:text-amber-300"
              >
                {roomCode}
              </button>

              <button
                onClick={copyRoomInvite}
                title="Скопировать ссылку-приглашение для друга"
                className="p-1 rounded text-neutral-400 hover:text-white transition"
              >
                {headerCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-amber-400" />
                )}
              </button>
            </div>
          )}

          {/* Online Lobby Button */}
          <button
            onClick={() => setIsOnlineLobbyOpen(true)}
            title="Игра онлайн с друзьями"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm cursor-pointer ${
              isOnline
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Онлайн</span>
            {isOnline && (
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-500'
                    : connectionStatus === 'connecting'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-red-500'
                }`}
              />
            )}
          </button>

          {/* Quick Chat in Online Mode */}
          {isOnline && (
            <QuickChat
              messages={chatMessages}
              onSendMessage={sendChatMessage}
              myNickname={myNickname}
              opponentNickname={opponentNickname}
            />
          )}

          <button
            onClick={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
            title={settings.soundEnabled ? 'Выключить звук' : 'Включить звук'}
            className="p-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4 text-red-400" />
            )}
          </button>

          <button
            onClick={() => setIsRulesOpen(true)}
            title="Правила игры"
            className="p-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Настройки"
            className="p-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Table Felt Arena */}
      <main className="flex-1 flex flex-col justify-between max-w-6xl w-full mx-auto px-2 sm:px-4 py-1 relative">
        <div
          className={`relative w-full flex-1 rounded-3xl border-4 sm:border-8 border-amber-950/70 shadow-2xl flex flex-col justify-between p-3 sm:p-5 overflow-hidden transition-colors duration-500 ${
            settings.darkFelt
              ? 'bg-gradient-to-b from-emerald-950 via-neutral-900 to-emerald-950'
              : 'bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-950'
          }`}
          style={{
            boxShadow: 'inset 0 0 80px rgba(0, 0, 0, 0.7), 0 20px 40px rgba(0, 0, 0, 0.8)',
          }}
        >
          {/* Subtle Felt Texture / Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

          {/* Opponent(s) Area (Top) */}
          {is4Player ? (
            /* 4 Players Layout (FFA or 2v2 Teams) */
            <div className="w-full flex items-center justify-between z-10 px-2 gap-2">
              {/* Player 2 (Left) */}
              <div className="flex items-center gap-2 bg-neutral-950/70 p-2 rounded-2xl border border-neutral-800">
                <div className="relative">
                  <div
                    className={`w-9 h-9 rounded-full bg-neutral-900 border-2 ${
                      phase === 'evaluating' && evaluatingWinner === 'opponent'
                        ? 'border-amber-300 ring-4 ring-amber-400 ring-offset-2 ring-offset-neutral-950 animate-pulse'
                        : 'border-red-500/60'
                    } flex items-center justify-center text-amber-300 font-serif font-black shadow text-xs`}
                  >
                    🤠
                  </div>
                  {activePlayer === 'opponent' && (
                    <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-white truncate max-w-[80px]">
                      {opponentName}
                    </span>
                    {isTeamMode && (
                      <span className="text-[9px] bg-red-600/30 text-red-300 border border-red-500/40 px-1 rounded font-bold">
                        🔴 К2
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-emerald-200/80">
                    Взятки: {opponentTricks.length} карт
                  </div>
                </div>
                {/* Hand cards count */}
                <div className="flex -space-x-5 ml-1">
                  {opponentHand.map((c, i) => (
                    <CardView key={c.id || i} faceDown size="sm" className="w-7 h-10" />
                  ))}
                </div>
              </div>

              {/* Player 3 (Top Center) - In Teams mode this is Teammate! */}
              <div className="flex items-center gap-2 bg-neutral-950/70 p-2 rounded-2xl border border-neutral-800">
                <div className="relative">
                  <div
                    className={`w-9 h-9 rounded-full bg-neutral-900 border-2 ${
                      phase === 'evaluating' && evaluatingWinner === 'p3'
                        ? 'border-amber-300 ring-4 ring-amber-400 ring-offset-2 ring-offset-neutral-950 animate-pulse'
                        : isTeamMode
                        ? 'border-blue-400'
                        : 'border-amber-500/60'
                    } flex items-center justify-center text-amber-300 font-serif font-black shadow text-xs`}
                  >
                    {isTeamMode ? '🤝' : '🧔'}
                  </div>
                  {activePlayer === 'p3' && (
                    <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-white truncate max-w-[80px]">
                      {p3Nickname}
                    </span>
                    {isTeamMode && (
                      <span className="text-[9px] bg-blue-600/30 text-blue-300 border border-blue-500/40 px-1 rounded font-bold">
                        🔵 К1
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-emerald-200/80">
                    Взятки: {p3Tricks.length} карт
                  </div>
                </div>
                {/* Hand cards count */}
                <div className="flex -space-x-5 ml-1">
                  {p3Hand.map((c, i) => (
                    <CardView key={c.id || i} faceDown size="sm" className="w-7 h-10" />
                  ))}
                </div>
              </div>

              {/* Player 4 (Right) */}
              <div className="flex items-center gap-2 bg-neutral-950/70 p-2 rounded-2xl border border-neutral-800">
                <div className="relative">
                  <div
                    className={`w-9 h-9 rounded-full bg-neutral-900 border-2 ${
                      phase === 'evaluating' && evaluatingWinner === 'p4'
                        ? 'border-amber-300 ring-4 ring-amber-400 ring-offset-2 ring-offset-neutral-950 animate-pulse'
                        : 'border-red-500/60'
                    } flex items-center justify-center text-amber-300 font-serif font-black shadow text-xs`}
                  >
                    🎩
                  </div>
                  {activePlayer === 'p4' && (
                    <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-white truncate max-w-[80px]">
                      {p4Nickname}
                    </span>
                    {isTeamMode && (
                      <span className="text-[9px] bg-red-600/30 text-red-300 border border-red-500/40 px-1 rounded font-bold">
                        🔴 К2
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-emerald-200/80">
                    Взятки: {p4Tricks.length} карт
                  </div>
                </div>
                {/* Hand cards count */}
                <div className="flex -space-x-5 ml-1">
                  {p4Hand.map((c, i) => (
                    <CardView key={c.id || i} faceDown size="sm" className="w-7 h-10" />
                  ))}
                </div>
              </div>
            </div>
          ) : is3Player ? (
            /* 3 Players Layout */
            <div className="w-full flex items-center justify-between z-10 px-2 gap-4">
              {/* Player 2 */}
              <div className="flex items-center gap-3 bg-neutral-950/70 p-2.5 rounded-2xl border border-neutral-800">
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-full bg-neutral-900 border-2 ${
                      phase === 'evaluating' && evaluatingWinner === 'opponent'
                        ? 'border-amber-300 ring-4 ring-amber-400 ring-offset-2 ring-offset-neutral-950 animate-pulse'
                        : 'border-amber-500/60'
                    } flex items-center justify-center text-amber-300 font-serif font-black shadow text-sm`}
                  >
                    🤠
                  </div>
                  {activePlayer === 'opponent' && (
                    <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm text-white">
                    {opponentName}
                  </div>
                  <div className="text-xs text-emerald-200/80">
                    Взятки: {opponentTricks.length} карт
                  </div>
                </div>
                <div className="flex -space-x-6 ml-2">
                  {opponentHand.map((c, i) => (
                    <CardView key={c.id || i} faceDown size="sm" className="w-8 h-12" />
                  ))}
                </div>
              </div>

              {/* Player 3 */}
              <div className="flex items-center gap-3 bg-neutral-950/70 p-2.5 rounded-2xl border border-neutral-800">
                <div className="flex -space-x-6 mr-2">
                  {p3Hand.map((c, i) => (
                    <CardView key={c.id || i} faceDown size="sm" className="w-8 h-12" />
                  ))}
                </div>
                <div className="text-right">
                  <div className="font-bold text-xs sm:text-sm text-white">
                    {p3Nickname}
                  </div>
                  <div className="text-xs text-emerald-200/80">
                    Взятки: {p3Tricks.length} карт
                  </div>
                </div>
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-full bg-neutral-900 border-2 ${
                      phase === 'evaluating' && evaluatingWinner === 'p3'
                        ? 'border-amber-300 ring-4 ring-amber-400 ring-offset-2 ring-offset-neutral-950 animate-pulse'
                        : 'border-amber-500/60'
                    } flex items-center justify-center text-amber-300 font-serif font-black shadow text-sm`}
                  >
                    🎩
                  </div>
                  {activePlayer === 'p3' && (
                    <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Standard 2 Players Layout (Classic & Chain 6) */
            <div className="w-full flex items-center justify-between z-10 px-2">
              {/* Opponent Info */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neutral-900 border-2 ${
                      phase === 'evaluating' && evaluatingWinner === 'opponent'
                        ? 'border-amber-300 ring-4 ring-amber-400 ring-offset-2 ring-offset-neutral-950 animate-pulse'
                        : 'border-amber-500/60'
                    } flex items-center justify-center text-amber-300 font-serif font-black shadow-lg`}
                  >
                    {isOnline ? '🌐' : isHotseat ? '👥' : settings.difficulty === 'hard' ? '🎩' : settings.difficulty === 'medium' ? '🧔' : '🤠'}
                  </div>
                  {isAITurn && (
                    <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                    </span>
                  )}
                  {isOnline && connectionStatus === 'connected' && (
                    <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm sm:text-base text-white">
                      {opponentName}
                    </span>
                    {isOnline && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                          connectionStatus === 'connected'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : connectionStatus === 'connecting'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                            : 'bg-red-500/20 text-red-300 border-red-500/30'
                        }`}
                      >
                        {connectionStatus === 'connected'
                          ? 'В сети'
                          : connectionStatus === 'connecting'
                          ? 'Ожидание...'
                          : 'Отключен'}
                      </span>
                    )}
                    {activePlayer === 'opponent' && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-semibold animate-pulse">
                        Ходит
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-emerald-200/80 flex items-center gap-2">
                    <span>Взятки: {opponentTricks.length} карт</span>
                  </div>
                </div>
              </div>

              {/* Opponent Cards in Hand (Face down) */}
              <div className="flex items-center -space-x-8 sm:-space-x-12">
                {(isHotseat && isPlayer2Active ? playerHand : opponentHand).map((c, i) => (
                  <div
                    key={c.id || i}
                    style={{
                      transform: `rotate(${(i - 1) * 6}deg)`,
                    }}
                    className="transition-transform duration-300"
                  >
                    <CardView faceDown size="sm" />
                  </div>
                ))}
              </div>

              {/* Opponent Trick Pile (Clickable to view tricks) */}
              <div
                onClick={() => openTricksViewer('opponent')}
                title="Нажмите, чтобы просмотреть взятки"
                className="text-right flex flex-col items-end cursor-pointer group"
              >
                <div className="relative w-12 h-16 sm:w-14 sm:h-20 rounded border border-white/20 bg-emerald-950/40 flex items-center justify-center shadow-inner group-hover:border-amber-400 transition">
                  {opponentTricks.length > 0 ? (
                    <div className="relative">
                      <CardView faceDown size="sm" className="w-12 h-16 sm:w-14 sm:h-20" />
                      <span className="absolute -bottom-2 -left-2 bg-neutral-900 border border-amber-500/40 text-amber-300 font-bold text-[10px] px-1.5 py-0.5 rounded-full shadow">
                        {opponentTricks.length}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-emerald-400/40 uppercase font-bold text-center">
                      Взятки
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Table Center (Stock Deck + Trump + Trick Arena) */}
          <div className="w-full flex-1 flex flex-col sm:flex-row items-center justify-between gap-4 py-3 z-10">
            {/* Left: Deck & Trump card beneath */}
            <div className="flex sm:flex-col items-center gap-3 sm:gap-2">
              <div className="relative flex items-center justify-center w-28 h-36 sm:w-32 sm:h-44">
                {/* Trump card placed horizontally beneath deck */}
                {trumpCard && (
                  <div
                    className="absolute z-0 transition-transform duration-300"
                    style={{ transform: 'rotate(90deg) translate(0, 10px)' }}
                  >
                    <CardView card={trumpCard} size="sm" isTrump />
                  </div>
                )}

                {/* Stock deck pile */}
                {deck.length > 0 ? (
                  <div className="relative z-10 flex items-center justify-center">
                    <div className="absolute top-1 left-1 w-full h-full rounded-lg bg-red-950 border border-amber-950/60 shadow-md" />
                    <CardView faceDown size="sm" />
                    <span className="absolute bottom-2 bg-neutral-950/90 text-amber-300 font-mono font-bold text-xs px-2 py-0.5 rounded-full border border-amber-500/40 shadow-lg z-20">
                      {deck.length + (trumpCard ? 1 : 0)}
                    </span>
                  </div>
                ) : trumpCard ? (
                  <div className="relative z-10">
                    <CardView card={trumpCard} size="sm" isTrump />
                    <span className="absolute -bottom-2 -right-2 bg-amber-500 text-black font-black text-[9px] px-1.5 py-0.5 rounded shadow">
                      Последняя!
                    </span>
                  </div>
                ) : (
                  <div className="w-16 h-24 rounded-lg border-2 border-dashed border-emerald-400/30 flex items-center justify-center text-[10px] text-emerald-400/40 font-bold text-center p-2">
                    Колода пуста
                  </div>
                )}
              </div>

              {/* Trump Suit indicator badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/80 border border-amber-500/40 text-xs shadow-md">
                <span className="text-neutral-400">Козырь:</span>
                <span
                  className={`font-black ${
                    trumpInfo.color === 'red' ? 'text-red-500' : 'text-neutral-100'
                  }`}
                >
                  {trumpInfo.symbol} {trumpInfo.ru}
                </span>
              </div>

              {/* Last Trick Button */}
              {lastTrick && (
                <button
                  onClick={() => setIsLastTrickOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-400/50 text-xs text-neutral-300 hover:text-white shadow transition cursor-pointer"
                  title="Посмотреть карты прошлой взятки"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Прошлая взятка</span>
                </button>
              )}
            </div>

            {/* Trick Arena in Center */}
            <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[160px] sm:min-h-[220px] relative">
              {/* Dynamic status pill / resolution text or Prominent Winner Announcement */}
              <div className="mb-3 text-center relative z-40">
                {phase === 'evaluating' && evaluatingWinner ? (
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-neutral-950 font-black text-sm sm:text-base shadow-2xl border-2 border-amber-200 animate-bounce">
                    <Trophy className="w-5 h-5 text-amber-950 shrink-0" />
                    <span>Взятку забирает:</span>
                    <span className="underline">{getPlayerDisplayName(evaluatingWinner)}</span>
                    {evaluatingPoints > 0 && <span>(+{evaluatingPoints} очков)</span>}
                  </div>
                ) : trickResolutionText ? (
                  <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500 text-neutral-950 font-black text-xs sm:text-sm shadow-xl animate-bounce">
                    {trickResolutionText}
                  </div>
                ) : combinationNotice ? (
                  <div className="inline-block px-4 py-1.5 rounded-full bg-red-600 text-white font-black text-xs sm:text-sm shadow-xl animate-pulse">
                    🎉 {combinationNotice.name}: {combinationNotice.description}
                  </div>
                ) : (
                  <div className="inline-block px-4 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-emerald-100 text-xs sm:text-sm font-medium shadow-md">
                    {statusMessage}
                  </div>
                )}
              </div>

              {/* Center Arena: Chain Battle Arena, Multiplayer Plays, or Standard 2-player Cards */}
              {isChainMode && chainBattle?.active ? (
                <div className={`flex flex-col items-center justify-center gap-3 ${getCardFlightClass()}`}>
                  {chainBattle.stage === 'defend' ? (
                    <div className="flex flex-col items-center gap-1.5 animate-pulse">
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        {chainBattle.currentDefenderId === 'player'
                          ? `Атака: ${opponentName} (шаг 1: покройте ${
                              chainBattle.currentTargetCards?.length || 1
                            } ${
                              (chainBattle.currentTargetCards?.length || 1) === 1 ? 'карту' : 'карт'
                            } или сдайтесь)`
                          : `Ваша атака (${
                              chainBattle.currentTargetCards?.length || 1
                            } карт, ждём ответ соперника)`}
                      </span>
                      <div className="flex items-center gap-2 p-2 rounded-2xl bg-amber-500/20 border-2 border-amber-400 shadow-2xl">
                        {(chainBattle.currentTargetCards &&
                        chainBattle.currentTargetCards.length > 0
                          ? chainBattle.currentTargetCards
                          : chainBattle.currentTargetCard
                          ? [chainBattle.currentTargetCard]
                          : []
                        ).map((card) => (
                          <CardView
                            key={card.id}
                            card={card}
                            isTrump={card.suit === trumpSuit}
                            size="md"
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Attack stage (Step 2: Choose counter-attack cards) */
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>
                          {chainBattle.currentAttackerId === 'player'
                            ? 'Вы успешно отбились! Шаг 2: выберите карты для своего хода'
                            : `${opponentName} отбился и обдумывает ответный ход...`}
                        </span>
                      </div>

                      {/* Display previously beaten cards preview */}
                      {chainBattle.lastBeatenCards && (
                        <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-neutral-900/60 border border-neutral-700/60">
                          <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
                            Побитые карты ({chainBattle.lastBeatenCards.defenderName}):
                          </span>
                          <div className="flex items-center gap-2">
                            {chainBattle.lastBeatenCards.leadCards.map((leadC, idx) => {
                              const defC = chainBattle.lastBeatenCards?.defenseCards[idx]
                              return (
                                <div key={leadC.id} className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                                  <CardView card={leadC} isTrump={leadC.suit === trumpSuit} size="sm" />
                                  <span className="text-emerald-400 font-bold text-xs">←</span>
                                  {defC && <CardView card={defC} isTrump={defC.suit === trumpSuit} size="sm" />}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Played cards pile in this chain */}
                  {chainBattle.pile.length > 0 && (
                    <div className="flex flex-col items-center gap-1 mt-1">
                      <span className="text-[11px] text-neutral-400 font-semibold">
                        В раздаче на столе: {chainBattle.pile.length} карт
                      </span>
                      <div className="flex items-center gap-1.5 max-w-full overflow-x-auto px-2 py-1 bg-black/40 rounded-xl border border-white/10">
                        {chainBattle.pile.map((play, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1 text-[11px] bg-neutral-900 border border-neutral-700 px-2 py-0.5 rounded-md"
                          >
                            <span className="font-bold text-white">{play.playerName}:</span>
                            <span
                              className={
                                play.card.suit === 'hearts' || play.card.suit === 'diamonds'
                                  ? 'text-red-400 font-bold'
                                  : 'text-neutral-200 font-bold'
                              }
                            >
                              {play.card.rank}{SUIT_NAMES[play.card.suit].symbol}
                            </span>
                            <span className="text-[9px] text-neutral-500">
                              {play.isDefense ? '(побил)' : '(ход)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : is3Player || is4Player ? (
                /* Multiplayer Arena: All active plays visible on the table */
                <div className={`flex flex-wrap items-center justify-center gap-3 sm:gap-6 ${getCardFlightClass()}`}>
                  {multiplayerPlays.length > 0 ? (
                    multiplayerPlays.map((play, idx) => (
                      <div
                        key={play.playerId || idx}
                        className={`flex flex-col items-center p-2 rounded-2xl bg-neutral-950/70 border ${
                          idx === 0 ? 'border-amber-500/50' : 'border-neutral-800'
                        }`}
                      >
                        <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          {idx === 0 ? 'Заход' : 'Ответ'}: {getPlayerDisplayName(play.playerId)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {play.cards.map((c, ci) => (
                            <CardView
                              key={c.id || ci}
                              card={c}
                              faceDown={c.faceDown}
                              isTrump={c.suit === trumpSuit}
                              size="md"
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-neutral-500 italic py-6">
                      Ожидание захода в раздаче...
                    </div>
                  )}
                </div>
              ) : (
                /* Standard 2-Player Cards in play on table */
                <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 ${getCardFlightClass()}`}>
                  {/* Lead cards */}
                  {tableLeadCards.length > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                        {leadPlayer === 'player' ? 'Заход Игрока' : 'Заход Соперника'}
                      </span>
                      <div className="flex items-center gap-2">
                        {tableLeadCards.map((c) => (
                          <CardView
                            key={c.id}
                            card={c}
                            isTrump={c.suit === trumpSuit}
                            size="md"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* VS divider */}
                  {tableLeadCards.length > 0 && tableResponseCards.length > 0 && (
                    <div className="text-amber-400 font-serif font-black text-lg sm:text-xl">
                      VS
                    </div>
                  )}

                  {/* Response cards */}
                  {tableResponseCards.length > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                        {leadPlayer === 'player' ? 'Ответ Соперника' : 'Ответ Игрока'}
                      </span>
                      <div className="flex items-center gap-2">
                        {tableResponseCards.map((c, i) => (
                          <CardView
                            key={c.id || i}
                            card={c}
                            faceDown={c.faceDown}
                            isTrump={c.suit === trumpSuit}
                            size="md"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Live Card Beating Pairs Preview when player is responding */}
              {canInteract && phase === 'response' && !isChainMode && responseMatchPairs.length > 0 && (
                <div className="mt-3 p-2 bg-neutral-900/90 border border-neutral-700 rounded-xl shadow-lg flex flex-col items-center gap-1.5 text-xs">
                  <div className="flex items-center gap-2 text-neutral-300 font-semibold">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Соответствие карт:</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {responseMatchPairs.map((pair, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                          pair.beats
                            ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                            : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                        }`}
                      >
                        <span className="font-bold">
                          {SUIT_NAMES[pair.lead.suit].symbol}
                          {pair.lead.rank}
                        </span>
                        <span className="text-neutral-500">→</span>
                        <span className="font-bold">
                          {SUIT_NAMES[pair.response.suit].symbol}
                          {pair.response.rank}
                        </span>
                        {pair.beats ? (
                          <span className="text-[10px] text-emerald-400 font-black">
                            (Бьёт ✓)
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-black">
                            (Сброс ✗)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Player Trick Pile (Clickable to view tricks) */}
            <div
              onClick={() => openTricksViewer('player')}
              title="Нажмите, чтобы просмотреть свои взятки"
              className="hidden sm:flex flex-col items-center gap-2 cursor-pointer group"
            >
              <div className="relative w-14 h-20 rounded border border-white/20 bg-emerald-950/40 flex items-center justify-center shadow-inner group-hover:border-amber-400 transition">
                {playerTricks.length > 0 ? (
                  <div className="relative">
                    <CardView faceDown size="sm" className="w-14 h-20" />
                    <span className="absolute -bottom-2 -right-2 bg-amber-500 text-neutral-950 font-black text-[10px] px-1.5 py-0.5 rounded-full shadow">
                      {playerTricks.length}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-emerald-400/40 uppercase font-bold text-center">
                    Ваши взятки
                  </span>
                )}
              </div>
              <span className="text-xs text-emerald-200/80 font-bold flex items-center gap-1">
                <Eye className="w-3 h-3 text-emerald-400" />
                Взяток: {playerTricks.length / 2}
              </span>
            </div>
          </div>

          {/* Action Controls & Combinations Area */}
          <div className="w-full flex flex-col items-center gap-2.5 z-20 mb-2">
            {/* Quick Combinations Bar (Bura, Moscow, Molodka) */}
            {currentCombos.length > 0 && phase !== 'evaluating' && canInteract && (
              <div className="flex flex-wrap items-center justify-center gap-2 animate-bounce">
                {currentCombos.map((combo) => (
                  <button
                    key={combo.type}
                    onClick={() => declareCombination(activePlayer, combo)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-neutral-950 font-black text-xs sm:text-sm shadow-xl hover:brightness-110 active:scale-95 transition border border-amber-300 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-900" />
                    Объявить «{combo.name}»!
                  </button>
                ))}
              </div>
            )}

            {/* Validation & Guide Hint */}
            {canInteract && validationHint && (
              <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-700 text-neutral-300 shadow">
                {isSelectionValidLead || isSelectionValidResponse ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{validationHint}</span>
              </div>
            )}

            {/* Interactive Turn Action Buttons */}
            {canInteract && (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
                {/* 6-Card Chain Battling Phase Controls */}
                {isChainMode ? (
                  <>
                    {/* Attack stage: either initial attack or after defending */}
                    {(!chainBattle?.active || chainBattle.stage === 'attack') && (
                      <button
                        onClick={() =>
                          chainBattle?.stage === 'attack'
                            ? chainBattleAttack()
                            : playerLead()
                        }
                        disabled={!isSelectionValidLead}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition active:scale-95 cursor-pointer ${
                          isSelectionValidLead
                            ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/30'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                        }`}
                      >
                        Сходить в атаку{' '}
                        {selectedCardIds.length > 0
                          ? `(${selectedCardIds.length})`
                          : ''}
                      </button>
                    )}

                    {/* Defend stage: player must beat the incoming attack or surrender */}
                    {chainBattle?.active && chainBattle.stage === 'defend' && (
                      <>
                        <button
                          onClick={() => chainBattleDefend()}
                          disabled={!isSelectionValidResponse}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition active:scale-95 cursor-pointer ${
                            isSelectionValidResponse
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/30'
                              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                          }`}
                        >
                          Побить ({chainBattle.requiredSurrenderCount || 1})
                        </button>

                        <button
                          onClick={() => chainBattleSurrender()}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-red-950/70 hover:bg-red-900 border border-red-500/50 text-red-300 transition active:scale-95 cursor-pointer"
                        >
                          Сдаться (отдать{' '}
                          {chainBattle.requiredSurrenderCount || 1}{' '}
                          {chainBattle.requiredSurrenderCount === 1
                            ? 'карту'
                            : 'карт'}
                          )
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {/* Standard Leading Phase */}
                    {phase === 'lead' && (
                      <button
                        onClick={() => playerLead()}
                        disabled={!isSelectionValidLead}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition active:scale-95 cursor-pointer ${
                          isSelectionValidLead
                            ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/30'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                        }`}
                      >
                        Сходить{' '}
                        {selectedCardIds.length > 0
                          ? `(${selectedCardIds.length} ${
                              selectedCardIds.length === 1 ? 'картой' : 'картами'
                            })`
                          : ''}
                      </button>
                    )}

                    {/* Standard Responding Phase */}
                    {phase === 'response' && (
                      <>
                        <button
                          onClick={() => playerRespond()}
                          disabled={!isSelectionValidResponse}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition active:scale-95 cursor-pointer ${
                            isSelectionValidResponse
                              ? canSelectedCardsBeat
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/30'
                                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                          }`}
                        >
                          {canSelectedCardsBeat
                            ? `Побить (${leadCount})`
                            : `Сбросить (${leadCount})`}
                        </button>

                        {/* Face-down discard toggle */}
                        <button
                          onClick={() => setDiscardFaceDown(!discardFaceDown)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            discardFaceDown
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                              : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                          }`}
                          title="Сбросить карты рубашкой вверх (соперник не узнает номиналы)"
                        >
                          {discardFaceDown ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                              <span>В закрытую</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5 text-neutral-400" />
                              <span>В открытую</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* Reset Selection Button */}
                {selectedCardIds.length > 0 && (
                  <button
                    onClick={clearSelection}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white bg-neutral-800/60 hover:bg-neutral-800 transition cursor-pointer"
                  >
                    Сброс
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom Area: Player Hand & Status */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 z-10 px-2">
            {/* Player Info Badge */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neutral-900 border-2 ${
                  phase === 'evaluating' && evaluatingWinner === 'player'
                    ? 'border-amber-300 ring-4 ring-amber-400 ring-offset-2 ring-offset-neutral-950 animate-pulse'
                    : 'border-amber-400'
                } flex items-center justify-center text-amber-300 font-serif font-black shadow-lg`}
              >
                {isOnline ? '👤' : isHotseat ? (isPlayer1Active ? 'И1' : 'И2') : 'ВЫ'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm sm:text-base text-white">
                    {playerName}
                  </span>
                  {isTeamMode && (
                    <span className="text-[10px] bg-blue-600/30 text-blue-300 border border-blue-500/40 px-1 rounded font-bold">
                      🔵 Команда 1
                    </span>
                  )}
                  {canInteract && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold animate-pulse">
                      Ваш ход
                    </span>
                  )}
                </div>
                <div className="text-xs text-emerald-200/90 flex items-center gap-2">
                  <span>
                    Взяток:{' '}
                    {isPlayer1Active ? playerTricks.length : opponentTricks.length} карт
                  </span>
                  {settings.showScoreHelper && (
                    <span className="text-amber-300 font-mono font-bold">
                      {isTeamMode
                        ? `(Очки команды 1: ${team1Points})`
                        : `(Очки: ${isPlayer1Active ? playerTricksPoints : opponentTricksPoints})`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Active Player Hand Cards */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 my-1">
              {activeHand.map((c) => {
                const isSelected = selectedCardIds.includes(c.id)
                const isTrump = c.suit === trumpSuit

                // Pair beat preview badge on response card
                let beatsBadge: 'beats' | 'fails' | undefined = undefined
                if (phase === 'response') {
                  const match = responseMatchPairs.find((m) => m.response.id === c.id)
                  if (match) {
                    beatsBadge = match.beats ? 'beats' : 'fails'
                  }
                }

                const handleCardClick = () => {
                  if (!canInteract) return
                  toggleSelectCard(c.id)
                }

                return (
                  <div key={c.id} className="transition-transform duration-200">
                    <CardView
                      card={c}
                      isSelected={isSelected}
                      isTrump={isTrump}
                      isPlayable={canInteract}
                      beatsBadge={beatsBadge}
                      onClick={handleCardClick}
                      size="md"
                    />
                  </div>
                )
              })}
            </div>

            {/* Mobile Player Trick Counter */}
            <div
              onClick={() => openTricksViewer(isPlayer1Active ? 'player' : 'opponent')}
              className="sm:hidden text-xs text-emerald-300 font-bold underline cursor-pointer"
            >
              Взятки:{' '}
              {isPlayer1Active ? playerTricks.length : opponentTricks.length} карт
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info / Status bar */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-2 flex items-center justify-between text-[11px] text-neutral-500">
        <div>
          Классическая карточная игра «Бура» • 36 карт • Туз 11, Десятка 10, К 4, Д 3, В 2
        </div>
        <div className="hidden sm:block">
          Цель: набрать больше очков из 120 к концу раздачи или собрать Буру
        </div>
      </footer>
    </div>
  )
}

import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import {
  X,
  Trophy,
  BookOpen,
  Settings as SettingsIcon,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Flame,
  Eye,
  Layers,
} from 'lucide-react'
import type { Card, GameRuleType, GameSettings, MatchScore, PlayerId, RoundResult, Suit, Trick } from '../game/types'
import { CardView } from './CardView'

export const RulesModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-amber-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl text-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold font-serif text-amber-300">
              Правила игры «Бура»
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-neutral-300 leading-relaxed custom-scrollbar">
          {/* Goal */}
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/20">
            <h3 className="font-bold text-amber-300 text-base mb-1">Цель игры</h3>
            <p>
              Собрать как можно больше очков во взятках к концу раздачи (всего в колоде 120 очков,
              для победы нужно набрать больше соперника — от 61 очка), либо собрать победную
              комбинацию карт («Бура» — 4 козыря или «Москва» — 4 туза). Победитель раздачи получает ровно 1 балл в матче.
            </p>
          </div>

          {/* Cards & Values */}
          <div>
            <h3 className="font-bold text-white text-base mb-2">Колода и стоимость карт</h3>
            <p className="mb-3 text-neutral-400">
              Игра ведётся колодой из 36 карт. Старшинство при побитии: 
              <span className="text-amber-400 font-bold ml-1">Туз &gt; 10 &gt; Король &gt; Дама &gt; Валет &gt; 9 &gt; 8 &gt; 7 &gt; 6</span>.
              (Внимание: 10 старше Короля!).
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2 bg-neutral-800/80 rounded border border-neutral-700">
                <div className="font-black text-amber-300 text-base">Туз (Т)</div>
                <div className="text-emerald-400 font-bold">11 очков</div>
              </div>
              <div className="p-2 bg-neutral-800/80 rounded border border-neutral-700">
                <div className="font-black text-amber-300 text-base">10</div>
                <div className="text-emerald-400 font-bold">10 очков</div>
              </div>
              <div className="p-2 bg-neutral-800/80 rounded border border-neutral-700">
                <div className="font-black text-white text-base">Король (К)</div>
                <div className="text-neutral-300 font-bold">4 очка</div>
              </div>
              <div className="p-2 bg-neutral-800/80 rounded border border-neutral-700">
                <div className="font-black text-white text-base">Дама (Д)</div>
                <div className="text-neutral-300 font-bold">3 очка</div>
              </div>
              <div className="p-2 bg-neutral-800/80 rounded border border-neutral-700">
                <div className="font-black text-white text-base">Валет (В)</div>
                <div className="text-neutral-300 font-bold">2 очка</div>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-2 text-center">
              Карты 9, 8, 7 и 6 дают <strong className="text-neutral-400">0 очков</strong>. Всего в колоде 120 очков.
            </p>
          </div>

          {/* Gameplay & Leading */}
          <div className="space-y-2">
            <h3 className="font-bold text-white text-base">Режимы и правила игры</h3>
            <ul className="list-disc list-inside space-y-2 text-neutral-300">
              <li>
                <strong className="text-amber-300">По 4 карты на руках:</strong> в классической Буре каждому игроку сдаётся по 4 карты. Открывается козырь. Добор после каждой взятки до 4 карт.
              </li>
              <li>
                <strong className="text-amber-300">Режим 1 на 1 «Перепалка» (по 6 карт):</strong> игрокам сдается по 6 карт. Игрок заходит с 1 карты. Соперник может побить её своей картой и сразу скинуть встречную карту (атаку), которую уже должен бить первый игрок. Перепалка продолжается, пока один из игроков не сможет или не захочет бить и <strong className="text-red-300">сдаётся</strong>. Тогда все карты раздачи забирает победитель!
              </li>
              <li>
                <strong className="text-amber-300">Игра на 2, 3 и 4 человека:</strong>
                <div className="pl-4 mt-1 space-y-1 text-xs text-neutral-400">
                  <p>• <strong>3 игрока:</strong> каждый сам за себя (по 4 карты).</p>
                  <p>• <strong>4 игрока (Каждый за себя):</strong> индивидуальная борьба за взятки.</p>
                  <p>• <strong>4 игрока (2 на 2 Командная):</strong> игроки, сидящие напротив друг друга, играют в одной команде (Команда 1 vs Команда 2). Очки и взятки суммируются!</p>
                </div>
              </li>
              <li>
                <strong className="text-white">Тайна очков:</strong> очки соперников во время раздачи скрыты, чтобы исключить подсказки. Считать взятки нужно самостоятельно!
              </li>
            </ul>
          </div>

          {/* Combinations */}
          <div>
            <h3 className="font-bold text-white text-base mb-2">Особые комбинации (4 карты)</h3>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">Бура:</span> 4 козырные карты на руках. Немедленный безоговорочный выигрыш всей сдачи!
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                <Flame className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-red-300">Москва:</span> 4 туза на руках. Немедленный выигрыш сдачи!
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
                <Trophy className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-300">Молодка (Письмо):</span> 4 карты одной не козырной масти. Право внеочередного захода всеми четырьмя картами!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-neutral-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg transition"
          >
            Понятно, к игре!
          </button>
        </div>
      </div>
    </div>
  )
}

export const SettingsModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  settings: GameSettings
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void
  onRestartMatch: (customRule?: GameRuleType) => void
  onOpenOnlineLobby?: () => void
}> = ({ isOpen, onClose, settings, onUpdateSettings, onRestartMatch, onOpenOnlineLobby }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-amber-500/30 rounded-2xl max-w-md w-full shadow-2xl text-neutral-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-amber-300">Настройки игры</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-sm">
          {/* Game Mode */}
          <div>
            <label className="block text-xs uppercase font-bold tracking-wider text-neutral-400 mb-2">
              Режим игры
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <button
                onClick={() => onUpdateSettings({ mode: 'vs_ai' })}
                className={`py-2 px-2 rounded-lg font-medium border text-xs sm:text-sm text-center transition ${
                  settings.mode === 'vs_ai'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                Против бота
              </button>
              <button
                onClick={() => onUpdateSettings({ mode: 'hotseat' })}
                className={`py-2 px-2 rounded-lg font-medium border text-xs sm:text-sm text-center transition ${
                  settings.mode === 'hotseat'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                Вдвоём (экран)
              </button>
              <button
                onClick={() => {
                  onClose()
                  onOpenOnlineLobby?.()
                }}
                className={`py-2 px-2 rounded-lg font-medium border text-xs sm:text-sm text-center transition ${
                  settings.mode === 'online'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                Онлайн 🌐
              </button>
            </div>
          </div>

          {/* Game Rules / Player Count & Variant */}
          <div>
            <label className="block text-xs uppercase font-bold tracking-wider text-neutral-400 mb-2">
              Правила и число игроков
            </label>
            <div className="space-y-1.5">
              {[
                {
                  id: 'duel_classic_4',
                  title: '1 на 1 — Классика (по 4 карты)',
                  desc: 'Обычные правила Буры, сдача по 4 карты каждому',
                },
                {
                  id: 'duel_chain_6',
                  title: '1 на 1 — Перепалка (по 6 карт)',
                  desc: 'По 6 карт, перебивание и ответная атака до сдачи',
                },
                {
                  id: 'ffa_3',
                  title: '3 игрока — Все сами за себя (по 4 карты)',
                  desc: 'Игра втроём, каждый сам за себя',
                },
                {
                  id: 'ffa_4',
                  title: '4 игрока — Все сами за себя (по 4 карты)',
                  desc: 'Игра вчетвером, индивидуальный зачёт',
                },
                {
                  id: 'teams_4',
                  title: '4 игрока — 2 на 2 Командная (по 4 карты)',
                  desc: 'Игроки напротив — в одной команде, общий счёт',
                },
              ].map((rule) => (
                <button
                  key={rule.id}
                  onClick={() => {
                    onUpdateSettings({ ruleType: rule.id as any })
                    onRestartMatch(rule.id as any)
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition flex flex-col gap-0.5 cursor-pointer ${
                    (settings.ruleType || 'duel_classic_4') === rule.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                      : 'bg-neutral-800/60 border-neutral-700/80 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <span className="font-bold text-neutral-200">{rule.title}</span>
                  <span className="text-[11px] text-neutral-400">{rule.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Difficulty */}
          {settings.mode === 'vs_ai' && (
            <div>
              <label className="block text-xs uppercase font-bold tracking-wider text-neutral-400 mb-2">
                Сложность бота
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as const).map((diff) => {
                  const labels = {
                    easy: 'Новичок',
                    medium: 'Бывалый',
                    hard: 'Шулер',
                  }
                  return (
                    <button
                      key={diff}
                      onClick={() => onUpdateSettings({ difficulty: diff })}
                      className={`py-2 px-2 rounded-lg text-xs font-medium border text-center transition ${
                        settings.difficulty === diff
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                      }`}
                    >
                      {labels[diff]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Match Target */}
          <div>
            <label className="block text-xs uppercase font-bold tracking-wider text-neutral-400 mb-2">
              Цель матча (победных очков)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[1, 6].map((pts) => (
                <button
                  key={pts}
                  onClick={() => onUpdateSettings({ matchTarget: pts })}
                  className={`py-2 px-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                    settings.matchTarget === pts
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  {pts === 1 ? '1 (Быстрая)' : `${pts} очков (Стандарт)`}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-neutral-300">Помощник подсчёта очков</span>
              <input
                type="checkbox"
                checked={settings.showScoreHelper}
                onChange={(e) => onUpdateSettings({ showScoreHelper: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-neutral-300">Звуковые эффекты</span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-neutral-300">Тёмное сукно стола</span>
              <input
                type="checkbox"
                checked={settings.darkFelt}
                onChange={(e) => onUpdateSettings({ darkFelt: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-neutral-300">Ускоренные анимации</span>
              <input
                type="checkbox"
                checked={settings.fastAnimations}
                onChange={(e) => onUpdateSettings({ fastAnimations: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                onRestartMatch()
                onClose()
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-700/50 rounded-xl font-bold transition"
            >
              <RotateCcw className="w-4 h-4" />
              Начать матч заново
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const TricksViewerModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  cards: Card[]
  playerName: string
  trumpSuit: Suit
  totalPoints: number
  hidePoints?: boolean
}> = ({ isOpen, onClose, cards, playerName, trumpSuit, totalPoints, hidePoints }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl max-w-xl w-full shadow-2xl text-neutral-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-amber-300">
              Взятки: {playerName} ({cards.length} карт
              {!hidePoints ? `, ${totalPoints} очков` : ''})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {cards.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-sm">
              Пока нет ни одной взятой карты
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5 justify-center">
              {cards.map((c, i) => (
                <div key={c.id || i} className="scale-90 sm:scale-100">
                  <CardView
                    card={c}
                    isTrump={c.suit === trumpSuit}
                    size="sm"
                    badge={hidePoints ? undefined : `${c.points}п`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

export const HotseatCurtainModal: React.FC<{
  isOpen: boolean
  activePlayer: PlayerId
  onReady: () => void
}> = ({ isOpen, activePlayer, onReady }) => {
  if (!isOpen) return null

  const isPlayer1 = activePlayer === 'player'
  const title = isPlayer1 ? 'Ход Игрока 1' : 'Ход Игрока 2'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-900 border-2 border-amber-500/50 rounded-3xl max-w-sm w-full p-6 text-center space-y-5 shadow-2xl text-neutral-200">
        <div className="w-16 h-16 mx-auto rounded-full bg-neutral-950 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-lg">
          {isPlayer1 ? '👤' : '👥'}
        </div>

        <div>
          <h2 className="text-2xl font-black font-serif text-amber-300">{title}</h2>
          <p className="text-xs text-neutral-400 mt-2">
            Передайте экран нужному игроку. Карты скрыты для сохранения тайны руки.
          </p>
        </div>

        <button
          onClick={onReady}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black rounded-xl shadow-lg transition active:scale-95 text-sm"
        >
          Я готов, открыть карты!
        </button>
      </div>
    </div>
  )
}

export const RoundEndModal: React.FC<{
  isOpen: boolean
  roundResult: RoundResult | null
  matchScore: MatchScore
  playerTricks: Card[]
  opponentTricks: Card[]
  trumpSuit: Suit
  onNextRound: () => void
}> = ({ isOpen, roundResult, matchScore, playerTricks, opponentTricks, trumpSuit, onNextRound }) => {
  if (!isOpen || !roundResult) return null

  const isTeamMatch = roundResult.winnerTeam !== undefined
  const isPlayerWinner = isTeamMatch
    ? roundResult.winnerTeam === 1 || roundResult.winner === 'player'
    : roundResult.winner === 'player'
  const isDraw = roundResult.winner === 'draw'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl max-w-lg w-full shadow-2xl text-neutral-200 overflow-hidden text-center flex flex-col max-h-[90vh]">
        {/* Banner */}
        <div
          className={`py-5 px-4 ${
            isPlayerWinner
              ? 'bg-gradient-to-b from-amber-600/30 to-transparent'
              : isDraw
              ? 'bg-gradient-to-b from-blue-600/30 to-transparent'
              : 'bg-gradient-to-b from-red-600/30 to-transparent'
          }`}
        >
          <div className="w-14 h-14 mx-auto rounded-full bg-neutral-950 border-2 border-amber-400 flex items-center justify-center shadow-lg mb-2">
            {isPlayerWinner ? (
              <Trophy className="w-7 h-7 text-amber-400 animate-bounce" />
            ) : isDraw ? (
              <RotateCcw className="w-7 h-7 text-blue-400" />
            ) : (
              <ShieldAlert className="w-7 h-7 text-red-400" />
            )}
          </div>
          <h2 className="text-2xl font-black font-serif text-white">
            {isPlayerWinner
              ? isTeamMatch
                ? 'Победа Команды 1!'
                : 'Победа в сдаче!'
              : isDraw
              ? 'Ничья (Свара)!'
              : isTeamMatch
              ? 'Победа Команды 2'
              : 'Сдача проиграна'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 px-4">{roundResult.reason}</p>
        </div>

        {/* Scores & Showdown */}
        <div className="px-6 py-3 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Match Score progression */}
          <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-500/20">
            <div className="text-xs text-amber-400 uppercase tracking-wider font-bold mb-1">
              {isTeamMatch ? 'Счёт команд' : 'Счёт матча'} (до {matchScore.target})
            </div>
            <div className="text-3xl font-black font-serif text-white tracking-widest">
              {isTeamMatch
                ? `${matchScore.team1 || 0} : ${matchScore.team2 || 0}`
                : `${matchScore.player} : ${matchScore.opponent}`}
            </div>
          </div>

          {/* Cards Reveal for Both Players */}
          <div className="space-y-3 text-left">
            <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-emerald-400">
                  {isTeamMatch ? 'Взятки Команды 1' : 'Взятки Игрока'} ({roundResult.scorePlayer} очков)
                </span>
                <span className="text-neutral-500">{playerTricks.length} карт</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                {playerTricks.map((c, i) => (
                  <div key={c.id || i} className="scale-75 origin-top-left -mr-4 -mb-6">
                    <CardView card={c} isTrump={c.suit === trumpSuit} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-amber-400">
                  {isTeamMatch ? 'Взятки Команды 2' : 'Взятки Соперника'} ({roundResult.scoreOpponent} очков)
                </span>
                <span className="text-neutral-500">{opponentTricks.length} карт</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                {opponentTricks.map((c, i) => (
                  <div key={c.id || i} className="scale-75 origin-top-left -mr-4 -mb-6">
                    <CardView card={c} isTrump={c.suit === trumpSuit} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-neutral-950/80 border-t border-neutral-800">
          <button
            onClick={onNextRound}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black rounded-xl shadow-lg transition active:scale-95 text-sm cursor-pointer"
          >
            Следующая сдача
          </button>
        </div>
      </div>
    </div>
  )
}

export const MatchEndModal: React.FC<{
  isOpen: boolean
  matchScore: MatchScore
  onRestartMatch: () => void
  isTeamMode?: boolean
}> = ({ isOpen, matchScore, onRestartMatch, isTeamMode = false }) => {
  const isTeamMatch = isTeamMode && matchScore.team1 !== undefined && matchScore.team2 !== undefined
  const isPlayerWinner = isTeamMatch
    ? (matchScore.team1 || 0) >= matchScore.target
    : matchScore.player >= matchScore.target

  useEffect(() => {
    if (isOpen && isPlayerWinner) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      })
    }
  }, [isOpen, isPlayerWinner])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-900 border-2 border-amber-400 rounded-3xl max-w-md w-full shadow-2xl text-neutral-200 overflow-hidden text-center p-6 space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-amber-950/60 border-2 border-amber-400 flex items-center justify-center shadow-xl">
          <Trophy className="w-10 h-10 text-amber-300 animate-pulse" />
        </div>

        <div>
          <h2 className="text-3xl font-black font-serif text-amber-300">
            {isPlayerWinner
              ? isTeamMatch
                ? 'Команда 1 победила в матче!'
                : 'Вы победили в матче!'
              : isTeamMatch
              ? 'Команда 2 выиграла матч!'
              : 'Соперник выиграл матч!'}
          </h2>
          <p className="text-neutral-400 text-sm mt-1">
            Игра завершена со счётом{' '}
            {isTeamMatch
              ? `${matchScore.team1 || 0} : ${matchScore.team2 || 0}`
              : `${matchScore.player} : ${matchScore.opponent}`}{' '}
            (цель: {matchScore.target})
          </p>
        </div>

        <div className="py-4 px-6 bg-neutral-950/80 rounded-2xl border border-neutral-800">
          <div className="text-4xl font-serif font-black tracking-widest text-white">
            {isTeamMatch
              ? `${matchScore.team1 || 0} — ${matchScore.team2 || 0}`
              : `${matchScore.player} — ${matchScore.opponent}`}
          </div>
        </div>

        <button
          onClick={onRestartMatch}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-neutral-950 font-black rounded-xl shadow-xl transition active:scale-95 text-base cursor-pointer"
        >
          Сыграть новый матч
        </button>
      </div>
    </div>
  )
}

export const LastTrickModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  lastTrick: Trick | null
  trumpSuit: Suit
  opponentName: string
}> = ({ isOpen, onClose, lastTrick, trumpSuit, opponentName }) => {
  if (!isOpen || !lastTrick) return null

  const isPlayerWinner = lastTrick.winner === 'player'
  const leaderName = lastTrick.leadPlayer === 'player' ? 'Игрок' : opponentName
  const winnerName = isPlayerWinner ? 'Игрок' : opponentName

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl max-w-lg w-full shadow-2xl text-neutral-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-amber-300">
              Предыдущая взятка (+{lastTrick.points} очков)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
            <span className="text-xs uppercase font-bold tracking-wider text-neutral-400">
              Результат взятки:
            </span>
            <div className={`text-base font-black mt-1 ${isPlayerWinner ? 'text-emerald-400' : 'text-amber-400'}`}>
              Взятку забрал {winnerName} {lastTrick.beaten ? '(побил заход)' : '(заход не побит)'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 flex flex-col items-center">
              <span className="text-xs font-bold text-neutral-400 mb-2">
                Заход ({leaderName})
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                {lastTrick.leadCards.map((c, i) => (
                  <CardView key={c.id || i} card={c} isTrump={c.suit === trumpSuit} size="sm" />
                ))}
              </div>
            </div>

            <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 flex flex-col items-center">
              <span className="text-xs font-bold text-neutral-400 mb-2">
                Ответ ({lastTrick.leadPlayer === 'player' ? opponentName : 'Игрок'})
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                {lastTrick.responseCards.map((c, i) => (
                  <CardView key={c.id || i} card={c} isTrump={c.suit === trumpSuit} size="sm" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg transition"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  )
}

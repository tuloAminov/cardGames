import React, { useState } from 'react'
import type { SpadesCard, SpadesGameConfig, SpadesRoundSummary } from './types'
import { SpadesCardView } from './SpadesCardView'
import {
  X,
  Trophy,
  Volume2,
  VolumeX,
  HelpCircle,
  History,
  Settings,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Award,
} from 'lucide-react'

// ==========================================
// 1. BIDDING MODAL
// ==========================================
interface BiddingModalProps {
  isOpen: boolean
  hand: SpadesCard[]
  partnerBid: number | null
  opponentsBids: (number | null)[]
  onSubmitBid: (bid: number) => void
  nilPoints: number
}

export const BiddingModal: React.FC<BiddingModalProps> = ({
  isOpen,
  hand,
  partnerBid,
  opponentsBids,
  onSubmitBid,
  nilPoints,
}) => {
  const [selectedBid, setSelectedBid] = useState<number>(3)

  if (!isOpen) return null

  // Quick stats from hand to help bidding
  const spadeCount = hand.filter((c) => c.suit === '♠').length
  const highCardsCount = hand.filter((c) => c.rank >= 13).length // Kings and Aces

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col gap-5 text-neutral-100">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">♠️</span>
            <div>
              <h2 className="text-xl font-bold text-amber-400">Сделайте вашу ставку</h2>
              <p className="text-xs text-neutral-400">Сколько взяток вы обязуетесь взять в этом раунде?</p>
            </div>
          </div>
          <div className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300">
            Раунд: 13 взяток
          </div>
        </div>

        {/* Hand Cards Preview */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span>Ваши карты на руках (13 шт.):</span>
            <span>
              Пик: <b className="text-sky-400">{spadeCount}</b> | Тузов/Королей: <b className="text-amber-400">{highCardsCount}</b>
            </span>
          </div>
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto p-2 bg-neutral-950/70 rounded-2xl border border-neutral-800 max-w-full">
            {hand.map((c) => (
              <SpadesCardView key={c.id} card={c} size="sm" />
            ))}
          </div>
        </div>

        {/* Other players' bids summary */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-neutral-800/60 p-2.5 rounded-xl border border-neutral-700/50 flex flex-col items-center">
            <span className="text-neutral-400">Запад (соперник):</span>
            <span className="font-bold text-amber-400">{opponentsBids[0] !== null ? opponentsBids[0] : '—'}</span>
          </div>
          <div className="bg-sky-950/40 p-2.5 rounded-xl border border-sky-500/30 flex flex-col items-center">
            <span className="text-sky-300">Партнёр (Север):</span>
            <span className="font-bold text-sky-400">{partnerBid !== null ? partnerBid : '—'}</span>
          </div>
          <div className="bg-neutral-800/60 p-2.5 rounded-xl border border-neutral-700/50 flex flex-col items-center">
            <span className="text-neutral-400">Восток (соперник):</span>
            <span className="font-bold text-amber-400">{opponentsBids[1] !== null ? opponentsBids[1] : '—'}</span>
          </div>
        </div>

        {/* Bid selection grid */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-neutral-300">Выберите число взяток (0 = Nil):</span>
          <div className="grid grid-cols-7 sm:grid-cols-7 gap-1.5">
            <button
              onClick={() => setSelectedBid(0)}
              className={`col-span-2 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm border transition ${
                selectedBid === 0
                  ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/30 ring-2 ring-rose-400'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
              }`}
            >
              0 (Nil / 0 взяток)
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((bid) => (
              <button
                key={bid}
                onClick={() => setSelectedBid(bid)}
                className={`py-2 rounded-xl font-bold text-sm sm:text-base border transition ${
                  selectedBid === bid
                    ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400 scale-105'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                }`}
              >
                {bid}
              </button>
            ))}
          </div>
        </div>

        {/* Selected info notice */}
        <div className="p-3 rounded-2xl bg-black/40 border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2">
          {selectedBid === 0 ? (
            <>
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <span>
                <b>Ставка Nil:</b> вы обязуетесь не взять ни одной взятки. Успех: <b className="text-emerald-400">+{nilPoints}</b> очков, срыв: <b className="text-rose-400">−{nilPoints}</b> очков!
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                Ваша ставка: <b>{selectedBid}</b>. Вместе со ставкой партнёра ({partnerBid ?? 0}) контракт команды составит{' '}
                <b>{selectedBid + (partnerBid ?? 0)}</b> взяток.
              </span>
            </>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => onSubmitBid(selectedBid)}
          className="w-full py-3.5 rounded-2xl font-bold text-base bg-amber-500 hover:bg-amber-400 active:scale-98 text-neutral-950 shadow-xl shadow-amber-500/25 transition cursor-pointer"
        >
          Подтвердить ставку ({selectedBid === 0 ? 'Nil' : `${selectedBid} взяток`})
        </button>
      </div>
    </div>
  )
}

// ==========================================
// 2. ROUND END SUMMARY MODAL
// ==========================================
interface RoundEndModalProps {
  isOpen: boolean
  summary: SpadesRoundSummary | null
  onNextRound: () => void
  isGameOver: boolean
}

export const RoundEndModal: React.FC<RoundEndModalProps> = ({
  isOpen,
  summary,
  onNextRound,
  isGameOver,
}) => {
  if (!isOpen || !summary || isGameOver) return null

  const t0 = summary.team0Score
  const t1 = summary.team1Score

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col gap-5 text-neutral-100">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Итоги раунда {summary.roundNumber}</h2>
              <p className="text-xs text-neutral-400">Подсчёт контрактов, мешков и ставок Nil</p>
            </div>
          </div>
        </div>

        {/* Teams comparison cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Team 0 (You + Partner) */}
          <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${t0.contractMade ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-rose-950/30 border-rose-500/40'}`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold text-sm text-sky-300">Ваша команда (Вы + Партнёр)</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${t0.contractMade ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {t0.contractMade ? 'Контракт взят!' : 'Провал контракта'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Заявка / Взято:</span>
                <span className="font-bold">{t0.contractBid} / {t0.tricksWon} взяток</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Очки за контракт:</span>
                <span className={t0.contractPoints >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {t0.contractPoints > 0 ? `+${t0.contractPoints}` : t0.contractPoints}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Овертрики (мешки):</span>
                <span>+{t0.overtricks} (всего: {t0.bagsAfter})</span>
              </div>
              {t0.bagPenalty > 0 && (
                <div className="flex justify-between text-rose-400 font-bold">
                  <span>Штраф за перебор мешков:</span>
                  <span>−{t0.bagPenalty}</span>
                </div>
              )}
              {t0.nilPointsTotal !== 0 && (
                <div className="flex justify-between font-bold">
                  <span>Ставка Nil:</span>
                  <span className={t0.nilPointsTotal > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {t0.nilPointsTotal > 0 ? `+${t0.nilPointsTotal}` : t0.nilPointsTotal}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-2 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Итого за раунд:</span>
              <span className="text-lg font-black text-amber-400">
                {t0.totalRoundPoints > 0 ? `+${t0.totalRoundPoints}` : t0.totalRoundPoints} очков
              </span>
            </div>
            <div className="text-xs text-right text-neutral-400">
              Общий счёт команды: <b>{t0.scoreAfter}</b>
            </div>
          </div>

          {/* Team 1 (Opponents) */}
          <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${t1.contractMade ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-rose-950/30 border-rose-500/40'}`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold text-sm text-amber-300">Соперники (Запад + Восток)</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${t1.contractMade ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {t1.contractMade ? 'Контракт взят!' : 'Провал контракта'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Заявка / Взято:</span>
                <span className="font-bold">{t1.contractBid} / {t1.tricksWon} взяток</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Очки за контракт:</span>
                <span className={t1.contractPoints >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {t1.contractPoints > 0 ? `+${t1.contractPoints}` : t1.contractPoints}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Овертрики (мешки):</span>
                <span>+{t1.overtricks} (всего: {t1.bagsAfter})</span>
              </div>
              {t1.bagPenalty > 0 && (
                <div className="flex justify-between text-rose-400 font-bold">
                  <span>Штраф за перебор мешков:</span>
                  <span>−{t1.bagPenalty}</span>
                </div>
              )}
              {t1.nilPointsTotal !== 0 && (
                <div className="flex justify-between font-bold">
                  <span>Ставка Nil:</span>
                  <span className={t1.nilPointsTotal > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {t1.nilPointsTotal > 0 ? `+${t1.nilPointsTotal}` : t1.nilPointsTotal}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-2 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Итого за раунд:</span>
              <span className="text-lg font-black text-amber-400">
                {t1.totalRoundPoints > 0 ? `+${t1.totalRoundPoints}` : t1.totalRoundPoints} очков
              </span>
            </div>
            <div className="text-xs text-right text-neutral-400">
              Общий счёт команды: <b>{t1.scoreAfter}</b>
            </div>
          </div>
        </div>

        <button
          onClick={onNextRound}
          className="w-full py-3.5 rounded-2xl font-bold text-base bg-amber-500 hover:bg-amber-400 active:scale-98 text-neutral-950 shadow-xl shadow-amber-500/25 transition cursor-pointer"
        >
          Перейти к раунду {summary.roundNumber + 1}
        </button>
      </div>
    </div>
  )
}

// ==========================================
// 3. GAME OVER MODAL
// ==========================================
interface GameOverModalProps {
  isOpen: boolean
  winnerTeamId: (0 | 1) | null
  team0Score: number
  team1Score: number
  targetScore: number
  onPlayAgain: () => void
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winnerTeamId,
  team0Score,
  team1Score,
  targetScore,
  onPlayAgain,
}) => {
  if (!isOpen || winnerTeamId === null) return null

  const isPlayerWin = winnerTeamId === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center gap-5 text-neutral-100">
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl ${isPlayerWin ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-400' : 'bg-neutral-800 border border-neutral-700 text-neutral-400'}`}>
          {isPlayerWin ? <Trophy className="w-10 h-10 animate-bounce" /> : <Award className="w-10 h-10" />}
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {isPlayerWin ? 'Победа вашей команды!' : 'Победа соперников!'}
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Партия завершена (цель победы: {targetScore} очков).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          <div className={`p-4 rounded-2xl border ${isPlayerWin ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-neutral-800/60 border-neutral-700 text-neutral-300'}`}>
            <span className="text-xs block text-neutral-400">Ваша команда</span>
            <span className="text-2xl font-black">{team0Score}</span>
            <span className="text-[10px] block text-neutral-400">очков</span>
          </div>
          <div className={`p-4 rounded-2xl border ${!isPlayerWin ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-neutral-800/60 border-neutral-700 text-neutral-300'}`}>
            <span className="text-xs block text-neutral-400">Соперники</span>
            <span className="text-2xl font-black">{team1Score}</span>
            <span className="text-[10px] block text-neutral-400">очков</span>
          </div>
        </div>

        <button
          onClick={onPlayAgain}
          className="w-full py-3.5 rounded-2xl font-bold text-base bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-xl shadow-amber-500/25 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Сыграть новую партию
        </button>
      </div>
    </div>
  )
}

// ==========================================
// 4. RULES MODAL
// ==========================================
interface RulesModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SpadesRulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-neutral-900 border border-neutral-700 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col gap-4 text-neutral-100 overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">Правила игры «Пики» (Spades)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 text-xs sm:text-sm text-neutral-300 pr-1 custom-scrollbar">
          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800">
            <h3 className="font-bold text-amber-400 mb-1">1. Цель и состав игроков</h3>
            <p>
              В игре участвуют 4 игрока, разбитые на 2 команды партнёров напротив друг друга (Вы + Север против Запада и Востока). Колода — 52 карты (от 2 до Туза). Игра идёт до набора 250 или 500 очков.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800">
            <h3 className="font-bold text-amber-400 mb-1">2. Постоянный козырь — Пики (♠)</h3>
            <p>
              Масть ♠ (Пики) всегда является козырной. Старшинство карт: 2, 3, 4, 5, 6, 7, 8, 9, 10, Валет, Дама, Король, Туз.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800">
            <h3 className="font-bold text-amber-400 mb-1">3. Торговля (Ставки и Nil)</h3>
            <p>
              Перед началом розыгрыша каждый игрок заявляет, сколько взяток обязуется взять (от 1 до 13 или 0 — Nil). Ставки партнёров суммируются в командный контракт.
            </p>
            <p className="mt-1 text-sky-300">
              <b>Ставка Nil:</b> если игрок заявляет 0 и не берет взяток, команда получает +100 (или +50) очков. Если игрок берет хотя бы 1 взятку, ставка провалена и начисляется штраф −100 (или −50) очков.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800">
            <h3 className="font-bold text-amber-400 mb-1">4. Розыгрыш взяток</h3>
            <p>
              Игроки по очереди выкладывают по одной карте. Обязательно ходить в масть первой сыгранной карты. Если масти нет — можно сбросить любую карту или побить козырной пикой.
            </p>
            <p className="mt-1 text-amber-300">
              <b>Пики не сломаны (Spades not broken):</b> нельзя начинать взятку с пик, пока пики не были сыграны ранее в любой другой взятке, либо пока у игрока на руках не останутся только одни пики.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800">
            <h3 className="font-bold text-amber-400 mb-1">5. Очки и мешки (Sandbags)</h3>
            <p>
              Взятый контракт: +10 очков за каждую заявленную взятку плюс 1 очко за каждый овертрик («мешок»). Провал контракта: −10 очков за каждую заявленную взятку.
            </p>
            <p className="mt-1 text-rose-300">
              <b>Штраф за мешки:</b> когда команда накапливает 10 мешков (или 6 в короткой игре), со счёта списывается штраф −100 (или −50) очков!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 5. HISTORY MODAL
// ==========================================
interface HistoryModalProps {
  isOpen: boolean
  history: SpadesRoundSummary[]
  onClose: () => void
}

export const SpadesHistoryModal: React.FC<HistoryModalProps> = ({ isOpen, history, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[85vh] bg-neutral-900 border border-neutral-700 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col gap-4 text-neutral-100 overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">История сыгранных раундов</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 text-sm">
            Пока нет завершённых раундов. Сыграйте первый раунд!
          </div>
        ) : (
          <div className="overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {history.map((r) => (
              <div key={r.roundNumber} className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 font-bold text-neutral-300">
                  <span>Раунд {r.roundNumber}</span>
                  <span className="text-[11px] text-neutral-500">13 взяток</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-neutral-900 p-2 rounded-xl border border-neutral-800">
                    <span className="text-sky-300 font-semibold block">Ваша команда:</span>
                    <span>Контракт: {r.team0Score.contractBid} (взято {r.team0Score.tricksWon})</span>
                    <span className="block font-bold text-amber-400">Счёт: {r.team0Score.scoreAfter}</span>
                  </div>
                  <div className="bg-neutral-900 p-2 rounded-xl border border-neutral-800">
                    <span className="text-amber-300 font-semibold block">Соперники:</span>
                    <span>Контракт: {r.team1Score.contractBid} (взято {r.team1Score.tricksWon})</span>
                    <span className="block font-bold text-amber-400">Счёт: {r.team1Score.scoreAfter}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// 6. SETTINGS MODAL
// ==========================================
interface SettingsModalProps {
  isOpen: boolean
  config: SpadesGameConfig
  onUpdateConfig: (config: SpadesGameConfig) => void
  onClose: () => void
}

export const SpadesSettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  config,
  onUpdateConfig,
  onClose,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col gap-5 text-neutral-100">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">Настройки игры «Пики»</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800">
            <div className="flex items-center gap-2.5">
              {config.soundEnabled ? <Volume2 className="w-5 h-5 text-amber-400" /> : <VolumeX className="w-5 h-5 text-neutral-500" />}
              <span>Звуковые эффекты</span>
            </div>
            <button
              onClick={() => onUpdateConfig({ ...config, soundEnabled: !config.soundEnabled })}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer ${
                config.soundEnabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
            >
              {config.soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
          </div>

          {/* Animation Speed */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800">
            <span>Скорость анимации</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => onUpdateConfig({ ...config, animSpeed: 'normal' })}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer ${
                  config.animSpeed === 'normal' ? 'bg-amber-500 text-neutral-950 border-amber-400' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}
              >
                Обычная
              </button>
              <button
                onClick={() => onUpdateConfig({ ...config, animSpeed: 'fast' })}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer ${
                  config.animSpeed === 'fast' ? 'bg-amber-500 text-neutral-950 border-amber-400' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}
              >
                Быстрая
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-bold text-sm bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition cursor-pointer"
        >
          Закрыть
        </button>
      </div>
    </div>
  )
}

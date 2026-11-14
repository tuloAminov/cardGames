import React, { useState } from 'react'
import {
  Trophy,
  Play,
  Users,
  Shield,
  Zap,
  Sparkles,
  HelpCircle,
  Award,
  Flame,
  Layers,
} from 'lucide-react'
import { RulesModal } from './Modals'
import { SpadesRulesModal } from '../spades/SpadesModals'

interface GameHubProps {
  onSelectGame: (game: 'bura' | 'spades') => void
}

export const GameHub: React.FC<GameHubProps> = ({ onSelectGame }) => {
  const [isBuraRulesOpen, setIsBuraRulesOpen] = useState(false)
  const [isSpadesRulesOpen, setIsSpadesRulesOpen] = useState(false)

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0c] text-neutral-100 flex flex-col justify-between overflow-x-hidden select-none">
      {/* Background Ambient Lighting & Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Subtle Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* HEADER */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-neutral-950 font-black text-xl shadow-lg shadow-amber-500/25">
            ♠
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Карточный Клуб
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                Онлайн & ИИ
              </span>
            </h1>
            <p className="text-xs text-neutral-400">Коллекция классических карточных игр</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-400 bg-neutral-900/60 px-3 py-1.5 rounded-xl border border-neutral-800">
          <span>Доступно игр:</span>
          <b className="text-amber-400">2</b>
        </div>
      </header>

      {/* HERO SECTION & GAME SELECTION CARDS */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center justify-center gap-8">
        <div className="text-center max-w-2xl flex flex-col items-center gap-2">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Выберите карточную игру
          </h2>
          <p className="text-sm sm:text-base text-neutral-400">
            Играйте против умного искусственного интеллекта или сражайтесь с друзьями онлайн по ссылке
          </p>
        </div>

        {/* 2 MAIN GAME CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-4xl">
          {/* CARD 1: БУРА (31) */}
          <div className="group relative rounded-3xl bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 p-6 sm:p-8 flex flex-col justify-between gap-6 transition-all duration-300 shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1">
            {/* Top Badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Популярное • Мультиплеер
              </span>
              <span className="text-xs text-neutral-400 font-mono">Колода 36 карт</span>
            </div>

            {/* Game Info */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                  👑
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white group-hover:text-amber-400 transition">
                    Бура (Тридцать одно)
                  </h3>
                  <p className="text-xs text-neutral-400">Азартная игра на взятки и комбинации</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Традиционная карточная игра. Наберите 31 очко во взятках или объявите победную комбинацию («Бура», «Москва», «Молодка»). Доступны классический режим, <b>перепалка по 6 карт (пошаговое отбитие и атака)</b>, командный режим 2 на 2 и мультиплеер по сети.
              </p>

              {/* Features List */}
              <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400 mt-1">
                <div className="flex items-center gap-1.5 bg-neutral-950/60 p-2 rounded-xl border border-neutral-800/80">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>1 на 1 и до 4 игроков</span>
                </div>
                <div className="flex items-center gap-1.5 bg-neutral-950/60 p-2 rounded-xl border border-neutral-800/80">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Перепалка по 6 карт</span>
                </div>
                <div className="flex items-center gap-1.5 bg-neutral-950/60 p-2 rounded-xl border border-neutral-800/80">
                  <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Команды 2 на 2</span>
                </div>
                <div className="flex items-center gap-1.5 bg-neutral-950/60 p-2 rounded-xl border border-neutral-800/80">
                  <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>P2P Онлайн комнаты</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => onSelectGame('bura')}
                className="flex-1 py-3.5 px-5 rounded-2xl font-bold text-sm bg-amber-500 hover:bg-amber-400 active:scale-98 text-neutral-950 shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Играть в Буру
              </button>
              <button
                onClick={() => setIsBuraRulesOpen(true)}
                className="p-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition cursor-pointer"
                title="Правила игры Бура"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CARD 2: ПИКИ (SPADES) */}
          <div className="group relative rounded-3xl bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 p-6 sm:p-8 flex flex-col justify-between gap-6 transition-all duration-300 shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1">
            {/* Top Badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                Командная 2 на 2 • Классика
              </span>
              <span className="text-xs text-neutral-400 font-mono">Колода 52 карты</span>
            </div>

            {/* Game Info */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                  ♠️
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white group-hover:text-emerald-400 transition">
                    Пики (Spades)
                  </h3>
                  <p className="text-xs text-neutral-400">Тактическая командная карточная игра</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Популярнейшая мировая игра на взятки. Вы с партнёром сражаетесь против двух ИИ-соперников. Торгуйтесь перед раздачей, объявляйте контракт или рискуйте ставкой <b>Nil (0 взяток)</b>. Постоянный козырь — Пики (♠)!
              </p>

              {/* Features List */}
              <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400 mt-1">
                <div className="flex items-center gap-1.5 bg-neutral-950/60 p-2 rounded-xl border border-neutral-800/80">
                  <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Партнёрство 2 на 2</span>
                </div>
                <div className="flex items-center gap-1.5 bg-neutral-950/60 p-2 rounded-xl border border-neutral-800/80">
                  <Trophy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Ставки и контракты</span>
                </div>
                <div className="flex items-center gap-1.5 bg-neutral-950/60 p-2 rounded-xl border border-neutral-800/80">
                  <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Ставка Nil (±100 очков)</span>
                </div>
                <div className="flex items-center gap-1.5 bg-neutral-950/60 p-2 rounded-xl border border-neutral-800/80">
                  <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Штрафы за мешки</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => onSelectGame('spades')}
                className="flex-1 py-3.5 px-5 rounded-2xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-neutral-950 shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Играть в Пики
              </button>
              <button
                onClick={() => setIsSpadesRulesOpen(true)}
                className="p-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition cursor-pointer"
                title="Правила игры Пики"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
        <div>Карточный Клуб © 2026. «Бура» и «Пики» онлайн.</div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsBuraRulesOpen(true)}
            className="hover:text-neutral-300 transition cursor-pointer"
          >
            Правила Буры
          </button>
          <span>•</span>
          <button
            onClick={() => setIsSpadesRulesOpen(true)}
            className="hover:text-neutral-300 transition cursor-pointer"
          >
            Правила Пик
          </button>
        </div>
      </footer>

      {/* RULES MODALS ACCESSIBLE DIRECTLY FROM HUB */}
      <RulesModal isOpen={isBuraRulesOpen} onClose={() => setIsBuraRulesOpen(false)} />
      <SpadesRulesModal isOpen={isSpadesRulesOpen} onClose={() => setIsSpadesRulesOpen(false)} />
    </div>
  )
}

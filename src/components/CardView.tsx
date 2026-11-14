import React from 'react'
import { Lock, Check, X } from 'lucide-react'
import type { Card, Suit } from '../game/types'
import { RANK_NAMES, SUIT_NAMES } from '../game/rules'

interface CardViewProps {
  card?: Card
  faceDown?: boolean
  isSelected?: boolean
  isPlayable?: boolean
  isTrump?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
  dimmed?: boolean
  badge?: string
  beatsBadge?: 'beats' | 'fails'
  angle?: number
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  faceDown = false,
  isSelected = false,
  isPlayable = true,
  isTrump = false,
  onClick,
  size = 'md',
  className = '',
  dimmed = false,
  badge,
  beatsBadge,
  angle = 0,
}) => {
  const sizeClasses = {
    sm: 'w-16 h-24 text-xs rounded-md',
    md: 'w-24 h-36 sm:w-28 sm:h-40 text-sm rounded-lg',
    lg: 'w-32 h-48 sm:w-36 sm:h-52 text-base rounded-xl',
  }[size]

  if (faceDown || !card) {
    return (
      <div
        onClick={onClick}
        style={{ transform: angle ? `rotate(${angle}deg)` : undefined }}
        className={`relative select-none transition-all duration-200 border-2 border-amber-900/60 shadow-lg ${sizeClasses} ${
          onClick ? 'cursor-pointer hover:brightness-110 active:scale-95' : ''
        } ${className}`}
      >
        {/* Ornate Card Back */}
        <div className="w-full h-full rounded-[inherit] bg-gradient-to-br from-red-950 via-red-900 to-amber-950 p-1.5 flex items-center justify-center overflow-hidden">
          <div className="w-full h-full border border-amber-400/40 rounded-[inherit] flex flex-col items-center justify-center relative p-1 bg-[radial-gradient(#e5a93b_1px,transparent_1px)] [background-size:8px_8px] shadow-inner">
            <div className="w-8 h-8 rounded-full border border-amber-400/50 flex items-center justify-center bg-red-950/80 shadow-md">
              <span className="text-amber-300 font-serif font-black text-sm">31</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none" />
          </div>
        </div>

        {card?.faceDown && (
          <div className="absolute inset-x-1 bottom-1 bg-black/75 rounded text-[9px] text-amber-300 font-bold py-0.5 flex items-center justify-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            <span>Закрытая</span>
          </div>
        )}

        {badge && (
          <span className="absolute -top-2 -right-2 bg-amber-500 text-black font-bold text-[10px] px-1.5 py-0.5 rounded-full shadow-md z-10">
            {badge}
          </span>
        )}
      </div>
    )
  }

  const suitInfo = SUIT_NAMES[card.suit]
  const isRed = suitInfo.color === 'red'
  const rankLabel = RANK_NAMES[card.rank]

  const suitIcon = (s: Suit, iconSize = 'text-lg') => {
    switch (s) {
      case 'spades':
        return <span className={`${iconSize} leading-none text-neutral-900 font-bold`}>♠</span>
      case 'clubs':
        return <span className={`${iconSize} leading-none text-neutral-900 font-bold`}>♣</span>
      case 'diamonds':
        return <span className={`${iconSize} leading-none text-red-600 font-bold`}>♦</span>
      case 'hearts':
        return <span className={`${iconSize} leading-none text-red-600 font-bold`}>♥</span>
    }
  }

  return (
    <div
      onClick={isPlayable && onClick ? onClick : undefined}
      style={{ transform: angle ? `rotate(${angle}deg)` : undefined }}
      className={`relative select-none transition-all duration-200 bg-white font-sans ${sizeClasses} ${
        isSelected
          ? '-translate-y-4 ring-4 ring-amber-400 shadow-2xl z-20 brightness-105'
          : 'shadow-md hover:-translate-y-1 hover:shadow-xl'
      } ${dimmed ? 'opacity-40 grayscale-[40%]' : ''} ${
        isTrump ? 'border-2 border-amber-400 ring-2 ring-amber-400/40' : 'border border-neutral-300'
      } ${
        onClick && isPlayable ? 'cursor-pointer active:scale-95' : 'cursor-default'
      } ${className}`}
    >
      {/* Gloss and border effect */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/60 via-transparent to-neutral-200/40 pointer-events-none" />

      {/* Trump badge */}
      {isTrump && (
        <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 text-[9px] font-black uppercase px-1 py-0.5 rounded-bl-md rounded-tr-[inherit] shadow-sm tracking-wider">
          Козырь
        </div>
      )}

      {/* Beats / Fails status pill */}
      {beatsBadge && (
        <div
          className={`absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.2 rounded-full font-bold text-[9px] shadow-lg z-20 whitespace-nowrap ${
            beatsBadge === 'beats'
              ? 'bg-emerald-500 text-neutral-950'
              : 'bg-amber-600 text-white'
          }`}
        >
          {beatsBadge === 'beats' ? (
            <>
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              <span>Бьёт</span>
            </>
          ) : (
            <>
              <X className="w-2.5 h-2.5 stroke-[3]" />
              <span>Сброс</span>
            </>
          )}
        </div>
      )}

      {/* Top Left Rank & Suit */}
      <div className="absolute top-1.5 left-2 flex flex-col items-center leading-none">
        <span
          className={`font-serif font-black ${
            isRed ? 'text-red-600' : 'text-neutral-900'
          } ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'}`}
        >
          {rankLabel}
        </span>
        <div className="-mt-0.5">
          {suitIcon(card.suit, size === 'sm' ? 'text-xs' : 'text-sm')}
        </div>
      </div>

      {/* Center Art / Large Suit Symbol */}
      <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none">
        {card.rank === 'A' ? (
          <div className="flex flex-col items-center">
            {suitIcon(card.suit, size === 'sm' ? 'text-2xl' : size === 'lg' ? 'text-5xl' : 'text-4xl')}
            <span className="text-[10px] uppercase tracking-widest font-serif font-bold text-neutral-400 mt-0.5">
              Туз
            </span>
          </div>
        ) : ['10', 'K', 'Q', 'J'].includes(card.rank) ? (
          <div className="flex flex-col items-center justify-center p-1">
            <div
              className={`rounded border ${
                isRed ? 'border-red-200 bg-red-50/50' : 'border-neutral-200 bg-neutral-50/50'
              } px-2 py-0.5 flex flex-col items-center`}
            >
              <span
                className={`font-serif font-black ${
                  isRed ? 'text-red-700' : 'text-neutral-800'
                } ${size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'}`}
              >
                {rankLabel}
              </span>
              {suitIcon(card.suit, size === 'sm' ? 'text-sm' : 'text-base')}
            </div>
            <span className="text-[9px] font-bold text-neutral-500 mt-0.5">
              {card.points} очк.
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {suitIcon(card.suit, size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-4xl' : 'text-3xl')}
            <span className="text-[9px] font-semibold text-neutral-400 mt-0.5">
              0 очк.
            </span>
          </div>
        )}
      </div>

      {/* Bottom Right Rank & Suit (upside down) */}
      <div className="absolute bottom-1.5 right-2 flex flex-col items-center leading-none rotate-180">
        <span
          className={`font-serif font-black ${
            isRed ? 'text-red-600' : 'text-neutral-900'
          } ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'}`}
        >
          {rankLabel}
        </span>
        <div className="-mt-0.5">
          {suitIcon(card.suit, size === 'sm' ? 'text-xs' : 'text-sm')}
        </div>
      </div>

      {/* Points helper badge at bottom-left */}
      <div className="absolute bottom-1 left-1.5 bg-neutral-100/90 text-neutral-700 font-bold text-[9px] px-1 py-0.2 rounded border border-neutral-300">
        {card.points} очк
      </div>

      {badge && (
        <span className="absolute -top-2 -right-2 bg-amber-500 text-black font-bold text-[10px] px-1.5 py-0.5 rounded-full shadow-md z-10">
          {badge}
        </span>
      )}
    </div>
  )
}

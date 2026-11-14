import React from 'react'
import type { SpadesCard } from './types'
import { SUIT_COLORS } from './engine'

interface SpadesCardViewProps {
  card: SpadesCard
  isValid?: boolean
  isSelected?: boolean
  isPlayed?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}

export const SpadesCardView: React.FC<SpadesCardViewProps> = ({
  card,
  isValid = true,
  isSelected = false,
  isPlayed = false,
  onClick,
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const isRed = SUIT_COLORS[card.suit] === 'red'

  const sizeClasses = {
    sm: 'w-10 h-14 text-xs rounded-md',
    md: 'w-14 h-20 sm:w-16 sm:h-24 text-sm sm:text-base rounded-lg',
    lg: 'w-18 h-26 sm:w-20 sm:h-28 text-base sm:text-lg rounded-xl',
  }

  const isClickable = !disabled && isValid && !!onClick

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`
        relative select-none flex flex-col justify-between p-1 sm:p-1.5 bg-white border font-bold transition-all duration-200
        ${sizeClasses[size]}
        ${isRed ? 'text-red-600 border-red-200' : 'text-neutral-900 border-neutral-300'}
        ${isSelected ? 'ring-4 ring-amber-400 -translate-y-3 shadow-2xl scale-105 z-20' : 'shadow-md'}
        ${isClickable ? 'cursor-pointer hover:-translate-y-2 hover:shadow-xl' : ''}
        ${!isValid && !isPlayed ? 'opacity-40 grayscale-[40%] cursor-not-allowed brightness-75' : ''}
        ${card.suit === '♠' ? 'ring-1 ring-sky-400/40' : ''}
        ${className}
      `}
      style={{
        boxShadow: isSelected
          ? '0 12px 25px -4px rgba(245, 158, 11, 0.45), 0 8px 10px -6px rgba(245, 158, 11, 0.3)'
          : undefined,
      }}
    >
      {/* Top Left Rank & Suit */}
      <div className="flex flex-col items-start leading-none">
        <span className="font-extrabold tracking-tighter">{card.name.replace(card.suit, '')}</span>
        <span className="text-xs sm:text-sm">{card.suit}</span>
      </div>

      {/* Center Suit / Trump emblem */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className={`font-serif select-none ${
            size === 'sm' ? 'text-base opacity-25' : size === 'md' ? 'text-2xl sm:text-3xl opacity-20' : 'text-4xl opacity-20'
          }`}
        >
          {card.suit}
        </span>
      </div>

      {/* Bottom Right Rank & Suit (upside down) */}
      <div className="flex flex-col items-end leading-none rotate-180">
        <span className="font-extrabold tracking-tighter">{card.name.replace(card.suit, '')}</span>
        <span className="text-xs sm:text-sm">{card.suit}</span>
      </div>

      {/* Trump badge for Spades */}
      {card.isTrump && size !== 'sm' && (
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500 shadow-sm" title="Козырь (Пики)" />
      )}
    </div>
  )
}

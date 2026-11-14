import React, { useState } from 'react'
import {
  X,
  Users,
  Copy,
  Check,
  Share2,
  LogIn,
  PlusCircle,
  Wifi,
  WifiOff,
  Loader2,
  LogOut,
  User,
} from 'lucide-react'
import type { ConnectionStatus, GameRuleType, OnlineRole } from '../game/types'

interface OnlineLobbyModalProps {
  isOpen: boolean
  onClose: () => void
  onlineRole: OnlineRole
  connectionStatus: ConnectionStatus
  roomCode: string
  myNickname: string
  opponentNickname: string
  onCreateRoom: (code?: string, ruleType?: GameRuleType) => Promise<string>
  onJoinRoom: (code: string) => Promise<void>
  onLeaveRoom: () => void
  onUpdateNickname: (name: string) => void
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  isOpen,
  onClose,
  onlineRole,
  connectionStatus,
  roomCode,
  myNickname,
  opponentNickname,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onUpdateNickname,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create')
  const [selectedRule, setSelectedRule] = useState<GameRuleType>('duel_classic_4')
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [nicknameInput, setNicknameInput] = useState(myNickname)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const isConnected = connectionStatus === 'connected'
  const isConnecting = connectionStatus === 'connecting'

  const handleCreate = async () => {
    setIsSubmitting(true)
    setErrorMessage(null)
    onUpdateNickname(nicknameInput)
    try {
      await onCreateRoom(undefined, selectedRule)
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Не удалось создать комнату'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoin = async () => {
    if (!joinCodeInput.trim()) {
      setErrorMessage('Введите код комнаты')
      return
    }
    setIsSubmitting(true)
    setErrorMessage(null)
    onUpdateNickname(nicknameInput)
    try {
      await onJoinRoom(joinCodeInput)
      onClose()
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Не удалось подключиться к комнате'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyRoomCode = () => {
    if (!roomCode) return
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    })
  }

  const copyInviteLink = () => {
    if (!roomCode || typeof window === 'undefined') return
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl max-w-md w-full shadow-2xl text-neutral-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold font-serif text-amber-300">
              Игра онлайн с друзьями
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
        <div className="p-6 space-y-5">
          {/* Nickname Input */}
          <div>
            <label className="block text-xs uppercase font-bold tracking-wider text-neutral-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Ваше имя в игре</span>
            </label>
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => {
                setNicknameInput(e.target.value)
                onUpdateNickname(e.target.value)
              }}
              placeholder="Введите имя..."
              maxLength={16}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-400 focus:outline-none text-white text-sm"
            />
          </div>

          {/* Connected Room Status View */}
          {onlineRole && roomCode ? (
            <div className="p-4 rounded-xl bg-neutral-950 border border-amber-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <Wifi className="w-4 h-4" /> В сети
                    </span>
                  ) : isConnecting ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin" /> Подключение...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                      <WifiOff className="w-4 h-4" /> Отключено
                    </span>
                  )}
                </div>
                <span className="text-xs text-neutral-400">
                  Роль: <strong className="text-amber-300">{onlineRole === 'host' ? 'Создатель (Хост)' : 'Гость'}</strong>
                </span>
              </div>

              {/* Room Code Display */}
              <div className="text-center py-2 bg-neutral-900 rounded-xl border border-neutral-800">
                <span className="text-xs text-neutral-400 uppercase tracking-widest font-bold">
                  Код комнаты
                </span>
                <div className="text-3xl font-black font-mono tracking-widest text-amber-400 mt-0.5">
                  {roomCode}
                </div>
              </div>

              {/* Action Buttons for Room */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copyRoomCode}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 transition"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Копировать код</span>
                    </>
                  )}
                </button>

                <button
                  onClick={copyInviteLink}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 transition"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ссылка скопирована!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ссылка другу</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Notice */}
              {onlineRole === 'host' && !isConnected && (
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                  <span>Отправьте код или ссылку другу. Игра начнется сразу после подключения!</span>
                </div>
              )}

              {isConnected && (
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between">
                  <span>Соперник: <strong className="text-white font-bold">{opponentNickname || 'Друг'}</strong></span>
                  <span className="text-emerald-400 font-bold">Готов ✓</span>
                </div>
              )}

              {/* Leave Room Button */}
              <button
                onClick={() => {
                  onLeaveRoom()
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-700/40 text-red-300 text-xs font-bold transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Покинуть комнату</span>
              </button>
            </div>
          ) : (
            /* Not in room: Tabs to Create or Join */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
                <button
                  onClick={() => {
                    setActiveTab('create')
                    setErrorMessage(null)
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'create'
                      ? 'bg-amber-500 text-neutral-950 shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Создать игру</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('join')
                    setErrorMessage(null)
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'join'
                      ? 'bg-amber-500 text-neutral-950 shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Войти по коду</span>
                </button>
              </div>

              {/* Tab 1: Create Room */}
              {activeTab === 'create' && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-neutral-400 mb-1.5">
                      Правила и число игроков
                    </label>
                    <div className="space-y-1">
                      {[
                        { id: 'duel_classic_4', title: '1 на 1: Классика (по 4 карты)' },
                        { id: 'duel_chain_6', title: '1 на 1: Перепалка (по 6 карт)' },
                        { id: 'ffa_3', title: '3 игрока: Все сами за себя' },
                        { id: 'ffa_4', title: '4 игрока: Все сами за себя' },
                        { id: 'teams_4', title: '4 игрока: 2 на 2 Командная' },
                      ].map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedRule(r.id as GameRuleType)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                            selectedRule === r.id
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                          }`}
                        >
                          {r.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Создайте онлайн-комнату и отправьте короткий код или ссылку другу.
                    Подключение происходит напрямую в браузере без регистрации!
                  </p>
                  <button
                    onClick={handleCreate}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black rounded-xl shadow-lg transition active:scale-95 text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Создание комнаты...</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        <span>Создать комнату</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Tab 2: Join Room */}
              {activeTab === 'join' && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Введите код комнаты, полученный от друга (например, <strong className="text-neutral-200">BURA-XXXX</strong>):
                  </p>
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="BURA-XXXX"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-400 focus:outline-none text-white text-base font-mono tracking-widest text-center uppercase"
                  />
                  <button
                    onClick={handleJoin}
                    disabled={isSubmitting || !joinCodeInput.trim()}
                    className={`w-full py-3 rounded-xl font-black text-sm shadow-lg transition active:scale-95 flex items-center justify-center gap-2 ${
                      joinCodeInput.trim() && !isSubmitting
                        ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 cursor-pointer shadow-amber-500/30'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Подключение...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Присоединиться</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 bg-red-950/70 border border-red-700/50 rounded-xl text-xs text-red-200 text-center font-medium">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-lg transition text-xs"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

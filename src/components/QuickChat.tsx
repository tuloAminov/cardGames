import React, { useState, useRef, useEffect } from 'react'
import {
  MessageSquare,
  Send,
  X,
} from 'lucide-react'
import type { ChatMessage } from '../game/types'

interface QuickChatProps {
  messages: ChatMessage[]
  onSendMessage: (text: string) => void
  myNickname: string
  opponentNickname: string
}

const QUICK_PHRASES = [
  'Вскрываюсь!',
  'Красиво сыграно!',
  'Эх, не побил!',
  'Держи козыря!',
  'Реванш?',
  'Удачи!',
]

const QUICK_EMOJIS = ['🔥', '😎', '🃏', '👑', '👏', '😈', '💥', '👀']

export const QuickChat: React.FC<QuickChatProps> = ({
  messages,
  onSendMessage,
  myNickname,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const lastReadCountRef = useRef(messages.length)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Track unread messages
  useEffect(() => {
    if (isOpen) {
      lastReadCountRef.current = messages.length
      setUnreadCount(0)
    } else {
      const newMessages = messages.length - lastReadCountRef.current
      if (newMessages > 0) {
        setUnreadCount(newMessages)
      }
    }
  }, [messages.length, isOpen])

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isOpen])

  const handleSend = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim()
    if (!text) return
    onSendMessage(text)
    if (textToSend === undefined) {
      setInputText('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="relative font-sans">
      {/* Floating Chat Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-400 text-neutral-300 hover:text-white shadow-xl transition flex items-center justify-center cursor-pointer"
        title="Чат и быстрые реакции"
      >
        <MessageSquare className="w-4 h-4 text-amber-400" />
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-black font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Chat Popover Window */}
      {isOpen && (
        <div className="fixed sm:absolute bottom-16 right-4 sm:right-0 w-[calc(100vw-2rem)] sm:w-80 h-96 bg-neutral-950/95 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in text-neutral-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/80">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">
                Чат партии
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Emojis Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800/80 bg-neutral-900/40 text-base">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSend(emoji)}
                className="hover:scale-125 transition active:scale-95 cursor-pointer px-1"
                title={`Отправить ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Messages list */}
          <div
            ref={scrollRef}
            className="flex-1 p-3 overflow-y-auto space-y-2 text-xs custom-scrollbar"
          >
            {messages.length === 0 ? (
              <div className="text-center py-10 text-neutral-500 text-xs">
                Пока нет сообщений. Отправьте реакцию другу!
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender === 'player'
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      isMe ? 'items-end' : 'items-start'
                    }`}
                  >
                    <span className="text-[10px] text-neutral-400 mb-0.5 px-1">
                      {isMe ? myNickname : m.senderName}
                    </span>
                    <div
                      className={`px-3 py-1.5 rounded-2xl max-w-[85%] break-words shadow-md ${
                        isMe
                          ? 'bg-amber-500 text-neutral-950 font-medium rounded-br-none'
                          : 'bg-neutral-800 text-neutral-100 rounded-bl-none border border-neutral-700'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Quick Phrases */}
          <div className="px-2.5 py-1.5 border-t border-neutral-800/80 bg-neutral-900/40 flex flex-wrap gap-1">
            {QUICK_PHRASES.slice(0, 4).map((phrase) => (
              <button
                key={phrase}
                onClick={() => handleSend(phrase)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white transition whitespace-nowrap cursor-pointer"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-2 border-t border-neutral-800 bg-neutral-900/90 flex items-center gap-1.5">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите сообщение..."
              maxLength={120}
              className="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-400 focus:outline-none text-white text-xs placeholder:text-neutral-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim()}
              className={`p-2 rounded-xl transition flex items-center justify-center ${
                inputText.trim()
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 cursor-pointer shadow-md'
                  : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

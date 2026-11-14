import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBuraGame } from './useBuraGame'
import { networkManager } from './network'

describe('Online Multiplayer Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    networkManager.disconnect()
    vi.useRealTimers()
  })

  it('creates an online room immediately without blocking or delays', async () => {
    const { result } = renderHook(() => useBuraGame())

    let roomCode = ''
    await act(async () => {
      roomCode = await result.current.createOnlineRoom('BURA-TEST')
    })

    expect(roomCode).toBe('BURA-TEST')
    expect(result.current.roomCode).toBe('BURA-TEST')
    expect(result.current.isOnline).toBe(true)
    expect(result.current.onlineRole).toBe('host')
    expect(result.current.connectionStatus).toBe('connecting')
  })

  it('allows sending chat messages and preserves message list', () => {
    const { result } = renderHook(() => useBuraGame())

    act(() => {
      result.current.sendChatMessage('Привет! Сыграем в Буру?')
    })

    expect(result.current.chatMessages.length).toBe(1)
    expect(result.current.chatMessages[0].text).toBe('Привет! Сыграем в Буру?')
    expect(result.current.chatMessages[0].sender).toBe('player')
  })

  it('restores room on page refresh when saved session exists in sessionStorage', async () => {
    // 1. Simulate existing saved host session in sessionStorage
    sessionStorage.setItem(
      'bura_active_online_session',
      JSON.stringify({ roomCode: 'BURA-PERS', role: 'host', ruleType: 'duel_classic_4' })
    )

    const { result } = renderHook(() => useBuraGame())

    // Allow mount effect to run
    await act(async () => {
      vi.advanceTimersByTime(50)
    })

    expect(result.current.isOnline).toBe(true)
    expect(result.current.onlineRole).toBe('host')
    expect(result.current.roomCode).toBe('BURA-PERS')

    // 2. Leaving room clears the session
    act(() => {
      result.current.leaveOnlineRoom()
    })

    expect(sessionStorage.getItem('bura_active_online_session')).toBeNull()
    expect(result.current.isOnline).toBe(false)
    expect(result.current.onlineRole).toBeNull()
  })
})

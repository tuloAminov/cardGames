class SoundManager {
  private ctx: AudioContext | null = null
  private enabled: boolean = true

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Card deal sound: crisp paper flutter/swish
   */
  public playDeal() {
    if (!this.enabled) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    const filter = this.ctx.createBiquadFilter()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(800, now)

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.08)
  }

  /**
   * Card placed on table: crisp snap on felt
   */
  public playCardSnap() {
    if (!this.enabled) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    // Noise burst + thud
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(280, now)
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.07)

    gain.gain.setValueAtTime(0.35, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.07)
  }

  /**
   * Collect trick sound: sliding paper sweep
   */
  public playCollectTrick() {
    if (!this.enabled) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.linearRampToValueAtTime(260, now + 0.12)

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.15)
  }

  /**
   * Bura / Moscow combo: grand fanfare
   */
  public playBuraFanfare() {
    if (!this.enabled) return
    this.initCtx()
    if (!this.ctx) return

    const notes = [440, 554.37, 659.25, 880] // A major chord
    notes.forEach((freq, idx) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const startTime = this.ctx.currentTime + idx * 0.1

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.25, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.6)
    })
  }

  /**
   * Round victory fanfare
   */
  public playWin() {
    if (!this.enabled) return
    this.initCtx()
    if (!this.ctx) return

    const notes = [523.25, 659.25, 783.99, 1046.5] // C E G C
    notes.forEach((freq, idx) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const startTime = this.ctx.currentTime + idx * 0.12

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.25, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.5)
    })
  }

  /**
   * Defeat / penalty tone
   */
  public playLose() {
    if (!this.enabled) return
    this.initCtx()
    if (!this.ctx) return

    const notes = [440, 415.3, 392, 349.23]
    notes.forEach((freq, idx) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const startTime = this.ctx.currentTime + idx * 0.14

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.2, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.45)
    })
  }

  /**
   * Subtle UI click
   */
  public playClick() {
    if (!this.enabled) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, now)
    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.04)
  }
}

export const soundManager = new SoundManager()

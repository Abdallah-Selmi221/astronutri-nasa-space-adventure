// Bulletproof Egyptian Arabic DialogueManager & Gemini 3.1 Flash TTS Engine
// Strictly uses Web Audio API PCM16 decoding — ZERO browser speechSynthesis fallback.

export type SpeechCallback = () => void;
export type ErrorCallback = (error: unknown) => void;

export interface DialogueStatus {
  isLoading: boolean;   // True while awaiting Gemini API response ("THINKING" state)
  isSpeaking: boolean;  // True ONLY when decoded AudioBuffer is actively playing
  queueLength: number;  // Pending queued utterances
  toastError: string | null; // Non-blocking toast message if Gemini API fails
}

interface QueuedUtterance {
  id: number;
  text: string;
  interrupt: boolean;
  onStart?: SpeechCallback;
  onEnd?: SpeechCallback;
  onError?: ErrorCallback;
}

interface TTSCacheEntry {
  base64Audio: string;
  sampleRate: number;
}

// Dynamic Randomized Egyptian Arabic Success Phrases (6 variations)
export const ROBO_SUCCESS_PHRASES: readonly string[] = [
  'عاش يا بطل! ده أكل مثالي للرحلة 🚀',
  'اختيار ذكي جداً! الأكل ده هيدينا طاقة كبيرة في الفضاء ⭐',
  'طاقة مليانة وفيتامينات ممتازة! برافو عليك يا كابتن 💪',
  'أحسنت! هذه الأطعمة مناسبة لرواد الفضاء 🌟',
  'يا سلام عليك! كده جسم رائد الفضاء هيفضل قوي ونشيط 🦸‍♂️',
  'ممتاز يا بطل الفضاء! وجبة صحية وآمنة تماماً للرحلة ✨'
];

// Dynamic Randomized Egyptian Arabic Warning Phrases (6 variations)
export const ROBO_WARNING_PHRASES: readonly string[] = [
  'لا لا لا! ده هيعمل فتات ويبوظ الأجهزة! ⚠️',
  'حاسب! الأكل ده خطر في الفضاء 🚨',
  'مينفعش ناخد ده معانا يا كابتن! ❌',
  'حاسب يا بطل! الأكل ده هيعمل فتات ويبوظ أجهزة الصاروخ في انعدام الجاذبية!',
  'أوعى تحط ده في الصندوق! رواد الفضاء بياكلوا أكل صحي بس 🍎',
  'خطر يا كابتن! الأكل ده غير مسموح بيه داخل المركبة الفضائية 🛑'
];

let lastSuccessIndex = -1;
let lastWarningIndex = -1;

export function getRandomSuccessPhrase(): string {
  let idx = Math.floor(Math.random() * ROBO_SUCCESS_PHRASES.length);
  if (idx === lastSuccessIndex && ROBO_SUCCESS_PHRASES.length > 1) {
    idx = (idx + 1) % ROBO_SUCCESS_PHRASES.length;
  }
  lastSuccessIndex = idx;
  return ROBO_SUCCESS_PHRASES[idx];
}

export function getRandomWarningPhrase(): string {
  let idx = Math.floor(Math.random() * ROBO_WARNING_PHRASES.length);
  if (idx === lastWarningIndex && ROBO_WARNING_PHRASES.length > 1) {
    idx = (idx + 1) % ROBO_WARNING_PHRASES.length;
  }
  lastWarningIndex = idx;
  return ROBO_WARNING_PHRASES[idx];
}

export class DialogueManager {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Uint8Array<ArrayBuffer> | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private abortController: AbortController | null = null;
  private requestTimeoutId: number | null = null;
  private queue: QueuedUtterance[] = [];
  private isProcessingQueue: boolean = false;
  private activeUtteranceId: number = 0;
  private nextUtteranceId: number = 1;
  private memoryCache: Map<string, AudioBuffer> = new Map();

  private isLoading: boolean = false;
  private isSpeaking: boolean = false;
  private toastError: string | null = null;
  private toastTimer: number | null = null;
  private voiceEnabled: boolean = true;

  private speakingListeners: Set<(speaking: boolean) => void> = new Set();
  private statusListeners: Set<(status: DialogueStatus) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedVoice = localStorage.getItem('astronutri_voice_enabled');
        if (savedVoice !== null) {
          this.voiceEnabled = savedVoice === 'true';
        }
      } catch {
        // ignore storage access issues
      }
    }
  }

  public setVoiceEnabled(val: boolean): void {
    this.voiceEnabled = val;
    if (!val) {
      this.stop();
    }
    try {
      localStorage.setItem('astronutri_voice_enabled', String(val));
    } catch {
      // ignore
    }
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public subscribeSpeaking(listener: (speaking: boolean) => void): () => void {
    this.speakingListeners.add(listener);
    listener(this.isSpeaking);
    return () => this.speakingListeners.delete(listener);
  }

  public subscribeStatus(listener: (status: DialogueStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.getStatusSnapshot());
    return () => this.statusListeners.delete(listener);
  }

  public getStatusSnapshot(): DialogueStatus {
    return {
      isLoading: this.isLoading,
      isSpeaking: this.isSpeaking,
      queueLength: this.queue.length,
      toastError: this.toastError
    };
  }

  private emitStatus(loading: boolean, speaking: boolean, errorMsg?: string | null): void {
    this.isLoading = loading;
    this.isSpeaking = speaking;
    if (errorMsg !== undefined) {
      this.toastError = errorMsg;
      if (this.toastTimer) {
        window.clearTimeout(this.toastTimer);
        this.toastTimer = null;
      }
      if (errorMsg) {
        this.toastTimer = window.setTimeout(() => {
          this.toastError = null;
          this.notifyListeners();
        }, 4000);
      }
    }
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const snapshot = this.getStatusSnapshot();
    this.speakingListeners.forEach((fn) => fn(this.isSpeaking));
    this.statusListeners.forEach((fn) => fn(snapshot));
  }

  public dismissToastError(): void {
    this.toastError = null;
    if (this.toastTimer) {
      window.clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.notifyListeners();
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Returns normalized RMS audio amplitude (0.0 to 1.0) from the active Web Audio AnalyserNode
   * so Phaser's ProceduralRobo can synchronize mouth/head animation in real time.
   */
  public getAudioAmplitude(): number {
    if (!this.isSpeaking || !this.analyser || !this.analyserData) {
      return 0;
    }
    try {
      this.analyser.getByteTimeDomainData(this.analyserData);
      let sumSquares = 0;
      const len = this.analyserData.length;
      for (let i = 0; i < len; i++) {
        const normalized = (this.analyserData[i] - 128) / 128.0;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / len);
      return Math.min(1, rms * 4.2);
    } catch {
      return 0.35;
    }
  }

  /**
   * Immediately flushes the dialogue queue, aborts any in-flight Gemini fetch,
   * and stops any currently playing Web Audio buffer so voices NEVER overlap.
   */
  public stop(): void {
    this.queue = [];
    this.isProcessingQueue = false;
    this.activeUtteranceId = ++this.nextUtteranceId;

    if (this.requestTimeoutId !== null) {
      window.clearTimeout(this.requestTimeoutId);
      this.requestTimeoutId = null;
    }

    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {
        // ignore abort error
      }
      this.abortController = null;
    }

    this.stopCurrentAudioSource();
    this.emitStatus(false, false);
  }

  private stopCurrentAudioSource(): void {
    if (this.currentSource) {
      try {
        this.currentSource.onended = null;
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // Source already finished
      }
      this.currentSource = null;
    }
  }

  private sanitizeForSpeech(raw: string): string {
    return raw
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private decodePCM16(base64: string, sampleRate = 24000): AudioBuffer {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const ctx = this.getAudioContext();
    const buffer = ctx.createBuffer(1, int16.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < int16.length; i++) {
      channelData[i] = int16[i] / 32768.0;
    }
    return buffer;
  }

  /**
   * Enqueues a dialogue line to be spoken sequentially after current lines finish.
   */
  public enqueue(
    text: string,
    onStart?: SpeechCallback,
    onEnd?: SpeechCallback,
    onError?: ErrorCallback
  ): void {
    const cleanText = this.sanitizeForSpeech(text);
    if (!cleanText || !this.voiceEnabled) {
      if (onEnd) onEnd();
      return;
    }

    this.queue.push({
      id: ++this.nextUtteranceId,
      text: cleanText,
      interrupt: false,
      onStart,
      onEnd,
      onError
    });

    this.notifyListeners();
    void this.processQueue();
  }

  /**
   * Interrupts any current speech/queue and speaks the new line immediately.
   * Guarantees zero audio overlap.
   */
  public async speak(
    text: string,
    onStart?: SpeechCallback,
    onEnd?: SpeechCallback,
    onError?: ErrorCallback
  ): Promise<void> {
    this.stop();

    const cleanText = this.sanitizeForSpeech(text);
    if (!cleanText || !this.voiceEnabled) {
      if (onEnd) onEnd();
      return;
    }

    this.queue.push({
      id: ++this.nextUtteranceId,
      text: cleanText,
      interrupt: true,
      onStart,
      onEnd,
      onError
    });

    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.activeUtteranceId = item.id;
      await this.executeUtterance(item);
    }

    this.isProcessingQueue = false;
  }

  private async executeUtterance(item: QueuedUtterance): Promise<void> {
    const { id, text, onStart, onEnd, onError } = item;

    // 1. Check in-memory decoded AudioBuffer cache (works 100% offline!)
    const cachedBuffer = this.memoryCache.get(text);
    if (cachedBuffer) {
      if (id === this.activeUtteranceId) {
        await this.playBufferAsync(cachedBuffer, id, onStart, onEnd);
      }
      return;
    }

    // 2. Check localStorage PCM16 cache (works 100% offline!)
    try {
      const localKey = `tts_v3_${text.slice(0, 40)}`;
      const localItem = localStorage.getItem(localKey);
      if (localItem) {
        const parsed: TTSCacheEntry = JSON.parse(localItem);
        const decoded = this.decodePCM16(parsed.base64Audio, parsed.sampleRate);
        this.memoryCache.set(text, decoded);
        if (id === this.activeUtteranceId) {
          await this.playBufferAsync(decoded, id, onStart, onEnd);
        }
        return;
      }
    } catch {
      // proceed to network fetch
    }

    // 3. Offline check — if browser is offline and phrase is not cached, gracefully use visual text bubble
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.emitStatus(
        false,
        false,
        'وضع عدم الاتصال: يمكنك متابعة اللعب وقراءة رسائل روبو! 🚀'
      );
      if (onEnd) onEnd();
      return;
    }

    // 4. Set Robo to THINKING state (isLoading: true, isSpeaking: false)
    // Mouth does NOT move until audio is decoded and playing.
    this.emitStatus(true, false);

    const controller = new AbortController();
    this.abortController = controller;
    this.requestTimeoutId = window.setTimeout(() => {
      try {
        controller.abort();
      } catch {
        // ignore
      }
    }, 8000);

    try {
      // Secure Vercel Serverless endpoint (/api/tts) — API key stays strictly server-side
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal
      });

      if (this.requestTimeoutId !== null) {
        window.clearTimeout(this.requestTimeoutId);
        this.requestTimeoutId = null;
      }

      if (id !== this.activeUtteranceId || controller.signal.aborted) {
        return;
      }

      if (!response.ok) {
        throw new Error(`TTS Proxy HTTP ${response.status}`);
      }

      const json = (await response.json()) as {
        base64Audio?: string;
        sampleRate?: number;
      };
      if (id !== this.activeUtteranceId || controller.signal.aborted) {
        return;
      }

      if (!json?.base64Audio) {
        throw new Error('Empty audio payload from /api/tts');
      }

      const base64Data: string = json.base64Audio;
      const sampleRate: number = json.sampleRate || 24000;
      const audioBuffer = this.decodePCM16(base64Data, sampleRate);

      this.memoryCache.set(text, audioBuffer);

      try {
        const localKey = `tts_v3_${text.slice(0, 40)}`;
        const cacheObj: TTSCacheEntry = { base64Audio: base64Data, sampleRate };
        localStorage.setItem(localKey, JSON.stringify(cacheObj));
      } catch {
        // storage quota full, ignore
      }

      if (id === this.activeUtteranceId && !controller.signal.aborted) {
        await this.playBufferAsync(audioBuffer, id, onStart, onEnd);
      }
    } catch (err) {
      if (this.requestTimeoutId !== null) {
        window.clearTimeout(this.requestTimeoutId);
        this.requestTimeoutId = null;
      }

      if (
        (err instanceof DOMException && err.name === 'AbortError') ||
        id !== this.activeUtteranceId ||
        controller.signal.aborted
      ) {
        this.emitStatus(false, false);
        return;
      }

      // API failed or offline: exit THINKING state, show non-blocking toast, NEVER use browser speech fallback
      this.emitStatus(
        false,
        false,
        'وضع القراءة الصامت: استمر في اللعب مع رسائل روبو المرئية! 🚀'
      );
      if (onError) onError(err);
      if (onEnd) onEnd();
    }
  }

  private playBufferAsync(
    buffer: AudioBuffer,
    utteranceId: number,
    onStart?: SpeechCallback,
    onEnd?: SpeechCallback
  ): Promise<void> {
    return new Promise((resolve) => {
      if (utteranceId !== this.activeUtteranceId) {
        resolve();
        return;
      }

      this.stopCurrentAudioSource();

      const ctx = this.getAudioContext();
      if (!this.analyser) {
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.connect(ctx.destination);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.analyser);

      this.currentSource = source;
      // Synchronize Robo's mouth ONLY now that audio is actually decoded and playing!
      this.emitStatus(false, true, null);
      if (onStart) onStart();

      source.onended = () => {
        if (this.currentSource === source) {
          this.currentSource = null;
          this.emitStatus(false, false);
          if (onEnd) onEnd();
        }
        resolve();
      };

      try {
        source.start(0);
      } catch {
        this.currentSource = null;
        this.emitStatus(false, false);
        resolve();
      }
    });
  }

  public speakRandomSuccess(): string {
    const phrase = getRandomSuccessPhrase();
    void this.speak(phrase);
    return phrase;
  }

  public speakRandomWarning(): string {
    const phrase = getRandomWarningPhrase();
    void this.speak(phrase);
    return phrase;
  }
}

export const dialogueManager = new DialogueManager();
export const geminiTTS = dialogueManager;

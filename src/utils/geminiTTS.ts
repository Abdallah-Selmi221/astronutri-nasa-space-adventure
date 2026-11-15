// Bulletproof Egyptian Arabic DialogueManager & Gemini 3.1 Flash TTS Engine
// Strictly uses Web Audio API PCM16 decoding — ZERO browser speechSynthesis fallback.
import { soundManager } from './sound';

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
  private hasShownFallbackToast: boolean = false;
  private voiceEnabled: boolean = true;
  private lastSpeakAtMs: number = 0;
  private lastSpokenText: string = '';

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
    soundManager.duckBGM(speaking);
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
  public stopCurrentSpeech(): void {
    this.stop();
  }

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
    soundManager.duckBGM(false);
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
    onError?: ErrorCallback,
    options?: { force?: boolean }
  ): Promise<void> {
    const cleanText = this.sanitizeForSpeech(text);
    if (!cleanText || !this.voiceEnabled) {
      this.stopCurrentSpeech();
      if (onEnd) onEnd();
      return;
    }

    // Single-channel 1.5s debounce guard against double-triggers & overlapping dialogue
    const now = Date.now();
    if (!options?.force && now - this.lastSpeakAtMs < 1500 && (this.isSpeaking || this.isLoading || cleanText === this.lastSpokenText)) {
      if (onEnd) onEnd();
      return;
    }

    this.stopCurrentSpeech();
    this.lastSpeakAtMs = now;
    this.lastSpokenText = cleanText;

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

  private resolveLocalAudioUrl(text: string): string | null {
    // 1. Stage 2 Zero-G & Spacecraft Handrails / Floating Objects / Hydration
    if (text.includes('الدرابزين') || text.includes('القصور الذاتي') || (text.includes('تطفو') && text.includes('الجاذبية'))) {
      return '/audio/robo/pilot/pilot_02_handrail.mp3';
    }
    if (text.includes('بتطفو') || text.includes('الأغراض الطافية') || text.includes('الأدوات') || text.includes('ثبتها') || text.includes('خزانتها')) {
      return '/audio/robo/pilot/pilot_03_loose_objects.mp3';
    }
    if (text.includes('كيس الماء') || text.includes('القطرات') || text.includes('توقف وابلع')) {
      return '/audio/robo/campaign/health_welcome.mp3';
    }

    // 2. Island Hopping, World Map & Onboarding
    if (text.includes('نطير بالسفينة') || text.includes('اربط الحزام') || text.includes('وصلنا إلى') || text.includes('الرحلة إلى القمر')) {
      return '/audio/robo/campaign/island_hop_welcome.mp3';
    }

    // 3. Planet & NASA Radar Exploration (SpaceScience + NeoWs)
    if (text.includes('كويكب') || text.includes('2010 PK') || text.includes('رادار ناسا') || text.includes('NeoWs')) {
      return '/audio/robo/campaign/asteroid_radar.mp3';
    }
    if (text.includes('على الأرض') || text.includes('كوكب الأرض') || text.includes('مركز الأرض')) {
      return '/audio/robo/campaign/planet_earth.mp3';
    }
    if (text.includes('على القمر') || text.includes('سطح القمر') || text.includes('سُدس') || text.includes('0.16')) {
      return '/audio/robo/campaign/planet_moon.mp3';
    }
    if (text.includes('على المريخ') || text.includes('كوكب المريخ')) {
      return '/audio/robo/campaign/planet_mars.mp3';
    }
    if (text.includes('زحل')) {
      return '/audio/robo/campaign/planet_saturn.mp3';
    }
    if (text.includes('المشتري')) {
      return '/audio/robo/campaign/planet_jupiter.mp3';
    }

    // 4. Nutrition Lab Coaching (L1 Food Prep & L2 Balanced Meal)
    if (text.includes('عسل النحل') || text.includes('السيناوي') && text.includes('عسل')) {
      return '/audio/robo/campaign/nutrition_balance_tip.mp3';
    }
    if (text.includes('نوازن') || text.includes('البروتين والطاقة') || text.includes('غير متوازن') || text.includes('وجبة فضائية متوازنة')) {
      return '/audio/robo/campaign/nutrition_balance_tip.mp3';
    }
    if (text.includes('مختبر التغذية') || text.includes('مخزن الطعام') || text.includes('أربع وجبات') || text.includes('4 وجبات')) {
      return '/audio/robo/campaign/nutrition_welcome.mp3';
    }

    // 5. Quiz & Challenge Feedback
    if (text.includes('عبقري الفضاء') || text.includes('مية في المية') || text.includes('إجابة صحيحة')) {
      return '/audio/robo/campaign/quiz_praise.mp3';
    }
    if (text.includes('قربت جداً') || text.includes('فكر تاني') || text.includes('جرب إجابة')) {
      return '/audio/robo/campaign/quiz_hint.mp3';
    }

    // 6. Levels 1-4 Briefings & NASA Systems
    if (text.includes('قسم الصحة') || text.includes('الفحص الطبي') || text.includes('صحة القلب') || text.includes('عضلاتنا') || text.includes('المقاومة') || text.includes('OSDR') || text.includes('دوار')) {
      return '/audio/robo/campaign/health_welcome.mp3';
    }
    if (text.includes('بدلة الفضاء') || text.includes('البدلة القمرية') || text.includes('الخوذة الذهبية') || text.includes('غرفة التجهيز')) {
      return '/audio/robo/campaign/suit_welcome.mp3';
    }
    if (text.includes('قلب المحرك') || text.includes('خلايا الوقود') || text.includes('حظيرة المركبة') || text.includes('عطل طارئ') || text.includes('غرفة الصيانة')) {
      return '/audio/robo/campaign/engine_welcome.mp3';
    }
    if (text.includes('منصة الإطلاق') || text.includes('إطلاق الصاروخ') || text.includes('أملاح التوازن') || text.includes('العد التنازلي')) {
      return '/audio/robo/campaign/launch_welcome.mp3';
    }
    if (text.includes('عاصفة شمسية') || text.includes('دونكي') || text.includes('DONKI') || text.includes('ملجأ الطوارئ')) {
      return '/audio/robo/campaign/lunar_storm_warning.mp3';
    }
    if (text.includes('فتات') || text.includes('خطر') || text.includes('حاسب') || text.includes('ممنوع') || text.includes('تحذير') || text.includes('نسيت أداة')) {
      return '/audio/robo/sample/sample_warning.mp3';
    }
    if (text.includes('ECLSS') || text.includes('تدوير المياه') || text.includes('الفلتر') || text.includes('مسار المياه')) {
      return '/audio/robo/pilot/pilot_04_eclss_success.mp3';
    }
    if (text.includes('موازنة') || text.includes('عينات القمر') || text.includes('خزانات الشحن')) {
      return '/audio/robo/campaign/return_balance.mp3';
    }
    if (text.includes('الغلاف الجوي') || text.includes('الدرع الحراري') || text.includes('زاوية الأمان') || text.includes('المظلات')) {
      return '/audio/robo/campaign/return_reentry.mp3';
    }
    if (text.includes('فتحت مرحلة') || text.includes('فتحت محطة') || text.includes('المستوى التالي') || text.includes('الإذن بالعودة')) {
      return '/audio/robo/campaign/mission_unlock.mp3';
    }
    if (text.includes('مبروووك') || text.includes('قاعدة القمر') || text.includes('كبسولة العودة') || text.includes('تمت المهمة')) {
      return '/audio/robo/pilot/pilot_05_emotional_reflection.mp3';
    }
    if (text.includes('عاش') || text.includes('أحسنت') || text.includes('برافو') || text.includes('ممتاز') || text.includes('اختيار ذكي') || text.includes('الله عليك')) {
      return '/audio/robo/sample/sample_success.mp3';
    }
    if (text.includes('مستنيينك') || text.includes('يلا يا بطل') || text.includes('مغامرة الفضاء')) {
      return '/audio/robo/campaign/island_hop_welcome.mp3';
    }
    if (text.includes('أهلًا') || text.includes('أهلاً') || text.includes('أهلا') || text.includes('مرحباً') || text.includes('الأرخبيل') || text.includes('روبو')) {
      return '/audio/robo/pilot/pilot_01_welcome.mp3';
    }
    return null;
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

    // 1B. Check pre-authored ElevenLabs local MP3 tracks (instant, offline, zero 503!)
    const localMp3Url = this.resolveLocalAudioUrl(text);
    if (localMp3Url) {
      const mp3CachedBuffer = this.memoryCache.get(`__mp3__:${localMp3Url}`);
      if (mp3CachedBuffer) {
        this.memoryCache.set(text, mp3CachedBuffer);
        if (id === this.activeUtteranceId) {
          await this.playBufferAsync(mp3CachedBuffer, id, onStart, onEnd);
        }
        return;
      }
      try {
        const res = await fetch(localMp3Url);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const ctx = this.getAudioContext();
          const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
          this.memoryCache.set(`__mp3__:${localMp3Url}`, decoded);
          this.memoryCache.set(text, decoded);
          if (id === this.activeUtteranceId) {
            await this.playBufferAsync(decoded, id, onStart, onEnd);
          }
          return;
        }
      } catch {
        // Fall through to localStorage / API proxy cleanly
      }
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

      // API failed or offline: exit THINKING state, show non-blocking toast once per session
      const toastMsg = this.hasShownFallbackToast
        ? null
        : 'وضع القراءة الصامت: استمر في اللعب مع رسائل روبو المرئية! 🚀';
      this.hasShownFallbackToast = true;
      this.emitStatus(false, false, toastMsg);
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

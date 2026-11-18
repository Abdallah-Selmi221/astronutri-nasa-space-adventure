import React, { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Radio, RotateCcw, Sparkles, Star, X } from 'lucide-react';
import { QuizQuestion } from '../../data/questionBanks';
import { useGameState } from '../../context/GameContext';
import { tr } from '../../utils/i18n';
import { dialogueManager } from '../../utils/geminiTTS';
import { soundManager } from '../../utils/sound';
import { shuffleArray } from '../../utils/shuffle';

interface InteractiveQuizDeckProps {
  questions: readonly QuizQuestion[];
  titleEn?: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  accent?: 'cyan' | 'emerald' | 'amber';
  milestoneCount?: number;
  isMilestoneDone?: boolean;
  onMilestoneComplete?: (correctCount: number, totalQuestions: number) => void;
}

const OPTION_LETTERS_AR = ['أ', 'ب', 'ج', 'د'];
const OPTION_LETTERS_EN = ['A', 'B', 'C', 'D'];
const OPTION_BADGE_COLORS = [
  'bg-sky-500 text-white border-sky-200/70',
  'bg-violet-500 text-white border-violet-200/70',
  'bg-amber-400 text-slate-950 border-amber-100/80',
  'bg-pink-500 text-white border-pink-200/70'
];

export const InteractiveQuizDeck: React.FC<InteractiveQuizDeckProps> = ({
  questions,
  titleEn = 'NASA Space Quiz',
  titleAr,
  subtitleEn,
  subtitleAr,
  accent = 'cyan',
  milestoneCount = 3,
  isMilestoneDone = false,
  onMilestoneComplete
}) => {
  const { language, setLanguage } = useGameState();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { optionId: string; isCorrect: boolean }>>({});
  const [milestoneFired, setMilestoneFired] = useState(false);
  const [attemptNonce, setAttemptNonce] = useState(0);

  const safeQuestions = questions.length > 0 ? questions : [];
  const shuffledOptionsByQuestion = useMemo(() => {
    const map: Record<string, QuizQuestion['options']> = {};
    for (const q of safeQuestions) {
      map[q.id] = shuffleArray(q.options);
    }
    return map;
  }, [safeQuestions, attemptNonce]);

  const currentQ = safeQuestions[currentIdx];
  const activeOptions = currentQ ? (shuffledOptionsByQuestion[currentQ.id] ?? currentQ.options) : [];
  const optionLetters = language === 'ar' ? OPTION_LETTERS_AR : OPTION_LETTERS_EN;

  const stats = useMemo(() => {
    const entries = Object.values(answers);
    const correctCount = entries.filter((item) => item.isCorrect).length;
    const answeredCount = entries.length;
    return { correctCount, answeredCount };
  }, [answers]);

  if (!currentQ) return null;

  const selectedAnswer = answers[currentQ.id];
  const selectedOption = selectedAnswer
    ? activeOptions.find((opt) => opt.id === selectedAnswer.optionId)
    : undefined;

  const handleSelectOption = (option: QuizQuestion['options'][number]) => {
    soundManager.playClick();
    const alreadyCorrect = answers[currentQ.id]?.isCorrect;
    const nextAnswers = {
      ...answers,
      [currentQ.id]: { optionId: option.id, isCorrect: option.isCorrect }
    };
    setAnswers(nextAnswers);

    if (option.isCorrect) {
      soundManager.playDropSuccess();
      void dialogueManager.speak(
        tr(language, 'Brilliant answer! True NASA Space Explorer!', 'إجابة عبقرية! بطل ناسا الحقيقي ممتاز جداً!')
      );
      const nextCorrect = Object.values(nextAnswers).filter((a) => a.isCorrect).length;
      if (!alreadyCorrect && !milestoneFired && nextCorrect >= milestoneCount) {
        setMilestoneFired(true);
        onMilestoneComplete?.(nextCorrect, safeQuestions.length);
      }
    } else {
      soundManager.playAlertSiren();
      void dialogueManager.speak(
        tr(language, 'Almost there! Try thinking through the other options!', 'قربت جداً يا بطل! فكر تاني وجرب الخيار الصح!')
      );
    }
  };

  const handleNext = () => {
    soundManager.playClick();
    setCurrentIdx((prev) => (prev + 1) % safeQuestions.length);
  };

  const handlePrev = () => {
    soundManager.playClick();
    setCurrentIdx((prev) => (prev - 1 + safeQuestions.length) % safeQuestions.length);
  };

  const handleReset = () => {
    soundManager.playClick();
    setAnswers({});
    setCurrentIdx(0);
    setMilestoneFired(false);
    setAttemptNonce((prev) => prev + 1);
  };

  const accentBadge =
    accent === 'emerald'
      ? 'from-emerald-500 to-teal-500 border-emerald-200/60'
      : accent === 'amber'
      ? 'from-amber-400 to-orange-500 border-amber-200/60'
      : 'from-cyan-500 to-indigo-500 border-cyan-200/60';

  const milestonePct = Math.min(100, Math.round((stats.correctCount / milestoneCount) * 100));
  const doneBadge = isMilestoneDone || milestoneFired || stats.correctCount >= milestoneCount;

  return (
    <section dir={language === 'ar' ? 'rtl' : 'ltr'} className="casual-card p-4 sm:p-6 space-y-4">
      {/* Header + Progress Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-hud font-black text-white bg-gradient-to-r ${accentBadge} border shadow-sm`}>
              🧠 {tr(language, titleEn, titleAr)}
            </span>
            <span className="casual-badge px-3 py-1 text-xs font-hud font-black flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-950" />
              <span>{stats.correctCount} / {safeQuestions.length}</span>
            </span>
          </div>
          {(subtitleEn || subtitleAr) && (
            <p className="text-xs sm:text-sm font-hud font-bold text-slate-200 mt-1.5">
              {tr(language, subtitleEn ?? 'Answer questions to earn your explorer badge!', subtitleAr ?? '')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setLanguage(language === 'en' ? 'ar' : 'en');
            }}
            className="px-2.5 py-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-amber-300/60 text-xs font-hud font-black text-amber-200 cursor-pointer"
          >
            {language === 'en' ? 'Switch: AR' : 'اللغة: عربي'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-hud font-bold text-slate-100 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{tr(language, 'Restart Quiz', 'إعادة التحدي')}</span>
          </button>
        </div>
      </div>

      {/* Milestone Bar */}
      <div className="bg-slate-950/60 rounded-2xl p-3 border border-white/15">
        <div className="flex items-center justify-between text-xs font-hud font-bold mb-1.5">
          <span className={doneBadge ? 'text-emerald-300' : 'text-amber-200'}>
            {doneBadge
              ? tr(
                  language,
                  `✅ Quiz Champion! Answered ${stats.correctCount} correctly (${safeQuestions.length} total)`,
                  `✅ بطل التحدي! أتممت ${stats.correctCount} إجابات صحيحة ويمكنك متابعة الـ ${safeQuestions.length} سؤالاً`
                )
              : tr(
                  language,
                  `🎯 Answer ${milestoneCount} questions correctly to earn the badge (${stats.correctCount}/${milestoneCount})`,
                  `🎯 أجب عن ${milestoneCount} أسئلة صحيحة لتوثيق شارة المهمة (${stats.correctCount}/${milestoneCount})`
                )}
          </span>
          <span className="text-cyan-300 font-black">{milestonePct}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-white/15">
          <div
            className={`h-full transition-all duration-500 ${
              doneBadge
                ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400'
                : 'bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300'
            }`}
            style={{ width: `${milestonePct}%` }}
          />
        </div>
      </div>

      {/* Numbered Question Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1">
        {safeQuestions.map((q, idx) => {
          const ans = answers[q.id];
          const isCurrent = idx === currentIdx;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                soundManager.playClick();
                setCurrentIdx(idx);
              }}
              className={`min-w-[34px] h-8 px-2 rounded-xl font-hud font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
                isCurrent
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_3px_0_#0e7490] scale-105'
                  : ans?.isCorrect
                  ? 'bg-emerald-500/80 text-white border border-emerald-200/50'
                  : ans
                  ? 'bg-rose-500/70 text-white border border-rose-200/50'
                  : 'bg-slate-900/75 text-slate-200 border border-white/20 hover:bg-slate-800'
              }`}
            >
              <span>{idx + 1}</span>
              {ans?.isCorrect && <Check className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* Active Question Card */}
      <div className="rounded-[26px] bg-slate-950/80 border-2 border-cyan-300/35 p-4 sm:p-5 space-y-4 shadow-[0_8px_0_rgba(15,23,42,0.75)]">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500/45 to-cyan-500/35 border-2 border-cyan-300/60 flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-md">
            {currentQ.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-hud font-black text-cyan-300">
                {tr(language, `Question ${currentIdx + 1} of ${safeQuestions.length}`, `سؤال ${currentIdx + 1} من ${safeQuestions.length}`)}
              </span>
              <span className="text-[10px] font-hud font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/35 border border-indigo-300/50 text-indigo-100">
                🛰️ {tr(language, currentQ.nasaBadgeEn, currentQ.nasaBadgeAr)}
              </span>
            </div>
            <h3 dir={language === 'ar' ? 'rtl' : 'ltr'} className="font-hud font-black text-base sm:text-lg text-white leading-relaxed">
              {tr(language, currentQ.questionEn, currentQ.questionAr)}
            </h3>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-2.5">
          {activeOptions.map((option, optIdx) => {
            const isSelected = selectedAnswer?.optionId === option.id;
            const showCorrectHighlight = isSelected && option.isCorrect;
            const showWrongHighlight = isSelected && !option.isCorrect;
            const revealCorrect = Boolean(selectedAnswer?.isCorrect) && option.isCorrect;
            const badgeColor =
              showCorrectHighlight || revealCorrect
                ? 'bg-emerald-400 text-slate-950 border-white'
                : showWrongHighlight
                ? 'bg-rose-400 text-slate-950 border-white'
                : OPTION_BADGE_COLORS[optIdx % OPTION_BADGE_COLORS.length];

            return (
              <button
                key={option.id}
                type="button"
                data-testid={`quiz-option-${option.id}`}
                data-correct={option.isCorrect ? 'true' : 'false'}
                onClick={() => handleSelectOption(option)}
                className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} p-3.5 rounded-2xl border-2 border-b-4 font-hud font-bold text-sm sm:text-base transition-all cursor-pointer flex items-center justify-between gap-3 active:translate-y-0.5 ${
                  showCorrectHighlight || revealCorrect
                    ? 'bg-emerald-500/35 border-emerald-300 text-white shadow-[0_4px_0_#047857]'
                    : showWrongHighlight
                    ? 'bg-rose-500/35 border-rose-300 text-rose-100 shadow-[0_4px_0_#9f1239]'
                    : 'bg-slate-900/85 hover:bg-indigo-900/70 border-white/25 hover:border-cyan-300/80 text-slate-100 shadow-[0_4px_0_rgba(15,23,42,0.95)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${badgeColor}`}
                  >
                    {optionLetters[optIdx] || optIdx + 1}
                  </span>
                  <span dir={language === 'ar' ? 'rtl' : 'ltr'} className="leading-snug">
                    {tr(language, option.labelEn, option.labelAr)}
                  </span>
                </div>
                {(showCorrectHighlight || revealCorrect) && <Check className="w-5 h-5 text-emerald-300 shrink-0" />}
                {showWrongHighlight && <X className="w-5 h-5 text-rose-300 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Feedback + Live NASA Scientific Connection */}
        {selectedOption && (
          <div
            className={`rounded-2xl p-3.5 border-2 space-y-2 ${
              selectedOption.isCorrect
                ? 'bg-emerald-950/60 border-emerald-400/60'
                : 'bg-amber-950/60 border-amber-400/60'
            }`}
          >
            <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="flex items-start gap-2 font-hud font-bold text-sm text-white">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <span>{tr(language, selectedOption.feedbackEn, selectedOption.feedbackAr)}</span>
            </div>
            <div className="rounded-xl bg-slate-950/70 border border-cyan-400/30 p-2.5 flex items-start gap-2 text-xs font-hud font-bold text-cyan-100">
              <Radio className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
              <div>
                <span className="text-cyan-300 font-black">
                  {tr(
                    language,
                    `NASA Science (${currentQ.nasaBadgeEn}): `,
                    `حقيقة من ناسا (${currentQ.nasaBadgeAr}): `
                  )}
                </span>
                <span dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  {tr(language, currentQ.nasaConnectionEn, currentQ.nasaConnectionAr)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePrev}
          className="px-4 py-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-white/25 font-hud font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5 cursor-pointer"
        >
          {language === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          <span>{tr(language, 'Previous Question', 'السؤال السابق')}</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="casual-btn-cyan px-5 py-2.5 text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
        >
          <span>{tr(language, 'Next Question', 'السؤال التالي')}</span>
          {language === 'ar' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </section>
  );
};

export default InteractiveQuizDeck;

import { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, Home, AlertTriangle } from 'lucide-react';

interface GameErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
  onGoHome?: () => void;
}

interface GameErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class GameErrorBoundary extends Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
  public state: GameErrorBoundaryState = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): GameErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected render error'
    };
  }

  public componentDidUpdate(prevProps: GameErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn('[AstroNutri GameErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  private handleHome = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onGoHome) {
      this.props.onGoHome();
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      const isAr = typeof document !== 'undefined' && document.documentElement.lang === 'ar';
      return (
        <div
          className="flex-1 min-h-[75vh] flex items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-indigo-950 via-slate-900 to-space-950"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="casual-card max-w-md w-full p-6 sm:p-8 text-center flex flex-col items-center gap-4 border-4 border-amber-300">
            <div className="w-16 h-16 rounded-full bg-amber-400/20 border-3 border-amber-300 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-9 h-9 text-amber-300" />
            </div>

            <h2 className="font-hud font-black text-xl sm:text-2xl text-white">
              {isAr ? 'أوه! توقفت شاشة الفضاء للحظة 🛠️' : 'Oops! This Space Screen Paused 🛠️'}
            </h2>
            <p className="font-hud font-bold text-sm text-cyan-100 leading-relaxed">
              {isAr
                ? 'لا تقلق يا بطل! لم يضع أي من تقدمك أو نجومك. اضغط لإعادة تحميل الشاشة أو العودة لخريطة الفضاء.'
                : 'Don’t worry Cadet! None of your mission progress or stars were lost. Tap to reload or return to the Space Map.'}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="casual-btn-primary px-6 py-3 text-sm sm:text-base flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>{isAr ? 'إعادة المحاولة 🚀' : 'Retry Screen 🚀'}</span>
              </button>

              {this.props.onGoHome && (
                <button
                  type="button"
                  onClick={this.handleHome}
                  className="casual-btn-cyan px-6 py-3 text-sm sm:text-base flex items-center gap-2 cursor-pointer"
                >
                  <Home className="w-5 h-5" />
                  <span>{isAr ? 'خريطة الفضاء 🌍' : 'Space Map 🌍'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GameErrorBoundary;

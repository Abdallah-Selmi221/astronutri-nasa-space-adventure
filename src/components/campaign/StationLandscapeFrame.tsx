import React from 'react';

export interface StationLandscapeFrameProps {
  accentBorderClass?: string;
  leftStage: React.ReactNode;
  leftDataTestId?: string;
  leftExtraProps?: React.HTMLAttributes<HTMLDivElement>;
  roboTip: string;
  rightHeader?: React.ReactNode;
  rightContent: React.ReactNode;
  primaryCta?: React.ReactNode;
  leftExtraClass?: string;
  rightExtraClass?: string;
}

/**
 * Shared 2-column side-by-side landscape frame used across all 14 campaign stations.
 * Engineered to fit cleanly inside ~342px height on 844x390 mobile landscape with zero
 * outer scrolling, a visual left stage + 1-line Robo tip, and a right control deck
 * with an always-visible pinned primary CTA.
 */
export const StationLandscapeFrame: React.FC<StationLandscapeFrameProps> = ({
  accentBorderClass = 'border-cyan-400/50',
  leftStage,
  leftDataTestId = 'station-left-col',
  leftExtraProps,
  roboTip,
  rightHeader,
  rightContent,
  primaryCta,
  leftExtraClass = '',
  rightExtraClass = ''
}) => {
  return (
    <div className="grid grid-cols-12 gap-2 sm:gap-3 h-full min-h-0 flex-1 overflow-hidden">
      {/* Left Column: Visual Stage + Sleek 1-Line Robo Tip */}
      <div
        {...leftExtraProps}
        data-testid={leftDataTestId}
        data-station-col="left"
        className={`col-span-5 h-full min-h-0 flex flex-col gap-1.5 overflow-hidden rounded-2xl bg-slate-900/95 border border-cyan-500/35 p-2 sm:p-3 shadow-xl relative ${leftExtraClass}`}
      >
        <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden">
          {leftStage}
        </div>
        <div
          data-testid="robo-tip-strip"
          className="shrink-0 px-2 py-1 rounded-xl bg-slate-950/90 border border-cyan-400/35 flex items-center gap-1.5 text-[11px] font-hud font-bold text-cyan-100"
        >
          <span className="shrink-0" aria-hidden="true">
            🤖
          </span>
          <span className="truncate" title={roboTip}>
            {roboTip}
          </span>
        </div>
      </div>

      {/* Right Column: Interactive Controls + Pinned Primary CTA */}
      <div
        data-testid="station-right-col"
        data-station-col="right"
        className={`col-span-7 h-full min-h-0 flex flex-col gap-1.5 overflow-hidden rounded-2xl bg-slate-900/95 border ${accentBorderClass} p-2 sm:p-3 shadow-xl ${rightExtraClass}`}
      >
        {rightHeader && <div className="shrink-0">{rightHeader}</div>}
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 flex flex-col gap-1.5">
          {rightContent}
        </div>
        {primaryCta && (
          <div data-testid="station-primary-cta" className="shrink-0 pt-0.5">
            {primaryCta}
          </div>
        )}
      </div>
    </div>
  );
};

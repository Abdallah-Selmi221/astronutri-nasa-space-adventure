import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, CheckCircle2, AlertCircle, Droplets, Sparkles } from 'lucide-react';
import { soundManager } from '../../utils/sound';
import { useGameState } from '../../context/GameContext';
import { tr } from '../../utils/i18n';

// Directions: 0 = Top, 1 = Right, 2 = Bottom, 3 = Left
export type Direction = 0 | 1 | 2 | 3;

export type PipeType = 'straight' | 'corner' | 'tee' | 'cross';

export interface PipeCell {
  id: string;
  row: number;
  col: number;
  type: PipeType;
  baseConnections: Direction[]; // Base openings at 0 degrees
  rotation: number; // 0, 90, 180, 270
}

interface PipePuzzleProps {
  isProcessorFailed: boolean;
  onPuzzleSolved: () => void;
}

// Initial configuration for 3x3 grid designed to have a solvable continuous circuit
// Inlet at (1, 0) from LEFT. Outlet at (1, 2) to RIGHT.
const INITIAL_TILES: Array<Omit<PipeCell, 'rotation'> & { solutionRotation: number; initialRotation: number }> = [
  // Row 0
  { id: 'p-0-0', row: 0, col: 0, type: 'corner', baseConnections: [1, 2], solutionRotation: 0, initialRotation: 90 }, // Elbow down-right
  { id: 'p-0-1', row: 0, col: 1, type: 'straight', baseConnections: [1, 3], solutionRotation: 0, initialRotation: 90 }, // Horizontal
  { id: 'p-0-2', row: 0, col: 2, type: 'corner', baseConnections: [2, 3], solutionRotation: 0, initialRotation: 180 }, // Elbow down-left

  // Row 1
  { id: 'p-1-0', row: 1, col: 0, type: 'tee', baseConnections: [0, 1, 3], solutionRotation: 0, initialRotation: 90 }, // Inlet T-junction
  { id: 'p-1-1', row: 1, col: 1, type: 'straight', baseConnections: [1, 3], solutionRotation: 0, initialRotation: 90 }, // Core conduit
  { id: 'p-1-2', row: 1, col: 2, type: 'tee', baseConnections: [0, 1, 3], solutionRotation: 0, initialRotation: 270 }, // Outlet T-junction

  // Row 2
  { id: 'p-2-0', row: 2, col: 0, type: 'corner', baseConnections: [0, 1], solutionRotation: 0, initialRotation: 180 }, // Elbow up-right
  { id: 'p-2-1', row: 2, col: 1, type: 'straight', baseConnections: [1, 3], solutionRotation: 0, initialRotation: 90 }, // Horizontal
  { id: 'p-2-2', row: 2, col: 2, type: 'corner', baseConnections: [0, 3], solutionRotation: 0, initialRotation: 270 }, // Elbow up-left
];

// Helper: rotate directional connections by degrees
function getRotatedConnections(base: Direction[], rotation: number): Direction[] {
  const steps = Math.floor(rotation / 90) % 4;
  return base.map((d) => ((d + steps) % 4) as Direction);
}

// Opposite direction helper
function getOppositeDir(dir: Direction): Direction {
  return ((dir + 2) % 4) as Direction;
}

export const PipePuzzle: React.FC<PipePuzzleProps> = ({ isProcessorFailed, onPuzzleSolved }) => {
  const { language } = useGameState();
  const [grid, setGrid] = useState<PipeCell[]>(() =>
    INITIAL_TILES.map((t) => ({
      id: t.id,
      row: t.row,
      col: t.col,
      type: t.type,
      baseConnections: t.baseConnections,
      rotation: t.initialRotation
    }))
  );

  const [hasSolved, setHasSolved] = useState<boolean>(false);

  // Scramble grid with random 90-deg rotations ensuring it does not start in solved state
  const scramblePipes = useCallback(() => {
    soundManager.playClick();
    setHasSolved(false);
    setGrid((prev) =>
      prev.map((cell) => {
        const randomSteps = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3 rotations
        return {
          ...cell,
          rotation: (cell.rotation + randomSteps * 90) % 360
        };
      })
    );
  }, []);

  // Rotate a single pipe cell by 90 degrees clockwise
  const handleRotatePipe = (cellId: string) => {
    if (hasSolved && !isProcessorFailed) return;
    soundManager.playClick();

    setGrid((prev) =>
      prev.map((cell) => {
        if (cell.id !== cellId) return cell;
        return {
          ...cell,
          rotation: (cell.rotation + 90) % 360
        };
      })
    );
  };

  // Breadth-First-Search (BFS) Network Flow Solver
  // Source: Habitat wastewater inlet at (1, 0) entering from direction 3 (Left)
  // Target: Clean water processor outlet at (1, 2) exiting via direction 1 (Right)
  const { connectedCellIds, isFlowComplete } = useMemo(() => {
    const cellMap = new Map<string, PipeCell>();
    grid.forEach((c) => cellMap.set(`${c.row},${c.col}`, c));

    const visited = new Set<string>();
    const connectedIds = new Set<string>();
    let reachedOutlet = false;

    // Queue entries: { row, col, enterFromDir }
    const queue: Array<{ row: number; col: number; enterFromDir: Direction }> = [];

    // Check inlet cell (1, 0)
    const inletCell = cellMap.get('1,0');
    if (inletCell) {
      const activeConnections = getRotatedConnections(inletCell.baseConnections, inletCell.rotation);
      // Inlet enters from LEFT (Direction 3). The inlet pipe must have an opening facing left (3).
      if (activeConnections.includes(3)) {
        queue.push({ row: 1, col: 0, enterFromDir: 3 });
        visited.add(`1,0,3`);
        connectedIds.add(inletCell.id);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const cell = cellMap.get(`${current.row},${current.col}`)!;
      const currentConnections = getRotatedConnections(cell.baseConnections, cell.rotation);

      // Check if this cell is the outlet (1, 2) and has an opening exiting to the RIGHT (Direction 1)
      if (current.row === 1 && current.col === 2 && currentConnections.includes(1)) {
        reachedOutlet = true;
      }

      // Propagate fluid through all other openings of this pipe
      currentConnections.forEach((exitDir) => {
        if (exitDir === current.enterFromDir) return; // Don't backtrack through entry

        let nextRow = current.row;
        let nextCol = current.col;
        if (exitDir === 0) nextRow -= 1; // Top
        if (exitDir === 1) nextCol += 1; // Right
        if (exitDir === 2) nextRow += 1; // Bottom
        if (exitDir === 3) nextCol -= 1; // Left

        if (nextRow >= 0 && nextRow < 3 && nextCol >= 0 && nextCol < 3) {
          const neighbor = cellMap.get(`${nextRow},${nextCol}`);
          if (neighbor) {
            const requiredInletDir = getOppositeDir(exitDir);
            const neighborConnections = getRotatedConnections(neighbor.baseConnections, neighbor.rotation);

            if (neighborConnections.includes(requiredInletDir)) {
              const visitKey = `${nextRow},${nextCol},${requiredInletDir}`;
              if (!visited.has(visitKey)) {
                visited.add(visitKey);
                connectedIds.add(neighbor.id);
                queue.push({ row: nextRow, col: nextCol, enterFromDir: requiredInletDir });
              }
            }
          }
        }
      });
    }

    return {
      connectedCellIds: connectedIds,
      isFlowComplete: reachedOutlet
    };
  }, [grid]);

  // When solved, notify parent and play audio
  useEffect(() => {
    if (isFlowComplete && !hasSolved) {
      setHasSolved(true);
      soundManager.playDropSuccess();
      onPuzzleSolved();
    }
  }, [isFlowComplete, hasSolved, onPuzzleSolved]);

  // Render SVG Pipe Graphics
  const renderPipeGraphic = (type: PipeType, isFlowing: boolean) => {
    const strokeColor = isFlowing ? '#38bdf8' : '#64748b';
    const flowGlow = isFlowing ? 'url(#cyanGlow)' : 'none';
    const fluidFill = isFlowing ? '#0284c7' : '#1e293b';

    return (
      <svg viewBox="0 0 100 100" className="w-full h-full p-1" style={{ filter: flowGlow }}>
        <defs>
          <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Pipe Outer Metal Flange */}
        <circle cx="50" cy="50" r="14" fill="#0f172a" stroke="#334155" strokeWidth="3" />

        {/* Straight: Vertical line from top (50, 0) to bottom (50, 100) */}
        {type === 'straight' && (
          <g>
            <path d="M40 0 L40 100 M60 0 L60 100" stroke="#334155" strokeWidth="4" />
            <rect x="42" y="0" width="16" height="100" fill={fluidFill} />
            <line x1="50" y1="0" x2="50" y2="100" stroke={strokeColor} strokeWidth="4" strokeDasharray={isFlowing ? '6 4' : 'none'} className={isFlowing ? 'animate-pulse' : ''} />
          </g>
        )}

        {/* Corner: Elbow from Top (50, 0) to Right (100, 50) */}
        {type === 'corner' && (
          <g>
            <path d="M40 0 A60 60 0 0 1 100 60 M60 0 A40 40 0 0 1 100 40" stroke="#334155" strokeWidth="4" fill="none" />
            <path d="M42 0 A58 58 0 0 1 100 58 L100 42 A42 42 0 0 0 58 0 Z" fill={fluidFill} />
            <path d="M50 0 A50 50 0 0 1 100 50" stroke={strokeColor} strokeWidth="4" fill="none" strokeDasharray={isFlowing ? '6 4' : 'none'} className={isFlowing ? 'animate-pulse' : ''} />
          </g>
        )}

        {/* Tee: Junction Connecting Top (50, 0), Right (100, 50), and Left (0, 50) */}
        {type === 'tee' && (
          <g>
            {/* Left-Right horizontal arm */}
            <rect x="0" y="42" width="100" height="16" fill={fluidFill} />
            <line x1="0" y1="40" x2="100" y2="40" stroke="#334155" strokeWidth="3" />
            <line x1="0" y1="60" x2="100" y2="60" stroke="#334155" strokeWidth="3" />
            {/* Top vertical branch */}
            <rect x="42" y="0" width="16" height="50" fill={fluidFill} />
            <line x1="40" y1="0" x2="40" y2="42" stroke="#334155" strokeWidth="3" />
            <line x1="60" y1="0" x2="60" y2="42" stroke="#334155" strokeWidth="3" />
            {/* Center Flow lines */}
            <path d="M0 50 L100 50 M50 0 L50 50" stroke={strokeColor} strokeWidth="4" strokeDasharray={isFlowing ? '6 4' : 'none'} className={isFlowing ? 'animate-pulse' : ''} fill="none" />
          </g>
        )}

        {/* Cross: All 4 directions */}
        {type === 'cross' && (
          <g>
            <rect x="0" y="42" width="100" height="16" fill={fluidFill} />
            <rect x="42" y="0" width="16" height="100" fill={fluidFill} />
            <path d="M0 50 L100 50 M50 0 L50 100" stroke={strokeColor} strokeWidth="4" strokeDasharray={isFlowing ? '6 4' : 'none'} className={isFlowing ? 'animate-pulse' : ''} />
          </g>
        )}

        {/* Center Valve Node indicator */}
        <circle cx="50" cy="50" r="7" fill={isFlowing ? '#38bdf8' : '#475569'} />
        {isFlowing && <circle cx="50" cy="50" r="3" fill="#ffffff" />}
      </svg>
    );
  };

  return (
    <div className="w-full bg-space-950/90 border-2 border-slate-700 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden select-none">
      {/* Header telemetry */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Droplets className={`w-5 h-5 ${isFlowComplete ? 'text-cyan-400 animate-bounce' : 'text-amber-400'}`} />
          <div>
            <h4 className="font-hud font-black text-xs sm:text-sm text-white">
              {tr(language, 'Water Recovery Pipe Loop (ECLSS)', 'لغز إصلاح أنابيب تدوير المياه (ECLSS Loop)')}
            </h4>
            <span className="text-[10px] text-slate-400">
              {tr(
                language,
                'Tap/click pipes to rotate and connect wastewater inlet to filtration outlet',
                'قم بتدوير الأنابيب بالنقر أو اللمس لتوصيل مدخل العادم بمصفي التنقية'
              )}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={scramblePipes}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-space-800 hover:bg-space-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700 active:scale-95"
          title={tr(language, 'Scramble pipes', 'إعادة خلط الأنابيب')}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{tr(language, 'Reset', 'إعادة خلط')}</span>
        </button>
      </div>

      {/* Circuit Board with Habitat Inlet (Left) and Storage Outlet (Right) */}
      <div className="relative flex items-center justify-center py-2">
        {/* Inlet Indicator (Left) */}
        <div className="absolute -left-2 sm:left-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
          <span className="text-[9px] font-black text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600/50 shadow">
            {tr(language, 'Wastewater In 🚿', 'مدخل العادم 🚿')}
          </span>
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
        </div>

        {/* 3x3 Pipe Grid Container */}
        <div
          className="grid grid-cols-3 gap-2.5 sm:gap-3 p-3 rounded-2xl bg-slate-900/90 border-2 border-slate-700/80 shadow-inner max-w-[280px] sm:max-w-[320px] w-full"
          style={{ touchAction: 'manipulation' }}
        >
          {grid.map((cell) => {
            const isFlowing = connectedCellIds.has(cell.id);

            return (
              <motion.button
                key={cell.id}
                type="button"
                onClick={() => handleRotatePipe(cell.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                animate={{ rotate: cell.rotation }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className={`relative aspect-square rounded-xl flex items-center justify-center p-1 transition-colors border-2 shadow-md cursor-pointer ${
                  isFlowing
                    ? 'bg-cyan-950/60 border-cyan-400 shadow-cyan-500/30'
                    : 'bg-space-950 border-slate-800 hover:border-slate-600'
                }`}
                style={{ touchAction: 'manipulation' }}
                aria-label={tr(
                  language,
                  `Pipe row ${cell.row + 1} col ${cell.col + 1} rotate`,
                  `أنبوب صف ${cell.row + 1} عمود ${cell.col + 1} - اضغط للتدوير`
                )}
              >
                {renderPipeGraphic(cell.type, isFlowing)}
                <span className="absolute bottom-1 right-1 text-[8px] font-mono text-slate-500 select-none">
                  {cell.rotation}°
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Outlet Indicator (Right) */}
        <div className="absolute -right-2 sm:right-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border shadow ${
            isFlowComplete
              ? 'text-emerald-300 bg-emerald-950/90 border-emerald-500'
              : 'text-cyan-300 bg-cyan-950/80 border-cyan-600/50'
          }`}>
            {tr(language, 'Drink Tank 💧', 'خزان الشرب 💧')}
          </span>
          <div className={`w-3 h-3 rounded-full ${isFlowComplete ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-500'}`} />
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {isFlowComplete ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{tr(language, 'Circuit sealed! 98% potable water recovered.', 'اكتمل تدفق المياه بنجاح! تم استرجاع 98% من الماء.')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{tr(language, 'Loop open: rotate tiles so water flows right.', 'المسار غير مكتمل: قم بتدوير الأنابيب حتى يتدفق الماء للأمام.')}</span>
            </div>
          )}
        </div>

        {isFlowComplete && (
          <span className="text-[11px] font-black text-cyan-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> {tr(language, 'Sealed', 'تم الإصلاح')}
          </span>
        )}
      </div>
    </div>
  );
};


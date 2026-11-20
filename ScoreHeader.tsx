import { BarChart3, Home, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ScoreHeaderProps {
  razmikPoints: number;
  gayanePoints: number;
  razmikWins: number;
  gayaneWins: number;
  soundEnabled: boolean;
  inGame: boolean;
  onToggleSound: () => void;
  onOpenHistory: () => void;
  onGoHome: () => void;
}

export function ScoreHeader({
  razmikPoints,
  gayanePoints,
  razmikWins,
  gayaneWins,
  soundEnabled,
  inGame,
  onToggleSound,
  onOpenHistory,
  onGoHome,
}: ScoreHeaderProps) {
  const prevRazmik = useRef(razmikPoints);
  const prevGayane = useRef(gayanePoints);
  const [razmikDelta, setRazmikDelta] = useState<{ val: number; key: number } | null>(null);
  const [gayaneDelta, setGayaneDelta] = useState<{ val: number; key: number } | null>(null);

  useEffect(() => {
    const diff = razmikPoints - prevRazmik.current;
    if (diff > 0) {
      setRazmikDelta({ val: diff, key: Date.now() });
      const t = window.setTimeout(() => setRazmikDelta(null), 1500);
      prevRazmik.current = razmikPoints;
      return () => window.clearTimeout(t);
    }
    prevRazmik.current = razmikPoints;
  }, [razmikPoints]);

  useEffect(() => {
    const diff = gayanePoints - prevGayane.current;
    if (diff > 0) {
      setGayaneDelta({ val: diff, key: Date.now() + 1 });
      const t = window.setTimeout(() => setGayaneDelta(null), 1500);
      prevGayane.current = gayanePoints;
      return () => window.clearTimeout(t);
    }
    prevGayane.current = gayanePoints;
  }, [gayanePoints]);

  const razmikLeading = razmikPoints > gayanePoints;
  const gayaneLeading = gayanePoints > razmikPoints;

  return (
    <header className="w-full max-w-6xl mx-auto px-3 sm:px-5 pt-3 sm:pt-5 pb-2">
      {/* Desktop 3-column battle bar & compact mobile layout */}
      <div className="grid grid-cols-2 lg:grid-cols-[1fr_auto_1fr] items-stretch gap-2.5 sm:gap-4">
        {/* Center Title Bar on mobile (spans top row), center column on desktop */}
        <div className="col-span-2 lg:col-span-1 lg:order-2 flex flex-col items-center justify-center bg-white/90 rounded-2xl px-4 py-2.5 sm:py-3 shadow-sm border border-sky-100">
          <div className="flex items-center justify-between w-full lg:justify-center gap-3">
            {inGame ? (
              <button
                type="button"
                onClick={onGoHome}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Volver a los juegos"
              >
                <Home className="w-4 h-4" />
                <span>Juegos</span>
              </button>
            ) : (
              <span className="lg:hidden w-8" aria-hidden="true" />
            )}

            <h1 className="font-display text-lg sm:text-2xl font-extrabold tracking-tight text-slate-800 text-center whitespace-nowrap">
              🏆 ¡Batalla de Español!
            </h1>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenHistory}
                aria-label="Estadísticas e historial"
                title="Estadísticas e historial"
                className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 transition-colors cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                type="button"
                onClick={onToggleSound}
                aria-label={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
                title={soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'bg-sky-50 hover:bg-sky-100 text-sky-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
          </div>
          <p className="hidden lg:block text-xs font-medium text-slate-500 mt-1">
            Razmik vs Gayane · 🇪🇸 Español ↔ 🇦🇲 Հայերեն
          </p>
        </div>

        {/* Team Razmik — Orange #FF6500 */}
        <div
          className={`relative lg:order-1 bg-white rounded-2xl p-3 sm:p-4 shadow-sm transition-transform duration-200 border-2 ${
            razmikLeading ? 'border-[#FF6500] shadow-orange-100' : 'border-orange-200'
          }`}
        >
          {razmikDelta && (
            <span
              key={razmikDelta.key}
              className="animate-float-score pointer-events-none absolute -top-2 right-4 z-20 font-display font-black text-lg sm:text-2xl text-[#FF6500]"
            >
              +{razmikDelta.val}
            </span>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-2xl leading-none" aria-hidden="true">
                  ⚽
                </span>
                <span className="font-display font-extrabold text-sm sm:text-lg text-[#FF6500] truncate">
                  Razmik
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-orange-600/80 truncate">
                Equipo Naranja
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display font-black text-2xl sm:text-3xl leading-none text-slate-900 tabular-nums">
                {razmikPoints}
              </div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 tabular-nums whitespace-nowrap">
                Puntos · 🏆 {razmikWins}
              </div>
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-orange-100 flex items-center justify-between text-[11px] sm:text-xs text-slate-600 font-medium tabular-nums">
            <span>Puntos: {razmikPoints}</span>
            <span>Victorias: {razmikWins}</span>
          </div>
        </div>

        {/* Team Gayane — Pink #F50089 */}
        <div
          className={`relative lg:order-3 bg-white rounded-2xl p-3 sm:p-4 shadow-sm transition-transform duration-200 border-2 ${
            gayaneLeading ? 'border-[#F50089] shadow-pink-100' : 'border-pink-200'
          }`}
        >
          {gayaneDelta && (
            <span
              key={gayaneDelta.key}
              className="animate-float-score pointer-events-none absolute -top-2 right-4 z-20 font-display font-black text-lg sm:text-2xl text-[#F50089]"
            >
              +{gayaneDelta.val}
            </span>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-2xl leading-none" aria-hidden="true">
                  🌸
                </span>
                <span className="font-display font-extrabold text-sm sm:text-lg text-[#F50089] truncate">
                  Gayane
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-pink-600/80 truncate">
                Equipo Rosa
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display font-black text-2xl sm:text-3xl leading-none text-slate-900 tabular-nums">
                {gayanePoints}
              </div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 tabular-nums whitespace-nowrap">
                Puntos · 🏆 {gayaneWins}
              </div>
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-pink-100 flex items-center justify-between text-[11px] sm:text-xs text-slate-600 font-medium tabular-nums">
            <span>Puntos: {gayanePoints}</span>
            <span>Victorias: {gayaneWins}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

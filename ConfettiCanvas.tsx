import { useEffect, useRef } from 'react';

interface ConfettiCanvasProps {
  active: boolean;
  theme: 'razmik' | 'gayane' | 'empate';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  shape: 'rect' | 'circle';
  alpha: number;
}

const PALETTES: Record<'razmik' | 'gayane' | 'empate', string[]> = {
  razmik: ['#FF6500', '#FF8A33', '#FFB703', '#FB5607', '#FFFFFF', '#38BDF8'],
  gayane: ['#F50089', '#FF4DB2', '#FFB703', '#EC4899', '#FFFFFF', '#38BDF8'],
  empate: ['#FF6500', '#F50089', '#0EA5E9', '#10B981', '#F59E0B', '#FFFFFF'],
};

export function ConfettiCanvas({ active, theme }: ConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let animId = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = PALETTES[theme];
    const particles: Particle[] = [];
    const spawnBurst = (count: number) => {
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -20 - Math.random() * 240,
          vx: (Math.random() - 0.5) * 4.2,
          vy: 2.5 + Math.random() * 4.5,
          size: 6 + Math.random() * 7,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.18,
          shape: Math.random() > 0.35 ? 'rect' : 'circle',
          alpha: 1,
        });
      }
    };

    spawnBurst(140);
    const secondWave = window.setTimeout(() => spawnBurst(90), 900);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.rotation += p.vr;
        if (p.y > canvas.height * 0.78) {
          p.alpha = Math.max(0, p.alpha - 0.015);
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.38, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        if (p.y > canvas.height + 40 || p.alpha <= 0) {
          particles.splice(i, 1);
        }
      }

      if (particles.length > 0) {
        animId = window.requestAnimationFrame(render);
      }
    };

    animId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animId);
      window.clearTimeout(secondWave);
      window.removeEventListener('resize', resize);
    };
  }, [active, theme]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
    />
  );
}

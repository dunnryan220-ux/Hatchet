'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { HatchettLogo } from './HatchettLogo';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  rotation: number;
  lifetime: number;
  age: number;
  spawnDelay: number;
  type: 'ember' | 'flame';
}

const EMBER_COLORS = ['#FF4500', '#FF8C00', '#FFD700', '#FF6B35', '#FFA500'];

interface HatchettSplashProps {
  onComplete: () => void;
}

export function HatchettSplash({ onComplete }: HatchettSplashProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [phase, setPhase] = useState(0);
  const [splashOpacity, setSplashOpacity] = useState(1);
  const [hatchetStyle, setHatchetStyle] = useState<React.CSSProperties>({
    transform: 'translateY(-120px)',
    opacity: 0,
  });
  const [impactGlow, setImpactGlow] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [fireGlow, setFireGlow] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [showUnderline, setShowUnderline] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const letters = 'HATCHETT'.split('');

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const createParticles = useCallback((bladeX: number, bladeY: number) => {
    const count = isMobile ? 12 : 20;
    const flameCount = 6;
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        id: i,
        x: bladeX,
        y: bladeY,
        vx: (Math.random() * 200 - 80),
        vy: -(Math.random() * 80 + 120),
        size: Math.random() * 3 + 2,
        color: EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
        opacity: 1,
        rotation: Math.random() * 360,
        lifetime: Math.random() * 600 + 800,
        age: 0,
        spawnDelay: Math.random() * 600,
        type: 'ember',
      });
    }

    const flameColors = ['#FF4500', '#FF8C00', '#FFD700'];
    const flameDelays = [0, 100, 180, 260, 340, 420];
    for (let i = 0; i < flameCount; i++) {
      particles.push({
        id: count + i,
        x: bladeX + (Math.random() * 20 - 10),
        y: bladeY,
        vx: (Math.random() * 40 - 20),
        vy: -(Math.random() * 40 + 60),
        size: Math.random() * 8 + 6,
        color: flameColors[i % 3],
        opacity: 1,
        rotation: 0,
        lifetime: 700,
        age: 0,
        spawnDelay: flameDelays[i],
        type: 'flame',
      });
    }

    particlesRef.current = particles;
  }, [isMobile]);

  const animateParticles = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const deltaTime = Math.min(timestamp - lastTimeRef.current, 50);
    lastTimeRef.current = timestamp;

    const elapsed = timestamp - startTimeRef.current;

    particlesRef.current = particlesRef.current.map(p => {
      if (elapsed < p.spawnDelay + 500) return p;

      const age = p.age + deltaTime;
      if (age >= p.lifetime) return { ...p, opacity: 0, age };

      if (p.type === 'ember') {
        const newVy = p.vy + 2 * (deltaTime / 16);
        const newVx = p.vx * Math.pow(0.97, deltaTime / 16);
        const newX = p.x + newVx * (deltaTime / 16);
        const newY = p.y + newVy * (deltaTime / 16);
        const opacity = 1 - (age / p.lifetime);

        return {
          ...p,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
          opacity,
          rotation: p.rotation + 4,
          age,
        };
      } else {
        const progress = age / p.lifetime;
        const newX = p.x + p.vx * (deltaTime / 16);
        const newY = p.y + p.vy * (deltaTime / 16);
        const scaleProgress = progress < 0.3 ? progress / 0.3 : 1 - ((progress - 0.3) / 0.7);
        const opacity = 1 - progress;

        return {
          ...p,
          x: newX,
          y: newY,
          opacity,
          size: p.size * (0.2 + scaleProgress * 1.0),
          age,
        };
      }
    });

    if (elapsed < 3200) {
      animFrameRef.current = requestAnimationFrame(animateParticles);
    }
  }, []);

  useEffect(() => {
    const t0 = setTimeout(() => {
      setHatchetStyle({
        transform: 'translateY(0)',
        opacity: 1,
        transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease-out',
      });
      setPhase(1);
    }, 0);

    const t1 = setTimeout(() => {
      setImpactGlow(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 150);
      setTimeout(() => setImpactGlow(false), 250);
    }, 350);

    const t2 = setTimeout(() => {
      setFireGlow(true);
      const bladeX = window.innerWidth / 2 + 60;
      const bladeY = window.innerHeight / 2 - 20;
      createParticles(bladeX, bladeY);
      startTimeRef.current = performance.now();
      lastTimeRef.current = 0;
      animFrameRef.current = requestAnimationFrame(animateParticles);
      setPhase(2);
    }, 500);

    const t3 = setTimeout(() => {
      setShowText(true);
    }, 900);

    const t4 = setTimeout(() => {
      setShowUnderline(true);
    }, 900 + letters.length * 60 + 300);

    const t5 = setTimeout(() => {
      setShowTagline(true);
    }, 1600);

    const t6 = setTimeout(() => {
      setSplashOpacity(0);
      setTimeout(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        sessionStorage.setItem('hatchett_splash_seen', 'true');
        onComplete();
      }, 400);
    }, 2800);

    return () => {
      [t0, t1, t2, t3, t4, t5, t6].forEach(clearTimeout);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [createParticles, animateParticles, letters.length, onComplete]);

  const particles = particlesRef.current;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#1A1A1A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        opacity: splashOpacity,
        transition: splashOpacity === 0 ? 'opacity 400ms ease-out' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Particle layer */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {particles.map(p => (
          p.opacity > 0 && (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                borderRadius: p.type === 'ember' ? '50%' : '50% 50% 50% 0',
                backgroundColor: p.color,
                opacity: p.opacity,
                transform: `rotate(${p.rotation}deg)`,
                boxShadow: p.type === 'ember' ? `0 0 4px 2px ${p.color}99` : `0 0 8px 4px ${p.color}66`,
                willChange: 'transform',
              }}
            />
          )
        ))}
      </div>

      {/* Fire glow */}
      {fireGlow && (
        <div
          style={{
            position: 'absolute',
            width: isMobile ? 120 : 200,
            height: isMobile ? 120 : 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #FF4500 0%, transparent 70%)',
            filter: 'blur(20px)',
            opacity: 0.4,
            animation: 'none',
            transform: `scale(${1.3 + Math.sin(Date.now() / 300) * 0.15})`,
            willChange: 'transform',
            marginBottom: isMobile ? 20 : 40,
          }}
        />
      )}

      {/* Hatchet */}
      <div
        style={{
          ...hatchetStyle,
          position: 'relative',
          willChange: 'transform',
          transform: `${hatchetStyle.transform}${shaking ? ' translateX(3px)' : ''}`,
        }}
      >
        {impactGlow && (
          <div
            style={{
              position: 'absolute',
              inset: -40,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%)',
              animation: 'none',
            }}
          />
        )}
        <HatchettLogo size={isMobile ? 'sm' : 'md'} />
      </div>

      {/* Text */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        {showText && (
          <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
            {letters.map((letter, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  fontSize: isMobile ? '2rem' : '3rem',
                  fontWeight: 800,
                  letterSpacing: '0.25em',
                  color: '#F5F5F5',
                  animation: `letter-rise 300ms ease-out ${i * 60}ms both`,
                  willChange: 'transform',
                }}
              >
                {letter}
              </span>
            ))}
          </div>
        )}

        {showUnderline && (
          <div
            style={{
              height: 3,
              background: 'linear-gradient(to right, #FF4500, #FFD700, #FF4500)',
              transformOrigin: 'left',
              animation: 'draw-line 400ms ease-out both',
              marginTop: 4,
              willChange: 'transform',
            }}
          />
        )}

        {showTagline && (
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 300,
              letterSpacing: '0.15em',
              color: '#FF8C00',
              textTransform: 'uppercase',
              marginTop: 16,
              animation: 'fade-in 400ms ease-out both',
            }}
          >
            Ignite Your Growth
          </div>
        )}
      </div>
    </div>
  );
}

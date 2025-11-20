import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, ExternalLink, Play, Volume2, VolumeX } from 'lucide-react';
import { BreathingPhase } from './types';

// --- Sound Logic ---

const playPhaseSound = (phase: BreathingPhase) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Sound Profile: Soft, ambient, "singing bowl" style
    osc.type = 'sine';
    
    // Subtle pitch variation per phase
    let freq = 220; // Base A3
    switch (phase) {
        case BreathingPhase.INHALE: freq = 261.63; break; // C4
        case BreathingPhase.HOLD_IN: freq = 329.63; break; // E4
        case BreathingPhase.EXHALE: freq = 196.00; break; // G3
        case BreathingPhase.HOLD_OUT: freq = 220.00; break; // A3
        default: freq = 220;
    }

    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Envelope: Soft attack, long release
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1); // Fade in
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5); // Long fade out

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 2.5);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

// --- Components ---

// 1. Navigation
interface NavbarProps {
  isMuted: boolean;
  toggleMute: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isMuted, toggleMute }) => (
  <nav className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto z-10 relative shrink-0">
    <div className="flex items-center gap-2">
      <div className="h-5 w-5 bg-brand-yellow rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(230,250,75,0.3)]">
        <div className="h-1.5 w-1.5 bg-transparent rounded-full border border-brand-dark"></div>
      </div>
      <span className="font-display font-bold text-lg tracking-tighter text-brand-white">
        YOGA 1369
      </span>
    </div>
    
    <div className="flex items-center gap-4">
        {/* Sound Toggle */}
        <button 
            onClick={toggleMute}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-brand-lightGray hover:text-brand-yellow transition-colors"
            aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
        >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <a 
        href="https://t.me/yoga1369_bot" 
        target="_blank" 
        rel="noreferrer"
        className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium transition-all text-brand-white group"
        >
        <span>НАЧАТЬ ТРЕНИРОВКУ</span>
        <ExternalLink size={14} className="text-brand-yellow group-hover:translate-x-0.5 transition-transform" />
        </a>
    </div>
  </nav>
);

// 2. Breathing Visualizer
interface VisualizerProps {
  phase: BreathingPhase;
  duration: number;
  secondsLeft: number;
  isActive: boolean;
  onToggle: () => void;
}

const Visualizer: React.FC<VisualizerProps> = ({ phase, duration, secondsLeft, isActive, onToggle }) => {
  // Calculate scale based on phase
  const getScale = () => {
    switch (phase) {
      case BreathingPhase.IDLE: return 'scale-100';
      case BreathingPhase.INHALE: return 'scale-150'; // Expand more significantly
      case BreathingPhase.HOLD_IN: return 'scale-150'; // Stay expanded
      case BreathingPhase.EXHALE: return 'scale-100';  // Return to base
      case BreathingPhase.HOLD_OUT: return 'scale-100'; // Stay at base
      default: return 'scale-100';
    }
  };

  // Dynamic glow based on phase - Yellow glow
  const getGlow = () => {
    if (phase === BreathingPhase.HOLD_IN || phase === BreathingPhase.HOLD_OUT) {
      return 'shadow-[0_0_60px_rgba(230,250,75,0.3)]';
    }
    if (phase === BreathingPhase.INHALE) {
      return 'shadow-[0_0_100px_rgba(230,250,75,0.5)]';
    }
    return 'shadow-[0_0_20px_rgba(230,250,75,0.1)]';
  };

  const getLabel = () => {
    switch (phase) {
      case BreathingPhase.IDLE: return isActive ? 'ПАУЗА' : 'СТАРТ';
      case BreathingPhase.INHALE: return 'ВДОХ';
      case BreathingPhase.HOLD_IN: return 'ЗАДЕРЖКА';
      case BreathingPhase.EXHALE: return 'ВЫДОХ';
      case BreathingPhase.HOLD_OUT: return 'ЗАДЕРЖКА';
    }
  };

  // SVG Progress Logic
  const radius = 46; // SVG Circle Radius (viewBox 0 0 100 100)
  const circumference = 2 * Math.PI * radius;
  
  // Determine target stroke-dashoffset
  const getTargetOffset = () => {
    if (phase === BreathingPhase.IDLE) return circumference; // Empty
    if (phase === BreathingPhase.INHALE || phase === BreathingPhase.HOLD_IN) return 0; // Full
    return circumference; // Empty (Exhale / Hold Out)
  };

  // Transition only during active movement phases
  const getTransition = () => {
     if (phase === BreathingPhase.IDLE) return 'stroke-dashoffset 0.3s ease-out';
     if (phase === BreathingPhase.INHALE || phase === BreathingPhase.EXHALE) {
         return `stroke-dashoffset ${duration}s linear`;
     }
     return 'none'; // No transition during holds (keep state)
  };

  return (
    <div className="relative flex items-center justify-center w-full flex-grow shrink-0 py-4">
      {/* Touch Target Container */}
      <button 
        onClick={onToggle}
        className="relative group flex items-center justify-center focus:outline-none tap-highlight-transparent"
        aria-label={isActive ? "Pause Breathing Session" : "Start Breathing Session"}
      >
        {/* Static Track Ring */}
        <div className="absolute inset-0 rounded-full border border-brand-white/10 scale-150 pointer-events-none"></div>
        <div className="absolute inset-0 rounded-full border border-brand-white/5 scale-100 pointer-events-none"></div>
        
        {/* Animated Circle */}
        <div 
          className={`
            w-40 h-40 sm:w-56 sm:h-56 rounded-full bg-brand-yellow mix-blend-normal opacity-90
            flex flex-col items-center justify-center relative overflow-hidden
            transition-all cursor-pointer
            ${getScale()} 
            ${getGlow()}
            ${!isActive && phase === BreathingPhase.IDLE ? 'hover:scale-105 hover:opacity-100' : ''}
          `}
          style={{
            transitionProperty: 'transform, box-shadow',
            transitionDuration: phase === BreathingPhase.IDLE ? '0.3s' : `${duration}s`,
            transitionTimingFunction: 'linear'
          }}
        >
          {/* SVG Progress Ring Overlay */}
          <svg 
             className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-0"
             viewBox="0 0 100 100"
          >
             {/* Background Track */}
             <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-brand-dark opacity-10"
             />
             {/* Filling Progress Line */}
             <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="text-brand-dark opacity-40"
                style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: getTargetOffset(),
                    transition: getTransition(),
                }}
             />
          </svg>

          {/* Icon overlay when IDLE */}
          {phase === BreathingPhase.IDLE && !isActive ? (
             <Play size={28} className="text-brand-dark mb-1 ml-1 relative z-10" fill="currentColor" />
          ) : null}

          <div className="text-brand-dark font-display font-bold text-lg sm:text-2xl tracking-widest uppercase z-10 pointer-events-none select-none relative">
            {getLabel()}
          </div>
          
          {phase !== BreathingPhase.IDLE && (
              <div className="text-brand-dark font-mono font-bold text-lg mt-1 z-10 pointer-events-none select-none relative">
                  {secondsLeft}
              </div>
          )}
        </div>
      </button>
    </div>
  );
};

// 3. Main App
const App: React.FC = () => {
  // State
  const [phase, setPhase] = useState<BreathingPhase>(BreathingPhase.IDLE);
  const [cycleDuration, setCycleDuration] = useState<number>(4); // Seconds per phase
  const [isActive, setIsActive] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [currentSecond, setCurrentSecond] = useState(1);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  // Constants
  const durations = [4, 6, 8, 10];

  // Sound Trigger Effect
  // Use a ref to track previous phase to avoid re-triggering on re-renders if nothing changed
  const prevPhaseRef = useRef<BreathingPhase>(BreathingPhase.IDLE);

  useEffect(() => {
    if (isActive && !isMuted && phase !== BreathingPhase.IDLE) {
      // Only play if the phase actually changed
      if (phase !== prevPhaseRef.current) {
          playPhaseSound(phase);
      }
    }
    prevPhaseRef.current = phase;
  }, [phase, isActive, isMuted]);


  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isActive) {
      // Ensure we start immediately if moving from IDLE
      if (phase === BreathingPhase.IDLE) {
        setPhase(BreathingPhase.INHALE);
        setCurrentSecond(1);
      }

      interval = setInterval(() => {
        // Increment total time
        setTotalSeconds(s => s + 1);

        // Cycle logic
        setCurrentSecond((prev) => {
          // If we reached the end of the duration for this phase
          if (prev >= cycleDuration) {
            // Move to next phase
            setPhase((currentPhase) => {
              switch (currentPhase) {
                case BreathingPhase.INHALE: return BreathingPhase.HOLD_IN;
                case BreathingPhase.HOLD_IN: return BreathingPhase.EXHALE;
                case BreathingPhase.EXHALE: return BreathingPhase.HOLD_OUT;
                case BreathingPhase.HOLD_OUT:
                  setCyclesCompleted(c => c + 1);
                  return BreathingPhase.INHALE;
                default: return BreathingPhase.INHALE;
              }
            });
            return 1; // Reset second counter
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setPhase(BreathingPhase.IDLE);
      setCurrentSecond(1);
    }

    return () => clearInterval(interval);
  }, [isActive, cycleDuration, phase]);


  // If duration changes while active, we restart
  const handleDurationChange = (d: number) => {
    setCycleDuration(d);
    setIsActive(false);
    setPhase(BreathingPhase.IDLE);
    setCurrentSecond(1);
    setTotalSeconds(0);
    setCyclesCompleted(0);
  };

  const toggleSession = () => {
    setIsActive(!isActive);
  };

  const resetSession = () => {
      setIsActive(false);
      setCyclesCompleted(0);
      setPhase(BreathingPhase.IDLE);
      setCurrentSecond(1);
      setTotalSeconds(0);
  }

  const toggleMute = () => {
    setIsMuted(!isMuted);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-[100dvh] flex flex-col relative overflow-hidden selection:bg-brand-yellow selection:text-brand-dark">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-gray rounded-full blur-[150px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-yellow rounded-full blur-[150px] opacity-5 pointer-events-none" />

      <Navbar isMuted={isMuted} toggleMute={toggleMute} />

      <main className="flex-1 flex flex-col items-center justify-between px-4 pb-4 pt-2 relative z-10 w-full max-w-md mx-auto text-center">
        
        {/* 1. Headline (Compact) */}
        <div className="shrink-0">
          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tighter leading-none mb-1 text-brand-white">
            КВАДРАТНОЕ <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-white">ДЫХАНИЕ</span>
          </h1>
          <p className="text-brand-lightGray text-xs leading-relaxed max-w-xs mx-auto hidden xxs:block">
            Восстановите баланс и снизьте стресс.
          </p>
        </div>

        {/* 2. Visualizer (Flexible Grow) */}
        <Visualizer 
          phase={phase} 
          duration={cycleDuration} 
          secondsLeft={currentSecond} 
          isActive={isActive}
          onToggle={toggleSession}
        />

        {/* 3. Controls & Stats Container */}
        <div className="w-full shrink-0 space-y-4">
          
          {/* Duration Selector */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-widest text-brand-lightGray uppercase">СЕКУНДЫ</p>
            <div className="flex justify-center gap-2">
              {durations.map((d) => (
                <button
                  key={d}
                  onClick={() => handleDurationChange(d)}
                  className={`
                    h-10 w-12 sm:w-14 rounded-lg font-bold text-base transition-all border
                    ${cycleDuration === d 
                      ? 'bg-brand-white text-brand-dark border-brand-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                      : 'bg-transparent text-brand-lightGray border-brand-gray hover:border-brand-lightGray hover:text-white'}
                  `}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Restart Button */}
          <div className="h-8 flex items-center justify-center">
            {(isActive || totalSeconds > 0) && (
               <button 
                 onClick={resetSession}
                 className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-gray border border-brand-gray text-brand-lightGray hover:text-white hover:border-brand-lightGray transition-all text-[10px] font-bold uppercase tracking-wider"
               >
                 <RefreshCw size={10} />
                 <span>Сброс</span>
               </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-brand-gray w-full">
             <div className="flex flex-col items-center">
               <span className="block text-xl font-display font-bold text-brand-white">{cyclesCompleted}</span>
               <span className="text-[10px] text-brand-lightGray uppercase tracking-wider">Циклы</span>
             </div>
             <div className="flex flex-col items-center">
               <span className="block text-xl font-display font-bold text-brand-white tabular-nums">
                 {formatTime(totalSeconds)}
               </span>
               <span className="text-[10px] text-brand-lightGray uppercase tracking-wider">Время</span>
             </div>
          </div>

        </div>
      </main>

      {/* Footer (Very compact or integrated) */}
      <footer className="w-full max-w-md mx-auto px-4 py-3 border-t border-brand-gray z-10 shrink-0">
        <div className="flex flex-row justify-between items-center gap-2">
           
           <a href="https://www.instagram.com/13_69/" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-brand-lightGray hover:text-white transition-colors">
             @13_69
           </a>
           
           {/* Mini CTA */}
           <a 
            href="https://t.me/yoga1369_bot" 
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-gray rounded-lg border border-white/5 hover:border-white/10 transition-all group"
           >
             <span className="text-[10px] font-bold text-brand-white uppercase">Йога со мной</span>
             <ExternalLink size={10} className="text-brand-yellow" />
           </a>
        </div>
      </footer>

    </div>
  );
};

export default App;
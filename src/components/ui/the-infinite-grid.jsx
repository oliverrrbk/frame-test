import React, { useRef, useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame,
  AnimatePresence
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, Clock, Users, Wallet, CalendarDays, Package, Calculator } from "lucide-react";

// Feature-bånd i heroen: viser at Frame er meget mere end en beregner.
// Chipsene popper staggered ind, og den "aktive" chip cykler roligt igennem —
// glas-look med hover, jf. Bison Frame-designkravene.
const HERO_FEATURES = [
  { icon: FileText,     label: "Tilbud på stedet" },
  { icon: Clock,        label: "Timeregistrering" },
  { icon: Users,        label: "Kunder & sager" },
  { icon: Wallet,       label: "Løn" },
  { icon: CalendarDays, label: "Kalender" },
  { icon: Package,      label: "Materialelister" },
  { icon: Calculator,   label: "Regnskab" },
];

const HeroFeatureTicker = () => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActive((i) => (i + 1) % HERO_FEATURES.length);
    }, 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-wrap justify-center gap-2.5 pt-6 max-w-3xl mx-auto pointer-events-auto"
    >
      {HERO_FEATURES.map((f, idx) => {
        const isActive = idx === active;
        return (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 + idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3, scale: 1.04 }}
            style={{ WebkitTransform: "translateZ(0)" }}
            className={`group flex items-center gap-2 rounded-full pl-3 pr-4 py-2 text-sm font-semibold backdrop-blur-md border transition-all duration-500 cursor-default select-none ${
              isActive
                ? "bg-white/90 dark:bg-slate-800/90 border-orange-500/40 text-slate-900 dark:text-slate-100 shadow-[0_8px_30px_-8px_rgba(234,88,12,0.45)]"
                : "bg-white/40 dark:bg-slate-900/40 border-white/40 dark:border-slate-700/40 text-slate-600 dark:text-slate-300 shadow-sm hover:bg-white/70 dark:hover:bg-slate-800/70"
            }`}
          >
            <f.icon
              size={16}
              className={`transition-colors duration-500 ${
                isActive ? "text-orange-600 dark:text-orange-400" : "text-slate-400 dark:text-slate-500 group-hover:text-orange-500"
              }`}
            />
            {f.label}
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export const TheInfiniteGrid = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  const speedX = 0.2625; 
  const speedY = 0.2625;

  useAnimationFrame(() => {
    const currentX = gridOffsetX.get();
    const currentY = gridOffsetY.get();
    gridOffsetX.set((currentX + speedX) % 40);
    gridOffsetY.set((currentY + speedY) % 40);
  });

  const maskImage = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-[90svh] flex flex-col items-center justify-center bg-surface"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ WebkitTransform: "translateZ(0)", willChange: "transform" }}>
        <div className="absolute inset-0 z-0 opacity-[0.15]">
          <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} id="grid-pattern-bg" />
        </div>
        <motion.div 
          className="absolute inset-0 z-0 opacity-100"
          style={{ maskImage, WebkitMaskImage: maskImage }}
        >
          <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} id="grid-pattern-mask" />
        </motion.div>

        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute right-[-20%] top-[-20%] w-[40%] h-[40%] rounded-full bg-orange-500/40 blur-[120px]" />
          <div className="absolute right-[10%] top-[-10%] w-[20%] h-[20%] rounded-full bg-slate-400/30 blur-[100px]" />
          <div className="absolute left-[-10%] bottom-[-20%] w-[40%] h-[40%] rounded-full bg-blue-500/40 blur-[120px]" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-[1440px] mx-auto space-y-8 pointer-events-none">
         <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
         >
          <h1 className="text-[clamp(2.5rem,6vw,5.5rem)] font-headline font-bold tracking-tight leading-[1.05] text-on-surface text-balance drop-shadow-sm">
            Lavet i samarbejde med tømrere — til tømrere.
          </h1>
          <p className="text-[clamp(1.125rem,2vw,1.375rem)] text-on-surface-variant max-w-[65ch] mx-auto text-balance leading-relaxed">
            Systemet der hjælper tømrere med at holde styr på deres forretning. På både mobil og computer.
          </p>
        </motion.div>
        
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap justify-center gap-4 pt-4 pointer-events-auto"
        >
          <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ WebkitTransform: "translateZ(0)", willChange: "transform" }}
              onClick={() => navigate('/register')}
              className="bg-inverse-surface text-inverse-primary rounded-full px-8 py-4 font-medium hover:bg-primary transition-colors shadow-[0_10px_40px_-10px_rgba(43,52,55,0.4)]"
          >
              Start din gratis prøveperiode
          </motion.button>
          <div className="relative z-50">
            <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/calculate')}
                style={{ WebkitTransform: "translateZ(0)", willChange: "transform" }}
                className="bg-surface-container-high text-on-surface rounded-full px-8 py-4 font-medium hover:bg-surface-container-highest transition-colors shadow-sm border border-outline-variant/10"
            >
                Læs om det
            </motion.button>
          </div>
        </motion.div>

        <HeroFeatureTicker />
      </div>
    </section>
  );
};

const GridPattern = ({ offsetX, offsetY, id = "grid-pattern" }) => {
  return (
    <svg className="w-full h-full" style={{ WebkitBackfaceVisibility: "hidden" }}>
      <defs>
        <motion.pattern
          id={id}
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-on-surface-variant/40" 
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
};

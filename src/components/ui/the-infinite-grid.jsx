import React, { useRef, useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame,
  AnimatePresence
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, Clock, Briefcase, Wallet, CalendarDays, Home, MapPin } from "lucide-react";
import { Preview } from "../Landing/SystemWheelPreviews";
import { MobilePreview } from "../Landing/SystemWheelMobilePreviews";

// Udpluk i heroen: et hurtigt kig på hvordan systemet ser ud. Chipsene fungerer
// som tabs (glas-look + hover, jf. Bison Frame-designkravene), og preview-ruden
// under dem auto-skifter gennem de rigtige app-mockups fra Funktioner.
// Rækkefølgen er valgt til at fange tømreren hurtigt: wow (overblik) → kerneværdi
// (tilbud) → hverdagen → det visuelt flotte (kort) → payoff (økonomi).
// Hver chip peger på en DISTINKT skærm, så man ikke ser den samme to gange.
const HERO_SHOWCASE = [
  { icon: Home,         label: "Oversigt",         id: "overview" },
  { icon: FileText,     label: "Tilbud på stedet", id: "leads" },
  { icon: Clock,        label: "Timeregistrering", id: "payroll" },
  { icon: CalendarDays, label: "Kalender",         id: "calendar" },
  { icon: Briefcase,    label: "Sager",            id: "cases" },
  { icon: MapPin,       label: "Kort",             id: "map" },
  { icon: Wallet,       label: "Økonomi",          id: "finance" },
];

// Roligt tempo — et "kig", ikke den fulde demo som på Funktioner-siden,
// men lang nok til at nå at se hvad hver skærm er.
const HERO_STEP_MS = 3400;

const HeroShowcase = () => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeId = HERO_SHOWCASE[active].id;

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => {
      setActive((i) => (i + 1) % HERO_SHOWCASE.length);
    }, HERO_STEP_MS);
    return () => clearTimeout(t);
  }, [active, paused]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 pointer-events-auto"
    >
      {/* Chip-tabs */}
      <div className="flex flex-wrap justify-center gap-2.5">
        {HERO_SHOWCASE.map((f, idx) => {
          const isActive = idx === active;
          return (
            <motion.button
              key={f.id}
              onClick={() => setActive(idx)}
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 + idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3, scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{ WebkitTransform: "translateZ(0)" }}
              className={`group flex items-center gap-2 rounded-full pl-3 pr-4 py-2 text-sm font-semibold backdrop-blur-md border transition-all duration-500 select-none ${
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
            </motion.button>
          );
        })}
      </div>

      {/* Preview-rude — rigtige app-mockups, hurtigt skiftende */}
      <div className="w-full text-left">
        {/* Desktop-mockup */}
        <div className="hidden lg:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Preview id={activeId} />
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Telefon-mockup (mobil/tablet) */}
        <div className="lg:hidden max-w-sm mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <MobilePreview id={activeId} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
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
      className="relative w-full min-h-[100svh] flex flex-col items-center justify-center bg-surface py-24 md:py-28"
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

      <div className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-[1440px] mx-auto space-y-10 md:space-y-12 pointer-events-none">
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
            Styr på det hele — fra pladsen til kontoret. Uden bøvl, på både computer og telefon. Simpelt, ærligt og overskueligt.
          </p>
        </motion.div>

        {/* Midten — hurtigt udpluk af hvordan systemet ser ud */}
        <HeroShowcase />

        {/* Nederst — de to CTA-knapper */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap justify-center gap-4 pointer-events-auto"
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
                onClick={() => navigate('/features')}
                style={{ WebkitTransform: "translateZ(0)", willChange: "transform" }}
                className="bg-surface-container-high text-on-surface rounded-full px-8 py-4 font-medium hover:bg-surface-container-highest transition-colors shadow-sm border border-outline-variant/10"
            >
                Læs om det
            </motion.button>
          </div>
        </motion.div>
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

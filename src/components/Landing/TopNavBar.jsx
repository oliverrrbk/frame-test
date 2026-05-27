import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

export default function TopNavBar({ onLoginClick }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

    const navLinks = [
        { path: '/calculate', label: 'Beregner' },
        { path: '/features', label: 'Funktioner' },
        { path: '/pricing', label: 'Priser' },
        { path: '/about', label: 'Om os' }
    ];

    return (
        <nav className={`sticky top-0 w-full z-50 font-headline tracking-tight antialiased text-slate-600 dark:text-slate-300 transition-colors duration-300 ${
            isMobileMenuOpen 
                ? 'bg-white dark:bg-slate-950' 
                : 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg'
        }`}>
            <div className="flex justify-between items-center max-w-[1440px] mx-auto px-6 md:px-8 py-4">
                <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <img src="/logo.png" alt="Bison Frame Logo" className="h-10 w-auto object-contain" />
                    <div className="text-lg font-bold tracking-[-0.02em] uppercase text-slate-800 dark:text-slate-100">
                        Bison Frame
                    </div>
                </Link>
                
                {/* Desktop Menu Links */}
                <div className="hidden md:flex gap-8">
                    {navLinks.map((link) => {
                        const isActive = currentPath === link.path;
                        return (
                            <Link 
                                key={link.path}
                                to={link.path} 
                                className={`font-medium transition-all duration-300 px-3 py-2 rounded-md ${
                                    isActive 
                                        ? 'text-slate-900 dark:text-white bg-slate-100/50 dark:bg-slate-800/50' 
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
                
                <div className="flex gap-4 items-center">
                    {/* Desktop Log Ind */}
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{ WebkitTransform: "translateZ(0)", willChange: "transform" }}
                        onClick={onLoginClick}
                        className="hidden md:block text-slate-500 font-medium hover:text-slate-800 transition-colors"
                    >
                        Log ind
                    </motion.button>

                    {/* Desktop Prøv gratis */}
                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{ WebkitTransform: "translateZ(0)", willChange: "transform" }}
                        onClick={() => navigate('/register')}
                        className="hidden sm:block bg-inverse-surface text-inverse-primary rounded-full px-6 py-2.5 font-medium hover:bg-primary shadow-sm hover:shadow-md transition-all duration-300"
                    >
                        Prøv gratis i en måned
                    </motion.button>

                    {/* Mobile Hamburger Menu Button */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="4" x2="20" y1="12" y2="12" />
                                <line x1="4" x2="20" y1="6" y2="6" />
                                <line x1="4" x2="20" y1="18" y2="18" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
            <div className="h-px w-full bg-slate-100 dark:bg-slate-900"></div>

            {/* Mobile Dropdown Menu Container (Fullscreen Overlay) */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
                        exit={{ opacity: 0, y: -20, transition: { duration: 0.2, ease: 'easeIn' } }}
                        className="fixed inset-0 w-full h-[100dvh] bg-white dark:bg-slate-950 z-[100] flex flex-col"
                    >
                        {/* Overlay Header */}
                        <div className="flex justify-between items-center px-6 md:px-8 py-4 border-b border-slate-100 dark:border-slate-900">
                            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
                                <img src="/logo.png" alt="Bison Frame Logo" className="h-10 w-auto object-contain" />
                                <div className="text-lg font-bold tracking-[-0.02em] uppercase text-slate-800 dark:text-slate-100">
                                    Bison Frame
                                </div>
                            </Link>
                            <button 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="px-6 py-8 flex flex-col gap-6 font-body flex-1 overflow-y-auto">
                            <div className="flex flex-col gap-4">
                                {navLinks.map((link) => (
                                    <Link 
                                        key={link.path}
                                        to={link.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="block text-2xl font-bold text-slate-800 dark:text-slate-100 py-3 border-b border-slate-50 dark:border-slate-900"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                            
                            <div className="flex flex-col gap-4 mt-auto pt-8">
                                <button 
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        onLoginClick();
                                    }}
                                    className="w-full py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-lg text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                >
                                    Log ind
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        navigate('/register');
                                    }}
                                    className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-lg text-center hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-lg"
                                >
                                    Prøv gratis i en måned
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}

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

            {/* Mobile Dropdown Menu Container */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ 
                            opacity: 1, 
                            height: 'auto',
                            transition: {
                                height: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                                opacity: { duration: 0.2, delay: 0.1 }
                            }
                        }}
                        exit={{ 
                            opacity: 0, 
                            height: 0,
                            transition: {
                                height: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                                opacity: { duration: 0.1 }
                            }
                        }}
                        className="absolute top-full left-0 w-full md:hidden bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 shadow-2xl z-50 overflow-hidden"
                        style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}
                    >
                        <div className="px-6 py-6 flex flex-col gap-4 font-body bg-white dark:bg-slate-950 w-full h-full relative z-50">
                            {navLinks.map((link) => (
                                <motion.div 
                                    key={link.path}
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 28 } }}
                                    exit={{ opacity: 0, y: -8, transition: { duration: 0.1 } }}
                                >
                                    <Link 
                                        to={link.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="block text-lg font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-2 border-b border-slate-50 dark:border-slate-900 transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </motion.div>
                            ))}
                            
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.3, ease: "easeOut" } }}
                                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                                    className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-900"
                                >
                                <button 
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        onLoginClick();
                                    }}
                                    className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                >
                                    Log ind
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        navigate('/register');
                                    }}
                                    className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-center hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
                                >
                                    Prøv gratis i en måned
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Modal = ({ isOpen, onClose, title, content }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]"
                    >
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h2>
                            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
                            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                                {content}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default function Footer() {
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

    const placeholderText = (
        <div className="space-y-4">
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mt-6 mb-2">1. Section Heading</h3>
            <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
            <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.</p>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mt-6 mb-2">2. Another Section</h3>
            <p>Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.</p>
            <p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.</p>
            <p>Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.</p>
        </div>
    );

    return (
        <>
            <footer className="bg-slate-100 dark:bg-slate-900 font-inter text-sm tracking-wide text-slate-500 dark:text-slate-400 w-full py-16 px-8 mt-auto z-10 relative">
                <div className="flex flex-col gap-12 max-w-[1440px] mx-auto min-h-[160px]">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-12 w-full">
                        <div className="flex flex-col max-w-[320px]">
                            <div className="text-md font-bold text-slate-700 dark:text-slate-200 mb-6">
                                Bison Frame
                            </div>
                            <p className="mt-4 leading-relaxed">Præcise overslag til den moderne håndværker. Spar mere tid i hverdagen, og vind flere opgaver hos kunden.</p>
                        </div>
                        <div className="flex flex-row flex-wrap gap-x-12 gap-y-6 justify-start md:justify-end md:items-start text-xs font-semibold sm:text-sm text-slate-500 dark:text-slate-400 pt-1">
                            <Link className="underline decoration-blue-300/70 underline-offset-[6px] hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 text-inherit" to="/features">Funktioner</Link>
                            <Link className="underline decoration-blue-300/70 underline-offset-[6px] hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 text-inherit" to="/pricing">Priser</Link>
                            <button onClick={() => setIsTermsOpen(true)} className="underline decoration-blue-300/70 underline-offset-[6px] hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 appearance-none bg-transparent border-none p-0 outline-none text-inherit font-inherit">Handelsbetingelser</button>
                            <button onClick={() => setIsPrivacyOpen(true)} className="underline decoration-blue-300/70 underline-offset-[6px] hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 appearance-none bg-transparent border-none p-0 outline-none text-inherit font-inherit">Privatlivspolitik</button>
                            <button onClick={() => window.location.href='mailto:support@blueprintsystems.com'} className="underline decoration-blue-300/70 underline-offset-[6px] hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 appearance-none bg-transparent border-none p-0 outline-none text-inherit font-inherit">Kontakt Support</button>
                        </div>
                    </div>
                
                    <div className="w-full mt-12 pt-8 border-t border-outline-variant/10 text-center md:text-left">
                        © 2026 Bison Frame. Alle rettigheder forbeholdes.
                    </div>
                </div>
            </footer>

            {/* Modals for Terms & Privacy */}
            <Modal 
                isOpen={isTermsOpen} 
                onClose={() => setIsTermsOpen(false)} 
                title="Handelsbetingelser" 
                content={placeholderText} 
            />
            <Modal 
                isOpen={isPrivacyOpen} 
                onClose={() => setIsPrivacyOpen(false)} 
                title="Privatlivspolitik" 
                content={placeholderText} 
            />
        </>
    );
}

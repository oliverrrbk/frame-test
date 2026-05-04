import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, ArrowRight, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ROICalculator() {
    const navigate = useNavigate();
    const [quotesPerWeek, setQuotesPerWeek] = useState(5);
    const [hoursPerQuote, setHoursPerQuote] = useState(2);
    const [hourlyRate, setHourlyRate] = useState(550);

    // Beregninger
    const weeksPerMonth = 4.33;
    const totalHoursMonth = quotesPerWeek * hoursPerQuote * weeksPerMonth;
    const totalCostMonth = totalHoursMonth * hourlyRate;
    
    // Antagelse: Vi fjerner 30% dårlige leads/spildtid
    const savedHoursMonth = totalHoursMonth * 0.3;
    const savedMoneyMonth = savedHoursMonth * hourlyRate;

    return (
        <div className="w-full max-w-4xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-[2rem] border border-white/40 dark:border-slate-700/50 overflow-hidden flex flex-col xl:flex-row shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            {/* Venstre side: Sliders */}
            <div className="w-full xl:w-1/2 p-6 xl:p-8 bg-white/40 dark:bg-slate-800/40 border-r border-white/30 dark:border-slate-700/50">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shrink-0">
                        <Calculator size={20} />
                    </div>
                    <h3 className="text-xl xl:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Hvad koster tilbud dig?</h3>
                </div>

                <div className="space-y-6">
                    {/* Slider 1 */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="font-semibold text-sm text-slate-700 dark:text-slate-300">Tilbud pr. uge</label>
                            <span className="text-base font-bold text-blue-600 dark:text-blue-400">{quotesPerWeek} stk.</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" max="20" 
                            value={quotesPerWeek} 
                            onChange={(e) => setQuotesPerWeek(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hvor mange overslag/tilbud laver du i snit?</p>
                    </div>

                    {/* Slider 2 */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="font-semibold text-sm text-slate-700 dark:text-slate-300">Tid pr. tilbud</label>
                            <span className="text-base font-bold text-blue-600 dark:text-blue-400">{hoursPerQuote} timer</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.5" max="5" step="0.5"
                            value={hoursPerQuote} 
                            onChange={(e) => setHoursPerQuote(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Inkl. besigtigelse og tid på kontoret</p>
                    </div>

                    {/* Slider 3 */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="font-semibold text-sm text-slate-700 dark:text-slate-300">Din timepris</label>
                            <span className="text-base font-bold text-blue-600 dark:text-blue-400">{hourlyRate} kr.</span>
                        </div>
                        <input 
                            type="range" 
                            min="300" max="1000" step="50"
                            value={hourlyRate} 
                            onChange={(e) => setHourlyRate(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                    </div>
                </div>
            </div>

            {/* Højre side: Resultater og Konvertering */}
            <div className="w-full xl:w-1/2 p-6 xl:p-8 flex flex-col justify-center relative overflow-hidden bg-transparent">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 dark:bg-green-400/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="mb-6">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            Din pris for at give tilbud <Clock size={14} className="text-slate-400" />
                        </p>
                        <p className="text-2xl xl:text-3xl font-bold text-slate-900 dark:text-slate-100">
                            {Math.round(totalCostMonth).toLocaleString('da-DK')} <span className="text-base text-slate-500 font-medium">kr. / mdr</span>
                        </p>
                        <p className="text-xs xl:text-sm text-slate-500 mt-1">Værdien af din tid brugt på at besigtige og regne på opgaver.</p>
                    </div>

                    <div className="bg-green-50/60 dark:bg-green-900/30 backdrop-blur-md rounded-2xl p-5 border border-green-500/20 dark:border-green-800/40 mb-6 shadow-sm">
                        <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            Frigivet tid med systemet <TrendingUp size={14} />
                        </p>
                        <p className="text-3xl xl:text-4xl font-black text-green-600 dark:text-green-400 mb-2">
                            {Math.round(savedMoneyMonth).toLocaleString('da-DK')} <span className="text-lg xl:text-xl text-green-700/70 dark:text-green-500/70 font-bold">kr.</span>
                        </p>
                        <p className="text-xs xl:text-sm text-green-800 dark:text-green-300">
                            Du kan i gennemsnit frigive <strong>{Math.round(savedHoursMonth)} timer</strong> om måneden ved at lade kunden beregne overslaget selv.
                        </p>
                    </div>

                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/register')}
                        className="w-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-6 py-3 xl:py-4 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors duration-300 shadow-md flex items-center justify-center gap-2 group"
                    >
                        Opret en gratis bruger her
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                </div>
            </div>
        </div>
    );
}

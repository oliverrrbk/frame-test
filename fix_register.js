const fs = require('fs');
const file = 'src/components/Auth/Register.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetIndex = content.indexOf('    if (isSuccess) {');

if (targetIndex !== -1) {
    const newContent = `    if (isSuccess) {
        return (
            <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 p-8 md:p-12 max-w-lg w-full text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-500"></div>
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100 dark:border-emerald-500/20">
                        <Mail size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">Tjek din e-mail</h2>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                        Tak for din oprettelse! Vi har sendt en bekræftelsesmail til <strong className="text-slate-900 dark:text-slate-200">{email}</strong>. Klik på linket i mailen for at aktivere din platform.
                    </p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8">
                        Husk at tjekke dit spam-filter, hvis du ikke kan finde den.
                    </p>
                    <Link to="/" className="inline-flex items-center justify-center bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold px-6 py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg">
                        Gå tilbage til forsiden
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-body text-slate-900 dark:text-slate-100">
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-500/10 dark:bg-orange-500/20 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="w-full max-w-[640px] relative z-10">
                <div className="mb-8 flex justify-center md:justify-start">
                    <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                        <ArrowLeft size={16} />
                        Tilbage til forsiden
                    </Link>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 md:p-12">
                        <div className="flex flex-col items-center mb-10 text-center">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-100 dark:border-slate-700">
                                <img src="/logo.png" alt="Bison Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight mb-2">Opret tømrer-system</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Få fuld adgang til Bison Frame på under 1 minut.</p>
                        </div>
                        
                        <form onSubmit={handleRegister} className="flex flex-col gap-6">
                            {errorMsg && (
                                <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium border border-red-100 dark:border-red-500/20 text-center">
                                    {errorMsg}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Firmanavn */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Firmanavn *</label>
                                    <div className="relative">
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" placeholder="Dit Firma ApS" value={companyName} onChange={e=>setCompanyName(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>

                                {/* CVR */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">CVR-nummer *</label>
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" placeholder="12345678" value={cvr} onChange={e=>setCvr(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>

                                {/* Ejer */}
                                <div className="flex flex-col gap-1.5 md:col-span-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Kontaktperson *</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" placeholder="Jens Jensen" value={ownerName} onChange={e=>setOwnerName(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>

                                {/* Adresse */}
                                <div className="flex flex-col gap-1.5 md:col-span-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Firmaadresse *</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                                        {window.google && window.google.maps && window.google.maps.places ? (
                                            <Autocomplete 
                                                onLoad={onLoad} 
                                                onPlaceChanged={onPlaceChanged} 
                                                options={{ 
                                                    componentRestrictions: { country: "dk" },
                                                    fields: ['formatted_address', 'name']
                                                }}
                                            >
                                                <input 
                                                    type="text" 
                                                    placeholder="Søg på firmaets adresse"
                                                    value={address}
                                                    onChange={(e) => {
                                                        setAddress(e.target.value);
                                                        setIsAddressValid(false);
                                                    }}
                                                    required 
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium relative z-0 text-[15px]"
                                                    onKeyDown={(e) => {
                                                        if(e.key === 'Enter') e.preventDefault();
                                                    }}
                                                />
                                            </Autocomplete>
                                        ) : (
                                            <input type="text" placeholder="Byggevej 12, 1234 Byen" value={address} onChange={e=>setAddress(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                        )}
                                    </div>
                                </div>

                                {/* Telefon */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Telefonnummer *</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="tel" placeholder="+45 12 34 56 78" value={phone} onChange={handlePhoneChange} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Bruger E-mail *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="email" placeholder="kontakt@firma.dk" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Adgangskode *</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="password" placeholder="Min. 6 tegn" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Gentag kode *</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="password" placeholder="Min. 6 tegn" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} minLength={6} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[15px]" />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-800 my-2" />

                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Vælg din pakke (30 Dage Gratis) *</label>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md uppercase tracking-wider inline-flex items-center gap-1 w-max">
                                        <CheckCircle2 size={12} /> Intet kort påkrævet
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                    {[
                                        { id: 'basis', name: 'Basis', price: '390' },
                                        { id: 'standard', name: 'Professionel', price: '790' },
                                        { id: 'enterprise', name: 'Enterprise', price: '1.890' }
                                    ].map(tier => (
                                        <button 
                                            key={tier.id}
                                            type="button"
                                            onClick={() => setSelectedTier(tier.id)}
                                            className={\`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all \${
                                                selectedTier === tier.id 
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-sm' 
                                                    : 'border-slate-100 dark:border-slate-800 bg-transparent hover:border-slate-300 dark:hover:border-slate-700'
                                            }\`}
                                        >
                                            {selectedTier === tier.id && (
                                                <div className="absolute -top-2.5 -right-2.5 bg-blue-500 text-white rounded-full p-1 shadow-md">
                                                    <CheckCircle2 size={14} strokeWidth={3} />
                                                </div>
                                            )}
                                            <span className={\`text-[10px] sm:text-xs font-bold mb-1 \${selectedTier === tier.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}\`}>{tier.name}</span>
                                            <span className={\`text-sm sm:text-lg md:text-xl font-black \${selectedTier === tier.id ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}\`}>{tier.price}</span>
                                            <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 mt-0.5">kr / md</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-2">
                                <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 cursor-pointer group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                    <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                                        <input 
                                            type="checkbox" 
                                            className="peer sr-only"
                                            checked={acceptedTerms}
                                            onChange={() => setAcceptedTerms(!acceptedTerms)}
                                        />
                                        <div className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all flex items-center justify-center">
                                            <CheckCircle2 size={14} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                    <p className="text-[11px] sm:text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                                        Jeg accepterer hermed <a href="/Bison_Frame_Vilkaar.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">handelsbetingelserne</a> samt <a href="/Bison_Frame_Databehandleraftale.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Databehandleraftalen (DPA)</a>, og bekræfter, at alle angivne oplysninger er korrekte, samt at Bison Frame optræder som databehandler.
                                    </p>
                                </label>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-[15px] py-4 rounded-xl flex items-center justify-center gap-2 mt-2 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg shadow-slate-900/10 disabled:opacity-70 group">
                                {loading ? 'Opretter system...' : (
                                    <>
                                        Start din gratis prøveperiode nu
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-950 p-6 text-center border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 text-sm mr-2">Har du allerede et system?</span>
                        <Link to="/" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline transition-colors">
                            Log ind her
                        </Link>
                    </div>
                </div>
                
                <div className="text-center mt-8 pb-8">
                    <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Opret nemt din platform. Data lagres krypteret i EU.</p>
                </div>
            </div>
        </div>
    );
};

export default Register;
`;
content = content.substring(0, targetIndex) + newContent;
fs.writeFileSync(file, content, 'utf8');

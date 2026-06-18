import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Droplets, Phone, Calendar, PenTool,  Settings, Package, Users, Globe, Wrench, Menu, LogOut, User, Shield, ShieldAlert, Info, Truck, Check, CheckCircle, MapPin, Link, Bell, MessageSquare, FileText, ExternalLink, UploadCloud, Archive, Mail, Eye, Search, Sliders, CreditCard, Lock, Briefcase, Tent, LayoutGrid, AppWindow, DoorOpen, Layers, ArrowUpToLine, PanelRight, Utensils, PlusSquare, Car, AlignJustify, HardHat, Calculator, Wallet, Clock, RefreshCw, ChevronDown, Play } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GoogleMap, useLoadScript, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { QUESTIONS, initialCategories } from '../Wizard/questionsConfig';
import Wizard from '../Wizard/Wizard';
import { getFeedbackTemplate, getCustomerOfferSentTemplate, getCustomerRequestReceivedTemplate, getCarpenterSenderName } from '../../utils/emailTemplates';
import { generateHumanQuoteText } from '../../utils/quoteTextGenerator';
import { parseBreakdownToExplanation } from '../../utils/explanationGenerator';
import { generateTaskDescription } from '../../utils/taskDescription';
import AiTrainingView from './AiTrainingView';
import TeamManagement from './TeamManagement';
import CaseManagement from './CaseManagement';
import MaterialList from './MaterialList';
import WorkerTimesheet from './WorkerTimesheet';
import AdminTimesheet from './AdminTimesheet';
import WorkerDrafts from './WorkerDrafts';
import ProjectManagerOverview from './ProjectManagerOverview';
import FinanceOverview from './FinanceOverview';
import VoucherAccountConfig from './VoucherAccountConfig';
import OnboardingModal from './OnboardingModal';
import EmployeeOnboardingModal from './EmployeeOnboardingModal';
import SuperAdminView from './SuperAdminView';
import MyProfileView from './MyProfileView';
import SubscriptionSettings from './SubscriptionSettings';
import DashboardOverview from './DashboardOverview';
import WorkerOverview from './WorkerOverview';
import CalculatorFaqAccordion from './CalculatorFaqAccordion';
import MobileQuickShare from './MobileQuickShare';
import CreateLeadSelector from './CreateLeadSelector';
import { useClickOutside } from '../../hooks/useClickOutside';
import { getRoleLabel } from '../../utils/roles';
import CustomProjectCreator from './CustomProjectCreator';
import DrawingsGallery from '../Drawings/DrawingsGallery';
import CalendarView from './CalendarView';
import PwaOnboarding from './PwaOnboarding';
import AccountSettingsView from './AccountSettingsView';
import ChatTab from './ChatTab';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

// Konfiguration til det nye Google Map
const MAP_LIBRARIES = ['places'];
const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '500px'
};
const defaultCenter = { lat: 56.2639, lng: 9.5018 }; // Midten af Danmark

const FormattedNumberInput = ({ value, onChange, placeholder, style }) => {
    const [displayValue, setDisplayValue] = useState(value != null ? new Intl.NumberFormat('da-DK').format(value) : '');

    useEffect(() => {
        setDisplayValue(value != null ? new Intl.NumberFormat('da-DK').format(value) : '');
    }, [value]);

    const handleChange = (e) => {
        const raw = e.target.value;
        setDisplayValue(raw);
        const clean = raw.replace(/\./g, '').replace(/,/g, '.');
        const num = parseFloat(clean);
        if (!isNaN(num)) {
            onChange(num);
        } else if (raw === '') {
            onChange(0);
        }
    };

    const handleBlur = () => {
        if (value != null) {
            setDisplayValue(new Intl.NumberFormat('da-DK').format(value));
        }
    };

    return (
        <input 
            type="text" 
            value={displayValue} 
            onChange={handleChange} 
            onBlur={handleBlur}
            placeholder={placeholder}
            style={style} 
        />
    );
};

const CustomSelect = ({ value, onChange, options, icon: Icon, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); if (!disabled) setIsOpen(!isOpen); }}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: disabled ? 'rgba(0,0,0,0.02)' : 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    {Icon && <Icon size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>
            
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 -10px 25px -5px rgba(0,0,0,0.2), 0 -5px 10px -5px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    maxHeight: '250px',
                    overflowY: 'auto',
                    padding: '6px'
                }}>
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(128,128,128,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            style={{
                                padding: '10px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'background-color 0.15s'
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {option.icon && <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>{option.icon}</span>}
                                {option.label}
                            </span>
                            {value === option.value && <Check size={14} style={{ color: '#3b82f6' }} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const WindowsChecklist = ({ leadId }) => {
    const [checkedItems, setCheckedItems] = useState(() => {
        try {
            const saved = localStorage.getItem(`lead_checklist_${leadId}`);
            return saved ? JSON.parse(saved) : {
                notgang: false,
                greb: false,
                farver: false,
                vinduesplade: false
            };
        } catch (e) {
            return {
                notgang: false,
                greb: false,
                farver: false,
                vinduesplade: false
            };
        }
    });

    useEffect(() => {
        try {
            const saved = localStorage.getItem(`lead_checklist_${leadId}`);
            if (saved) {
                setCheckedItems(JSON.parse(saved));
            } else {
                setCheckedItems({
                    notgang: false,
                    greb: false,
                    farver: false,
                    vinduesplade: false
                });
            }
        } catch (e) {
            // fallback
        }
    }, [leadId]);

    const handleCheckboxChange = (key) => {
        const updated = { ...checkedItems, [key]: !checkedItems[key] };
        setCheckedItems(updated);
        localStorage.setItem(`lead_checklist_${leadId}`, JSON.stringify(updated));
    };

    return (
        <div style={{ 
            marginTop: '24px', 
            padding: '20px', 
            backgroundColor: '#f0f9ff', 
            border: '1px solid #bae6fd', 
            borderRadius: '14px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <strong style={{ color: '#0369a1', fontSize: '1.1rem' }}>Tømrerens Huskepunkter (Vinduer)</strong>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#0284c7', fontStyle: 'italic' }}>
                Intern huskeliste under opmåling/besigtigelse – kun synlig for dig på dashboardet.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.95rem', color: '#0f172a', cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                        type="checkbox" 
                        checked={checkedItems.notgang} 
                        onChange={() => handleCheckboxChange('notgang')} 
                        style={{ marginTop: '3px', width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0284c7' }}
                    />
                    <div>
                        <strong>Notgang:</strong> Husk at afklare om der skal fræses notgang i karmene til lysning.
                    </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.95rem', color: '#0f172a', cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                        type="checkbox" 
                        checked={checkedItems.greb} 
                        onChange={() => handleCheckboxChange('greb')} 
                        style={{ marginTop: '3px', width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0284c7' }}
                    />
                    <div>
                        <strong>Håndtag / Greb:</strong> Noter model, farve og eventuel børnesikring.
                    </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.95rem', color: '#0f172a', cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                        type="checkbox" 
                        checked={checkedItems.farver} 
                        onChange={() => handleCheckboxChange('farver')} 
                        style={{ marginTop: '3px', width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0284c7' }}
                    />
                    <div>
                        <strong>Farve (Ude/Inde):</strong> Bekræft RAL-koderne for de 2-farvede profiler.
                    </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.95rem', color: '#0f172a', cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                        type="checkbox" 
                        checked={checkedItems.vinduesplade} 
                        onChange={() => handleCheckboxChange('vinduesplade')} 
                        style={{ marginTop: '3px', width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0284c7' }}
                    />
                    <div>
                        <strong>Indvendig vinduesplade:</strong> Tjek om kunden ønsker nye vinduesplader (merpris).
                    </div>
                </label>
            </div>
        </div>
    );
};

const generateShortSummary = (lead) => {
    if (!lead || !lead.raw_data || !lead.raw_data.details) return "Ingen opgavedetaljer tilgængelige.";
    
    const categoryMap = {
        'Nyt Gulv': 'floor', 'Gulv': 'floor', 'Nye Vinduer': 'windows', 'Vinduer': 'windows',
        'Nye Døre': 'doors', 'Døre': 'doors', 'Træterrasse': 'terrace', 'Terrasse': 'terrace',
        'Tagprojekt': 'roof', 'Tag': 'roof', 'Nyt Køkken': 'kitchen', 'Køkken': 'kitchen',
        'Renovering af badeværelse': 'bath', 'Badeværelse': 'bath', 'Nyt Badeværelse': 'bath',
        'Nye Lofter': 'ceilings', 'Lofter': 'ceilings', 'Ny Facadebeklædning': 'facades',
        'Facader': 'facades', 'Tilbygning': 'extensions', 'Anneks': 'annex', 'Annekser & Skure': 'annex',
        'Carport': 'carport', 'Hegn': 'fence'
    };
    
    const cat = categoryMap[lead.project_category] || lead.project_category;
    const d = lead.raw_data.details;
    
    const amount = d.amount || d.area || d.roofAmount || d.facadeAmount || d.length || d.fenceLength || d.windowAmount || d.doorAmount || 0;
    const material = d.material || d.roofType || d.facadeWood || d.terraceWood || d.floorType || d.doorType || d.kitchenBrand || "";
    
    let text = `Opgaven indebærer `;
    
    switch(cat) {
        case 'fence':
            text += `opsætning af ${amount} meter løbende hegn`;
            if (material) text += ` i ${material}.`; else text += `.`;
            if (d.disposal && d.disposal.toLowerCase().includes('ja')) {
                text += ` Der skal fjernes eksisterende ${d.oldMaterial ? d.oldMaterial.toLowerCase() : 'hegn/beplantning'}, og dette er inkluderet i opgaven.`;
            }
            break;
        case 'roof':
            text += `etablering af ${amount} m² nyt tag`;
            if (material) text += ` med ${material}.`; else text += `.`;
            if (d.disposal && d.disposal.toLowerCase().includes('ja')) {
                text += ` Det eksisterende tag (${d.oldRoofType || 'ukendt type'}) skal pilles ned og bortskaffes først.`;
            }
            break;
        case 'windows':
        case 'doors':
            text += `udskiftning af ${amount} elementer`;
            if (material) text += ` (${material}).`; else text += `.`;
            text += ` Opgaven omfatter både demontering, montering og evt. indvendig finish.`;
            break;
        case 'terrace':
            text += `opbygning af ${amount} m² træterrasse`;
            if (material) text += ` i ${material}.`; else text += `.`;
            if (d.terraceHeight && d.terraceHeight !== 'none') {
                text += ` Terrassen er hævet, hvilket kræver ekstra underkonstruktion.`;
            }
            if (d.disposal && d.disposal.toLowerCase().includes('ja')) {
                text += ` Eksisterende belægning/terrasse skal fjernes først.`;
            }
            break;
        case 'floor':
            text += `lægning af ${amount} m² nyt gulv`;
            if (material) text += ` i ${material}.`; else text += `.`;
            if (d.disposal && d.disposal.toLowerCase().includes('ja')) {
                text += ` Det eksisterende gulv (${d.oldFloorType || 'ukendt type'}) skal fjernes og bortskaffes inden lægning.`;
            }
            break;
        case 'facades':
            text += `montering af ${amount} m² ny facadebeklædning`;
            if (material) text += ` i ${material}.`; else text += `.`;
            if (d.disposal && d.disposal.toLowerCase().includes('ja')) {
                text += ` Den eksisterende facadebeklædning skal nedrives og bortskaffes som del af opgaven.`;
            }
            break;
        case 'ceilings':
            text += `opsætning af ${amount} m² nye lofter`;
            if (material) text += ` i ${material}.`; else text += `.`;
            if (d.spots === 'Ja') {
                const calcSpots = Math.max(1, Math.round((parseFloat(d.amount) || 0) / 1.75));
                text += ` Opgaven inkluderer forberedelse til ${calcSpots} spots.`;
            }
            break;
        case 'extensions':
        case 'annex':
        case 'carport':
            text += `opbygning af en ny ${lead.project_category}`;
            if (amount) text += ` på ca. ${amount} m².`; else text += `.`;
            if (material) text += ` Kunden ønsker det primært udført i ${material}.`;
            break;
        case 'kitchen':
            text += `montering af nyt køkken`;
            if (material) text += ` fra ${material}.`; else text += `.`;
            if (d.kitchenElements) text += ` Det anslås at indeholde ca. ${d.kitchenElements} elementer, der skal opstilles og justeres.`;
            break;
        case 'bath':
            text += `renovering af badeværelse. Kunden afventer kontakt med henblik på besigtigelse.`;
            break;
        default:
            text += `et projekt inden for ${lead.project_category}`;
            if (amount) text += ` (Omfang: ${amount}).`; else text += `.`;
    }
    
    if (d.notes) {
        text += ` Tjek desuden kundens egne noter for specifikke ønsker.`;
    }
    
    return text;
};

const PdfMobileWrapper = ({ children }) => {
    const [height, setHeight] = useState(1123);
    const [scale, setScale] = useState(1);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(entries => {
            for (let entry of entries) {
                const newHeight = entry.contentRect.height;
                setHeight(newHeight);
                
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    const scaleW = (window.innerWidth * 0.95) / 794;
                    // Action bar is roughly 150px, top padding is 40px.
                    const availableHeight = window.innerHeight - 200;
                    const scaleH = availableHeight / newHeight;
                    // We want the entire PDF to be visible at once! So we take the minimum of scaleW and scaleH.
                    setScale(Math.min(scaleW, scaleH));
                } else {
                    setScale(1);
                }
            }
        });
        ro.observe(containerRef.current);
        
        // Initial setup
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
             const scaleW = (window.innerWidth * 0.95) / 794;
             const scaleH = (window.innerHeight - 200) / 1123;
             setScale(Math.min(scaleW, scaleH));
        }
        
        return () => ro.disconnect();
    }, []);

    const marginHorizontal = scale !== 1 ? -(794 - (794 * scale)) / 2 : 0;
    const marginBottom = scale !== 1 ? -(height - (height * scale)) : 0;

    return (
        <div style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            marginBottom: `${marginBottom}px`,
            marginLeft: `${marginHorizontal}px`,
            marginRight: `${marginHorizontal}px`
        }}>
            <div ref={containerRef} style={{ width: '794px', minWidth: '794px', flexShrink: 0 }}>
                {children}
            </div>
        </div>
    );
};

export const isConfirmedCase = (lead) => {
    if (!lead) return false;
    if (['Bekræftet opgave', 'Historik', 'Afbrudt Sag'].includes(lead.status)) return true;
    if (lead.status === 'Sæt i bero') {
        return !!lead.raw_data?.actual_quote_price || 
               !!lead.raw_data?.audit_trail || 
               !!lead.ordrestyring_case_id || 
               !!lead.apacta_case_id || 
               !!lead.minuba_case_id || 
               (lead.raw_data?.case_logs && lead.raw_data.case_logs.length > 0) || 
               (lead.raw_data?.todo_list && lead.raw_data.todo_list.length > 0) || 
               (lead.raw_data?.assigned_workers && lead.raw_data.assigned_workers.length > 0);
    }
    return false;
};

const Dashboard = () => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const impersonateId = urlParams ? urlParams.get('impersonate') : null;
    
    const [targetCaseId, setTargetCaseId] = useState(null);
    const [targetInvoiceCaseId, setTargetInvoiceCaseId] = useState(null);
    const [chatTargetLeadId, setChatTargetLeadId] = useState(null);
    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem('dashboard_active_tab') || 'overview';
    });

    useEffect(() => {
        localStorage.setItem('dashboard_active_tab', activeTab);
    }, [activeTab]);
    const [settingsData, setSettingsData] = useState(null);
    const [materialsData, setMaterialsData] = useState([]);
    const [disabledCategories, setDisabledCategories] = useState([]);
    const [leadsData, setLeadsData] = useState([]);
    const [geocodedLeads, setGeocodedLeads] = useState({});
    const [leadFilter, setLeadFilter] = useState('Ny forespørgsel');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLead, setSelectedLead] = useState(null);
    const [isCustomerChoicesOpen, setIsCustomerChoicesOpen] = useState(false);
    const [isPriceBasisOpen, setIsPriceBasisOpen] = useState(false);
    const [isMaterialListOpen, setIsMaterialListOpen] = useState(false);
    const [isQuoteEditorOpen, setIsQuoteEditorOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const [isTestWizardOpen, setIsTestWizardOpen] = useState(false);
    
    // DAILY MESSAGE GLOBAL STATE
    const [showDailyMessagePopup, setShowDailyMessagePopup] = useState(false);
    const [unreadDailyMessages, setUnreadDailyMessages] = useState([]);



    useEffect(() => {
        let touchStartX = 0;
        let touchStartY = 0;

        const handleTouchStart = (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        };

        const handleTouchMove = (e) => {
            if (!touchStartX || !touchStartY) return;
            
            const touchEndX = e.touches[0].clientX;
            const touchEndY = e.touches[0].clientY;

            const diffX = touchEndX - touchStartX;
            const diffY = Math.abs(touchEndY - touchStartY);

            // Tjek om vi swiper fra den absolutte venstre kant (inden for 30 pixels)
            if (touchStartX < 30) {
                // Hvis swipe går mod højre, er længere end 50px og er primært vandret
                if (diffX > 50 && diffX > diffY * 1.5) {
                    setIsMobileMenuOpen(true);
                    touchStartX = 0; // forhindrer dobbelt-trigger
                    touchStartY = 0;
                }
            }
        };

        const handleTouchEnd = () => {
            touchStartX = 0;
            touchStartY = 0;
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    useEffect(() => {
        if (selectedLead) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [selectedLead]);

    // Håndter åbning af specifik opgave via URL fra e-mail (deep linking)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlLeadId = params.get('leadId');
        if (urlLeadId && leadsData.length > 0 && !selectedLead) {
            const leadToSelect = leadsData.find(l => String(l.id) === urlLeadId || String(l.quote_token) === urlLeadId);
            if (leadToSelect) {
                setSelectedLead(leadToSelect);
                
                // Marker med det samme som læst hvis den ikke er læst endnu
                if (leadToSelect.is_read === false) {
                    setLeadsData(prev => prev.map(l => l.id === leadToSelect.id ? { ...l, is_read: true } : l));
                    (async () => {
                        try {
                            await supabase.from('leads').update({ is_read: true }).eq('id', leadToSelect.id);
                        } catch (err) {
                            console.error('Kunne ikke markere deep-linked lead som læst:', err);
                        }
                    })();
                }
                
                // Fjern parameteren fra URL'en, så den ikke bliver ved med at poppe op ved refresh
                const newUrl = new URL(window.location);
                newUrl.searchParams.delete('leadId');
                window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
            }
        }
    }, [leadsData, selectedLead]);

    const [isSaving, setIsSaving] = useState(false);
    const [expandedIntegration, setExpandedIntegration] = useState(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingPortrait, setIsUploadingPortrait] = useState(false);
    
    // myProfile er den person, der fysisk er logget ind (f.eks. Oliver)
    const [myProfile, setMyProfile] = useState(null);

    // Global ulæst-tæller til chat (vises som badge i menuen, à la Messenger).
    const [chatUnreadCount, setChatUnreadCount] = useState(0);
    const chatUnreadRefreshRef = useRef(null);
    useEffect(() => {
        const uid = myProfile?.id;
        if (!uid) return;
        const compute = async () => {
            try {
                const { data: parts } = await supabase
                    .from('chat_participants')
                    .select('thread_id, last_read_at')
                    .eq('user_id', uid);
                if (!parts || parts.length === 0) { setChatUnreadCount(0); return; }
                let total = 0;
                await Promise.all(parts.map(async (p) => {
                    let q = supabase
                        .from('chat_messages')
                        .select('id', { count: 'exact', head: true })
                        .eq('thread_id', p.thread_id)
                        .neq('sender_id', uid);
                    if (p.last_read_at) q = q.gt('created_at', p.last_read_at);
                    const { count } = await q;
                    total += count || 0;
                }));
                setChatUnreadCount(total);
            } catch {
                setChatUnreadCount(0); // last_read_at mangler måske endnu (kør setup_chat_notifications.sql)
            }
        };
        chatUnreadRefreshRef.current = compute;
        compute();
        const ch = supabase
            .channel('chat_unread_global')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
                if (payload?.new?.sender_id !== uid) compute();
            })
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [myProfile?.id]);
    
    // Test Simulator: Rolle-simulering for localhost
    const [simulatedRole, setSimulatedRole] = useState(null);
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    
    // carpenterProfile er firmaet (Mester), som dataene tilhører
    const [carpenterProfile, setCarpenterProfile] = useState(null);
    
    const [isDashboardLoaded, setIsDashboardLoaded] = useState(false);
    const [isLeadsLoading, setIsLeadsLoading] = useState(false);
    const [isMaterialsLoading, setIsMaterialsLoading] = useState(false);
    const [expandedMaterialCategories, setExpandedMaterialCategories] = useState({});
    const [dbDebugLog, setDbDebugLog] = useState('');
    const [selectedPdfFile, setSelectedPdfFile] = useState(null);
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showSetPassword, setShowSetPassword] = useState(false);
    
    // Feedback State
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);
    const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);
    const [showCreateLeadCancelConfirm, setShowCreateLeadCancelConfirm] = useState(false);
    const [createLeadMode, setCreateLeadMode] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [mapFilters, setMapFilters] = useState({ showNew: true, showSent: true, showConfirmed: true, showOnHold: true });
    const [selectedMapLead, setSelectedMapLead] = useState(null); // lead vist i info-boblen på kortet

    // Hvilke sager vises på kortet — én fælles, autoritativ liste (whitelist) brugt af
    // både prikker og tælleren, så de altid stemmer overens med filter-knapperne.
    const mapVisibleLeads = useMemo(() => {
        const role = simulatedRole || myProfile?.role || 'admin';
        return (leadsData || []).filter(l => {
            if (['worker', 'apprentice'].includes(role)) {
                if (simulatedRole) return ['Bekræftet opgave', 'Historik'].includes(l.status);
                const workers = l.raw_data?.assigned_workers || [];
                const pmData = l.raw_data?.assigned_pm;
                const pms = Array.isArray(pmData) ? pmData : (pmData ? [pmData] : []);
                return (workers.includes(myProfile?.id) || pms.includes(myProfile?.id)) && ['Bekræftet opgave', 'Historik'].includes(l.status);
            }
            const s = l.status || 'Ny forespørgsel';
            if (s === 'Ny forespørgsel') return mapFilters.showNew;
            if (s === 'Sendt tilbud') return mapFilters.showSent;
            if (s === 'Bekræftet opgave') return mapFilters.showConfirmed;
            if (s === 'Sæt i bero') return mapFilters.showOnHold;
            return false; // Historik, Afbrudt Sag, Slettet, Fortrudt, Afvist m.fl. — skjult
        });
    }, [leadsData, simulatedRole, myProfile, mapFilters]);

    const [quoteBuilder, setQuoteBuilder] = useState(null);
    const [integrationSuccessData, setIntegrationSuccessData] = useState(null);
    const [showEmailPreview, setShowEmailPreview] = useState(false);
    const invoiceRef = useRef(null);
    
    // Auth & Profile
    const [session, setSession] = useState(null);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    // Luk profil-menuen ved klik/tap udenfor eller Escape.
    useClickOutside(profileMenuRef, () => setIsProfileMenuOpen(false), isProfileMenuOpen);

    // Close profile menu when navigating
    useEffect(() => {
        setIsProfileMenuOpen(false);
    }, [activeTab]);

    // Historik auto-check
    const isLeadReadyForHistory = (lead) => {
        if (!lead || lead.status !== 'Bekræftet opgave') return false;
        const laborHours = lead.raw_data?.calc_data?.laborHours || 0;
        const expectedWeeks = Math.max(1, Math.ceil(laborHours / 37));
        const totalWeeksAllowed = 4 + expectedWeeks + 2; 
        const createdDate = new Date(lead.created_at);
        const now = new Date();
        const weeksPassed = (now - createdDate) / (1000 * 60 * 60 * 24 * 7);
        return weeksPassed > totalWeeksAllowed;
    };

    // Google Maps Loader (bruger Miljøvariabel og samme indstillinger som App.jsx for at undgå konflikter)
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        id: 'google-map-script',
        libraries: MAP_LIBRARIES
    });

    useEffect(() => {
        setIsProfileMenuOpen(false);
    }, [activeTab]);

    useEffect(() => {
        // Tjek URL parametre først
        const params = new URLSearchParams(window.location.search);
        
        // DAILY MESSAGE AUTO-CHECK
        if (myProfile && leadsData && leadsData.length > 0) {
            const effectiveRole = simulatedRole || myProfile.role;
            const userId = myProfile.id;
            
            const userLeads = leadsData.filter(lead => {
                if (['admin', 'accountant', 'boss'].includes(effectiveRole)) return true;
                if (effectiveRole === 'sales') {
                    return (lead.raw_data?.assigned_pm || []).includes(userId);
                }
                const assignedWorkers = lead.raw_data?.assigned_workers || [];
                return assignedWorkers.includes(userId);
            });

            const unreadMessages = [];
            
            userLeads.forEach(lead => {
                const msg = lead.raw_data?.daily_message;
                if (msg && msg.date) {
                    const msgDate = new Date(msg.date).toDateString();
                    const today = new Date().toDateString();
                    
                    if (msgDate === today) {
                        const seenBy = msg.seen_by || [];
                        if (!seenBy.includes(userId)) {
                            unreadMessages.push({
                                leadId: lead.id,
                                caseNumber: lead.case_number || String(lead.id).substring(0,8),
                                title: lead.raw_data?.project_title || lead.raw_data?.details?.title || lead.project_category || 'Skræddersyet opgave',
                                text: msg.text,
                                author: msg.author
                            });
                        }
                    }
                }
            });
            
            if (unreadMessages.length > 0) {
                setUnreadDailyMessages(unreadMessages);
                setShowDailyMessagePopup(true);
            } else {
                setShowDailyMessagePopup(false);
            }
        }
        
        const tabParam = params.get('tab');
        if (tabParam === 'Bekræftet opgave') {
            setActiveTab('leads');
            setLeadFilter('Bekræftet opgave');
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('tab');
            window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
        } else if (tabParam === 'leads') {
            setActiveTab('leads');
            setLeadFilter('Ny forespørgsel');
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('tab');
            window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
        } else if (tabParam === 'timesheet' && myProfile) {
            const effectiveRole = simulatedRole || myProfile.role;
            if (['admin', 'accountant'].includes(effectiveRole)) {
                setActiveTab('admin_timesheet');
            } else {
                setActiveTab('worker_timesheet');
            }
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('tab');
            window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
        } else if (tabParam === 'calendar') {
            setActiveTab('calendar');
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('tab');
            window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
        } else if (tabParam === 'integrations') {
            setActiveTab('integrations');
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('tab');
            window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
        } else if (tabParam === 'chat') {
            setActiveTab('chat');
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('tab');
            window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
        }

        // Global URL parametre
        const code = params.get('code');
        const state = params.get('state');

        // Tjek for Minuba OAuth Callback
        const minubaIntegration = params.get('integration');
        
        // Tjek for e-conomic Auth Callback
        const token = params.get('token');
        
        const isAuthCallback = (code && state === 'dinero') || (code && minubaIntegration === 'minuba') || token;

        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            if (session) {
                let authHandled = false;

                if (code && minubaIntegration === 'minuba') {
                    authHandled = true;
                    setActiveTab('integrations');
                    window.history.replaceState({}, document.title, window.location.pathname);
                    setCarpenterProfile(prev => prev ? {...prev, minuba_api_key: 'pending_authorization'} : null);
                    
                    const redirectUri = 'https://bisonframe.dk/dashboard?integration=minuba';
                        
                    const { data, error } = await supabase.functions.invoke('minuba-auth', {
                        body: { code: code, redirectUri: redirectUri }
                    });
                    
                    if (error) {
                        toast.error("Der skete en fejl under godkendelse hos Minuba. Prøv venligst igen.");
                    } else {
                        toast.success("Minuba er nu forbundet!");
                    }
                }
                
                if (code && state === 'dinero') {
                    authHandled = true;
                    setActiveTab('integrations');
                    window.history.replaceState({}, document.title, window.location.pathname);
                    setCarpenterProfile(prev => prev ? {...prev, dinero_api_key: 'pending_authorization'} : null);
                    
                    const redirectUri = window.location.origin.includes('localhost') 
                        ? 'http://localhost:5173/dashboard?tab=integrations' 
                        : 'https://app.bisonframe.dk/dashboard?tab=integrations';
                        
                    const { data, error } = await supabase.functions.invoke('dinero-auth', {
                        body: { code: code, redirectUri: redirectUri }
                    });
                    
                    if (error) {
                        toast.error(`Fejl hos Dinero: ${error.message || JSON.stringify(error)}`);
                    } else {
                        toast.success("Dinero er nu forbundet!");
                    }
                }
                
                if (token) {
                    authHandled = true;
                    setActiveTab('integrations');
                    window.history.replaceState({}, document.title, window.location.pathname);
                    setCarpenterProfile(prev => prev ? {...prev, economic_api_key: 'pending_authorization'} : null);
                    
                    const { error } = await supabase.functions.invoke('economic-auth', {
                        body: { token: token }
                    });
                    
                    if (error) {
                        toast.error("Der skete en fejl under godkendelse hos e-conomic. Prøv venligst igen.");
                    } else {
                        toast.success("e-conomic er nu forbundet!");
                    }
                }

                // Efter eventuel auth processering, hent data (sikrer at ny token er gemt først)
                initProfileAndData(session.user);
            }
        });
    }, [activeTab]); // React overvåger også activeTab nu for at refreshe

    // Google Maps Geocoding - Finder automatisk koordinater på leads i baggrunden formidabelt fuzzy!
    useEffect(() => {
        if (!isLoaded || leadsData.length === 0) return;
        
        const toGeocode = leadsData.filter(l => l.customer_address && geocodedLeads[l.id] === undefined);
        if (toGeocode.length === 0) return;

        const performGeocoding = async () => {
            const geocoder = new window.google.maps.Geocoder();
            let updated = {...geocodedLeads};
            
            // Lokalt cache-objekt for at spare på Google Maps kald ved ens adresser
            const addressCache = {};
            
            for (const lead of toGeocode) {
                try {
                    let baseLocation = null;
                    
                    // Tjek om vi allerede har slået denne adresse op i dette loop
                    if (addressCache[lead.customer_address]) {
                        baseLocation = addressCache[lead.customer_address];
                    } else {
                        // Kald Google's geocoder
                        const response = await geocoder.geocode({ 
                            address: lead.customer_address,
                            componentRestrictions: { country: "DK" }
                        });
                        
                        if (response.results && response.results.length > 0) {
                            baseLocation = response.results[0].geometry.location;
                            addressCache[lead.customer_address] = baseLocation;
                        }
                        
                        // Delay kun når vi reelt rammer API'et (4 requests pr. sekund)
                        await new Promise(r => setTimeout(r, 250));
                    }
                    
                    if (baseLocation) {
                        // Tilføj en minimal "jitter" (ca. 10-20 meter) så leads på samme adresse ikke ligger oveni hinanden 100%
                        const jitterLat = (Math.random() - 0.5) * 0.0003;
                        const jitterLng = (Math.random() - 0.5) * 0.0003;
                        
                        // Håndtér forskellen på rigtigt Google objekt vs vores locale cache objekt (som måske kun er lat/lng tal hvis vi udvidede den senere)
                        const lat = typeof baseLocation.lat === 'function' ? baseLocation.lat() : baseLocation.lat;
                        const lng = typeof baseLocation.lng === 'function' ? baseLocation.lng() : baseLocation.lng;
                        
                        updated[lead.id] = { lat: lat + jitterLat, lng: lng + jitterLng }; 
                    } else {
                        updated[lead.id] = null; // Markerer som null, hvis adr er fuldstændig uforståelig
                    }
                } catch (err) {
                    console.error("Google Geocoder fejl:", err);
                    if (err?.code === 'OVER_QUERY_LIMIT') {
                        console.warn("Ramte Google Maps Rate Limit. Stopper geocoding batch.");
                        break; // Stop løkken, lad systemet prøve igen senere uden at gemme null
                    } else {
                        updated[lead.id] = null;
                    }
                }
            }
            setGeocodedLeads(prev => ({...prev, ...updated}));
        };
        performGeocoding();
    }, [leadsData, geocodedLeads, isLoaded]);

    useEffect(() => {
        if (selectedLead && selectedLead.raw_data) {
            const cat = selectedLead.raw_data.category;
            const cName = categoryNames[cat] || cat;
            const defaultMessage = generateHumanQuoteText(cat, selectedLead.raw_data.details, cName);

            const calc = selectedLead.raw_data.calc_data || {};

            let initialCustomLines = (calc.customLines || []).filter(line => 
                line.description !== 'Ekstra materialer (smådele) & Sikkerhedsbuffer' && 
                line.description !== 'System-rabat / Afrunding'
            );
            const activeHourlyRate = calc.hourlyRate || carpenterProfile?.hourly_rate || 500;
            const activeLaborHours = calc.laborHours || 0;
            // NYT: Dekonstruering af materialepris
            const defaultMarkup = settingsData?.material_markup || 1.15;
            let activeMaterialCostBase = calc.materialCostBase;
            let activeMaterialMarkup = calc.materialMarkup;
            
            if (activeMaterialCostBase === undefined) {
                // Legacy support: Regn baglæns fra AI'ens estimerede pris, da den allerede indeholder avance
                const costInclMarkup = calc.materialCost || 0;
                activeMaterialCostBase = Math.round(costInclMarkup / defaultMarkup);
                activeMaterialMarkup = defaultMarkup;
            }
            
            const activeMaterialCost = calc.materialCost || 0;
            const activeDrivingCost = calc.drivingCost || 0;
            
            let activeExtraMaterialsCost = calc.extraMaterialsCost !== undefined ? calc.extraMaterialsCost : 0;
            
            // Udregn differencen mellem de rå materialer/timer og det endelige kundetilbud (bagudkompatibilitet)
            if (calc.finalEstimateExVat && calc.extraMaterialsCost === undefined) {
                const baseExVat = (activeLaborHours * activeHourlyRate) + activeMaterialCost + activeDrivingCost;
                activeExtraMaterialsCost = calc.finalEstimateExVat - baseExVat;
            }

            const isKombi = calc.isKombi || cat === 'Kombi-projekt';
            let initialSubprojects = [];
            if (isKombi && Array.isArray(calc.projects)) {
                initialSubprojects = calc.projects.map(p => {
                    const subCost = p.result?.calcData?.materialCost || p.materialCost || 0;
                    const subCostBase = p.materialCostBase !== undefined ? p.materialCostBase : Math.round(subCost / defaultMarkup);
                    const subMarkup = p.materialMarkup !== undefined ? p.materialMarkup : defaultMarkup;
                    
                    return {
                        id: p.id,
                        category: p.category,
                        title: categoryNames[p.category] || p.category,
                        laborHours: p.result?.calcData?.laborHours || p.laborHours || 0,
                        materialCost: subCost,
                        materialCostBase: subCostBase,
                        materialMarkup: subMarkup
                    };
                });
            }

            setQuoteBuilder({
                laborHours: activeLaborHours,
                hourlyRate: activeHourlyRate,
                materialCostBase: activeMaterialCostBase,
                materialMarkup: activeMaterialMarkup,
                materialCost: activeMaterialCost,
                drivingCost: activeDrivingCost,
                extraMaterialsCost: activeExtraMaterialsCost,
                customLines: initialCustomLines, 
                showPreview: false,
                isGeneratingPdf: false,
                showDetailedBreakdown: false, // Nu skjult som standard
                validityDays: 14,
                customMessage: defaultMessage,
                isKombi: isKombi,
                subprojects: initialSubprojects
            });
        } else {
            setQuoteBuilder(null);
        }
    }, [selectedLead, carpenterProfile]);

    const handleAcknowledgeDailyMessages = async () => {
        if (!myProfile) return;
        const userId = myProfile.id;
        
        setShowDailyMessagePopup(false);
        
        const updatedLeads = [...leadsData];
        for (const unreadMsg of unreadDailyMessages) {
            const leadIndex = updatedLeads.findIndex(l => l.id === unreadMsg.leadId);
            if (leadIndex !== -1) {
                const lead = updatedLeads[leadIndex];
                const { data: latestData } = await supabase.from('leads').select('raw_data').eq('id', lead.id).single();
                const currentRawData = latestData?.raw_data || lead.raw_data || {};
                
                const newMsgData = {
                    ...(currentRawData.daily_message || {}),
                    seen_by: [...((currentRawData.daily_message || {}).seen_by || []), userId]
                };
                const newRawData = { ...currentRawData, daily_message: newMsgData };
                
                updatedLeads[leadIndex] = { ...lead, raw_data: newRawData };
                await supabase.from('leads').update({ raw_data: newRawData }).eq('id', lead.id);
            }
        }
        setLeadsData(updatedLeads);
    };

    const refreshData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await initProfileAndData(session.user);
        }
    };
    
    const { isRefreshing, pullProgress } = usePullToRefresh(refreshData);

    useEffect(() => {
        if (!myProfile) return;
        
        let targetId = myProfile.company_id || myProfile.id;
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const impId = urlParams ? urlParams.get('impersonate') : null;
        if (impId && myProfile.email === 'team@bisoncompany.dk') {
            targetId = impId;
        }

        // Svende/lærlinge i produktion abonnerer IKKE på realtime: payloaden bærer
        // hele rækken (inkl. pris) over websocket. De opdateres i stedet når appen
        // kommer i fokus — så prisdata aldrig leveres til dem (audit #6).
        const isDevEnv = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isWorkerRole = (myProfile.role === 'worker' || myProfile.role === 'apprentice');
        if (!isDevEnv && isWorkerRole) {
            const onVisible = () => { if (document.visibilityState === 'visible') refreshData(); };
            document.addEventListener('visibilitychange', onVisible);
            return () => document.removeEventListener('visibilitychange', onVisible);
        }

        const subscription = supabase
            .channel('dashboard_leads_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'leads'
            }, (payload) => {
                // For a simpler approach, just refresh when ANY lead changes that we have access to
                // In a production app with thousands of users, you'd want to add filter: `carpenter_id=eq.${targetId}`
                // but since we have "stranded leads" logic, we just trigger a refresh and let fetchLeads do the filtering.
                refreshData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [myProfile]);


    const initProfileAndData = async (authUser) => {
        const userId = authUser.id;
        // Hent den faktiske indloggede brugers profil først
        const { data: myDbProfile } = await supabase.from('carpenters').select('*').eq('id', userId).single();
        if (myDbProfile) {
            setMyProfile(myDbProfile);
        }
        
        // Find ud af hvilket firma dashboardet skal vise (targetId)
        let targetId = userId;
        if (impersonateId && authUser.email === 'team@bisoncompany.dk') {
            targetId = impersonateId;
        }

        // 1. Slå virksomhedsprofil op (den der vises på skærmen)
        let userProfile;
        const { data: profile } = await supabase.from('carpenters').select('*').eq('id', targetId).single();
        
        if (profile) {
            const { data: secrets } = await supabase.from('carpenter_secrets').select('*').eq('carpenter_id', profile.company_id || profile.id).single();
            if (secrets) {
                profile.economic_api_key = secrets.economic_api_key;
                profile.dinero_api_key = secrets.dinero_api_key;
                profile.ordrestyring_api_key = secrets.ordrestyring_api_key;
                profile.apacta_api_key = secrets.apacta_api_key;
                profile.minuba_api_key = secrets.minuba_api_key;
            }
            
            userProfile = profile;
        } else {
            if (authUser?.email === 'team@bisoncompany.dk' && !impersonateId) {
                // Admin skal ikke have oprettet en tømrer-profil, men sendes til Admin panelet
                window.location.href = '/admin';
                return;
            }

            // Første gang tømreren/medarbejderen logger ind, skabes hans profil ud fra auth metadata!
            const metadata = authUser?.user_metadata || {};
            const baseSlug = metadata.company_name 
                ? metadata.company_name.toLowerCase().replace(/[^a-z0-9æøå-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') 
                : 'tomrer';
            const randomSuffix = Math.floor(Math.random() * 10000);
            let autoLonnummer = null;
            if (metadata.role && metadata.role !== 'admin' && metadata.company_id) {
                const { data: existingTeam } = await supabase.from('carpenters').select('raw_data').eq('company_id', metadata.company_id);
                const { data: adminProfile } = await supabase.from('carpenters').select('raw_data').eq('id', metadata.company_id).single();
                
                const existingNumbers = [
                    ...(existingTeam || []).map(m => m.raw_data?.lonnummer),
                    adminProfile?.raw_data?.lonnummer
                ].filter(Boolean);
                
                const validNumbers = existingNumbers.map(Number).filter(n => !isNaN(n));
                const maxNum = validNumbers.length > 0 ? Math.max(...validNumbers) : 1000;
                autoLonnummer = (maxNum + 1).toString();
            }

            const newProfile = {
                id: targetId,
                slug: `${baseSlug}-${randomSuffix}`,
                company_name: metadata.company_name || 'Min Tømrervirksomhed',
                cvr: metadata.cvr || '',
                owner_name: metadata.owner_name || '',
                address: metadata.address || '',
                phone: metadata.phone || '',
                email: metadata.email || authUser?.email || '',
                role: metadata.role || 'admin',
                company_id: metadata.company_id || null,
                tier: metadata.tier || 'standard',
                raw_data: autoLonnummer ? { lonnummer: autoLonnummer } : {},
                has_completed_onboarding: false,
                requires_password_change: metadata.role && metadata.role !== 'admin' ? true : false,
                success_message: 'Tusind tak for din henvendelse! Vi går tilbuddet igennem hurtigst muligt.'
            };
            const { data, error } = await supabase.from('carpenters').upsert([newProfile], { onConflict: 'id' }).select().single();
            if (error) {
                 console.error("Oprettelsesfejl:", error);
                 if (error.code !== '23505') {
                     toast.error('Profil-Oprettelse i databasen blokeres: ' + JSON.stringify(error));
                 }
            }
            userProfile = data || newProfile;
            
            // Hvis det er min egen profil jeg lige har oprettet via fallback, så husk at sætte myProfile i state
            if (targetId === userId) {
                setMyProfile(userProfile);
            }
        }

        setCarpenterProfile(userProfile);

        // Hvis det er en admin, hent deres medarbejdere til lead-fordeling
        if (userProfile.role === 'admin') {
            const { data: teamData } = await supabase.from('carpenters').select('*').eq('company_id', userProfile.company_id || userProfile.id);
            if (teamData) setTeamMembers(teamData);
        } else if (userProfile.role === 'accountant') {
            setLeadFilter('Bekræftet opgave');
            const { data: adminSecrets } = await supabase.from('carpenter_secrets').select('economic_api_key, dinero_api_key').eq('carpenter_id', userProfile.company_id).single();
            if (adminSecrets) {
                userProfile.economic_api_key = adminSecrets.economic_api_key;
                userProfile.dinero_api_key = adminSecrets.dinero_api_key;
                setCarpenterProfile(userProfile);
            }
        }

        // Tjek Onboarding (Vis kun hvis de mangler det, og det er ejeren selv)
        if (userProfile.role === 'admin' && !userProfile.has_completed_onboarding && !impersonateId) {
            setShowOnboarding(true);
        }
        // Tjek Password Skift (Kun for employees)
        if (userProfile.role !== 'admin' && !userProfile.has_completed_onboarding && !impersonateId) {
            setShowSetPassword(true);
        }

        // --- VIGTIGT: Hvis brugeren er en medarbejder, skal alle data-kald laves mod Mesterens firma-id ---
        if (userProfile.company_id) {
            targetId = userProfile.company_id;
            
            // --- AUTO-MIGRATE: Flyt evt. gamle stranded kladder fra medarbejderens ID til Mesterens ID ---
            const { data: strandedLeads } = await supabase.from('leads').select('id').eq('carpenter_id', userProfile.id);
            if (strandedLeads && strandedLeads.length > 0) {
                console.log(`Auto-migrating ${strandedLeads.length} stranded leads from worker ${userProfile.id} to company ${userProfile.company_id}`);
                await supabase.from('leads').update({ carpenter_id: userProfile.company_id }).eq('carpenter_id', userProfile.id);
            }
        }

        // Hent den speficikke tømrers priser & leads
        if (activeTab === 'settings') {
            const { data } = await supabase.from('settings').select('*').eq('carpenter_id', targetId).limit(1).single();
            
            // Hvis tabellen er tom (fordi SQL-scriptet ikke bandt gamle data fast i tide), hook den gamle række her:
            if (!data) {
                 const { data: oldData } = await supabase.from('settings').select('*').is('carpenter_id', null).limit(1).single();
                 if (oldData) {
                     await supabase.from('settings').update({ carpenter_id: targetId }).eq('id', oldData.id);
                     setSettingsData({ ...oldData, carpenter_id: targetId });
                 } else {
                     // Hvis appen er helt ny og uden indhold overhovedet
                     const { data: insertedData } = await supabase.from('settings').insert([{ carpenter_id: targetId }]).select().single();
                     setSettingsData(insertedData);
                 }
            } else {
                setSettingsData(data);
            }
        }

        if (activeTab === 'materials') {
            if (materialsData.length === 0) {
                setIsMaterialsLoading(true);
            }
            const { data, error: firstSelectError } = await supabase.from('materials').select('*').eq('carpenter_id', targetId).order('category').order('id');
            
            const defaultMaterials = [
                // Tag
                { category: 'roof', name: 'Paptag', price: 450, carpenter_id: targetId },
                { category: 'roof', name: 'Tegl', price: 1100, carpenter_id: targetId },
                { category: 'roof', name: 'Stål', price: 500, carpenter_id: targetId },
                { category: 'roof', name: 'Tagplader (eternit asbest fri)', price: 450, carpenter_id: targetId },
                { category: 'roof', name: 'Decra', price: 600, carpenter_id: targetId },
                { category: 'roof', name: 'Betontagsten', price: 800, carpenter_id: targetId },
                { category: 'roof', name: 'Skiffer (hårdt materiale)', price: 1400, carpenter_id: targetId },
                { category: 'roof', name: 'Skiffer (blødt materiale)', price: 1400, carpenter_id: targetId },
                { category: 'roof', name: 'Tillæg: Stillads 1½-plan / 2-plan', price: 15000, carpenter_id: targetId },
                { category: 'roof', name: 'Tillæg: Stillads (Høj rejsning)', price: 10000, carpenter_id: targetId },
                { category: 'roof', name: 'Opretning af spær (Påforing)', price: 80, carpenter_id: targetId },
                { category: 'roof', name: 'Undertag (dug)', price: 120, carpenter_id: targetId },
                { category: 'roof', name: 'Udhæng/Stern træværk (pr m2 overslag)', price: 150, carpenter_id: targetId },
                { category: 'roof', name: 'Tagrender og nedløb (pr m2 overslag)', price: 180, carpenter_id: targetId },
                { category: 'roof', name: 'Skorstensinddækning (Zink/Bly)', price: 3500, carpenter_id: targetId },
                { category: 'roof', name: 'Ovenlysvindue / Velux (pr. stk)', price: 8500, carpenter_id: targetId },
                { category: 'roof', name: 'Tillæg: Kvist (Inddækning)', price: 10000, carpenter_id: targetId },
                { category: 'roof', name: 'Sikkerhed (Buffer-pris)', price: 500, carpenter_id: targetId },

                // Vinduer
                { category: 'windows', name: 'Træ', price: 6000, carpenter_id: targetId },
                { category: 'windows', name: 'PVC / plast', price: 4500, carpenter_id: targetId },
                { category: 'windows', name: 'Aluminium', price: 8000, carpenter_id: targetId },
                { category: 'windows', name: 'Træ/alu (kombination)', price: 7500, carpenter_id: targetId },
                { category: 'windows', name: 'Dannebrogsvinduer / Sprossevinduer', price: 9000, carpenter_id: targetId },
                { category: 'windows', name: 'Stål', price: 10000, carpenter_id: targetId },
                { category: 'windows', name: 'Glas', price: 9500, carpenter_id: targetId },
                { category: 'windows', name: 'Gerigter (sæt)', price: 400, carpenter_id: targetId },
                { category: 'windows', name: 'Tillæg: Stillads/Lift leje', price: 8000, carpenter_id: targetId },
                { category: 'windows', name: 'Sikkerhed (Buffer-pris)', price: 6000, carpenter_id: targetId },

                // Gulve
                { category: 'floor', name: 'Træ', price: 600, carpenter_id: targetId },
                { category: 'floor', name: 'Massivt træ', price: 1200, carpenter_id: targetId },
                { category: 'floor', name: 'Parket', price: 750, carpenter_id: targetId },
                { category: 'floor', name: 'Sildebensparket', price: 1500, carpenter_id: targetId },
                { category: 'floor', name: 'Laminat', price: 300, carpenter_id: targetId },
                { category: 'floor', name: 'Vinyl', price: 350, carpenter_id: targetId },
                { category: 'floor', name: 'Linoleum', price: 400, carpenter_id: targetId },
                { category: 'floor', name: 'Fliser (keramik/porcelæn)', price: 500, carpenter_id: targetId },
                { category: 'floor', name: 'Natursten', price: 1000, carpenter_id: targetId },
                { category: 'floor', name: 'Beton', price: 800, carpenter_id: targetId },
                { category: 'floor', name: 'Tæppe', price: 250, carpenter_id: targetId },
                { category: 'floor', name: 'Kork', price: 550, carpenter_id: targetId },
                { category: 'floor', name: 'Trinlydsunderlag (Foam)', price: 45, carpenter_id: targetId },
                { category: 'floor', name: 'Opretning af undergulv', price: 120, carpenter_id: targetId },
                { category: 'floor', name: 'Fodlister (pr. m2 gulvareal proxy)', price: 50, carpenter_id: targetId },
                { category: 'floor', name: 'Sikkerhed (Buffer-pris)', price: 400, carpenter_id: targetId },

                // Døre
                { category: 'doors', name: 'Indvendig dør (Celledør)', price: 2500, carpenter_id: targetId },
                { category: 'doors', name: 'Indvendig dør (Massiv)', price: 4500, carpenter_id: targetId },
                { category: 'doors', name: 'Skydedør (Indbygget i væg)', price: 12000, carpenter_id: targetId },
                { category: 'doors', name: 'Dobbeltdør / Fransk dør', price: 14000, carpenter_id: targetId },
                { category: 'doors', name: 'Yderdør (Træ)', price: 8500, carpenter_id: targetId },
                { category: 'doors', name: 'Yderdør (Massivt træ)', price: 12000, carpenter_id: targetId },
                { category: 'doors', name: 'Yderdør (PVC / plast)', price: 6500, carpenter_id: targetId },
                { category: 'doors', name: 'Yderdør (Træ/Alu)', price: 10500, carpenter_id: targetId },
                { category: 'doors', name: 'Dørgreb inkl roset', price: 350, carpenter_id: targetId },
                { category: 'doors', name: 'Sikkerhedslås (Yderdør)', price: 1200, carpenter_id: targetId },
                { category: 'doors', name: 'Dørtrin / Bundstykke', price: 250, carpenter_id: targetId },
                { category: 'doors', name: 'Gerigter (sæt)', price: 300, carpenter_id: targetId },
                { category: 'doors', name: 'Sikkerhed (Buffer-pris)', price: 5500, carpenter_id: targetId },

                // Terrasse
                { category: 'terrace', name: 'Trykimprægneret fyr', price: 250, carpenter_id: targetId },
                { category: 'terrace', name: 'Hardwood / Hårdttræ', price: 900, carpenter_id: targetId },
                { category: 'terrace', name: 'Komposit (vedligeholdelsesfrit biomateriale)', price: 1100, carpenter_id: targetId },
                { category: 'terrace', name: 'Tagterrasse plastfødder (pr m2 overslag)', price: 90, carpenter_id: targetId },
                { category: 'terrace', name: 'Punktfundament og støbemix (pr m2 overslag)', price: 150, carpenter_id: targetId },
                { category: 'terrace', name: 'Rækværk/Gelænder træ (pr løbende meter)', price: 400, carpenter_id: targetId },
                { category: 'terrace', name: 'Beslag til skjult montering (pr m2 overslag)', price: 120, carpenter_id: targetId },
                { category: 'terrace', name: 'Hævet terrasse materialer (pr m2)', price: 250, carpenter_id: targetId },
                { category: 'terrace', name: 'Udskiftning/Opbygning fundament (pr m2)', price: 150, carpenter_id: targetId },
                { category: 'terrace', name: 'Fast tag (med tagpap)', price: 800, carpenter_id: targetId },
                { category: 'terrace', name: 'Termotag / Plast', price: 400, carpenter_id: targetId },
                { category: 'terrace', name: 'Sikkerhed (Buffer-pris)', price: 400, carpenter_id: targetId },

                // Lofter
                { category: 'ceilings', name: 'Træloft (listeloft/paneler/rustikloft)', price: 300, carpenter_id: targetId },
                { category: 'ceilings', name: 'Gipsloft (standard 2-lag)', price: 250, carpenter_id: targetId },
                { category: 'ceilings', name: 'Lydgipsloft (lyddæmpende gips)', price: 290, carpenter_id: targetId },
                { category: 'ceilings', name: 'Fibergipsloft (Fermacel)', price: 350, carpenter_id: targetId },
                { category: 'ceilings', name: 'Troldtekt (akustikloft)', price: 380, carpenter_id: targetId },
                { category: 'ceilings', name: 'Nedhængt loft (systemloft)', price: 450, carpenter_id: targetId },
                { category: 'ceilings', name: 'Akustikpaneler (lameller)', price: 750, carpenter_id: targetId },
                { category: 'ceilings', name: 'Forskalling', price: 50, carpenter_id: targetId },
                { category: 'ceilings', name: 'Dampspærre inkl tape', price: 35, carpenter_id: targetId },
                { category: 'ceilings', name: 'Isolering (50-100mm)', price: 85, carpenter_id: targetId },
                { category: 'ceilings', name: 'Spartelmasse og tape', price: 30, carpenter_id: targetId },
                { category: 'ceilings', name: 'Skyggelister / Fuge', price: 45, carpenter_id: targetId },
                { category: 'ceilings', name: 'Maler: Spartel, filt og maling (pr m2)', price: 250, carpenter_id: targetId },
                { category: 'ceilings', name: 'Maler: Koordineringsgebyr (Fast pris)', price: 5000, carpenter_id: targetId },
                { category: 'ceilings', name: 'Elektriker: Etablering af spot/lampested (pr. stk)', price: 950, carpenter_id: targetId },
                { category: 'ceilings', name: 'Sikkerhed (Buffer-pris)', price: 350, carpenter_id: targetId },

                // Facader
                { category: 'facades', name: 'Trykimprægneret', price: 300, carpenter_id: targetId },
                { category: 'facades', name: 'Almindeligt træ (Malet)', price: 310, carpenter_id: targetId },
                { category: 'facades', name: 'Superwood', price: 550, carpenter_id: targetId },
                { category: 'facades', name: 'Cedertræ / Hardwood', price: 950, carpenter_id: targetId },
                { category: 'facades', name: 'Thermowood', price: 650, carpenter_id: targetId },
                { category: 'facades', name: 'HardiePlank', price: 720, carpenter_id: targetId },
                { category: 'facades', name: 'Cembrit / Cedral', price: 780, carpenter_id: targetId },
                { category: 'facades', name: 'Krydsforskalling (tillæg til lodret)', price: 45, carpenter_id: targetId },
                { category: 'facades', name: 'Efterisolering (50-100mm)', price: 120, carpenter_id: targetId },
                { category: 'facades', name: 'Efterisolering 50mm', price: 120, carpenter_id: targetId },
                { category: 'facades', name: 'Efterisolering 100mm', price: 175, carpenter_id: targetId },
                { category: 'facades', name: 'Efterisolering 150mm', price: 250, carpenter_id: targetId },
                { category: 'facades', name: 'Vindspærre og Klemlister', price: 150, carpenter_id: targetId },
                { category: 'facades', name: 'Inddækning/Lister (pr åbning)', price: 500, carpenter_id: targetId },
                { category: 'facades', name: 'Tillæg: Facadestilladsleje', price: 12000, carpenter_id: targetId },
                { category: 'facades', name: 'Sikkerhed (Buffer-pris)', price: 450, carpenter_id: targetId },
                
                // Køkken
                { category: 'kitchen', name: 'Køkken-element montering', price: 800, carpenter_id: targetId },
                { category: 'kitchen', name: 'Bordplade udskæring', price: 1200, carpenter_id: targetId },
                { category: 'kitchen', name: 'Nedtagning af gammelt køkken (fast)', price: 3500, carpenter_id: targetId },
                { category: 'kitchen', name: 'Sikkerhed (Buffer-pris)', price: 800, carpenter_id: targetId },

                // Badeværelse
                { category: 'bath', name: 'Murer-arbejde (Fliser & Vådrum)', price: 15000, carpenter_id: targetId },
                { category: 'bath', name: 'VVS Installationer', price: 12000, carpenter_id: targetId },
                { category: 'bath', name: 'Elektriker (Spots, Gulvvarme)', price: 8000, carpenter_id: targetId },
                { category: 'bath', name: 'Sikkerhed (Buffer-pris)', price: 5000, carpenter_id: targetId },

                // Tilbygning
                { category: 'extensions', name: 'Træbeklædning', price: 15000, carpenter_id: targetId },
                { category: 'extensions', name: 'Hardwood / Cedertræ', price: 18000, carpenter_id: targetId },
                { category: 'extensions', name: 'Skalmur / Mursten', price: 22000, carpenter_id: targetId },
                { category: 'extensions', name: 'Tillæg: Krybekælder (pr m2)', price: 500, carpenter_id: targetId },
                { category: 'extensions', name: 'Tillæg: Tag med hældning (pr m2)', price: 1000, carpenter_id: targetId },
                { category: 'extensions', name: 'Tillæg: Vådrumspakke', price: 120000, carpenter_id: targetId },
                { category: 'extensions', name: 'Tillæg: Stor gennembrydning', price: 12000, carpenter_id: targetId },
                { category: 'extensions', name: 'Tillæg: Lille gennembrydning', price: 2500, carpenter_id: targetId },
                { category: 'extensions', name: 'Tillæg: Element (Vindue/Dør)', price: 4000, carpenter_id: targetId },
                { category: 'extensions', name: 'Tillæg: Støbt terrændæk (pr m2)', price: 1500, carpenter_id: targetId },
                { category: 'extensions', name: 'Tillæg: Gulvvarme etablering (pr m2)', price: 450, carpenter_id: targetId },
                { category: 'extensions', name: 'Leje af container (fast pris)', price: 3500, carpenter_id: targetId },
                { category: 'extensions', name: 'Sikkerhed (Buffer-pris)', price: 18000, carpenter_id: targetId },

                // Anneks
                { category: 'annex', name: 'Trykimprægneret fyr', price: 3000, carpenter_id: targetId },
                { category: 'annex', name: 'Eksklusivt træ (Cedertræ/Hardwood)', price: 5500, carpenter_id: targetId },
                { category: 'annex', name: 'Vedligeholdelsesfrit (Komposit)', price: 4500, carpenter_id: targetId },
                { category: 'annex', name: 'Tillæg: Isolering/værksted (pr m2)', price: 1200, carpenter_id: targetId },
                { category: 'annex', name: 'Tillæg: Fuldt beboeligt/BR18 (pr m2)', price: 4000, carpenter_id: targetId },
                { category: 'annex', name: 'Tillæg: Sadel tag (pr m2)', price: 500, carpenter_id: targetId },
                { category: 'annex', name: 'Tillæg: Støbt terrændæk (pr m2)', price: 1500, carpenter_id: targetId },
                { category: 'annex', name: 'Sikkerhed (Buffer-pris)', price: 4000, carpenter_id: targetId },

                // Carport
                { category: 'carport', name: 'Standard træ (Trykimprægneret)', price: 20000, carpenter_id: targetId },
                { category: 'carport', name: 'Eksklusivt træ (Cedertræ/Hardwood)', price: 35000, carpenter_id: targetId },
                { category: 'carport', name: 'Vedligeholdelsesfrit (Stål/Alu)', price: 35000, carpenter_id: targetId },
                { category: 'carport', name: 'Tillæg: Dobbelt carport (fast pris)', price: 15000, carpenter_id: targetId },
                { category: 'carport', name: 'Tillæg: Redskabsskur uisoleret (fast pris)', price: 8000, carpenter_id: targetId },
                { category: 'carport', name: 'Tillæg: Redskabsskur isoleret (fast pris)', price: 15000, carpenter_id: targetId },
                { category: 'carport', name: 'Sikkerhed (Buffer-pris)', price: 25000, carpenter_id: targetId },

                // Hegn
                { category: 'fence', name: 'Klinkehegn (Træ)', price: 550, carpenter_id: targetId },
                { category: 'fence', name: 'Listehegn (Træ)', price: 800, carpenter_id: targetId },
                { category: 'fence', name: 'Lamelhegn (Træ)', price: 450, carpenter_id: targetId },
                { category: 'fence', name: 'Raftehegn (Træ)', price: 700, carpenter_id: targetId },
                { category: 'fence', name: 'Komposithegn', price: 1000, carpenter_id: targetId },
                { category: 'fence', name: 'Træstolper', price: 100, carpenter_id: targetId },
                { category: 'fence', name: 'Betonstolper', price: 240, carpenter_id: targetId },
                { category: 'fence', name: 'Metal/Stålstolper', price: 300, carpenter_id: targetId },
                { category: 'fence', name: 'Støbt direkte i jord/beton (Standard)', price: 30, carpenter_id: targetId },
                { category: 'fence', name: 'Stolpesko i støbt punktfundament (Træ fri af jord)', price: 90, carpenter_id: targetId },
                { category: 'fence', name: 'Direkte i jorden uden beton (Kun visse træsorter)', price: 0, carpenter_id: targetId },
                { category: 'fence', name: 'Jordskruer / Skruefundament (Hurtig stålforankring)', price: 180, carpenter_id: targetId },
                { category: 'fence', name: 'Betonstolpe med betonbundplade (H-stolpe med plade)', price: 150, carpenter_id: targetId },
                { category: 'fence', name: 'Tillæg: Ekstra højde >1,8m (pr m)', price: 200, carpenter_id: targetId },
                { category: 'fence', name: 'Miljøtillæg: Rodfræsning/deponi af hæk (pr m)', price: 50, carpenter_id: targetId },
                { category: 'fence', name: 'Sikkerhed (Buffer-pris)', price: 700, carpenter_id: targetId }
            ];

            if (!data || data.length === 0) {
                setDbDebugLog(prev => prev + '\n> Prøver at oprette ' + defaultMaterials.length + ' nye rækker...');
                const { error: insertError } = await supabase.from('materials').insert(defaultMaterials);
                
                if (insertError) {
                    setDbDebugLog(prev => prev + '\n> INSERT FEJLDE: ' + JSON.stringify(insertError));
                } else {
                    setDbDebugLog(prev => prev + '\n> INSERT SUCCESS!');
                }
                
                const { data: newData } = await supabase.from('materials').select('*').eq('carpenter_id', targetId);
                setMaterialsData(newData || []);
            } else {
                // AUTO-SYNC: Find og tilføj manglende ny-tilføjede SaaS materialer til eksisterende tømrere
                const missingMaterials = defaultMaterials.filter(dm => 
                    !data.some(dbm => dbm.category === dm.category && dbm.name === dm.name)
                );
                
                const sysMat = missingMaterials.find(m => m.category === 'SYSTEM');
                let workingData = data;
                
                if (missingMaterials.length > 0) {
                    setDbDebugLog(prev => prev + '\n> AUTO-SYNC: Fandt ' + missingMaterials.length + ' nye materialer der manglede. Tilføjer dem nu...');
                    await supabase.from('materials').insert(missingMaterials);
                    
                    const { data: updatedData } = await supabase.from('materials').select('*').eq('carpenter_id', targetId);
                    workingData = updatedData || [];
                }
                
                setMaterialsData(workingData);
                
                const dbSysMat = workingData.find(m => m.category === 'SYSTEM' && m.name && m.name.startsWith('DISABLED_CATEGORIES||'));
                if (dbSysMat) {
                    const str = dbSysMat.name.replace('DISABLED_CATEGORIES||', '');
                    setDisabledCategories(str ? str.split(',') : []);
                } else {
                    setDisabledCategories([]);
                }
            }
            setIsMaterialsLoading(false);
        }

        if (activeTab === 'leads') {
            if (leadsData.length === 0) {
                setIsLeadsLoading(true);
            }
        }
        // Svende/lærlinge i produktion henter via maskeret RPC, så pris/økonomi
        // aldrig forlader serveren til dem (audit #6). Alle andre: som før.
        const isDevEnv = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const maskForWorker = !isDevEnv && !impersonateId && (userProfile.role === 'worker' || userProfile.role === 'apprentice');

        let workingLeads = [];
        if (maskForWorker) {
            const { data: maskedLeads } = await supabase.rpc('get_visible_leads');
            workingLeads = maskedLeads || [];
        } else {
            const { data: leadsDataFetch } = await supabase.from('leads').select('*').eq('carpenter_id', targetId).order('created_at', { ascending: false });
            workingLeads = leadsDataFetch || [];

            // --- EMERGENCY FIX: Hent også strandede kladder fra medarbejderens eget ID ---
            if (userProfile.role !== 'admin' && userProfile.company_id && targetId !== userProfile.id) {
                const { data: strandedLeads } = await supabase.from('leads').select('*').eq('carpenter_id', userProfile.id).order('created_at', { ascending: false });
                if (strandedLeads && strandedLeads.length > 0) {
                    workingLeads = [...workingLeads, ...strandedLeads];
                }
            }

            if (leadsDataFetch && leadsDataFetch.length < 2) {
                await supabase.from('leads').update({ carpenter_id: targetId }).is('carpenter_id', null);
                const { data: nData } = await supabase.from('leads').select('*').eq('carpenter_id', targetId).order('created_at', { ascending: false });
                if (nData) workingLeads = [...workingLeads.filter(l => l.carpenter_id !== targetId), ...nData];
            }
        }
        workingLeads = workingLeads.filter(l => l.status !== 'Slettet');
        
        // --- Granulær Data-filtrering (Kun for ægte auth) ---
        // Hvis vi er i udviklingsmiljø, henter vi altid ALLE leads, så rolle-simulatoren kan filtrere dynamisk
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (!isDev) {
            const userRole = profile?.role;
            const userPermissions = profile?.permissions || {};
            const isSelf = !impersonateId;
            
            if (isSelf && userRole !== 'admin' && !userPermissions.view_all_leads) {
                if (userRole === 'accountant') {
                    const confirmedStatuses = ['Bekræftet opgave', 'Sæt i bero', 'Historik', 'Afbrudt Sag'];
                    workingLeads = workingLeads.filter(l => confirmedStatuses.includes(l.status));
                } else if (userRole === 'sales') {
                    workingLeads = workingLeads.filter(l => {
                        const pmData = l.raw_data?.assigned_pm;
                        const pmArray = Array.isArray(pmData) ? pmData : (pmData ? [pmData] : []);
                        const workerData = l.raw_data?.assigned_workers;
                        const workerArray = Array.isArray(workerData) ? workerData : (workerData ? [workerData] : []);
                        return pmArray.includes(userId) || workerArray.includes(userId) || l.assigned_to === userId || l.raw_data?.created_by === userId || l.raw_data?.draft_mode === true;
                    });
                } else if (userRole === 'worker' || userRole === 'apprentice') {
                    workingLeads = workingLeads.filter(l => {
                        const pmData = l.raw_data?.assigned_pm;
                        const pmArray = Array.isArray(pmData) ? pmData : (pmData ? [pmData] : []);
                        const workerData = l.raw_data?.assigned_workers;
                        const workerArray = Array.isArray(workerData) ? workerData : (workerData ? [workerData] : []);
                        return pmArray.includes(userId) || workerArray.includes(userId) || l.raw_data?.created_by === userId || l.raw_data?.draft_mode === true;
                    });
                }
            }
        }
        
        setLeadsData(workingLeads);
        setSelectedLead(prev => {
            if (prev) {
                const updated = workingLeads.find(l => l.id === prev.id);
                return updated || prev;
            }
            return prev;
        });
        if (activeTab === 'leads') setIsLeadsLoading(false);
        setIsDashboardLoaded(true);
    };

    // Gem en fakturarekord på sagen (historik + faktureret beløb). Bruges af både
    // Dinero-, e-conomic- og manuel-fakturering, så de tre veje er konsistente.
    const recordInvoiceLocally = async ({ lead, leadForInvoice, totalAmountToBill, invoiceId, system, action }) => {
        const { data: latestData } = await supabase.from('leads').select('raw_data').eq('id', lead.id).single();
        const currentRawData = latestData?.raw_data || leadForInvoice?.raw_data || lead.raw_data || {};

        const status = system === 'manual'
            ? 'manual'
            : (action === 'book_and_send' ? 'booked' : 'draft');

        const history = currentRawData.invoice_history || [];
        history.push({
            id: invoiceId,
            amount: totalAmountToBill || 0,
            date: new Date().toISOString(),
            system,
            status
        });
        currentRawData.invoice_history = history;
        currentRawData.invoiced_amount = (currentRawData.invoiced_amount || 0) + (totalAmountToBill || 0);
        if (system !== 'manual') currentRawData.synced_to_accounting = true;

        const updatedLead = { ...(leadForInvoice || lead), raw_data: currentRawData };
        await supabase.from('leads').update({ raw_data: updatedLead.raw_data }).eq('id', lead.id);
        setSelectedLead(updatedLead);
        setLeadsData(prev => prev.map(l => l.id === lead.id ? updatedLead : l));
        return updatedLead;
    };

    const syncToAccounting = async (lead, action = 'draft', invoiceLines = [], isReverseCharge = false, customerOverride = null) => {
        if (!carpenterProfile) return;

        // Beskyt mod dobbelt-overførsel: overførsel laver en kladde i regnskabsprogrammet,
        // men er sagen allerede overført før, bekræft at man bevidst laver én mere.
        const priorInvoices = (lead?.raw_data?.invoice_history || []).length;
        if (priorInvoices > 0) {
            const ok = window.confirm(
                `Denne sag er allerede overført til dit regnskabsprogram ${priorInvoices} gang${priorInvoices > 1 ? 'e' : ''} før.\n\n` +
                `Vil du overføre en ny fakturakladde igen? (Du undgår dobbelt-fakturering ved at redigere den eksisterende kladde i regnskabsprogrammet i stedet.)`
            );
            if (!ok) return;
        }

        const buildInvoiceLead = (sourceLead, override) => {
            if (!override) return sourceLead;

            const clean = (value) => String(value || '').trim();
            const cityLine = [clean(override.zip), clean(override.city)].filter(Boolean).join(' ');
            const invoiceAddress = [clean(override.address), cityLine].filter(Boolean).join(', ') || sourceLead.customer_address;
            const customerDetails = {
                ...(sourceLead.raw_data?.customerDetails || {}),
                fullName: clean(override.fullName) || sourceLead.customer_name,
                cvr: clean(override.cvr),
                email: clean(override.email) || sourceLead.customer_email,
                phone: clean(override.phone) || sourceLead.customer_phone,
                address: clean(override.address) || sourceLead.customer_address,
                zip: clean(override.zip),
                city: clean(override.city)
            };

            return {
                ...sourceLead,
                customer_name: customerDetails.fullName,
                customer_email: customerDetails.email,
                customer_phone: customerDetails.phone,
                customer_address: invoiceAddress,
                raw_data: {
                    ...(sourceLead.raw_data || {}),
                    customerDetails
                }
            };
        };

        const leadForInvoice = buildInvoiceLead(lead, customerOverride);

        // Udregn total beløbet for fakturaen
        const totalAmountToBill = invoiceLines.reduce((sum, line) => sum + Number(line.priceExVat || 0), 0);

        try {
            // Hvis Dinero er forbundet (og ikke 'pending_authorization')
            if (carpenterProfile.dinero_api_key && carpenterProfile.dinero_api_key !== 'pending_authorization') {
                console.log('--- DINERO BACKEND SYNC STARTER ---');
                
                // Vis loading overlay eller lign. hvis ønsket
                const { data, error } = await supabase.functions.invoke('dinero-invoice', {
                    body: { lead: leadForInvoice, action, invoiceLines, isReverseCharge }
                });

                if (error || (data && !data.success)) {
                    console.error("Dinero fejl:", error || data.error);
                    toast.error("Der opstod en fejl ved overførsel til Dinero: " + (error?.message || data?.error));
                } else {
                    toast.success(data.message || `Fakturakladde oprettet i Dinero! (ID: ${data.invoiceId})`);
                    await recordInvoiceLocally({ lead, leadForInvoice, totalAmountToBill, invoiceId: data.invoiceId, system: 'dinero', action });
                }

            } else if (carpenterProfile.economic_api_key && carpenterProfile.economic_api_key !== 'pending_authorization') {
                console.log('--- E-CONOMIC BACKEND SYNC STARTER ---');
                
                const { data, error } = await supabase.functions.invoke('economic-invoice', {
                    body: { lead: leadForInvoice, action, invoiceLines, isReverseCharge }
                });

                if (error || (data && !data.success)) {
                    console.error("e-conomic fejl:", error || data.error);
                    toast.error("Der opstod en fejl ved overførsel til e-conomic: " + (error?.message || data?.error));
                } else {
                    toast.success(data.message || `Fakturakladde oprettet i e-conomic! (ID: ${data.invoiceId})`);
                    await recordInvoiceLocally({ lead, leadForInvoice, totalAmountToBill, invoiceId: data.invoiceId, system: 'economic', action });
                }
            } else {
                // Intet regnskabsprogram forbundet — registrér fakturaen manuelt,
                // så økonomi-oversigten opdateres og restbeløbet falder.
                const manualId = `MANUAL-${Date.now()}`;
                await recordInvoiceLocally({ lead, leadForInvoice, totalAmountToBill, invoiceId: manualId, system: 'manual', action });
                toast.success(`Faktura på ${(totalAmountToBill || 0).toLocaleString('da-DK')} kr. registreret manuelt. Forbind et regnskabsprogram i Indstillinger for automatisk overførsel.`, { duration: 5000 });
            }
        } catch(err) {
            console.error('Fejl under regnskabssynkronisering:', err);
            toast.error("Der skete en netværksfejl. Prøv igen senere.");
        }
    };

    const syncToOrdrestyring = async (lead) => {
        if (!carpenterProfile) return;

        if (!carpenterProfile.ordrestyring_api_key) {
            toast('Indtast din Ordrestyring API-nøgle i Indstillinger for at overføre.', { icon: 'ℹ️' });
            setSelectedLead(null);
            setActiveTab('integrations');
            return;
        }

        try {
            console.log('--- ORDRESTYRING SYNC STARTER ---');
            toast.loading("Opretter sag i Ordrestyring...", { id: "ordrestyring" });
            
            const { data, error } = await supabase.functions.invoke('ordrestyring-case', {
                body: { lead: lead, api_key: carpenterProfile.ordrestyring_api_key }
            });

            if (error || (data && !data.success)) {
                console.error("Ordrestyring fejl:", error || data?.error);
                toast.error("Fejl ved oprettelse i Ordrestyring: " + (error?.message || data?.error), { id: "ordrestyring" });
            } else {
                toast.success(`Succes! Sagen er nu overført til eget ordrestyringssystem. (Sagsnr: ${data.caseId})`, { id: "ordrestyring" });
                const { error: updateError } = await supabase.from('leads').update({ ordrestyring_case_id: String(data.caseId) }).eq('id', lead.id);
                if (!updateError) {
                    setLeadsData(prev => prev.map(l => l.id === lead.id ? { ...l, ordrestyring_case_id: String(data.caseId) } : l));
                    if (selectedLead && selectedLead.id === lead.id) {
                        setSelectedLead(prev => ({ ...prev, ordrestyring_case_id: String(data.caseId) }));
                    }
                    
                    const isInternalId = String(data.caseId).length >= 4 || Number(data.caseId) > 1000;
                    const finalUrl = isInternalId 
                        ? `https://system.ordrestyring.dk/cases?id=${data.caseId}` 
                        : `https://system.ordrestyring.dk/cases`;

                    setIntegrationSuccessData({
                        platform: 'Ordrestyring',
                        caseId: String(data.caseId),
                        url: finalUrl,
                        debugData: data
                    });
                }
            }
        } catch(err) {
            console.error('Fejl under Ordrestyring-synkronisering:', err);
            toast.error("Der skete en netværksfejl. Prøv igen senere.", { id: "ordrestyring" });
        }
    };

    const syncToApacta = async (lead) => {
        if (!carpenterProfile) return;

        if (!carpenterProfile.apacta_api_key) {
            toast('Indtast din Apacta API-nøgle i Indstillinger for at overføre.', { icon: 'ℹ️' });
            setSelectedLead(null);
            setActiveTab('integrations');
            return;
        }

        try {
            console.log('--- APACTA SYNC STARTER ---');
            toast.loading("Opretter sag i Apacta...", { id: "apacta" });
            
            const { data, error } = await supabase.functions.invoke('apacta-case', {
                body: { lead: lead, api_key: carpenterProfile.apacta_api_key }
            });

            if (error || (data && !data.success)) {
                console.error("Apacta fejl:", error || data?.error);
                toast.error("Fejl ved oprettelse i Apacta: " + (error?.message || data?.error), { id: "apacta" });
            } else {
                toast.success(`Succes! Sagen er nu overført til eget ordrestyringssystem. (Sagsnr: ${data.caseId})`, { id: "apacta" });
                const { error: updateError } = await supabase.from('leads').update({ apacta_case_id: String(data.caseId) }).eq('id', lead.id);
                if (!updateError) {
                    setLeadsData(prev => prev.map(l => l.id === lead.id ? { ...l, apacta_case_id: String(data.caseId) } : l));
                    if (selectedLead && selectedLead.id === lead.id) {
                        setSelectedLead(prev => ({ ...prev, apacta_case_id: String(data.caseId) }));
                    }

                    setIntegrationSuccessData({
                        platform: 'Apacta',
                        caseId: String(data.caseId),
                        url: `https://control-panel.apacta.com/projects/${data.caseId}`
                    });
                }
            }
        } catch(err) {
            console.error('Fejl under Apacta-synkronisering:', err);
            toast.error("Der skete en netværksfejl. Prøv igen senere.", { id: "apacta" });
        }
    };

    const syncToMinuba = async (lead) => {
        if (!carpenterProfile.minuba_api_key) {
            toast('Indtast din Minuba API-nøgle i Indstillinger for at overføre.', { icon: 'ℹ️' });
            setActiveTab('integrations');
            return;
        }

        try {
            toast.loading("Opretter sag i Minuba...", { id: "minuba" });
            const { data, error } = await supabase.functions.invoke('minuba-case', {
                body: { lead: lead, api_key: carpenterProfile.minuba_api_key }
            });

            if (error || !data?.success) {
                console.error("Minuba fejl:", error || data?.error);
                toast.error("Fejl ved oprettelse i Minuba: " + (error?.message || data?.error), { id: "minuba" });
            } else {
                toast.success(`Succes! Sagen er nu overført til eget ordrestyringssystem. (Sagsnr: ${data.caseId})`, { id: "minuba" });
                
                // Gem Minuba sags-id på leadet
                await supabase.from('leads').update({ minuba_case_id: data.caseId }).eq('id', lead.id);

                setIntegrationSuccessData({
                    platform: 'Minuba',
                    caseId: data.caseId,
                    url: `https://app.minuba.dk/` // Default URL until we get the actual deep link
                });
                setActiveTab('integrations');
            }
        } catch (err) {
            console.error('Fejl under Minuba-synkronisering:', err);
            toast.error('Noget gik galt under overførslen.', { id: "minuba" });
        }
    };

    const handleSendFeedback = async () => {
        if (!feedbackText.trim()) return;
        setIsSendingFeedback(true);
        try {
            const htmlContent = getFeedbackTemplate(carpenterProfile, feedbackText);
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: 'team@bisoncompany.dk',
                    subject: 'Ny System Feedback fra ' + (carpenterProfile?.company_name || 'Tømrer'),
                    html: htmlContent
                })
            });
            
            if (!response.ok) throw new Error('Kunne ikke sende feedback');
            
            toast.success('Tak for din feedback! Den er sendt direkte til vores udviklere.');
            setFeedbackText('');
            setIsFeedbackModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error('Der skete en fejl. Prøv venligst igen.');
        } finally {
            setIsSendingFeedback(false);
        }
    };

    const handleSelectLead = async (lead) => {
        setSelectedLead(lead);
        setIsCustomerChoicesOpen(false);
        setIsMaterialListOpen(false);
        setIsQuoteEditorOpen(false);
        if (lead.is_read === false) {
            setLeadsData(prev => prev.map(l => l.id === lead.id ? { ...l, is_read: true } : l));
            try {
                await supabase.from('leads').update({ is_read: true }).eq('id', lead.id);
            } catch (err) {
                console.error('Kunne ikke markere lead som læst', err);
            }
        }
    };

    const updateLeadStatus = async (leadId, newStatus) => {
        try {
            const leadToUpdate = leadsData.find(l => l.id === leadId);
            const currentStatus = leadToUpdate?.status || 'Ny forespørgsel';
            const isFirstResponse = currentStatus === 'Ny forespørgsel' && newStatus !== 'Ny forespørgsel';
            const updates = { status: newStatus };
            if (isFirstResponse && !leadToUpdate?.first_responded_at) {
                updates.first_responded_at = new Date().toISOString();
            }

            const { error } = await supabase.from('leads').update(updates).eq('id', leadId);
            if (error) throw error;
            
            setLeadsData(prev => prev.map(lead => {
                if (lead.id === leadId) {
                    const updatedLead = { ...lead, ...updates };
                    return updatedLead;
                }
                return lead;
            }));
        } catch(err) {
            toast.error('Fejl ved opdatering af kundestatus: ' + err.message);
        }
    };

    const handleUploadAndSendQuote = async (leadId, carpenterSlug, providedFile = null, finalPrice = null, extraRawData = {}, sendEmail = true) => {
        const fileToUpload = providedFile || selectedPdfFile;
        if (!fileToUpload) {
            toast.error('Du skal vedhæfte en PDF, før du kan udsende tilbuddet!');
            return;
        }

        setIsUploadingPdf(true);
        try {
            const fileExt = fileToUpload.name.split('.').pop() || 'pdf';
            const fileName = `quote_${leadId}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(fileName, fileToUpload, { upsert: true, cacheControl: '0' });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(fileName);
                
            const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

            const targetLead = leadsData.find(l => l.id === leadId);
            const currentRawData = targetLead.raw_data || {};
            const newRawData = { ...currentRawData, ...extraRawData, quote_pdf_url: cacheBustedUrl };
            if (finalPrice !== null) {
                newRawData.actual_quote_price = finalPrice;
            }

            const { error: updateError } = await supabase
                .from('leads')
                .update({ status: 'Sendt tilbud', raw_data: newRawData })
                .eq('id', leadId);

            if (updateError) throw updateError;

            // Udsend mail til kunden
            if (sendEmail && targetLead.customer_email && targetLead.customer_email !== 'Ukendt') {
                import('../../utils/sendEmail').then(({ sendEmail }) => {
                    const carpenterName = carpenterProfile?.company_name || carpenterProfile?.owner_name || 'Din Tømrer';
                    const senderName = getCarpenterSenderName(carpenterProfile);
                    // Brug produktions URL hvis online, ellers window.location.origin (localhost)
                    const quoteUrl = `${window.location.origin}/${carpenterSlug}/tilbud/${targetLead.quote_token || leadId}`;
                    const isUpdate = targetLead.status === 'Sendt tilbud';
                    const subjectText = isUpdate ? `Dit opdaterede tilbud fra ${carpenterName} er klar` : `Dit tilbud fra ${carpenterName} er klar`;
                    sendEmail({
                        to: targetLead.customer_email,
                        subject: subjectText,
                        html: getCustomerOfferSentTemplate(targetLead.customer_name, quoteUrl, targetLead.project_category, carpenterProfile, publicUrl, isUpdate, targetLead.case_number || String(targetLead.id).substring(0,8)),
                        fromName: senderName,
                        replyTo: carpenterProfile?.email
                    });
                });
            }

            setLeadsData(prev => prev.map(lead => lead.id === leadId ? { ...lead, status: 'Sendt tilbud', raw_data: newRawData } : lead));
            setLeadFilter('Sendt tilbud'); 
            
            if (selectedLead && selectedLead.id === leadId) {
                setSelectedLead(prev => ({...prev, status: 'Sendt tilbud', raw_data: newRawData}));
            }
            setSelectedPdfFile(null);
            
            toast.success("Tilbuddet er nu sendt afsted til kunden!");
        } catch (error) {
            toast.error('Fejl ved upload af PDF til Supabase: Glem ikke RLS og publik indstillinger på bucket.\n' + error.message);
        } finally {
            setIsUploadingPdf(false);
        }
    };

    const handleFileUpload = async (event, type) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Vælg venligst en gyldig billedfil (JPG/PNG).');
            return;
        }

        if (type === 'logo') setIsUploadingLogo(true);
        if (type === 'portrait') setIsUploadingPortrait(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${carpenterProfile.id}-${type}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(fileName, file);

            if (uploadError) {
                // Håndterer hvis RLS uploader-blokkere bremser.
                console.error("Storage block:", uploadError);
                throw uploadError; 
            }

            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(fileName);

            if (type === 'logo') {
                setCarpenterProfile(prev => ({ ...prev, logo_url: publicUrl }));
            } else {
                setCarpenterProfile(prev => ({ ...prev, portrait_url: publicUrl }));
            }
            
        } catch (error) {
            toast.error('Kunne ikke uploade billedet: Fik du oprettet din bucket som "PUBLIC" i Supabase?\n' + error.message);
        } finally {
            if (type === 'logo') setIsUploadingLogo(false);
            if (type === 'portrait') setIsUploadingPortrait(false);
        }
    };

    const handleProfileSave = async () => {
        if (!carpenterProfile) return;
        setIsSaving(true);
        const { error } = await supabase.from('carpenters').update({
            slug: carpenterProfile.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            company_name: carpenterProfile.company_name,
            logo_url: carpenterProfile.logo_url,
            portrait_url: carpenterProfile.portrait_url,
            success_message: carpenterProfile.success_message,
            owner_name: carpenterProfile.owner_name,
            phone: carpenterProfile.phone,
            email: carpenterProfile.email,
            cvr: carpenterProfile.cvr,
            address: carpenterProfile.address
        }).eq('id', carpenterProfile.id);
        
        if (!error) {
            await supabase.from('carpenter_secrets').upsert({
                carpenter_id: carpenterProfile.id,
                dinero_api_key: carpenterProfile.dinero_api_key,
                economic_api_key: carpenterProfile.economic_api_key,
                ordrestyring_api_key: carpenterProfile.ordrestyring_api_key,
                apacta_api_key: carpenterProfile.apacta_api_key,
                minuba_api_key: carpenterProfile.minuba_api_key
            });
        }
        
        setIsSaving(false);
        if(!error) toast.success('Profil og URL-link opdateret succesfuldt!');
        else toast.error('Fejl: URL-linket er desværre allerede taget af et andet firma.');
    };

    const handleSave = async () => {
        if (!settingsData) return;
        setIsSaving(true);
        const { id, ...updatePayload } = settingsData;
        
        const { error } = await supabase
            .from('settings')
            .update(updatePayload)
            .eq('id', settingsData.id);
            
        setIsSaving(false);
        if(!error) {
            toast.success('Indstillingerne blev gemt med succes.');
        } else {
            toast.error('Der skete en fejl ved gem: ' + error.message);
        }
    };

    const toggleCategoryActive = async (categoryId) => {
        if (!carpenterProfile) return;
        setIsSaving(true);
        const isCurrentlyDisabled = disabledCategories.includes(categoryId);
        const newDisabled = isCurrentlyDisabled 
            ? disabledCategories.filter(c => c !== categoryId) 
            : [...disabledCategories, categoryId];
            
        setDisabledCategories(newDisabled);
        
        const payloadStr = 'DISABLED_CATEGORIES||' + newDisabled.join(',');
        const sysMat = materialsData.find(m => m.category === 'SYSTEM');
        
        if (sysMat) {
            await supabase.from('materials').update({ name: payloadStr }).eq('id', sysMat.id);
            setMaterialsData(prev => prev.map(m => m.id === sysMat.id ? {...m, name: payloadStr} : m));
        } else {
            const { data } = await supabase.from('materials').insert([{ carpenter_id: carpenterProfile.id, category: 'SYSTEM', name: payloadStr, price: 0 }]).select();
            if (data && data.length > 0) {
                setMaterialsData(prev => [...prev, data[0]]);
            }
        }
        setIsSaving(false);
    };

    const toggleMaterialActive = async (id, currentName) => {
        setIsSaving(true);
        const nameVal = currentName || '';
        const isActive = !nameVal.startsWith('INACTIVE||');
        const newName = isActive ? 'INACTIVE||' + nameVal : nameVal.replace('INACTIVE||', '');

        const { error } = await supabase.from('materials').update({ name: newName }).eq('id', id);
        setIsSaving(false);
        
        if (!error) {
            setMaterialsData(prev => prev.map(m => m.id === id ? { ...m, name: newName } : m));
        } else {
            toast.error('Fejl under opdatering: ' + error.message);
        }
    };

    const handleMaterialChange = (id, newPrice) => {
        setMaterialsData(prev => 
            prev.map(m => m.id === id ? { ...m, price: parseInt(newPrice) || 0 } : m)
        );
    };

    const handleSaveMaterials = async () => {
        setIsSaving(true);
        // Supabase mangler en simpel mass-update metode fra frontend, så vi opdaterer dem i et loop
        // (I et rigtigt stort setup ville man skrive en Custom RPC funktion til det)
        let hasError = false;
        
        for (const mat of materialsData) {
            const { error } = await supabase
                .from('materials')
                .update({ price: mat.price })
                .eq('id', mat.id);
                
            if (error) hasError = true;
        }
        
        setIsSaving(false);
        if(!hasError) {
            toast.success('Materialepriser blev gemt med succes.');
        } else {
            toast.error('Der skete en fejl under gemning af nogle materialer.');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettingsData(prev => ({ ...prev, [name]: parseFloat(value) }));
    };

    const toggleMaterialCategory = (catKey) => {
        setExpandedMaterialCategories(prev => ({
            ...prev,
            [catKey]: !prev[catKey]
        }));
    };

    // Hjælpefunktion til at gruppere materialer pænt
    const groupedMaterials = (materialsData || []).reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = [];
        acc[curr.category].push(curr);
        return acc;
    }, {});

    const categoryNames = {
        roof: 'Tag',
        floor: 'Gulv',
        windows: 'Vinduer',
        doors: 'Døre',
        terrace: 'Terrasse',
        ceilings: 'Lofter',
        facades: 'Facader',
        kitchen: 'Køkken',
        bath: 'Badeværelse',
        extensions: 'Tilbygning',
        annex: 'Anneks',
        carport: 'Carport',
        fence: 'Hegn'
    };

    const getCategoryIcon = (catKey, size = 20) => {
        switch(catKey) {
            case 'roof': return <Tent size={size} />;
            case 'floor': return <LayoutGrid size={size} />;
            case 'windows': return <AppWindow size={size} />;
            case 'doors': return <DoorOpen size={size} />;
            case 'terrace': return <Layers size={size} />;
            case 'ceilings': return <ArrowUpToLine size={size} />;
            case 'facades': return <PanelRight size={size} />;
            case 'kitchen': return <Utensils size={size} />;
            case 'bath': return <Droplets size={size} />;
            case 'extensions': return <PlusSquare size={size} />;
            case 'annex': return <Home size={size} />;
            case 'carport': return <Car size={size} />;
            case 'fence': return <AlignJustify size={size} />;
            default: return <Package size={size} />;
        }
    };

    const getTooltipText = (catKey) => {
        if (catKey === 'doors' || catKey === 'windows') {
            return "Beregneren tager udgangspunkt i din rene indkøbspris for selve elementet ekskl. avance. Når kunden vælger f.eks. 6 vinduer, ganger systemet automatisk din indtastede stykpris op med kundens antal, lægger din valgte materialeavance oveni og tilføjer til sidst din timepris for arbejdet. Indtast derfor blot, hvad materialet koster dig at købe hjem pr. stk.";
        }
        return "Beregneren tager udgangspunkt i din rene gennemsnitlige indkøbspris pr. kvadratmeter (m²) ekskl. avance. Systemet udregner automatisk kundens totale m²-areal, ganger prisen op og lægger din valgte materialeavance oveni til sidst (plus nødvendige håndværkertimer for arealet). Indtast derfor blot, hvad materialet koster dig pr. m².";
    };

    // --- Retention Overview Calculations ---
    const totalLeadsCount = leadsData.length;
    const wonLeadsCount = leadsData.filter(l => ['Bekræftet opgave', 'Historik'].includes(l.status || '')).length;
    const conversionRate = totalLeadsCount > 0 ? Math.round((wonLeadsCount / totalLeadsCount) * 100) : 0;
    const timeSavedHours = Math.round(totalLeadsCount * 1.5);
    const timeSavedValue = timeSavedHours * 500; // 500 kr. i timen antaget

    const respondedLeads = leadsData.filter(l => l.first_responded_at && l.created_at);
    let avgResponseTimeHours = 0;
    if (respondedLeads.length > 0) {
        const totalMs = respondedLeads.reduce((acc, lead) => {
            const firstResp = new Date(lead.first_responded_at).getTime();
            const created = new Date(lead.created_at).getTime();
            return acc + (firstResp - created);
        }, 0);
        avgResponseTimeHours = totalMs / respondedLeads.length / (1000 * 60 * 60);
    }

    const calcLeadValue = (lead) => {
        const calc = lead.raw_data?.calc_data;
        if (!calc) return 0;
        
        const strictPrice = parseFloat(calc.strictPrice || 0);
        const marginFactor = 1.25;
        const priceTop = strictPrice * marginFactor;
        
        let minPrice = Math.floor(strictPrice / 1000) * 1000;
        let maxPrice = Math.ceil(priceTop / 1000) * 1000;
        
        minPrice = minPrice * 1.25;
        maxPrice = maxPrice * 1.25;
        
        return (minPrice + maxPrice) / 2;
    };
    const calcWonRevenue = (lead) => {
        const mat = parseFloat(lead.raw_data?.calc_data?.materialCost || 0);
        const labor = parseFloat(lead.raw_data?.calc_data?.laborCost || (lead.raw_data?.calc_data?.laborHours * lead.raw_data?.calc_data?.hourlyRate) || 0);
        return mat + labor;
    };

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
    const chartData = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthIndex = d.getMonth();
        const year = d.getFullYear();
        
        const wonValue = leadsData.filter(l => {
            if (!['Bekræftet opgave', 'Historik'].includes(l.status || '')) return false;
            const leadDate = new Date(l.created_at);
            return leadDate.getMonth() === monthIndex && leadDate.getFullYear() === year;
        }).reduce((acc, lead) => acc + calcWonRevenue(lead), 0);
        
        chartData.push({
            label: monthNames[monthIndex],
            value: wonValue,
            isCurrentMonth: i === 0
        });
    }

    const maxChartVal = Math.max(...chartData.map(d => d.value), 10000);
    
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const effectiveRole = simulatedRole || myProfile?.role || 'admin';

    // --- SØGEFUNKTION & FILTRERING ---
    const roleFilteredLeads = leadsData.filter(l => {
        // Rolle-baseret filtrering til Simulator (lokal)
        if (isDev && effectiveRole !== 'admin') {
            if (effectiveRole === 'accountant') {
                const confirmedStatuses = ['Bekræftet opgave', 'Sæt i bero', 'Historik', 'Afbrudt Sag'];
                if (!confirmedStatuses.includes(l.status)) return false;
            } else if (effectiveRole === 'sales') {
                if (simulatedRole) {
                    return ['Bekræftet opgave', 'Historik'].includes(l.status);
                }
                const pmData = l.raw_data?.assigned_pm;
                const pmArray = Array.isArray(pmData) ? pmData : (pmData ? [pmData] : []);
                if (!pmArray.includes(myProfile?.id) && l.assigned_to !== myProfile?.id) return false;
            } else if (effectiveRole === 'worker' || effectiveRole === 'apprentice') {
                if (simulatedRole) {
                    return l.status === 'Bekræftet opgave'; // Lad Simulatoren se alle bekræftede sager
                }
                const workerData = l.raw_data?.assigned_workers;
                const workerArray = Array.isArray(workerData) ? workerData : (workerData ? [workerData] : []);
                if (!workerArray.includes(myProfile?.id)) return false;
            }
        }
        return true;
    });

    const filteredLeads = roleFilteredLeads.filter(l => {
        const currentStatus = l.status || 'Ny forespørgsel';
        const matchesStatus = currentStatus === leadFilter || (leadFilter === 'Ny forespørgsel' && currentStatus === 'Intern Kladde');
        if (!searchQuery) return matchesStatus;
        
        const query = searchQuery.toLowerCase();
        const categoryName = categoryNames[l.project_category] || l.project_category || '';
        
        const nameMatch = l.customer_name?.toLowerCase().includes(query);
        const addressMatch = l.customer_address?.toLowerCase().includes(query);
        const phoneMatch = String(l.customer_phone || '').toLowerCase().includes(query);
        const emailMatch = l.customer_email?.toLowerCase().includes(query);
        const categoryMatch = categoryName.toLowerCase().includes(query);
        const caseMatch = String(l.case_number || l.id).toLowerCase().includes(query);
        
        return matchesStatus && (nameMatch || addressMatch || phoneMatch || emailMatch || categoryMatch || caseMatch);
    });
    // ---------------------------------------

    // --- PAYWALL LOGIC ---
    let isPaywallActive = false;
    let paywallReason = '';
    let trialDaysLeft = 0;
    
    if (carpenterProfile) {
        // Bemærk: Superadmin har altid adgang
        if (myProfile?.email !== 'team@bisoncompany.dk') {
            const subStatus = carpenterProfile.subscription_status || 'trialing';
            
            if (subStatus === 'trialing') {
                const fallbackDate = new Date();
                fallbackDate.setDate(fallbackDate.getDate() - 1); // fallback til udløbet hvis ingen dato
                let trialEndStr = carpenterProfile.trial_ends_at;
                
                if (!trialEndStr) {
                    if (carpenterProfile.created_at) {
                        const created = new Date(carpenterProfile.created_at);
                        created.setDate(created.getDate() + 30);
                        trialEndStr = created.toISOString();
                    } else {
                        trialEndStr = fallbackDate.toISOString();
                    }
                }
                
                const end = new Date(trialEndStr);
                const now = new Date();
                
                if (now > end) {
                    isPaywallActive = true;
                    paywallReason = 'trial_expired';
                } else {
                    const diffTime = end - now;
                    trialDaysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                }
            } else if (subStatus !== 'active') {
                isPaywallActive = true;
                paywallReason = 'subscription_inactive';
            }
        }
    }
    
    // ---------------------

    const getTabHeaderInfo = () => {
        switch (activeTab) {
            case 'leads':
                return { title: 'Kunder & Forespørgsler', desc: 'Her kan du styre dine kundeemner hele vejen gennem salgsprocessen.' };
            case 'map':
                return { title: 'Geografisk Overblik', desc: 'Se dine leads og nuværende forespørgsler direkte på Danmarkskortet.' };
            case 'materials':
                return { title: 'Standard Indkøbspriser (Ekskl. moms DKK)', desc: 'Disse priser danner grundlag for materialeberegningen. Din valgte system-avance lægges oveni.' };
            case 'settings':
                return { title: 'Prisberegner & System', desc: 'Opsæt timepriser, avance, kørsel og notifikationer for AI-tilbud.' };
            case 'integrations':
                return { title: 'Integrationer', desc: 'Forbind din profil automatisk til dit foretrukne regnskabsprogram for let overførsel.' };
            case 'team':
                return { title: 'Dit Team', desc: 'Administrer dine medarbejdere og deres adgangsniveau.' };
            case 'superadmin':
                return { title: 'Bizon Admin', desc: 'Håndter alle systemets brugere og konfiguration.' };
            case 'profile':
                return { title: 'Min Profil', desc: 'Administrer dine personlige oplysninger og præferencer.' };
            case 'account_settings':
                return { title: 'Konto Indstillinger', desc: 'Administrer din virksomheds indstillinger.' };
            case 'drawings':
                return { title: 'Mit Skitse-bibliotek', desc: 'Få det fulde overblik over alle dine byggetegninger.' };
            default:
                return null;
        }
    };
    const headerInfo = getTabHeaderInfo();
    const mobileTabHeaders = {
        leads: {
            icon: Users,
            title: 'Kunder & Leads',
            desc: 'Styr forespørgsler, tilbud og bekræftede opgaver fra mobilen.'
        },
        settings: {
            icon: Calculator,
            title: 'Prisberegner',
            desc: 'Opsæt kørsel, timepriser, avance og systemregler.'
        },
        integrations: {
            icon: Link,
            title: 'Integrationer',
            desc: 'Forbind regnskab og driftssystemer med din Bison Frame konto.'
        },
        team: {
            icon: HardHat,
            title: 'Team',
            desc: 'Tilføj medarbejdere og styr roller direkte fra dashboardet.'
        },
        drawings: {
            icon: PenTool,
            title: 'Skitser',
            desc: 'Se og rediger byggetegninger direkte på mobilen.'
        },
        profile: {
            icon: User,
            title: 'Min Profil',
            desc: 'Administrer dine personlige oplysninger og præferencer.'
        }
    };

    const renderDashboardMobileHeader = () => {
        const config = mobileTabHeaders[activeTab];
        if (!config) return null;
        const Icon = config.icon;

        return (
            <div className="dashboard-mobile-tab-header glass-panel">
                <h2>
                    <Icon size={28} color="#000" />
                    {config.title}
                </h2>
                <p>{config.desc}</p>
            </div>
        );
    };

    if (!isDashboardLoaded) {
        return (
            <div style={{textAlign: 'center', padding: '100px', height: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                <div className="flex flex-col items-center gap-2">
                    <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-200">
                        Bison Frame
                    </h3>
                    <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase animate-pulse">
                        Indlæser arbejdsområdet...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`dashboard-layout dashboard-tab-${activeTab} ${['worker', 'apprentice', 'sales'].includes(effectiveRole) && activeTab === 'overview' ? 'worker-overview-active' : ''}`}>
            {/* Pull to Refresh Indicator */}
            <div 
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `translateY(${isRefreshing ? '0' : (pullProgress > 0 ? (pullProgress * 60 - 60) + 'px' : '-60px')})`,
                    opacity: isRefreshing ? 1 : pullProgress,
                    transition: isRefreshing ? 'transform 0.3s' : 'none',
                    zIndex: 9999,
                    pointerEvents: 'none'
                }}
            >
                <div style={{ background: 'white', padding: '8px 16px', borderRadius: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a' }}>
                    <RefreshCw size={16} className={isRefreshing ? 'spinner' : ''} style={{ transform: `rotate(${pullProgress * 360}deg)` }} />
                    {isRefreshing ? 'Opdaterer...' : 'Træk ned for at opdatere'}
                </div>
            </div>

            {showOnboarding && carpenterProfile && (
                <OnboardingModal 
                    profile={carpenterProfile} 
                    onComplete={() => {
                        setShowOnboarding(false);
                        setCarpenterProfile({...carpenterProfile, has_completed_onboarding: true});
                    }} 
                />
            )}

            {showSetPassword && carpenterProfile && (
                <EmployeeOnboardingModal 
                    profile={carpenterProfile}
                    onComplete={() => {
                        setShowSetPassword(false);
                        setCarpenterProfile({...carpenterProfile, requires_password_change: false, has_completed_onboarding: true});
                    }}
                />
            )}
            
            {isMobileMenuOpen && (
                <div 
                    className="mobile-menu-overlay" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998 }}
                />
            )}
            <aside className={`dashboard-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <img src="/clean-transparent.png" alt="Bison Frame" className="brand-icon" style={{ width: 'auto', height: '36px', maxHeight: '36px', objectFit: 'contain' }} />
                    <h2>Bison Frame</h2>
                </div>
                <nav className="sidebar-nav">
                    <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}>
                        <Home size={20} /> Oversigt
                    </button>
                    {myProfile?.email === 'team@bisoncompany.dk' && (
                        <button className={activeTab === 'superadmin' ? 'active' : ''} onClick={() => { setActiveTab('superadmin'); setIsMobileMenuOpen(false); }}>
                            <ShieldAlert size={20} /> Bizon Admin
                        </button>
                    )}

                    {['admin'].includes(effectiveRole) && (
                        <button className={activeTab === 'leads' ? 'active' : ''} onClick={() => { setActiveTab('leads'); setIsMobileMenuOpen(false); }} style={{ position: 'relative' }}>
                            <Users size={20} /> Kunder & Leads
                            {(() => {
                                const unreadCount = leadsData.filter(l => (l.status || 'Ny forespørgsel') === 'Ny forespørgsel' && l.is_read === false).length;
                                if (unreadCount > 0) {
                                    return (
                                        <span className="notification-badge">
                                            {unreadCount}
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                        </button>
                    )}

                    {['admin', 'sales', 'worker', 'apprentice', 'accountant'].includes(effectiveRole) && (
                        <button className={activeTab === 'cases' ? 'active' : ''} onClick={() => { setActiveTab('cases'); setIsMobileMenuOpen(false); }}>
                            <Briefcase size={20} /> {['worker', 'apprentice'].includes(effectiveRole) ? 'Mine opgaver' : 'Sager & Ordrestyring'}
                        </button>
                    )}
                    {['admin', 'sales', 'worker', 'apprentice', 'accountant'].includes(effectiveRole) && (
                        <button className={activeTab === 'calendar' ? 'active' : ''} onClick={() => { setActiveTab('calendar'); setIsMobileMenuOpen(false); }}>
                            <Calendar size={20} /> Kalender
                        </button>
                    )}
                    {['admin', 'sales', 'worker', 'apprentice', 'accountant'].includes(effectiveRole) && (
                        <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }}>
                            <MessageSquare size={20} /> Intern Chat
                            {chatUnreadCount > 0 && <span className="notification-badge">{chatUnreadCount}</span>}
                        </button>
                    )}
                    {['worker', 'apprentice', 'sales'].includes(effectiveRole) && (
                        <button className={activeTab === 'worker_timesheet' ? 'active' : ''} onClick={() => { setActiveTab('worker_timesheet'); setIsMobileMenuOpen(false); }}>
                            <Clock size={20} /> Timeregistrering
                        </button>
                    )}
                    {['worker', 'sales'].includes(effectiveRole) && (
                        <button className={activeTab === 'worker_drafts' ? 'active' : ''} onClick={() => { setActiveTab('worker_drafts'); setIsMobileMenuOpen(false); }}>
                            <PenTool size={20} /> Dine Tilbudskladder
                        </button>
                    )}
                    {['admin', 'accountant'].includes(effectiveRole) && (
                        <>
                        <button className={activeTab === 'finance' ? 'active' : ''} onClick={() => { setActiveTab('finance'); setIsMobileMenuOpen(false); }}>
                            <Wallet size={20} /> Økonomi & Faktura
                        </button>
                        <button className={activeTab === 'admin_timesheet' ? 'active' : ''} onClick={() => { setActiveTab('admin_timesheet'); setIsMobileMenuOpen(false); }}>
                            <FileText size={20} /> Løn & Timer
                        </button>
                        </>
                    )}
                    {['admin', 'sales', 'worker', 'apprentice', 'accountant'].includes(effectiveRole) && (
                        <button className={activeTab === 'map' ? 'active' : ''} onClick={() => { setActiveTab('map'); setIsMobileMenuOpen(false); }}>
                            <MapPin size={20} /> Kortvisning
                        </button>
                    )}
                    {['admin', 'sales', 'worker', 'apprentice'].includes(effectiveRole) && (
                        <button className={activeTab === 'drawings' ? 'active' : ''} onClick={() => { setActiveTab('drawings'); setIsMobileMenuOpen(false); }}>
                            <PenTool size={20} /> Skitser & Tegninger
                        </button>
                    )}
                    {['admin', 'sales'].includes(effectiveRole) && (
                        <button className={activeTab === 'materials' ? 'active' : ''} onClick={() => { setActiveTab('materials'); setIsMobileMenuOpen(false); }}>
                            <Package size={20} /> Materialer
                        </button>
                    )}
                    {['admin'].includes(effectiveRole) && (
                        <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}>
                            <Sliders size={20} /> Prisberegning
                        </button>
                    )}
                    {['admin', 'accountant'].includes(effectiveRole) && (
                        <button className={activeTab === 'integrations' ? 'active' : ''} onClick={() => { setActiveTab('integrations'); setIsMobileMenuOpen(false); }}>
                            <Link size={20} /> Integrationer
                        </button>
                    )}
                    {['admin', 'accountant'].includes(effectiveRole) && (
                        <button className={activeTab === 'team' ? 'active' : ''} onClick={() => { setActiveTab('team'); setIsMobileMenuOpen(false); }}>
                            <HardHat size={20} /> Team & Medarbejdere
                        </button>
                    )}
                    
                    <div style={{ marginTop: 'auto' }}></div>
                    
                    {['admin', 'sales'].includes(effectiveRole) && (
                        <div className="sidebar-booking-card" style={{ padding: '16px', background: 'var(--surface-bg)', borderRadius: '12px', border: '1px solid var(--border-light)', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Link size={16} color="#10b981" />
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Dit Overslagslink</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Dette er linket du sender til kunderne.</p>
                            <button 
                                onClick={() => {
                                    const baseUrl = window.location.origin.includes('localhost') ? window.location.origin : 'https://bisonframe.dk';
                                    navigator.clipboard.writeText(`${baseUrl}/${carpenterProfile?.slug || 't'}`);
                                    toast.success('Overslagslink kopieret!');
                                }}
                                style={{ 
                                    background: '#10b981', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', 
                                    fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#059669'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#10b981'}
                            >
                                Kopiér Link
                            </button>
                        </div>
                    )}
                    
                    <button 
                        className="sidebar-logout-btn" 
                        onClick={() => { supabase.auth.signOut(); setIsProfileMenuOpen(false); }}
                        style={{
                            marginTop: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            color: '#ef4444',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            borderRadius: '8px',
                            width: '100%',
                            textAlign: 'left',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <LogOut size={20} /> Log ud
                    </button>
                </nav>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-topbar">
                    <div className="mobile-menu" onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu />
                    </div>

                    {headerInfo && activeTab !== 'overview' && (
                        <div className="page-title-section hidden md:flex" style={{ flex: 1, paddingLeft: '0', paddingTop: '20px', paddingBottom: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h2 style={{ margin: '0 0 6px', fontSize: '1.75rem', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.5px' }}>{headerInfo.title}</h2>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{headerInfo.desc}</p>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px' }}>


                            </div>
                        </div>
                    )}

                    <div ref={profileMenuRef} className="user-profile flex items-center gap-3 relative" style={{ marginLeft: 'auto' }}>
                        
                        {(isDev || ['team@bisoncompany.dk', 'mbc@bisoncompany.dk'].includes(myProfile?.email) || myProfile?.email?.toLowerCase().includes('madsbyg') || myProfile?.company_name?.toLowerCase().includes('mads') || myProfile?.company_name?.toLowerCase().includes('massbyg')) && (
                            <div style={{ marginRight: '16px', position: 'relative' }}>
                                <button 
                                    onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        padding: '8px 16px', 
                                        borderRadius: '12px', 
                                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                    }}
                                >
                                    <RefreshCw size={14} style={{ opacity: 0.8 }} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.02em' }}>
                                        {simulatedRole === 'sales' ? 'Projektleder' : 
                                         simulatedRole === 'worker' ? 'Svend' : 
                                         simulatedRole === 'apprentice' ? 'Lærling' : 
                                         simulatedRole === 'accountant' ? 'Bogholder' : 'Admin (Dig)'}
                                    </span>
                                    <ChevronDown size={14} style={{ opacity: 0.7, transform: isSimulatorOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                </button>
                                
                                {isSimulatorOpen && (
                                    <>
                                        <div 
                                            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                                            onClick={() => setIsSimulatorOpen(false)}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: '0',
                                            marginTop: '8px',
                                            background: 'rgba(255, 255, 255, 0.95)',
                                            backdropFilter: 'blur(16px)',
                                            borderRadius: '16px',
                                            border: '1px solid rgba(0,0,0,0.05)',
                                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                            padding: '8px',
                                            width: '200px',
                                            zIndex: 9999,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}>
                                            <div style={{ padding: '8px 12px', fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Simuler rolle</div>
                                            
                                            {[
                                                { value: null, label: 'Admin (Dig)', icon: Shield },
                                                { value: 'sales', label: 'Projektleder', icon: Briefcase },
                                                { value: 'worker', label: 'Svend', icon: HardHat },
                                                { value: 'apprentice', label: 'Lærling', icon: User },
                                                { value: 'accountant', label: 'Bogholder', icon: Calculator }
                                            ].map((role) => (
                                                <button
                                                    key={role.value || 'admin'}
                                                    onClick={() => { setSimulatedRole(role.value); setIsSimulatorOpen(false); }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        width: '100%',
                                                        padding: '10px 12px',
                                                        borderRadius: '10px',
                                                        border: 'none',
                                                        background: simulatedRole === role.value ? '#f1f5f9' : 'transparent',
                                                        color: simulatedRole === role.value ? '#3b82f6' : '#475569',
                                                        fontSize: '0.9rem',
                                                        fontWeight: simulatedRole === role.value ? '600' : '500',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = simulatedRole === role.value ? '#f1f5f9' : '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = simulatedRole === role.value ? '#f1f5f9' : 'transparent'; e.currentTarget.style.color = simulatedRole === role.value ? '#3b82f6' : '#475569'; }}
                                                >
                                                    <role.icon size={16} />
                                                    {role.label}
                                                    {simulatedRole === role.value && <Check size={14} style={{ marginLeft: 'auto' }} />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <button 
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '12px', background: 'transparent', 
                                border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '30px',
                                transition: 'all 0.2s'
                            }}
                            className="hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <div className="user-info text-right hidden sm:block" style={{ marginRight: '8px' }}>
                                <strong className="block text-slate-900 dark:text-white leading-tight">
                                    {myProfile?.owner_name || myProfile?.company_name || 'Henter...'}
                                </strong>
                                <span className="text-xs text-blue-500 font-medium">
                                    {myProfile?.role === 'sales' ? 'Projektleder' : myProfile?.role === 'accountant' ? 'Bogholder' : myProfile?.role === 'worker' ? 'Tømrersvend' : myProfile?.role === 'apprentice' ? 'Tømrerlærling' : myProfile?.role === 'admin' && myProfile?.email === 'team@bisoncompany.dk' ? 'Bizon Admin' : 'Mester'}
                                </span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-300 dark:border-slate-600">
                                {myProfile?.avatar_url ? (
                                    <img src={myProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-slate-500 font-bold text-sm">
                                        {(myProfile?.owner_name || myProfile?.company_name || 'T')?.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </button>

                        {isProfileMenuOpen && (
                                <div
                                    style={{
                                        position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 9999,
                                        width: '240px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px',
                                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '16px',
                                        transformOrigin: 'top right',
                                        animation: 'fadeUp 0.18s ease-out'
                                    }}
                                >
                                    <button 
                                        onClick={() => { setActiveTab('profile'); setIsProfileMenuOpen(false); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', fontWeight: '500', transition: 'background 0.2s' }}
                                        className="hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <User size={18} className="text-blue-500" />
                                        Min Profil
                                    </button>
                                    <button 
                                        onClick={() => { setActiveTab('account_settings'); setIsProfileMenuOpen(false); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', fontWeight: '500', transition: 'background 0.2s' }}
                                        className="hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <Settings size={18} className="text-blue-500" />
                                        Indstillinger
                                    </button>
                                    <button 
                                        onClick={() => { setIsFeedbackModalOpen(true); setIsProfileMenuOpen(false); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', fontWeight: '500', transition: 'background 0.2s' }}
                                        className="hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <MessageSquare size={18} className="text-blue-500" />
                                        Giv feedback
                                    </button>
                                    <div style={{ height: '1px', background: 'var(--border-light)', margin: '4px 0' }}></div>
                                    <button 
                                        onClick={() => { supabase.auth.signOut(); setIsProfileMenuOpen(false); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: '#ef4444', fontWeight: '500', transition: 'background 0.2s' }}
                                        className="hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <LogOut size={18} />
                                        Log ud
                                    </button>
                                </div>
                        )}
                    </div>
                </header>
                {/* Integration Success Modal */}
                {integrationSuccessData && createPortal(
                    <div 
                        className="fixed inset-0 flex items-center justify-center p-4" 
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <div 
                            className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-md relative"
                            style={{ animation: 'fadeUp 0.3s ease-out forwards', backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(24px)', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', width: '100%', maxWidth: '450px' }}
                        >
                            <div style={{ padding: '32px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
                                <div style={{ 
                                    width: '80px', height: '80px', borderRadius: '50%', 
                                    backgroundColor: integrationSuccessData.platform === 'Ordrestyring' ? '#fdf2f8' : integrationSuccessData.platform === 'Minuba' ? '#ecfdf5' : '#eef2ff',
                                    color: integrationSuccessData.platform === 'Ordrestyring' ? '#db2777' : integrationSuccessData.platform === 'Minuba' ? '#047857' : '#4f46e5',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    fontSize: '36px', margin: '0 auto 24px auto'
                                }}>
                                    <CheckCircle size={40} strokeWidth={2} />
                                </div>
                                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '12px', marginTop: 0 }}>
                                    Succes! Data er overført
                                </h2>
                                <p style={{ color: '#6b7280', marginBottom: '32px', lineHeight: '1.6', fontSize: '15px' }}>
                                    Kunden og opgaven er nu sikkert oprettet og ligger klar i <strong>{integrationSuccessData.platform}</strong>.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <a 
                                        href={integrationSuccessData.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        onClick={() => setIntegrationSuccessData(null)}
                                        style={{ 
                                            width: '100%', padding: '16px', borderRadius: '14px', 
                                            backgroundColor: integrationSuccessData.platform === 'Ordrestyring' ? '#be185d' : integrationSuccessData.platform === 'Minuba' ? '#10b981' : '#3730a3', 
                                            color: '#ffffff', fontWeight: '600', textDecoration: 'none', 
                                            display: 'block', transition: 'opacity 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                                        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                                    >
                                        Åbn sagen i {integrationSuccessData.platform} nu
                                    </a>
                                    
                                    {/* Debug hjælp til os (kun synlig hvis platform er Ordrestyring og der er debugData) */}
                                    {integrationSuccessData.platform === 'Ordrestyring' && integrationSuccessData.debugData?.fullCaseData && (
                                        <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '8px', wordBreak: 'break-all' }}>
                                            [Debug: fullCase={JSON.stringify(integrationSuccessData.debugData.fullCaseData || {}).substring(0, 100)}...
                                            casesList={(JSON.stringify(integrationSuccessData.debugData.casesList) || "").substring(0, 100)}...
                                            locHeader={integrationSuccessData.debugData.locationHeader || 'null'}]
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => setIntegrationSuccessData(null)}
                                        style={{ 
                                            width: '100%', padding: '16px', borderRadius: '14px', 
                                            backgroundColor: '#f3f1ed', color: '#6b7280', 
                                            fontWeight: '600', border: 'none', cursor: 'pointer',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                    >
                                        Fortsæt i Bison Frame
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* The old inline trial banner has been removed */}
                
                <div className="dashboard-content" style={activeTab === 'overview' && ['worker', 'apprentice', 'sales'].includes(effectiveRole) ? { padding: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' } : {}}>
                    {isPaywallActive && activeTab !== 'account_settings' ? (
                        <div className="smooth-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
                            <div style={{ background: '#fef2f2', border: '1px solid #e8e6e1', padding: '40px', borderRadius: '20px', maxWidth: '600px', boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.1)' }}>
                                <ShieldAlert size={64} color="#ef4444" style={{ margin: '0 auto 24px' }} />
                                <h2 style={{ fontSize: '24px', color: '#7f1d1d', marginBottom: '16px', fontWeight: 'bold' }}>
                                    {paywallReason === 'trial_expired' ? 'Din prøveperiode er udløbet' : 'Abonnement inaktivt'}
                                </h2>
                                <p style={{ color: '#991b1b', fontSize: '16px', marginBottom: '24px', lineHeight: '1.6' }}>
                                    {paywallReason === 'trial_expired' 
                                        ? 'For at fortsætte med at bruge platformen og sende tilbud, skal du tilknytte et firmakort. Dine data, igangværende tilbud og historik er stadig gemt trygt hos os.'
                                        : 'Dit abonnement står i øjeblikket som inaktivt. Venligst opdater dine betalingsoplysninger for at genoptage adgangen til platformen og dine tilbud.'}
                                </p>
                                <button 
                                    onClick={() => setActiveTab('account_settings')}
                                    style={{ fontSize: '16px', padding: '14px 28px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
                                >
                                    Gå til Betaling
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div key={activeTab} className="smooth-fade-in" style={activeTab === 'overview' && ['worker', 'apprentice', 'sales'].includes(effectiveRole) ? { flex: 1, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' } : { height: '100%' }}>
                        {renderDashboardMobileHeader()}
                        {activeTab === 'superadmin' && myProfile?.email === 'team@bisoncompany.dk' && (
                        <SuperAdminView />
                    )}
                    {activeTab === 'overview' && (
                        ['worker', 'apprentice', 'sales'].includes(effectiveRole) ? (
                            <WorkerOverview
                                leadsData={roleFilteredLeads}
                                myProfile={{ ...myProfile, role: effectiveRole }}
                                setActiveTab={setActiveTab}
                                setTargetCaseId={setTargetCaseId}
                                simulatedRole={simulatedRole}
                            />
                        ) : (
                            <DashboardOverview 
                                leadsData={roleFilteredLeads} 
                                carpenterProfile={{ ...carpenterProfile, role: effectiveRole }} 
                                myProfile={{ ...myProfile, role: effectiveRole }} 
                                setActiveTab={setActiveTab} 
                                setSelectedLead={setSelectedLead}
                                setTargetCaseId={setTargetCaseId}
                            />
                        )
                    )}

                    {activeTab === 'worker_timesheet' && ['worker', 'apprentice', 'sales'].includes(effectiveRole) && (
                        <WorkerTimesheet 
                            leadsData={roleFilteredLeads} 
                            myProfile={{ ...myProfile, role: effectiveRole }} 
                            simulatedRole={simulatedRole}
                        />
                    )}

                    {activeTab === 'worker_drafts' && ['worker', 'sales'].includes(effectiveRole) && (
                        <WorkerDrafts
                            profile={{ ...myProfile, role: effectiveRole, id: impersonateId || myProfile.id }}
                            carpenterProfile={carpenterProfile}
                            supabase={supabase}
                            leadsData={leadsData}
                            setLeadsData={setLeadsData}
                        />
                    )}

                    {activeTab === 'team' && ['admin', 'sales', 'accountant'].includes(effectiveRole) && (
                        <div className="dashboard-workspace team-overview tab-pane active" style={{ height: '100%', overflowY: 'auto', paddingRight: '10px' }}>
                            {carpenterProfile?.tier === 'enterprise' ? (
                                <TeamManagement profile={{ ...carpenterProfile, role: effectiveRole }} leadsData={leadsData} />
                            ) : (
                                <div style={{ maxWidth: '600px', margin: '60px auto', background: '#fff', borderRadius: '24px', padding: '48px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)' }}>
                                    <div style={{ width: '80px', height: '80px', background: '#fef2f2', color: '#ef4444', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 24px', border: '1px solid #fee2e2', boxShadow: '0 4px 12px rgba(239,68,68,0.1)' }}>
                                        <Lock size={40} />
                                    </div>
                                    <h2 style={{ fontSize: '1.75rem', color: '#0f172a', marginBottom: '16px', fontWeight: '800', letterSpacing: '-0.5px' }}>Låst Premium Funktion</h2>
                                    <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '32px' }}>
                                        "Team & Medarbejdere" funktionen er forbeholdt vores <strong>Enterprise</strong> pakkeløsning.<br/><br/>
                                        Få fuld kontrol over dit team, tildel opgaver og styr rettigheder ned til mindste detalje.
                                    </p>
                                    <button 
                                        onClick={() => setActiveTab('account_settings')}
                                        style={{ background: '#0f172a', color: '#fff', padding: '14px 28px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 8px 16px -4px rgba(15,23,42,0.3)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        Opgrader i Indstillinger
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'profile' && myProfile && (
                        <div className="space-y-8" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                            <MyProfileView myProfile={myProfile} setMyProfile={setMyProfile} />
                        </div>
                    )}
                    
                    {activeTab === 'account_settings' && myProfile && (
                        <div className="space-y-8" style={{ maxWidth: '1200px', margin: '0 auto', height: '100%', overflowY: 'auto', padding: '24px' }}>
                            {/* Vis kun firma-indstillinger hvis brugeren er ejer af firmaet (admin) */}
                            {myProfile.role === 'admin' && carpenterProfile ? (
                                <AccountSettingsView 
                                    carpenterProfile={carpenterProfile}
                                    setCarpenterProfile={setCarpenterProfile}
                                    handleProfileSave={handleProfileSave}
                                    isSaving={isSaving}
                                    initialCategories={initialCategories}
                                    disabledCategories={disabledCategories}
                                    toggleCategoryActive={toggleCategoryActive}
                                    handleFileUpload={handleFileUpload}
                                    isUploadingLogo={isUploadingLogo}
                                    isUploadingPortrait={isUploadingPortrait}
                                    session={session}
                                />
                            ) : (
                                <div style={{ maxWidth: '600px', margin: '60px auto', background: '#fff', borderRadius: '24px', padding: '48px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)' }}>
                                    <div style={{ width: '80px', height: '80px', background: '#f1f5f9', color: '#64748b', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                        <Lock size={40} />
                                    </div>
                                    <h2 style={{ fontSize: '1.75rem', color: '#0f172a', marginBottom: '16px', fontWeight: '800', letterSpacing: '-0.5px' }}>Firma Indstillinger Låst</h2>
                                    <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '32px' }}>
                                        Du har ikke administrator-rettigheder til at se eller ændre firmaets indstillinger.<br/><br/>
                                        Kontakt din mester (admin), hvis der er oplysninger, API-nøgler eller priser, der skal rettes for firmaet.
                                    </p>
                                    <button 
                                        onClick={() => setActiveTab('profile')}
                                        style={{ background: '#0f172a', color: '#fff', padding: '14px 28px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 8px 16px -4px rgba(15,23,42,0.3)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        Gå tilbage til Min Profil
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'cases' && (
                        <div className="tab-pane active" style={{ height: '100%', overflowY: 'auto' }}>
                            <CaseManagement 
                                targetCaseId={targetCaseId}
                                clearTargetCase={() => setTargetCaseId(null)}
                                leads={leadsData} 
                                profile={{ ...myProfile, role: effectiveRole, company_id: carpenterProfile?.company_id || carpenterProfile?.id }} 
                                carpenterProfile={carpenterProfile}
                                setCarpenterProfile={setCarpenterProfile}
                                simulatedRole={simulatedRole}
                                syncToAccounting={syncToAccounting}
                                onOpenInvoice={(caseId) => {
                                    setTargetInvoiceCaseId(caseId);
                                    setActiveTab('finance');
                                }}
                                onOpenChat={(caseId) => {
                                    setChatTargetLeadId(caseId);
                                    setActiveTab('chat');
                                }}
                                onUpdateLead={(updated) => {
                                    setLeadsData(prev => prev.map(l => l.id === updated.id ? updated : l));
                                    if (selectedLead && selectedLead.id === updated.id) {
                                        setSelectedLead(updated);
                                    }
                                }} 
                            />
                        </div>
                    )}
                    {activeTab === 'calendar' && (
                        <div className="tab-pane active" style={{ height: '100%', overflowY: 'auto' }}>
                            <CalendarView 
                                leadsData={leadsData}
                                myProfile={myProfile}
                                simulatedRole={simulatedRole}
                                setLeadsData={setLeadsData}
                                teamMembers={teamMembers}
                                carpenterProfile={carpenterProfile}
                                setCarpenterProfile={setCarpenterProfile}
                                onCaseClick={(lead) => {
                                    setTargetCaseId(lead.id);
                                    setActiveTab('cases');
                                }}
                            />
                        </div>
                    )}
                    {activeTab === 'chat' && (
                        <div className="tab-pane active" style={{ height: '100%' }}>
                            <ChatTab 
                                profile={{ ...myProfile, role: effectiveRole, company_id: carpenterProfile?.company_id || carpenterProfile?.id }}
                                leads={leadsData}
                                targetLeadId={chatTargetLeadId}
                                clearTargetLeadId={() => setChatTargetLeadId(null)}
                                onThreadRead={() => chatUnreadRefreshRef.current && chatUnreadRefreshRef.current()}
                            />
                        </div>
                    )}
                    {activeTab === 'finance' && (
                        <div className="tab-pane active " style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
                            <FinanceOverview
                                cases={leadsData.filter(l => isConfirmedCase(l))}
                                carpenterProfile={carpenterProfile}
                                isMobile={isMobile}
                                onSendToAccounting={syncToAccounting}
                                targetInvoiceCaseId={targetInvoiceCaseId}
                                clearTargetInvoiceCase={() => setTargetInvoiceCaseId(null)}
                                onOpenCase={(caseId) => {
                                    setTargetCaseId(caseId);
                                    setActiveTab('cases');
                                }}
                                onUpdateLead={(updated) => {
                                    setLeadsData(prev => prev.map(l => l.id === updated.id ? updated : l));
                                    if (selectedLead && selectedLead.id === updated.id) {
                                        setSelectedLead(updated);
                                    }
                                }}
                            />
                        </div>
                    )}
                    {activeTab === 'admin_timesheet' && (
                        <div className="tab-pane active " style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
                            <AdminTimesheet 
                                leadsData={leadsData} 
                                profile={myProfile} 
                            />
                        </div>
                    )}
                    {activeTab === 'leads' && (
                        <div className="dashboard-workspace leads-overview space-y-8 " style={{ maxWidth: '1200px', margin: '0 auto' }}>
                            <div className="settings-card">
                                
                                
                                <div className="card-body">
                                    {/* Pipeline Menu with Action Button */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingBottom: '10px', flexWrap: 'wrap', gap: '16px' }}>
                                    <div className="desktop-filters" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                                        {['Ny forespørgsel', 'Sendt tilbud', 'Bekræftet opgave', 'Sæt i bero', 'Afbrudt Sag', 'Historik']
                                            .filter(status => effectiveRole !== 'accountant' || status === 'Bekræftet opgave' || status === 'Sæt i bero' || status === 'Historik')
                                            .map(status => (
                                            <button 
                                                key={status} 
                                                onClick={(e) => {
                                                    setLeadFilter(status);
                                                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                                }}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '20px',
                                                    border: '1px solid',
                                                    borderColor: leadFilter === status 
                                                        ? (status === 'Ny forespørgsel' ? '#3b82f6' : status === 'Sendt tilbud' ? '#eab308' : status === 'Bekræftet opgave' ? '#10b981' : status === 'Sæt i bero' ? '#f97316' : status === 'Historik' ? '#6b7280' : '#ef4444') 
                                                        : 'rgba(255,255,255,0.2)',
                                                    backgroundColor: leadFilter === status 
                                                        ? (status === 'Ny forespørgsel' ? 'rgba(59, 130, 246, 0.1)' : status === 'Sendt tilbud' ? 'rgba(234, 179, 8, 0.1)' : status === 'Bekræftet opgave' ? 'rgba(16, 185, 129, 0.1)' : status === 'Sæt i bero' ? 'rgba(249, 115, 22, 0.1)' : status === 'Historik' ? 'rgba(107, 114, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)') 
                                                        : 'rgba(255,255,255,0.05)',
                                                    color: leadFilter === status 
                                                        ? (status === 'Ny forespørgsel' ? '#60a5fa' : status === 'Sendt tilbud' ? '#facc15' : status === 'Bekræftet opgave' ? '#34d399' : status === 'Sæt i bero' ? '#fb923c' : status === 'Historik' ? '#9ca3af' : '#f87171') 
                                                        : 'var(--text-primary)',
                                                    fontWeight: leadFilter === status ? 'bold' : 'normal',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                    transition: 'all 0.2s',
                                                    backdropFilter: 'blur(10px)'
                                                }}
                                            >
                                                {status}
                                                <span style={{ marginLeft: '8px', background: leadFilter === status ? (status === 'Ny forespørgsel' ? '#3b82f6' : status === 'Sendt tilbud' ? '#eab308' : status === 'Bekræftet opgave' ? '#10b981' : status === 'Sæt i bero' ? '#f97316' : status === 'Historik' ? '#6b7280' : '#ef4444') : 'rgba(255,255,255,0.2)', color: leadFilter === status ? '#fff' : 'var(--text-secondary)', borderRadius: '10px', padding: '2px 8px', fontSize: '0.75rem' }}>
                                                    {leadsData.filter(l => {
                                                        const s = l.status || 'Ny forespørgsel';
                                                        return s === status || (status === 'Ny forespørgsel' && s === 'Intern Kladde');
                                                    }).length}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mobile-filters" style={{ width: '100%', position: 'relative' }}>
                                        <button 
                                            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                                            style={{
                                                width: '100%',
                                                padding: '12px 20px',
                                                borderRadius: '24px',
                                                border: '1px solid',
                                                borderColor: leadFilter === 'Ny forespørgsel' ? '#3b82f6' : leadFilter === 'Sendt tilbud' ? '#eab308' : leadFilter === 'Bekræftet opgave' ? '#10b981' : leadFilter === 'Sæt i bero' ? '#f97316' : leadFilter === 'Historik' ? '#6b7280' : '#ef4444',
                                                backgroundColor: leadFilter === 'Ny forespørgsel' ? 'rgba(59, 130, 246, 0.1)' : leadFilter === 'Sendt tilbud' ? 'rgba(234, 179, 8, 0.1)' : leadFilter === 'Bekræftet opgave' ? 'rgba(16, 185, 129, 0.1)' : leadFilter === 'Sæt i bero' ? 'rgba(249, 115, 22, 0.1)' : leadFilter === 'Historik' ? 'rgba(107, 114, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: leadFilter === 'Ny forespørgsel' ? '#60a5fa' : leadFilter === 'Sendt tilbud' ? '#facc15' : leadFilter === 'Bekræftet opgave' ? '#34d399' : leadFilter === 'Sæt i bero' ? '#fb923c' : leadFilter === 'Historik' ? '#9ca3af' : '#f87171',
                                                fontSize: '1.05rem',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                backdropFilter: 'blur(10px)',
                                                transition: 'all 0.2s',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {leadFilter}
                                                <span style={{ 
                                                    background: leadFilter === 'Ny forespørgsel' ? '#3b82f6' : leadFilter === 'Sendt tilbud' ? '#eab308' : leadFilter === 'Bekræftet opgave' ? '#10b981' : leadFilter === 'Sæt i bero' ? '#f97316' : leadFilter === 'Historik' ? '#6b7280' : '#ef4444', 
                                                    color: '#fff', 
                                                    borderRadius: '10px', 
                                                    padding: '2px 8px', 
                                                    fontSize: '0.8rem' 
                                                }}>
                                                    {leadsData.filter(l => {
                                                        const s = l.status || 'Ny forespørgsel';
                                                        return s === leadFilter || (leadFilter === 'Ny forespørgsel' && s === 'Intern Kladde');
                                                    }).length}
                                                </span>
                                            </div>
                                            <svg style={{ transform: isFilterDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </button>
                                        
                                        {isFilterDropdownOpen && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                right: 0,
                                                marginTop: '8px',
                                                backgroundColor: '#ffffff',
                                                borderRadius: '16px',
                                                border: '1px solid var(--border)',
                                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
                                                zIndex: 50,
                                                overflow: 'hidden'
                                            }}>
                                                {['Ny forespørgsel', 'Sendt tilbud', 'Bekræftet opgave', 'Afbrudt Sag', 'Historik']
                                                    .filter(status => effectiveRole !== 'accountant' || status === 'Bekræftet opgave' || status === 'Historik')
                                                    .map(status => (
                                                        <button
                                                            key={status}
                                                            onClick={() => { setLeadFilter(status); setIsFilterDropdownOpen(false); }}
                                                            style={{
                                                                width: '100%',
                                                                padding: '16px 20px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                borderBottom: '1px solid var(--border-light)',
                                                                backgroundColor: leadFilter === status ? 'rgba(255,255,255,0.03)' : 'transparent',
                                                                color: leadFilter === status ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                                fontWeight: leadFilter === status ? 'bold' : 'normal',
                                                                textAlign: 'left',
                                                                border: 'none',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                {leadFilter === status && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                                <span style={{ marginLeft: leadFilter === status ? '0' : '26px' }}>{status}</span>
                                                            </div>
                                                            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                                                                {leadsData.filter(l => (l.status || 'Ny forespørgsel') === status).length}
                                                            </span>
                                                        </button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                    {leadFilter !== 'Bekræftet opgave' && leadFilter !== 'Afsluttet opgave' && (
                                        <button className="btn-primary" onClick={() => setIsCreateLeadModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, padding: '10px 20px', borderRadius: '30px' }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                            Opret Ny Kunde
                                        </button>
                                    )}
                                </div>
                                
                                <div style={{ marginBottom: '20px', position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                                    <Search size={20} />
                                </div>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        placeholder={window.innerWidth < 768 ? `Søg i "${leadFilter}"...` : `Søg i "${leadFilter}" på kundenavn, adresse, email, telefon eller opgavetype...`}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{
                                            width: '100%',
                                            paddingLeft: '44px'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            {isLeadsLoading ? (
                                <div className="placeholder-state"><h3>Henter kunder fra databasen...</h3></div>
                            ) : filteredLeads.length === 0 ? (
                                <div className="placeholder-state" style={{ backgroundColor: '#f3f1ed', borderColor: '#e2e8f0', padding: '48px 24px', textAlign: 'center' }}>
                                    <div style={{ width: '64px', height: '64px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                        <Users size={32} color="#64748b" />
                                    </div>
                                    {leadFilter === 'Ny forespørgsel' ? (
                                        <>
                                            <h3 style={{ color: '#1a1a1a', marginBottom: '12px' }}>Din indbakke er tom lige nu</h3>
                                            <p style={{ color: '#6b7280', maxWidth: '400px', margin: '0 auto 24px', lineHeight: '1.6' }}>
                                                Når kunder udfylder din prisberegner, vil de dukke op her automatisk. Kopiér dit booking-link herunder og del det på din hjemmeside eller sociale medier for at komme i gang.
                                            </p>
                                            <button 
                                                onClick={() => { 
                                                    navigator.clipboard.writeText(window.location.origin + '/' + carpenterProfile?.slug); 
                                                    toast.success('Link kopieret!'); 
                                                }}
                                                style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                                            >
                                                <Link size={18} /> Kopiér mit booking-link
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <h3 style={{ color: '#6b7280' }}>Ingen kunder i "{leadFilter}"</h3>
                                            <p style={{ color: '#6b7280' }}>Skift fane for at se dine andre leads.</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                    {filteredLeads.map(lead => (
                                        <div 
                                            key={lead.id} 
                                            onClick={() => handleSelectLead(lead)}
                                            className="glass-panel"
                                            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            {/* Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                                <div>
                                                    <h3 style={{ margin: '0 0 4px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '1.2rem' }}>
                                                        {lead.customer_name} 
                                                        {(lead.status || 'Ny forespørgsel') === 'Ny forespørgsel' && lead.is_read === false && (
                                                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ef4444', color: '#fff', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                                                                NY
                                                            </span>
                                                        )}
                                                        {lead.raw_data?.created_by ? (() => {
                                                            const creator = teamMembers.find(m => m.id === lead.raw_data.created_by);
                                                            if (creator) {
                                                                return (
                                                                    <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0' }}>
                                                                        {creator.avatar_url ? (
                                                                            <img src={creator.avatar_url} alt="avatar" style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover' }} />
                                                                        ) : (
                                                                            <User size={12} />
                                                                        )}
                                                                        Oprettet af {creator.full_name || creator.owner_name || creator.company_name || creator.email}
                                                                    </span>
                                                                );
                                                            }
                                                            return null;
                                                        })() : (
                                                            <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #bfdbfe' }}>
                                                                <Calculator size={12} /> Ny online forespørgsel
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Clock size={14} /> Modtaget: {new Date(lead.created_at).toLocaleDateString('da-DK')} kl. {new Date(lead.created_at).toLocaleTimeString('da-DK', {hour: '2-digit', minute:'2-digit'})}
                                                    </p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {lead.raw_data?.sent_by_worker_name && (
                                                        <span style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '20px', backgroundColor: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                                                            <User size={14} /> Fra {lead.raw_data.sent_by_worker_name}
                                                        </span>
                                                    )}
                                                    <span style={{ 
                                                        fontSize: '0.8rem', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold',
                                                        backgroundColor: (lead.status || 'Ny forespørgsel') === 'Ny forespørgsel' ? 'rgba(37,99,235,0.1)' : ((lead.status || '') === 'Sendt tilbud' ? 'rgba(202,138,4,0.1)' : (lead.status || '') === 'Bekræftet opgave' ? 'rgba(5,150,105,0.1)' : (lead.status === 'Intern Kladde' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220,38,38,0.1)')),
                                                        color: (lead.status || 'Ny forespørgsel') === 'Ny forespørgsel' ? '#3b82f6' : ((lead.status || '') === 'Sendt tilbud' ? '#eab308' : (lead.status || '') === 'Bekræftet opgave' ? '#10b981' : (lead.status === 'Intern Kladde' ? '#059669' : '#ef4444')),
                                                        border: `1px solid ${(lead.status || 'Ny forespørgsel') === 'Ny forespørgsel' ? '#3b82f6' : ((lead.status || '') === 'Sendt tilbud' ? '#eab308' : (lead.status || '') === 'Bekræftet opgave' ? '#10b981' : (lead.status === 'Intern Kladde' ? '#10b981' : '#ef4444'))}40`
                                                    }}>{lead.status || 'Ny forespørgsel'}</span>
                                                    {(lead.status === 'Sendt tilbud') && (
                                                        lead.opened_at ? (
                                                            <span style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '20px', backgroundColor: 'rgba(5,150,105,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(16,185,129,0.4)' }}>
                                                                <Eye size={14} /> Åbnet af kunde
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '20px', backgroundColor: 'rgba(107,114,128,0.1)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(107,114,128,0.4)' }}>
                                                                <Mail size={14} /> Afventer kunde
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Body */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', padding: '16px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                                                {/* Kolonne 1: Opgave og pris */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                                                        <Wrench size={18} style={{ color: '#60a5fa' }} /> 
                                                        <span style={{ fontWeight: 'bold' }}>
                                                            {lead.project_category === 'special' 
                                                                ? (lead.raw_data?.details?.title || 'Skræddersyet opgave')
                                                                : (categoryNames[lead.project_category] || lead.project_category)}
                                                        </span>
                                                    </div>
                                                    
                                                    {isConfirmedCase(lead) ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.05)', padding: '10px 12px', borderRadius: '8px' }}>
                                                            <CheckCircle size={18} />
                                                            <div>
                                                                <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8 }}>Accepteret tilbud</span>
                                                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{lead.raw_data?.actual_quote_price ? Math.round(lead.raw_data.actual_quote_price).toLocaleString('da-DK') : '?'} kr.</span>
                                                                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}> inkl. moms</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', backgroundColor: 'rgba(96,165,250,0.05)', padding: '10px 12px', borderRadius: '8px' }}>
                                                            <Calculator size={18} style={{ color: '#60a5fa' }} />
                                                            <div>
                                                                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                    {lead.project_category === 'special' ? 'Estimat (Intern kladde)' : 'Overslag givet'}
                                                                </span>
                                                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{lead.raw_data?.calc_data?.finalEstimateIncVat ? `${lead.raw_data.calc_data.finalEstimateIncVat.toLocaleString('da-DK')} kr.` : lead.price_estimate}</span>
                                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}> inkl. moms</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Kolonne 2: Kontaktinfo */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                                        <Phone size={16} style={{ color: '#9ca3af' }} />
                                                        <a href={`tel:${(lead.customer_phone || '').replace(/[^0-9+]/g, '')}`} style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'} onClick={(e) => e.stopPropagation()}>{lead.customer_phone}</a>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                                        <Mail size={16} style={{ color: '#9ca3af' }} />
                                                        <a href={`mailto:${lead.customer_email}`} style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'} onClick={(e) => e.stopPropagation()}>{lead.customer_email}</a>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                                        <MapPin size={16} style={{ color: '#9ca3af', marginTop: '2px', flexShrink: 0 }} />
                                                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.customer_address || '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', lineHeight: '1.4' }} onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'} onClick={(e) => e.stopPropagation()}>{lead.customer_address}</a>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa', fontSize: '0.95rem', fontWeight: '500', marginTop: '4px' }}>
                                                        <Calendar size={16} />
                                                        <span>Kunden ønsker: {lead.contact_preference}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer / Actions */}
                                            <div className="lead-card-actions">
                                                
                                                <div className="lead-card-actions-left">
                                                    <div style={{ width: '250px' }}>
                                                        <CustomSelect 
                                                            value={lead.status || 'Ny forespørgsel'}
                                                            onChange={(newVal) => updateLeadStatus(lead.id, newVal)}
                                                            icon={Layers}
                                                            options={[
                                                                { value: "Ny forespørgsel", label: "Mappe: Ny forespørgsel" },
                                                                { value: "Sendt tilbud", label: "Mappe: Sendt tilbud" },
                                                                { value: "Bekræftet opgave", label: "Mappe: Bekræftet opgave" },
                                                                { value: "Afbrudt Sag", label: "Mappe: Afbrudt Sag" },
                                                                { value: "Historik", label: "Mappe: Historik (Afsluttet)" }
                                                            ]}
                                                        />
                                                    </div>

                                                    {effectiveRole === 'admin' && teamMembers.length > 0 && (
                                                        <div style={{ width: '250px' }}>
                                                            <CustomSelect 
                                                                value={lead.assigned_to || ''}
                                                                placeholder="Ikke tildelt"
                                                                icon={User}
                                                                onChange={async (newVal) => { 
                                                                    const empId = newVal;
                                                                    const { error } = await supabase.from('leads').update({ assigned_to: empId || null }).eq('id', lead.id);
                                                                    if (!error) {
                                                                        setLeadsData(prev => prev.map(l => l.id === lead.id ? { ...l, assigned_to: empId || null } : l));
                                                                        toast.success("Lead tildelt!");
                                                                    } else {
                                                                        toast.error("Fejl ved tildeling.");
                                                                    }
                                                                }}
                                                                options={[
                                                                    { value: "", label: "Ikke tildelt" },
                                                                    ...teamMembers.map(member => ({
                                                                        value: member.id,
                                                                        label: `${member.owner_name || member.company_name || member.email || 'Ukendt'} (${getRoleLabel(member.role)})`
                                                                    }))
                                                                ]}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="lead-card-actions-right">
                                                    <button className="btn-primary" onClick={(e) => { e.stopPropagation(); handleSelectLead(lead); }} style={{ padding: '10px 24px', fontSize: '0.95rem' }}>
                                                        Se Opgavedetaljer
                                                    </button>

                                                    {isConfirmedCase(lead) && (
                                                        <div className="lead-card-integration-btns">
                                                            {(carpenterProfile?.economic_api_key || carpenterProfile?.dinero_api_key) && ['admin', 'accountant'].includes(effectiveRole) && !carpenterProfile?.ordrestyring_token && !carpenterProfile?.apacta_api_key && !carpenterProfile?.minuba_api_token && (
                                                                // Bison Frame OMS check: If lead has timesheets or work orders, hide the button so they must invoice from within the case management
                                                                (!lead.timesheets?.length && !lead.work_orders?.length) && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); syncToAccounting(lead); }}
                                                                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid #10b981', backgroundColor: '#ecfdf5', color: '#059669', fontWeight: 'bold', cursor: 'pointer', outline: 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                                >
                                                                    <FileText size={16} /> Regnskabsprogram
                                                                </button>
                                                                )
                                                            )}
                                                        {carpenterProfile?.ordrestyring_token && ['admin', 'accountant'].includes(effectiveRole) && (
                                                            lead.ordrestyring_case_id ? (
                                                                <a 
                                                                    href={
                                                                        (String(lead.ordrestyring_case_id).length >= 4 || Number(lead.ordrestyring_case_id) > 1000)
                                                                            ? `https://system.ordrestyring.dk/cases?id=${lead.ordrestyring_case_id}`
                                                                            : `https://system.ordrestyring.dk/cases`
                                                                    }
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid #db2777', backgroundColor: '#fdf2f8', color: '#be185d', fontWeight: 'bold', cursor: 'pointer', outline: 'none', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                                >
                                                                    <ExternalLink size={16} /> Åbn i Ordrestyring
                                                                </a>
                                                            ) : (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); syncToOrdrestyring(lead); }}
                                                                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid #db2777', backgroundColor: '#fdf2f8', color: '#be185d', fontWeight: 'bold', cursor: 'pointer', outline: 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                                >
                                                                    <UploadCloud size={16} /> Til Ordrestyring
                                                                </button>
                                                            )
                                                        )}
                                                        {carpenterProfile?.apacta_api_key && ['admin', 'accountant'].includes(effectiveRole) && (
                                                            lead.apacta_case_id ? (
                                                                <a 
                                                                    href={`https://control-panel.apacta.com/projects/${lead.apacta_case_id}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid #4f46e5', backgroundColor: '#eef2ff', color: '#4338ca', fontWeight: 'bold', cursor: 'pointer', outline: 'none', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                                >
                                                                    <ExternalLink size={16} /> Åbn i Apacta
                                                                </a>
                                                            ) : (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); syncToApacta(lead); }}
                                                                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid #4f46e5', backgroundColor: '#eef2ff', color: '#4338ca', fontWeight: 'bold', cursor: 'pointer', outline: 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                                >
                                                                    <UploadCloud size={16} /> Til Apacta
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedLead && createPortal(
                                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px', overscrollBehavior: 'none', touchAction: 'none' }} onClick={() => setSelectedLead(null)}>
                                    <div style={{ 
                                        backgroundColor: 'var(--bg-card)', 
                                        backdropFilter: 'blur(24px)', 
                                        borderRadius: '20px', 
                                        width: '100%', 
                                        maxWidth: '1100px', 
                                        maxHeight: '90vh', 
                                        overflowY: 'auto', 
                                        WebkitOverflowScrolling: 'touch',
                                        overscrollBehavior: 'contain',
                                        padding: '32px', 
                                        position: 'relative'
                                    }} onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => setSelectedLead(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
                                        
                                        <h2 style={{ color: '#1a1a1a', borderBottom: '2px solid #e8e6e1', paddingBottom: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', paddingRight: '40px' }}>
                                            Kunde: {selectedLead.customer_name}
                                        </h2>

                                        {/* Manuel Overslag Email Afsendelse / Vis Tilbud */}
                                        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>

                                            {isConfirmedCase(selectedLead) && (
                                                <a 
                                                    href={`${window.location.origin}/${carpenterProfile?.slug || 't'}/tilbud/${selectedLead.quote_token || selectedLead.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        padding: '10px 16px', 
                                                        borderRadius: '8px', 
                                                        background: '#2563eb', 
                                                        color: 'white', 
                                                        border: 'none', 
                                                        fontWeight: 'bold', 
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        textDecoration: 'none'
                                                    }}
                                                >
                                                    <ExternalLink size={18} /> SE ACCEPTERET TILBUD
                                                </a>
                                            )}
                                        </div>

                                        {/* Tjekket top-menu for integrationer med ensartede knapper */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'stretch', marginBottom: '32px' }}>
                                            {isConfirmedCase(selectedLead) && ['admin', 'accountant'].includes(effectiveRole) && (
                                                <>
                                                    {/* Regnskab integration fjernet fra lead-visning. Skal ligge under fremtidigt Faktura/Økonomi overblik */}

                                                    {carpenterProfile?.ordrestyring_token && (
                                                        selectedLead.ordrestyring_case_id ? (
                                                            <a href={ (String(selectedLead.ordrestyring_case_id).length >= 4 || Number(selectedLead.ordrestyring_case_id) > 1000) ? `https://system.ordrestyring.dk/cases?id=${selectedLead.ordrestyring_case_id}` : `https://system.ordrestyring.dk/cases` } target="_blank" rel="noopener noreferrer" style={{ flex: '1 1 140px', padding: '12px', borderRadius: '10px', backgroundColor: '#fdf2f8', color: '#be185d', border: '1px solid #db2777', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
                                                                <ExternalLink size={18} /> Åbn eget ordrestyringssystem
                                                            </a>
                                                        ) : selectedLead.raw_data?.synced_to_management ? (
                                                            <a href={`https://system.ordrestyring.dk/cases`} target="_blank" rel="noopener noreferrer" style={{ flex: '1 1 140px', padding: '12px', borderRadius: '10px', backgroundColor: '#fdf2f8', color: '#be185d', border: '1px solid #db2777', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
                                                                <ExternalLink size={18} /> Åbn eget ordrestyringssystem
                                                            </a>
                                                        ) : (
                                                            <button onClick={() => syncToOrdrestyring(selectedLead)} style={{ flex: '1 1 140px', padding: '12px', borderRadius: '10px', backgroundColor: '#fdf2f8', color: '#be185d', border: '1px solid #db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                                <UploadCloud size={18} /> Overfør til eget ordrestyringssystem
                                                            </button>
                                                        )
                                                    )}

                                                    {carpenterProfile?.apacta_api_key && (
                                                        selectedLead.apacta_case_id ? (
                                                            <a href={`https://control-panel.apacta.com/projects/${selectedLead.apacta_case_id}`} target="_blank" rel="noopener noreferrer" style={{ flex: '1 1 140px', padding: '12px', borderRadius: '10px', backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #4f46e5', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
                                                                <ExternalLink size={18} /> Åbn eget ordrestyringssystem
                                                            </a>
                                                        ) : selectedLead.raw_data?.synced_to_management ? (
                                                            <a href={`https://control-panel.apacta.com/projects`} target="_blank" rel="noopener noreferrer" style={{ flex: '1 1 140px', padding: '12px', borderRadius: '10px', backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #4f46e5', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
                                                                <ExternalLink size={18} /> Åbn eget ordrestyringssystem
                                                            </a>
                                                        ) : (
                                                            <button onClick={() => syncToApacta(selectedLead)} style={{ flex: '1 1 140px', padding: '12px', borderRadius: '10px', backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                                <UploadCloud size={18} /> Overfør til eget ordrestyringssystem
                                                            </button>
                                                        )
                                                    )}

                                                    {carpenterProfile?.minuba_api_key && (
                                                        selectedLead.minuba_case_id ? (
                                                            <a href={`https://app.minuba.dk/`} target="_blank" rel="noopener noreferrer" style={{ flex: '1 1 140px', padding: '12px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
                                                                <ExternalLink size={18} /> Åbn eget ordrestyringssystem
                                                            </a>
                                                        ) : (
                                                            <button onClick={() => syncToMinuba(selectedLead)} style={{ flex: '1 1 140px', padding: '12px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                                <UploadCloud size={18} /> Overfør til eget ordrestyringssystem
                                                            </button>
                                                        )
                                                    )}
                                                </>
                                            )}
                                            
                                            {selectedLead.raw_data?.quote_pdf_url && !isConfirmedCase(selectedLead) && (
                                                <a href={selectedLead.raw_data.quote_pdf_url} target="_blank" rel="noopener noreferrer" style={{ flex: '1 1 140px', padding: '12px', borderRadius: '10px', background: '#f3f1ed', border: '1px solid #e8e6e1', color: '#374151', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                                                    <FileText size={18} /> PDF-tilbud
                                                </a>
                                            )}
                                            {selectedLead.status === 'Sendt tilbud' && (
                                                <button 
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/${carpenterProfile?.slug || 't'}/tilbud/${selectedLead.quote_token || selectedLead.id}`;
                                                        navigator.clipboard.writeText(url);
                                                        toast.success('Link til interaktivt tilbud kopieret til udklipsholderen!');
                                                    }}
                                                    style={{ flex: '1 1 140px', padding: '12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #e8e6e1', color: '#1d4ed8', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                                >
                                                    <Globe size={18} /> Kopiér Web-Link
                                                </button>
                                            )}
                                        </div>

                                        {['Bekræftet opgave', 'Sæt i bero'].includes(selectedLead.status) && isLeadReadyForHistory(selectedLead) && (
                                            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', padding: '20px', borderRadius: '14px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <strong style={{ color: '#6b7280', display: 'block', fontSize: '1.1rem', marginBottom: '4px' }}>Er byggeriet afsluttet?</strong>
                                                    <span style={{ color: '#d97706', fontSize: '0.95rem' }}>Den forventede byggeperiode er overskredet. Er du klar til at afslutte sagen og smide den i Historik?</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        updateLeadStatus(selectedLead.id, 'Historik');
                                                        setSelectedLead(null);
                                                    }}
                                                    style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                >
                                                    Ja, flyt til Historik
                                                </button>
                                            </div>
                                        )}

                                        {isConfirmedCase(selectedLead) && selectedLead.raw_data?.audit_trail && (
                                            <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #10b981', padding: '16px', borderRadius: '14px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                <div style={{ color: '#059669', display: 'flex', alignItems: 'center' }}><Shield size={32} /></div>
                                                <div>
                                                    <strong style={{ color: '#065f46', display: 'block', fontSize: '1rem', marginBottom: '4px' }}>Juridisk Bindende Accept (Digital Signatur)</strong>
                                                    <p style={{ color: '#047857', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                                                        Kunden har aktivt accepteret tilbuddet og dine betingelser.<br/>
                                                        <strong>Tidspunkt:</strong> {new Date(selectedLead.raw_data.audit_trail.accepted_at).toLocaleString('da-DK')}<br/>
                                                        <strong>IP-adresse:</strong> {selectedLead.raw_data.audit_trail.ip_address}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="lead-details-grid">
                                            {/* TILBUD / OVERSLAG BOKS (Nu flyttet øverst) */}
                                            <div style={{ padding: '16px', backgroundColor: isConfirmedCase(selectedLead) ? '#ecfdf5' : '#f7f6f3', borderRadius: '14px', border: isConfirmedCase(selectedLead) ? '1px solid #10b981' : '1px solid #e8e6e1' }}>
                                                {isConfirmedCase(selectedLead) ? (
                                                    <>
                                                        <span style={{ fontSize: '0.85rem', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tilbud givet og accepteret</span>
                                                        <div style={{ margin: '12px 0 0', color: '#064e3b', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {selectedLead.raw_data?.actual_quote_price ? (() => {
                                                                const incVat = Math.round(selectedLead.raw_data.actual_quote_price);
                                                                const exVat = Math.round(incVat / 1.25);
                                                                const vat = incVat - exVat;
                                                                return (
                                                                    <>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                            <span style={{ opacity: 0.8 }}>Ekskl. moms:</span>
                                                                            <span>{exVat.toLocaleString('da-DK')} kr.</span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                            <span style={{ opacity: 0.8 }}>Moms (25%):</span>
                                                                            <span>{vat.toLocaleString('da-DK')} kr.</span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #a7f3d0', paddingTop: '6px', marginTop: '4px', fontWeight: 'bold', fontSize: '1.05rem', color: '#065f46' }}>
                                                                            <span>Inkl. moms:</span>
                                                                            <span>{incVat.toLocaleString('da-DK')} kr.</span>
                                                                        </div>
                                                                    </>
                                                                );
                                                            })() : <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>? kr. inkl. moms</span>}
                                                        </div>
                                                    </>
                                                ) : (['extensions', 'carport', 'kitchen', 'bath'].includes(selectedLead.project_category) || selectedLead.price_estimate === 'Besigtigelse kræves') ? (
                                                    <>
                                                        <span style={{ fontSize: '0.85rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overslag udeladt</span>
                                                        <p style={{ margin: '4px 0 0', fontWeight: 'bold', color: '#d97706', fontSize: '1.1rem' }}>
                                                            Kræver besigtigelse
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span style={{ fontSize: '0.85rem', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            {selectedLead.project_category === 'special' ? 'Estimat (Før moms) - Intern Kladde' : (['Sendt tilbud', 'Bekræftet opgave'].includes(selectedLead.status) ? 'Tilbud sendt til kunde' : 'Overslag sendt til kunde')}
                                                        </span>
                                                        <div style={{ margin: '12px 0 0', color: '#1e3a8a', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {(() => {
    let incVat = 0, exVat = 0, vat = 0;
    let hasData = false;

    if (selectedLead.raw_data?.calc_data?.finalEstimateIncVat) {
        incVat = selectedLead.raw_data.calc_data.finalEstimateIncVat;
        exVat = selectedLead.raw_data.calc_data.finalEstimateExVat;
        vat = incVat - exVat;
        hasData = true;
    } else if (selectedLead.project_category === 'special' && selectedLead.price_estimate) {
        exVat = parseFloat(selectedLead.price_estimate.replace(/[^0-9,-]/g, '').replace(',', '.'));
        if (!isNaN(exVat)) {
            vat = exVat * 0.25;
            incVat = exVat + vat;
            hasData = true;
        }
    }

    if (hasData) {
        return (
            <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.8 }}>Ekskl. moms:</span>
                    <span>{exVat.toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr.</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.8 }}>Moms (25%):</span>
                    <span>{vat.toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr.</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #bfdbfe', paddingTop: '6px', marginTop: '4px', fontWeight: 'bold', fontSize: '1.05rem', color: '#1d4ed8' }}>
                    <span>Inkl. moms:</span>
                    <span>{incVat.toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr.</span>
                </div>
            </>
        );
    }
    
    return <span style={{ fontWeight: 'bold', color: '#1d4ed8', fontSize: '1.1rem' }}>{selectedLead.price_estimate}</span>;
})()}
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* KATEGORI BOKS (Nu placeret under overslaget) */}
                                            <div style={{ padding: '16px', backgroundColor: '#f3f1ed', borderRadius: '14px' }}>
                                                <span style={{ fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kategori</span>
                                                <div style={{ margin: '4px 0 12px', fontWeight: 'bold', color: '#1a1a1a', fontSize: '1.1rem', position: 'relative' }}>
    {selectedLead.project_category === 'special' ? (
        <input 
            type="text" 
            defaultValue={selectedLead.raw_data?.details?.title || 'Skræddersyet Opgave'}
            onBlur={async (e) => {
                e.target.style.background = 'transparent';
                e.target.style.border = '1px solid transparent';
                e.target.style.boxShadow = 'none';
                
                const newTitle = e.target.value.trim();
                if (newTitle && newTitle !== (selectedLead.raw_data?.details?.title || 'Skræddersyet Opgave')) {
                    const { data: latestData } = await supabase.from('leads').select('raw_data').eq('id', selectedLead.id).single();
                    const currentRawData = latestData?.raw_data || selectedLead.raw_data || {};
                    
                    const newRawData = { ...currentRawData, details: { ...currentRawData.details, title: newTitle } };
                    const { error } = await supabase.from('leads').update({ raw_data: newRawData }).eq('id', selectedLead.id);
                    if (!error) {
                        setSelectedLead({ ...selectedLead, raw_data: newRawData });
                        setLeadsData(prev => prev.map(l => l.id === selectedLead.id ? { ...l, raw_data: newRawData } : l));
                        toast.success('Kategori/Titel opdateret');
                    }
                }
            }}
            style={{ 
                width: '100%', 
                background: 'transparent', 
                border: '1px solid transparent', 
                borderRadius: '8px', 
                padding: '4px 8px', 
                marginLeft: '-8px', 
                fontSize: 'inherit', 
                fontWeight: 'inherit', 
                color: 'inherit', 
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: 'none',
                WebkitAppearance: 'none'
            }}
            onFocus={(e) => {
                e.target.style.background = '#ffffff';
                e.target.style.border = '1px solid #3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
            }}
            onMouseEnter={(e) => { 
                if (document.activeElement !== e.target) {
                    e.target.style.background = 'rgba(0,0,0,0.04)';
                }
            }}
            onMouseLeave={(e) => { 
                if (document.activeElement !== e.target) {
                    e.target.style.background = 'transparent';
                }
            }}
            title="Klik for at redigere"
        />
    ) : (
        <p style={{ margin: 0 }}>{categoryNames[selectedLead.project_category] || selectedLead.project_category}</p>
    )}
</div>
                                                
                                                {/* AI Opgavebeskrivelse som dropdown (skjult for 'special' sager) */}
                                                {selectedLead.project_category !== 'special' && (
                                                    <details style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e8e6e1', cursor: 'pointer' }}>
                                                        <summary style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', outline: 'none' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexGrow: 1 }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                                                                Opsummering af opgaven
                                                            </div>
                                                            <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Læs mere ▼</span>
                                                        </summary>
                                                        {(() => {
                                                            const catMap = {
                                                                'Nyt Gulv': 'floor', 'Gulv': 'floor', 'Nye Vinduer': 'windows', 'Vinduer': 'windows',
                                                                'Nye Døre': 'doors', 'Døre': 'doors', 'Træterrasse': 'terrace', 'Terrasse': 'terrace',
                                                                'Tagprojekt': 'roof', 'Tag': 'roof', 'Nyt Køkken': 'kitchen', 'Køkken': 'kitchen',
                                                                'Renovering af badeværelse': 'bath', 'Badeværelse': 'bath', 'Nyt Badeværelse': 'bath',
                                                                'Nye Lofter': 'ceilings', 'Lofter': 'ceilings', 'Ny Facadebeklædning': 'facades',
                                                                'Facader': 'facades', 'Tilbygning': 'extensions', 'Anneks': 'annex', 'Annekser & Skure': 'annex',
                                                                'Carport': 'carport', 'Hegn': 'fence'
                                                            };
                                                            const rawCat = selectedLead.project_category || '';
                                                            const normalizedCat = catMap[rawCat] || rawCat;
                                                            
                                                            const detailedTasks = generateTaskDescription(normalizedCat, selectedLead.raw_data?.details || {});
                                                            
                                                            let summaryBullets = [];
                                                            if (detailedTasks && detailedTasks.length > 0) {
                                                                summaryBullets = detailedTasks;
                                                            } else {
                                                                const summaryText = selectedLead.raw_data?.ai_summary || selectedLead.ai_summary || generateShortSummary(selectedLead);
                                                                summaryBullets = summaryText.split('. ')
                                                                    .filter(sentence => sentence.trim().length > 0)
                                                                    .map(sentence => sentence.trim() + (sentence.endsWith('.') ? '' : '.'));
                                                            }
                                                            
                                                            return (
                                                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            if ('speechSynthesis' in window) {
                                                                                const synth = window.speechSynthesis;
                                                                                const btn = e.currentTarget;
                                                                                if (synth.speaking || synth.pending) {
                                                                                    synth.cancel();
                                                                                    btn.innerHTML = '🔊 Læs højt';
                                                                                    btn.style.background = '#faf5ff';
                                                                                    btn.style.color = '#7e22ce';
                                                                                    btn.style.borderColor = '#d8b4fe';
                                                                                } else {
                                                                                    synth.cancel();
                                                                                    const utterance = new SpeechSynthesisUtterance(summaryBullets.join('. '));
                                                                                    utterance.lang = 'da-DK';
                                                                                    utterance.onend = () => {
                                                                                        btn.innerHTML = '🔊 Læs højt';
                                                                                        btn.style.background = '#faf5ff';
                                                                                        btn.style.color = '#7e22ce';
                                                                                        btn.style.borderColor = '#d8b4fe';
                                                                                    };
                                                                                    utterance.onerror = utterance.onend;
                                                                                    synth.speak(utterance);
                                                                                    btn.innerHTML = '🛑 Stop Oplæsning';
                                                                                    btn.style.background = '#fef2f2';
                                                                                    btn.style.color = '#ef4444';
                                                                                    btn.style.borderColor = '#fecaca';
                                                                                }
                                                                            } else {
                                                                                toast.error('Oplæsning understøttes desværre ikke i din browser.');
                                                                            }
                                                                        }}
                                                                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d8b4fe', background: '#faf5ff', color: '#7e22ce', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginBottom: '12px' }}
                                                                    >
                                                                        🔊 Læs højt
                                                                    </button>
                                                                    <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc', marginLeft: '10px', fontSize: '0.95rem', color: '#4b5563', lineHeight: '1.5' }}>
                                                                        {summaryBullets.map((bullet, idx) => (
                                                                            <li key={idx} style={{ marginBottom: '6px' }}>{bullet}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            );
                                                        })()}
                                                    </details>
                                                )}
                                            </div>
                                        </div>

                                        <div 
                                            onClick={() => setIsCustomerChoicesOpen(!isCustomerChoicesOpen)}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#fafaf9', borderRadius: '12px', border: '1px solid #e8e6e1', cursor: 'pointer', marginBottom: '16px' }}
                                        >
                                            <h3 style={{ color: '#1a1a1a', margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {selectedLead.project_category === 'special' ? (
                                                    <><PenTool size={18} style={{ color: '#6b7280' }} /> Skræddersyet Opgave - Detaljer</>
                                                ) : (
                                                    <><Sliders size={18} style={{ color: '#6b7280' }} /> Kundens Valg i Beregneren</>
                                                )}
                                            </h3>
                                            <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'bold' }}>
                                                {isCustomerChoicesOpen ? 'Skjul ▲' : 'Vis ▼'}
                                            </span>
                                        </div>

                                        {isCustomerChoicesOpen && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                                                {selectedLead.raw_data && (() => {
                                                    const details = selectedLead.raw_data.details || {};
                                                    
                                                    // SÆRHÅNDTERING: Skræddersyet Opgave (Manuelt oprettet)
                                                    if (selectedLead.project_category === 'special') {
                                                        return (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                                                <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <FileText size={16} /> Opgavebeskrivelse
                                                                    </h4>
                                                                    <p style={{ margin: 0, fontSize: '1rem', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                                                        {details.notes || 'Ingen beskrivelse angivet for opgaven.'}
                                                                    </p>
                                                                </div>
                                                                
                                                                {details.phases && details.phases.length > 0 && (
                                                                    <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                                                        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <Layers size={16} /> Opdeling (Etaper)
                                                                        </h4>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                            {details.phases.map((phase, idx) => (
                                                                                <div key={idx} style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                                                                                    <h5 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: '#0f172a' }}>{idx + 1}. {phase.name}</h5>
                                                                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                                                                                        {phase.hours} timer, {phase.materialCostBase} kr. materialer
                                                                                    </p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {details.ai_summary && (
                                                                    <div style={{ padding: '20px', backgroundColor: '#faf5ff', borderRadius: '12px', border: '1px solid #e9d5ff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <PenTool size={16} /> AI Opsummering
                                                                        </h4>
                                                                        <p style={{ margin: 0, fontSize: '1rem', color: '#4c1d95', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                                                            {details.ai_summary}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    const translationMap = {
                                                        'material': 'Materialetype / Beklædning',
                                                        'amount': 'Areal / Mængde',
                                                        'roofAmount': 'Tagareal i kvm',
                                                        'facadeAmount': 'Facadeareal i kvm',
                                                        'notes': 'Særlige forhold / Bemærkninger',
                                                        'disposal': 'Afmontering og bortskaffelse',
                                                        'qualityLevel': 'Kvalitetsniveau',
                                                        'housingType': 'Bygningstype',
                                                        'scope': 'Projektets omfang',
                                                        'floors': 'Antal plan / etager',
                                                        'houseAge': 'Huset byggeår',
                                                        'floorType': 'Valgt gulvtype',
                                                        'oldFloorType': 'Eksisterende gulvtype',
                                                        'floorFoundation': 'Underlag / Konstruktion',
                                                        'underfloorHeating': 'Gulvvarme',
                                                        'floorPattern': 'Lægningsmønster',
                                                        'floorDoorsNear': 'Døre i nærheden',
                                                        'floorObstacles': 'Forhindringer i rummet',
                                                        'specificFloorWishes': 'Særlige gulvønsker',
                                                        'specificFloorDetails': 'Yderligere gulvdetaljer',
                                                        'finish': 'Afslutning / Lister / Fuge',
                                                        'underlayment': 'Underlagstype',
                                                        'terraceWood': 'Terrasse træsort',
                                                        'terraceFoundation': 'Fundamentstype',
                                                        'terraceHeight': 'Højde over terræn',
                                                        'terraceShape': 'Form på terrassen',
                                                        'terraceSteps': 'Trappetrin',
                                                        'terraceRailing': 'Gelænder',
                                                        'terraceBuiltIn': 'Indbyggede elementer',
                                                        'terraceSubConstruction': 'Underkonstruktion / Strøer',
                                                        'screwType': 'Skruetype / Montering',
                                                        'roofPitch': 'Tagets hældning',
                                                        'roofType': 'Tagtype',
                                                        'oldRoofType': 'Eksisterende tagtype',
                                                        'eavesMaterial': 'Stern & Vindskede materiale',
                                                        'skotrender': 'Skotrender',
                                                        'skotrenderMeters': 'Meter skotrende',
                                                        'grater': 'Grater (ved valmtag)',
                                                        'graterMeters': 'Meter grat',
                                                        'chimney': 'Skorstene til inddækning',
                                                        'chimneyAmount': 'Antal skorstene',
                                                        'skylightReplace': 'Ovenlysvinduer til udskiftning',
                                                        'skylightReplaceAmount': 'Antal udskiftede ovenlys',
                                                        'skylightNew': 'Nye ovenlysvinduer',
                                                        'skylightNewAmount': 'Antal nye ovenlys',
                                                        'fenceLength': 'Hegnslængde (meter)',
                                                        'fenceHeight': 'Hegnhøjde (meter)',
                                                        'fencePostType': 'Stolpetype',
                                                        'fenceGravelBoard': 'Bundplade / Hjulplade',
                                                        'fenceGates': 'Hegnsporte',
                                                        'facadeWood': 'Facade beklædningstype',
                                                        'facadeDirection': 'Lægningsretning',
                                                        'facadeIsolation': 'Efterisolering',
                                                        'facadeScaffolding': 'Stillads / Arbejdsplatform',
                                                        'kitchenBrand': 'Køkkenbrand / Mærke',
                                                        'kitchenElements': 'Antal elementer',
                                                        'kitchenTabletop': 'Bordplademateriale',
                                                        'kitchenSinkTabletop': 'Planlimet/underlimet vask',
                                                        'kitchenAppliances': 'Montering af hvidevarer',
                                                        'ceilingMaterial': 'Loftmateriale',
                                                        'ceilingHeight': 'Lofthøjde',
                                                        'ceilingInsulation': 'Efterisolering af loft',
                                                        'spots': 'Spots / Lampesteder',
                                                        'mountingStyle': 'Montagetype',
                                                        'insulation': 'Efterisolering',
                                                        'openings': 'Antal åbninger',
                                                        'annexType': 'Byggeritype',
                                                        'buildingPermit': 'Byggetilladelse',
                                                        'foundationType': 'Fundamentstype',
                                                        'oldCeilingType': 'Eksisterende loft',
                                                        'oldFacadeMaterial': 'Eksisterende facade',
                                                        'oldMaterial': 'Eksisterende materiale',
                                                        'postMaterial': 'Stolpemateriale',
                                                        'postAnchoringWoodMetal': 'Stolpeforankring (Træ/Metal)',
                                                        'postAnchoringConcrete': 'Stolpeforankring (Beton)',
                                                        'doorAmount': 'Antal døre',
                                                        'doorType': 'Dørtype',
                                                        'doorStyle': 'Dørstil',
                                                        'doorModel': 'Dørmodel',
                                                        'electricLock': 'Elektrisk lås / Smart-lock',
                                                        'doorHinge': 'Dørhængsling (Indad/Udad)',
                                                        'windowAmount': 'Antal vinduer',
                                                        'additionalNotes': 'Ekstra noter',
                                                        'subProjectCount': 'Antal delprojekter',
                                                        'length': 'Længde i meter',
                                                        'height': 'Højde i meter',
                                                        'width': 'Bredde i meter',
                                                        'isKombi': 'Kombi-projekt',
                                                        'vaporAndInsulation': 'Dampspærre og isolering',
                                                        'spotsAmount': 'Antal spots',
                                                        'elevation': 'Terrassetype (højde)',
                                                        'roofTerraceFeet': 'Tagterrassefødder',
                                                        'awning': 'Markise',
                                                        'awningType': 'Markisetype',
                                                        'railing': 'Rækværk/Gelænder',
                                                        'railingMaterial': 'Rækværksmateriale',
                                                        'railingMeters': 'Meter rækværk',
                                                        'terraceComplexity': 'Specialvinkler / Trapper',
                                                        'floorDoorsCount': 'Antal indvendige døre',
                                                        'windowsConfig': 'Vinduesspecifikationer',
                                                        'extensions': 'Kviste',
                                                        'extensionsAmount': 'Antal kviste'
                                                    };

                                                    const valueTranslationMap = {
                                                        'yes': 'Ja',
                                                        'no': 'Nej',
                                                        'none': 'Ingen',
                                                        'both': 'Begge',
                                                        'standard': 'Standard',
                                                        'premium': 'Premium',
                                                        'oak': 'Eg',
                                                        'pine': 'Fyr',
                                                        'larch': 'Lærk',
                                                        'spruce': 'Gran',
                                                        'plywood': 'Krydsfiner',
                                                        'felt': 'Tagpap',
                                                        'tiles': 'Tegl',
                                                        'concrete': 'Beton',
                                                        'steel': 'Stål',
                                                        'composite': 'Komposit',
                                                        'ground': 'Jordniveau',
                                                        'elevated': 'Hævet terrasse',
                                                        'roof': 'Tagterrasse / Tag',
                                                        'zinc': 'Zink',
                                                        'copper': 'Kobber',
                                                        'eternit': 'Eternit',
                                                        'wood': 'Træ'
                                                    };

                                                    const translateValue = (val) => {
                                                        if (val === undefined || val === null) return '';
                                                        const str = val.toString().trim();
                                                        const lower = str.toLowerCase();
                                                        if (valueTranslationMap[lower]) {
                                                            return valueTranslationMap[lower];
                                                        }
                                                        if (lower === 'yes') return 'Ja';
                                                        if (lower === 'no') return 'Nej';
                                                        return str;
                                                    };

                                                    const getUnit = (key, category) => {
                                                        const k = key.toLowerCase();
                                                        if (k.includes('amount') || k.includes('area') || k.includes('roofamount') || k.includes('facadeamount')) {
                                                            if (category === 'fence') return ' meter';
                                                            if (category === 'windows' || category === 'doors' || category === 'kitchen') return ' stk.';
                                                            return ' m²';
                                                        }
                                                        if (k.includes('length') || k.includes('meters') || k.includes('width') || k.includes('height')) {
                                                            return ' m';
                                                        }
                                                        return '';
                                                    };

                                                    const categorizeKey = (key) => {
                                                        const k = key.toLowerCase();
                                                        if (k.includes('disposal') || k.includes('demolition') || k.includes('old') || k.includes('obstacle') || k.includes('scaffolding') || k.includes('stillads') || k.includes('bortskaffelse') || k.includes('fjern')) {
                                                            return 'preparation';
                                                        }
                                                        if (k.includes('foundation') || k.includes('underlag') || k.includes('subcon') || k.includes('heating') || k.includes('varme') || k.includes('pattern') || k.includes('mønster') || k.includes('screw') || k.includes('skru') || k.includes('skotrende') || k.includes('grat') || k.includes('chimney') || k.includes('skorsten') || k.includes('gate') || k.includes('post') || k.includes('isol') || k.includes('door') || k.includes('vindue') || k.includes('window') || k.includes('dør')) {
                                                            return 'construction';
                                                        }
                                                        if (k.includes('finish') || k.includes('afslutning') || k.includes('list') || k.includes('fuge') || k.includes('shape') || k.includes('step') || k.includes('rail') || k.includes('gelænder') || k.includes('builtin') || k.includes('sink') || k.includes('tabletop') || k.includes('bordplade') || k.includes('appliance') || k.includes('hvidevare') || k.includes('wish') || k.includes('ønske') || k.includes('detail') || k.includes('note') || k.includes('bemærkning')) {
                                                            return 'finish';
                                                        }
                                                        return 'scope';
                                                    };

                                                    const renderStructuredBrief = (briefDetails, briefCategory) => {
                                                        const phases = [
                                                            {
                                                                id: 'scope',
                                                                title: 'Opgave & Omfang',
                                                                icon: <FileText size={16} style={{ color: '#3b82f6' }} />,
                                                                borderColor: '#3b82f6',
                                                                items: []
                                                            },
                                                            {
                                                                id: 'preparation',
                                                                title: 'Forberedelse & Nedrivning',
                                                                icon: <Wrench size={16} style={{ color: '#f59e0b' }} />,
                                                                borderColor: '#f59e0b',
                                                                items: []
                                                            },
                                                            {
                                                                id: 'construction',
                                                                title: 'Konstruktion & Montering',
                                                                icon: <Layers size={16} style={{ color: '#10b981' }} />,
                                                                borderColor: '#10b981',
                                                                items: []
                                                            },
                                                            {
                                                                id: 'finish',
                                                                title: 'Afslutning & Finish',
                                                                icon: <CheckCircle size={16} style={{ color: '#8b5cf6' }} />,
                                                                borderColor: '#8b5cf6',
                                                                items: []
                                                            }
                                                        ];

                                                        Object.keys(briefDetails).forEach(key => {
                                                            if (['isAiEstimate', 'chatLog', 'summaryBullets', 'obsNotes', 'aiLaborHours', 'aiMaterialCost', 'aiBreakdown', 'photos', 'projects'].includes(key)) {
                                                                return;
                                                            }

                                                            const val = briefDetails[key];
                                                            if (val === undefined || val === null || val === '') return;

                                                            let label = translationMap[key];
                                                            if (!label) {
                                                                const keyLower = key.toLowerCase();
                                                                const overrides = {
                                                                    'specificfloordetails': 'Gulvtype detaljer',
                                                                    'floortype': 'Valgt gulvtype',
                                                                    'underlayment': 'Underlag',
                                                                    'area': 'Areal i kvm',
                                                                    'subprojectcount': 'Antal delprojekter',
                                                                    'length': 'Længde i meter',
                                                                    'height': 'Højde i meter',
                                                                    'width': 'Bredde i meter',
                                                                    'amount': 'Mængde/Areal',
                                                                    'additionalnotes': 'Ekstra noter',
                                                                    'iskombi': 'Kombi-projekt',
                                                                    'disposal': 'Afmontering og bortskaffelse',
                                                                    'oldfloortype': 'Gamle gulvtype',
                                                                    'floorfoundation': 'Gulv-underlag/konstruktion',
                                                                    'underfloorheating': 'Gulvvarme',
                                                                    'floorpattern': 'Lægningsmønster'
                                                                };
                                                                if (overrides[keyLower]) {
                                                                    label = overrides[keyLower];
                                                                } else {
                                                                    label = key
                                                                        .replace(/([A-Z])/g, ' $1')
                                                                        .replace(/^./, str => str.toUpperCase())
                                                                        .trim();
                                                                }
                                                            }

                                                            const phaseId = categorizeKey(key);
                                                            const phase = phases.find(p => p.id === phaseId) || phases[0];
                                                            phase.items.push({ key, label, val });
                                                        });

                                                        return (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                                                {phases.map(phase => {
                                                                    if (phase.items.length === 0) return null;
                                                                    return (
                                                                        <div key={phase.id} style={{ 
                                                                            padding: '18px 20px', 
                                                                            borderLeft: `4px solid ${phase.borderColor}`, 
                                                                            backgroundColor: '#fafafa', 
                                                                            borderRadius: '10px', 
                                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            gap: '12px'
                                                                        }}>
                                                                            <h4 style={{ 
                                                                                margin: '0 0 4px 0', 
                                                                                fontSize: '0.9rem', 
                                                                                fontWeight: '700', 
                                                                                color: '#334155', 
                                                                                display: 'flex', 
                                                                                alignItems: 'center', 
                                                                                gap: '8px',
                                                                                textTransform: 'uppercase',
                                                                                letterSpacing: '0.05em'
                                                                            }}>
                                                                                {phase.icon}
                                                                                {phase.title}
                                                                            </h4>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                                {phase.items.map(item => {
                                                                                    if (Array.isArray(item.val)) {
                                                                                        const isFileArray = item.val.length > 0 && typeof item.val[0] === 'object' && item.val[0].preview;
                                                                                        if (isFileArray) {
                                                                                            return (
                                                                                                <div key={item.key} style={{ padding: '12px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #f1f1ef', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>{item.label}</span>
                                                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                                                                        {item.val.map((file, idx) => (
                                                                                                            <a key={idx} href={file.preview} target="_blank" rel="noopener noreferrer" style={{ display: 'block', border: '1px solid #e8e6e1', borderRadius: '6px', overflow: 'hidden', width: '80px', height: '80px' }}>
                                                                                                                <img 
                                                                                                                    src={file.preview} 
                                                                                                                    alt={file.name || 'Billede'} 
                                                                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                                                                                    onError={(e) => {
                                                                                                                        e.target.onerror = null; 
                                                                                                                        e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'; 
                                                                                                                        e.target.style.objectFit = 'contain'; 
                                                                                                                        e.target.style.padding = '10px';
                                                                                                                    }}
                                                                                                                />
                                                                                                            </a>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            );
                                                                                        }
                                                                                    }

                                                                                    const displayStr = translateValue(item.val);
                                                                                    const isLongText = typeof item.val === 'string' && (item.val.length > 60 || item.key === 'notes' || item.key === 'additionalNotes');

                                                                                    if (isLongText) {
                                                                                        return (
                                                                                            <div key={item.key} style={{ 
                                                                                                display: 'flex', 
                                                                                                flexDirection: 'column', 
                                                                                                gap: '6px', 
                                                                                                padding: '12px 14px', 
                                                                                                backgroundColor: '#ffffff', 
                                                                                                borderRadius: '8px', 
                                                                                                border: '1px solid #f1f1ef' 
                                                                                            }}>
                                                                                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>{item.label}</span>
                                                                                                <div style={{ 
                                                                                                    fontSize: '0.9rem', 
                                                                                                    color: '#0f172a', 
                                                                                                    fontWeight: '500', 
                                                                                                    whiteSpace: 'pre-wrap', 
                                                                                                    lineHeight: '1.5',
                                                                                                    backgroundColor: '#f8fafc',
                                                                                                    padding: '10px 12px',
                                                                                                    borderRadius: '6px',
                                                                                                    border: '1px solid #e2e8f0'
                                                                                                }}>
                                                                                                    {displayStr}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    }

                                                                                    return (
                                                                                        <div key={item.key} style={{ 
                                                                                            display: 'flex', 
                                                                                            justifyContent: 'space-between', 
                                                                                            alignItems: 'center', 
                                                                                            padding: '10px 14px', 
                                                                                            backgroundColor: '#ffffff', 
                                                                                            borderRadius: '8px', 
                                                                                            border: '1px solid #f1f1ef' 
                                                                                        }}>
                                                                                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>{item.label}</span>
                                                                                            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0f172a', textAlign: 'right' }}>
                                                                                                {displayStr}{getUnit(item.key, briefCategory)}
                                                                                            </span>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    };

                                                    const renderElements = [];
                                                    
                                                    const isKombi = selectedLead.raw_data.category === 'Kombi-projekt' || selectedLead.raw_data.calc_data?.isKombi;
                                                    
                                                    if (isKombi && Array.isArray(selectedLead.raw_data.projects)) {
                                                        return selectedLead.raw_data.projects.map((p, pIdx) => {
                                                            const pCatName = categoryNames[p.category] || p.category;
                                                            const pDetails = p.details || {};
                                                            
                                                            return (
                                                                <details key={p.id} style={{ border: '1px solid #cbd5e1', borderRadius: '12px', backgroundColor: '#ffffff', overflow: 'hidden', marginBottom: '16px', width: '100%' }} open={pIdx === 0}>
                                                                    <summary style={{ padding: '16px 20px', background: '#0f172a', color: '#ffffff', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between', outline: 'none' }}>
                                                                        <span>Del {pIdx + 1}: {pCatName}</span>
                                                                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Vis/skjul</span>
                                                                    </summary>
                                                                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#fafafa' }}>
                                                                        {renderStructuredBrief(pDetails, p.category)}
                                                                    </div>
                                                                </details>
                                                            );
                                                        });
                                                    }
                                                    
                                                    // Tilføj det smukke, strukturerede brief-card for standalone projekter
                                                    renderElements.push(
                                                        <div key="structured_brief" style={{ width: '100%' }}>
                                                            {renderStructuredBrief(details, selectedLead.project_category)}
                                                        </div>
                                                    );
                                                    
                                                    if (details.isAiEstimate && details.chatLog) {
                                                        const hasSummary = details.summaryBullets && details.summaryBullets.length > 0;
                                                        
                                                        renderElements.push(
                                                            <div key="ai_chat" style={{ padding: '16px', border: '1px solid #e8e6e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'white', width: '100%' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <Sliders size={18} style={{ color: '#4f46e5' }} />
                                                                    <strong style={{ color: '#1a1a1a', fontSize: '1.05rem' }}>Digital Opsummering af Kundens Ønsker</strong>
                                                                </div>
                                                                
                                                                {hasSummary ? (
                                                                    <>
                                                                        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                                {details.summaryBullets.map((bullet, idx) => (
                                                                                    <li key={idx} style={{ fontSize: '0.95rem' }}>{bullet}</li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                        
                                                                        {details.obsNotes && details.obsNotes.toLowerCase() !== 'ingen særlige forbehold' && (
                                                                            <div style={{ backgroundColor: '#fffbeb', padding: '16px', borderRadius: '8px', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b' }}>
                                                                                <strong style={{ color: '#b45309', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>OBS / Særlige Forbehold:</strong>
                                                                                <span style={{ color: '#92400e', fontSize: '0.95rem' }}>{details.obsNotes}</span>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic' }}>
                                                                        (Ældre opgave uden automatisk opsummering. Se chatlog herunder.)
                                                                    </p>
                                                                )}

                                                                <details style={{ marginTop: hasSummary ? '8px' : '0' }}>
                                                                    <summary style={{ cursor: 'pointer', color: '#2563eb', fontWeight: '500', fontSize: '0.9rem', userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                                                                        {hasSummary ? 'Læs hele samtalen med kunden' : 'Vis rå chatlog'} ({details.chatLog.filter(m => m.role !== 'system').length} beskeder)
                                                                    </summary>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px', marginTop: '12px', border: '1px solid #e2e8f0' }}>
                                                                        {details.chatLog.filter(m => m.role !== 'system').map((msg, idx) => (
                                                                            <div key={idx} style={{ 
                                                                                padding: '10px 14px', 
                                                                                borderRadius: '8px', 
                                                                                maxWidth: '90%', 
                                                                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                                                backgroundColor: msg.role === 'user' ? '#3b82f6' : 'white',
                                                                                color: msg.role === 'user' ? 'white' : '#1e293b',
                                                                                border: msg.role === 'user' ? 'none' : '1px solid #cbd5e1',
                                                                                fontSize: '0.95rem',
                                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                                            }}>
                                                                                <strong style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '4px', display: 'block' }}>{msg.role === 'user' ? 'Kunde' : 'Digital Assistent'}</strong>
                                                                                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content.replace(/\[KLAR_TIL_TILBUD.*?\]/i, '').trim()}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </details>
                                                                <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46' }}>
                                                                    <strong>Systemets hemmelige estimat:</strong><br/>
                                                                    Arbejdstid: {details.aiLaborHours} timer<br/>
                                                                    Materialer: {details.aiMaterialCost} kr. (før din avance)
                                                                    
                                                                    {details.aiBreakdown && details.aiBreakdown.length > 0 && (
                                                                        <div style={{ marginTop: '12px', borderTop: '1px solid #a7f3d0', paddingTop: '12px' }}>
                                                                            <strong style={{ fontSize: '0.9rem' }}>Beregningsoversigt:</strong>
                                                                            <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '0.9rem' }}>
                                                                                {details.aiBreakdown.map((item, i) => (
                                                                                    <li key={i} style={{ marginBottom: '4px' }}>
                                                                                        <strong>{item.item}:</strong> {item.hours} timer, {item.materials} kr.
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    } else if (details.aiLaborHours !== undefined && details.aiMaterialCost !== undefined) {
                                                        renderElements.push(
                                                            <div key="ai_internal_estimate" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                                                                <details style={{ border: '1px solid #e8e6e1', borderRadius: '8px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                                                                    <summary style={{ padding: '12px 16px', background: '#fafafa', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', outline: 'none' }}>
                                                                        <span>Se beregningsdetaljer (systemets bud)</span>
                                                                    </summary>
                                                                    <div style={{ padding: '16px', borderTop: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                            <span>Beregnet tidsforbrug:</span>
                                                                            <strong>{details.aiLaborHours} timer</strong>
                                                                        </div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                            <span>Beregnet materialeindkøb:</span>
                                                                            <strong>{details.aiMaterialCost.toLocaleString('da-DK')} DKK</strong>
                                                                        </div>
                                                                    </div>
                                                                </details>
                                                                <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46' }}>
                                                                    <strong>Systemets hemmelige estimat:</strong><br/>
                                                                    Arbejdstid: {details.aiLaborHours} timer<br/>
                                                                    Materialer: {details.aiMaterialCost} kr. (før din avance)
                                                                    
                                                                    {details.aiBreakdown && details.aiBreakdown.length > 0 && (
                                                                        <div style={{ marginTop: '12px', borderTop: '1px solid #a7f3d0', paddingTop: '12px' }}>
                                                                            <strong style={{ fontSize: '0.9rem' }}>Beregningsoversigt:</strong>
                                                                            <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '0.9rem' }}>
                                                                                {details.aiBreakdown.map((item, i) => (
                                                                                    <li key={i} style={{ marginBottom: '4px' }}>
                                                                                        <strong>{item.item}:</strong> {item.hours} timer, {item.materials} kr.
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                    
                                                    if (details.photos && details.photos.length > 0) {
                                                        renderElements.push(
                                                            <div key="photos" style={{ padding: '16px', border: '1px solid #e8e6e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                                                <strong style={{ color: '#6b7280' }}>Kundens Billeder</strong>
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                                                                    {details.photos.map((url, idx) => (
                                                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ position: 'relative', paddingTop: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e8e6e1', display: 'block' }}>
                                                                            <img 
                                                                                src={url} 
                                                                                alt={`Kundebillede ${idx + 1}`} 
                                                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                                                                            />
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    return renderElements;
                                                })()}
                                            </div>
                                        )}

                                        {selectedLead.project_category === 'windows' && (
                                            <WindowsChecklist leadId={selectedLead.id} />
                                        )}

                                        {/* GRUNDLAG FOR PRISESTIMATET ACCORDION */}
                                        <div 
                                            onClick={() => setIsPriceBasisOpen(!isPriceBasisOpen)}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#fafaf9', borderRadius: '12px', border: '1px solid #e8e6e1', cursor: 'pointer', marginBottom: '16px', marginTop: '24px' }}
                                        >
                                            <h3 style={{ color: '#1a1a1a', margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Calculator size={18} style={{ color: '#6b7280' }} /> Økonomisk overblik før moms
                                            </h3>
                                            <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'bold' }}>
                                                {isPriceBasisOpen ? 'Skjul ▲' : 'Vis ▼'}
                                            </span>
                                        </div>

                                        {isPriceBasisOpen && (
                                            <div style={{ marginBottom: '24px', padding: '24px', backgroundColor: '#fcfcfc', borderRadius: '14px', border: '1px solid #e8e6e1' }}>
                                                {(() => {
                                                    const calc = selectedLead.raw_data?.calc_data;
                                                    const bArr = selectedLead.raw_data?.breakdownArr || calc?.breakdownArr || [];
                                                    
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                            {/* GORGEOUS NUMERICAL BREAKDOWN */}
                                                            {calc && (
                                                                <div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                                                        
                                                                        {/* Arbejdstid Card */}
                                                                        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                                                            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                                                Arbejdstid
                                                                            </div>
                                                                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '2px' }}>
                                                                                {calc.laborHours ? Math.ceil(calc.laborHours) : 0} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#64748b' }}>timer</span>
                                                                            </div>
                                                                            <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '500' }}>
                                                                                {(calc.totalLaborCost || 0).toLocaleString('da-DK')} kr.
                                                                            </div>
                                                                        </div>

                                                                        {/* Materialer Card */}
                                                                        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                                                            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                                                                                Materialer
                                                                            </div>
                                                                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '2px' }}>
                                                                                {(calc.materialCost || 0).toLocaleString('da-DK')} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#64748b' }}>kr.</span>
                                                                            </div>
                                                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                                                Inkl. spild & tillæg
                                                                            </div>
                                                                        </div>

                                                                        {/* Kørsel & Maskinleje Card */}
                                                                        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                                                            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                                                                                Kørsel & Maskiner
                                                                            </div>
                                                                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '2px' }}>
                                                                                {((calc.drivingCost || 0) + (calc.externalLeaseCost || 0)).toLocaleString('da-DK')} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#64748b' }}>kr.</span>
                                                                            </div>
                                                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                                                Logistik udgifter
                                                                            </div>
                                                                        </div>

                                                                        {/* Risikobuffer Card */}
                                                                        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                                                            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                                                                Tømrer Risikobuffer
                                                                            </div>
                                                                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '2px' }}>
                                                                                {(calc.hiddenBuffer || 0).toLocaleString('da-DK')} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#64748b' }}>kr.</span>
                                                                            </div>
                                                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                                                Tillæg for uforudset
                                                                            </div>
                                                                        </div>

                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* DETAILED BULLET POINTS / AI SUMMARY */}
                                                            <div style={{ borderTop: calc ? '1px solid #e2e8f0' : 'none', paddingTop: calc ? '24px' : '0' }}>
                                                                
                                                                {bArr.length === 0 ? (
                                                                    <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #94a3b8' }}>
                                                                        <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                                                            Denne beregning er foretaget automatisk baseret på vores indbyggede branchespecifikke formler. Beregningen tager højde for estimeret arbejdstid, gennemsnitlige materialepriser, forventet spild og nødvendigt tilbehør (såsom beslag og fugematerialer).
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    (() => {
                                                                        const expl = parseBreakdownToExplanation(calc, bArr);
                                                                        if (!expl) return null;
                                                                        
                                                                        return (
                                                                            <details style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', marginTop: '24px', overflow: 'hidden' }}>
                                                                                <summary style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                    Detaljeret Begrundelse (Log)
                                                                                </summary>
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
                                                                                
                                                                                {(() => {
                                                                                    const activeCategories = Object.values(expl).filter(cat => cat.items.length > 0);
                                                                                    return activeCategories.map((cat, idx) => {
                                                                                        let catTotal = '';
                                                                                        if (cat.title.includes('Arbejdstid')) catTotal = ` (I alt: ~${(calc.totalLaborCost || 0).toLocaleString('da-DK')} kr.)`;
                                                                                        if (cat.title.includes('Hovedmaterialer')) catTotal = ` (I alt: ~${(calc.materialCost || 0).toLocaleString('da-DK')} kr.)`;
                                                                                        if (cat.title.includes('Logistik')) catTotal = ` (I alt: ~${((calc.drivingCost || 0) + (calc.externalLeaseCost || 0) + (calc.hiddenBuffer || 0)).toLocaleString('da-DK')} kr.)`;
                                                                                        
                                                                                        return (
                                                                                            <div key={idx} style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                                                                                <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '0.95rem', fontWeight: 'bold' }}>{idx + 1}. {cat.title}{catTotal}</h4>
                                                                                                <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '0.85rem' }}>{cat.description}</p>
                                                                                                <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', lineHeight: '1.6', fontSize: '0.9rem' }}>
                                                                                                    {cat.items.map((item, i) => (
                                                                                                        <li key={i} style={{ marginBottom: '8px' }}>
                                                                                                            {item.includes(':') ? (
                                                                                                                <>
                                                                                                                    <strong>{item.split(':')[0]}:</strong>{item.split(':').slice(1).join(':')}
                                                                                                                </>
                                                                                                            ) : item}
                                                                                                        </li>
                                                                                                    ))}
                                                                                                </ul>
                                                                                            </div>
                                                                                        );
                                                                                    });
                                                                                })()}
                                                                                </div>
                                                                            </details>
                                                                        );
                                                                    })()
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {/* MATERIALELISTE ACCORDION (For alle ikke-bekræftede cases) */}
                                        {!isConfirmedCase(selectedLead) && (
                                            <>
                                                <div 
                                                    onClick={() => setIsMaterialListOpen(!isMaterialListOpen)}
                                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#fafaf9', borderRadius: '12px', border: '1px solid #e8e6e1', cursor: 'pointer', marginBottom: '16px', marginTop: '24px' }}
                                                >
                                                    <h3 style={{ color: '#1a1a1a', margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Package size={18} style={{ color: '#6b7280' }} /> Materialeliste (Internt indkøb)
                                                     </h3>
                                                     <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'bold' }}>
                                                         {isMaterialListOpen ? 'Skjul ▲' : 'Vis ▼'}
                                                     </span>
                                                 </div>

                                                 {isMaterialListOpen && (
                                                     <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#fcfcfc', borderRadius: '14px', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column' }}>
                                                         <MaterialList isLead={true} 
                                                             lead={selectedLead} 
                                                             profile={carpenterProfile} 
                                                             onUpdate={(updated) => {
                                                                 setLeadsData(prev => prev.map(l => l.id === updated.id ? updated : l));
                                                                 setSelectedLead(updated);
                                                             }} 
                                                         />
                                                         <button 
                                                             onClick={() => setIsMaterialListOpen(false)}
                                                             style={{ width: '100%', marginTop: '24px', padding: '16px', backgroundColor: '#cbd5e1', color: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                                         >
                                                             ▲ Luk materialeliste
                                                         </button>
                                                     </div>
                                                 )}
                                             </>
                                         )}

                                        {/* QUOTE BUILDER SEKTION */}
                                        {!isConfirmedCase(selectedLead) && (
                                            <>
                                                <div 
                                                    onClick={() => setIsQuoteEditorOpen(!isQuoteEditorOpen)}
                                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#fafaf9', borderRadius: '12px', border: '1px solid #e8e6e1', cursor: 'pointer', marginBottom: '16px', marginTop: '24px' }}
                                                >
                                                    <h3 style={{ color: '#1a1a1a', margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <FileText size={18} style={{ color: '#6b7280' }} /> {(['extensions', 'carport', 'kitchen', 'bath'].includes(selectedLead.project_category) || selectedLead.price_estimate === 'Besigtigelse kræves') ? 'Lav & Send Skræddersyet Tilbud' : 'Tilpas & Send Endeligt Tilbud'}
                                                    </h3>
                                                    <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'bold' }}>
                                                        {isQuoteEditorOpen ? 'Skjul ▲' : 'Vis ▼'}
                                                    </span>
                                                </div>

                                                {isQuoteEditorOpen && (quoteBuilder ? (
                                                    selectedLead.status === 'Sendt tilbud' && !quoteBuilder.forceEdit ? (
                                                        <div style={{ marginTop: '24px', padding: '40px 20px', backgroundColor: '#ecfdf5', borderRadius: '14px', border: '1px solid #10b981', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                                            <div style={{ color: '#10b981', marginBottom: '16px' }}><CheckCircle size={48} /></div>
                                                            <h3 style={{ margin: '0 0 12px', color: '#065f46', fontSize: '1.5rem' }}>Nu har vi sendt tilbuddet på mail til kunden!</h3>
                                                            <p style={{ margin: '0 0 32px', color: '#047857', fontSize: '1rem', maxWidth: '400px' }}>
                                                                Kunden afventer nu, og du får direkte besked (samt en ny mail), så snart de accepterer opgaven.
                                                            </p>
                                                            <button 
                                                                onClick={() => setSelectedLead(null)}
                                                                style={{ padding: '14px 28px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', marginBottom: '24px' }}
                                                            >
                                                                Gå tilbage til dashboardet
                                                            </button>
                                                            <button 
                                                                onClick={() => setQuoteBuilder(p => ({...p, forceEdit: true}))}
                                                                style={{ background: 'none', border: 'none', color: '#6b7280', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }}
                                                            >
                                                                Har du lavet en fejl? Tryk her for at rette og sende igen
                                                            </button>
                                                        </div>
                                                    ) : (
                                                    <div style={{ marginTop: '24px', padding: '24px', backgroundColor: '#f3f1ed', borderRadius: '14px', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                        <h3 style={{ margin: '0', color: '#1a1a1a' }}>
                                                            {(['extensions', 'carport', 'kitchen', 'bath'].includes(selectedLead.project_category) || selectedLead.price_estimate === 'Besigtigelse kræves') ? 'Lav & Send Skræddersyet Tilbud' : 'Tilpas & Send Endeligt Tilbud'}
                                                        </h3>
                                                        <p style={{ margin: '0', color: '#6b7280', fontSize: '0.95rem' }}>
                                                            {(['extensions', 'carport', 'kitchen', 'bath'].includes(selectedLead.project_category) || selectedLead.price_estimate === 'Besigtigelse kræves') 
                                                                ? "Dette er et projekt uden auto-estimat. Opbyg tilbuddet fra bunden ved at indtaste dine beregnede timer og materialer, så bygger systemet en professionel PDF-kontrakt." 
                                                                : "Brug auto-estimatet som skabelon. Ret tallene til, og få systemet til at bygge PDF'en for dig."}
                                                        </p>
                                                        
                                                        <div className="quote-builder-grid" style={{ marginTop: '10px' }}>
                                                            {quoteBuilder.isKombi && quoteBuilder.subprojects && quoteBuilder.subprojects.length > 0 ? (
                                                                <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}>
                                                                    <strong style={{ color: '#1a1a1a', fontSize: '0.95rem' }}>Individuel tilpasning pr. underprojekt:</strong>
                                                                    {quoteBuilder.subprojects.map((sub, sIdx) => (
                                                                        <details key={sub.id} style={{ border: '1px solid #e8e6e1', borderRadius: '8px', backgroundColor: '#ffffff', overflow: 'hidden' }} open={sIdx === 0}>
                                                                            <summary style={{ padding: '10px 14px', background: '#fafafa', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', outline: 'none' }}>
                                                                                <span>Del {sIdx + 1}: {sub.title}</span>
                                                                                <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'normal' }}>
                                                                                    ({sub.laborHours} t / {sub.materialCost.toLocaleString('da-DK')} kr.)
                                                                                </span>
                                                                            </summary>
                                                                            <div className="quote-builder-grid" style={{ padding: '12px 14px', borderTop: '1px solid #e8e6e1' }}>
                                                                                <div className="input-group">
                                                                                    <label style={{ fontSize: '0.8rem', color: '#4b5563', marginBottom: '2px', display: 'block' }}>Arbejdstimer (antal)</label>
                                                                                    <input 
                                                                                        type="number" 
                                                                                        value={sub.laborHours} 
                                                                                        onChange={(e) => {
                                                                                            const val = Number(e.target.value);
                                                                                            const updatedSubs = quoteBuilder.subprojects.map(item => item.id === sub.id ? { ...item, laborHours: val } : item);
                                                                                            const newTotalHours = updatedSubs.reduce((sum, item) => sum + item.laborHours, 0);
                                                                                            setQuoteBuilder({
                                                                                                ...quoteBuilder,
                                                                                                subprojects: updatedSubs,
                                                                                                laborHours: newTotalHours
                                                                                            });
                                                                                        }} 
                                                                                        style={{ border: '1px solid #e8e6e1', padding: '8px 12px', borderRadius: '6px', width: '100%', fontSize: '0.9rem' }} 
                                                                                    />
                                                                                </div>
                                                                                <div className="input-group">
                                                                                    <label style={{ fontSize: '0.8rem', color: '#4b5563', marginBottom: '2px', display: 'block' }}>Internt Indkøbsbudget (kr)</label>
                                                                                    <input 
                                                                                        type="number" 
                                                                                        value={sub.materialCostBase} 
                                                                                        onChange={(e) => {
                                                                                            const val = Number(e.target.value);
                                                                                            const newSales = Math.round(val * sub.materialMarkup);
                                                                                            const updatedSubs = quoteBuilder.subprojects.map(item => item.id === sub.id ? { ...item, materialCostBase: val, materialCost: newSales } : item);
                                                                                            const newTotalMaterials = updatedSubs.reduce((sum, item) => sum + item.materialCost, 0);
                                                                                            const newTotalBase = updatedSubs.reduce((sum, item) => sum + item.materialCostBase, 0);
                                                                                            setQuoteBuilder({
                                                                                                ...quoteBuilder,
                                                                                                subprojects: updatedSubs,
                                                                                                materialCostBase: newTotalBase,
                                                                                                materialCost: newTotalMaterials
                                                                                            });
                                                                                        }} 
                                                                                        style={{ border: '1px solid #e8e6e1', padding: '8px 12px', borderRadius: '6px', width: '100%', fontSize: '0.9rem' }} 
                                                                                    />
                                                                                </div>
                                                                                <div className="input-group">
                                                                                    <label style={{ fontSize: '0.8rem', color: '#4b5563', marginBottom: '2px', display: 'block' }}>Materiale-avance (%)</label>
                                                                                    <input 
                                                                                        type="number" 
                                                                                        value={Math.round((sub.materialMarkup - 1) * 100)} 
                                                                                        onChange={(e) => {
                                                                                            const pct = Number(e.target.value);
                                                                                            const factor = 1 + (pct / 100);
                                                                                            const newSales = Math.round(sub.materialCostBase * factor);
                                                                                            const updatedSubs = quoteBuilder.subprojects.map(item => item.id === sub.id ? { ...item, materialMarkup: factor, materialCost: newSales } : item);
                                                                                            const newTotalMaterials = updatedSubs.reduce((sum, item) => sum + item.materialCost, 0);
                                                                                            setQuoteBuilder({
                                                                                                ...quoteBuilder,
                                                                                                subprojects: updatedSubs,
                                                                                                materialCost: newTotalMaterials
                                                                                            });
                                                                                        }} 
                                                                                        style={{ border: '1px solid #e8e6e1', padding: '8px 12px', borderRadius: '6px', width: '100%', fontSize: '0.9rem' }} 
                                                                                    />
                                                                                </div>
                                                                                <div className="input-group" style={{ backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                                                    <label style={{ fontSize: '0.8rem', color: '#0f172a', marginBottom: '2px', display: 'block', fontWeight: 'bold' }}>Salgspris (kr)</label>
                                                                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f172a' }}>
                                                                                        {sub.materialCost.toLocaleString('da-DK')} kr.
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </details>
                                                                    ))}
                                                                    <div className="input-group" style={{ marginTop: '8px' }}>
                                                                        <label style={{ fontWeight: 'bold' }}>Timepris (kr) - Gælder alle underprojekter</label>
                                                                        <input type="number" value={quoteBuilder.hourlyRate} onChange={(e) => setQuoteBuilder({...quoteBuilder, hourlyRate: Number(e.target.value)})} style={{ border: '1px solid #e8e6e1', padding: '10px', borderRadius: '6px', width: '100%' }} />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="input-group">
                                                                        <label>Arbejdstimer (antal)</label>
                                                                        <FormattedNumberInput value={quoteBuilder.laborHours} onChange={(val) => setQuoteBuilder({...quoteBuilder, laborHours: val})} style={{ border: '1px solid #e8e6e1', padding: '10px', borderRadius: '6px', width: '100%' }} />
                                                                    </div>
                                                                    <div className="input-group">
                                                                        <label>Timepris (kr)</label>
                                                                        <FormattedNumberInput value={quoteBuilder.hourlyRate} onChange={(val) => setQuoteBuilder({...quoteBuilder, hourlyRate: val})} style={{ border: '1px solid #e8e6e1', padding: '10px', borderRadius: '6px', width: '100%' }} />
                                                                    </div>
                                                                    <style>{`@media(max-width:768px){.quote-triple-grid{grid-template-columns:1fr !important;}}`}</style>
                                                                    <div className="quote-triple-grid">
                                                                        <div className="input-group">
                                                                            <label>Internt Indkøbsbudget (kr)</label>
                                                                            <FormattedNumberInput value={quoteBuilder.materialCostBase} onChange={(val) => {
                                                                                const newSales = Math.round(val * quoteBuilder.materialMarkup);
                                                                                setQuoteBuilder({...quoteBuilder, materialCostBase: val, materialCost: newSales});
                                                                            }} style={{ border: '1px solid #e8e6e1', padding: '12px 16px', borderRadius: '8px', width: '100%', fontSize: '0.95rem' }} />
                                                                        </div>
                                                                        <div className="input-group">
                                                                            <label>Materiale-avance (%)</label>
                                                                            <input 
                                                                                type="number" 
                                                                                value={Math.round((quoteBuilder.materialMarkup - 1) * 100)} 
                                                                                onChange={(e) => {
                                                                                    const pct = Number(e.target.value);
                                                                                    const factor = 1 + (pct / 100);
                                                                                    const newSales = Math.round(quoteBuilder.materialCostBase * factor);
                                                                                    setQuoteBuilder({...quoteBuilder, materialMarkup: factor, materialCost: newSales});
                                                                                }} 
                                                                                style={{ border: '1px solid #e8e6e1', padding: '12px 16px', borderRadius: '8px', width: '100%', fontSize: '0.95rem' }} 
                                                                            />
                                                                        </div>
                                                                        <div className="input-group">
                                                                            <label style={{ fontWeight: 'bold' }}>Salgspris til kunden</label>
                                                                            <div style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px', width: '100%', display: 'flex', alignItems: 'center', fontSize: '0.95rem', fontWeight: 'bold', color: '#0f172a', height: '46px' }}>
                                                                                {quoteBuilder.materialCost.toLocaleString('da-DK')} kr.
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="input-group">
                                                                <label>Kørsel/Øvrigt eks. moms (kr)</label>
                                                                <FormattedNumberInput value={quoteBuilder.drivingCost} onChange={(val) => setQuoteBuilder({...quoteBuilder, drivingCost: val})} style={{ border: '1px solid #e8e6e1', padding: '10px', borderRadius: '6px', width: '100%' }} />
                                                            </div>
                                                            <div className="input-group">
                                                                <label>Ekstra materialer (smådele) eks. moms</label>
                                                                <FormattedNumberInput value={quoteBuilder.extraMaterialsCost} onChange={(val) => setQuoteBuilder({...quoteBuilder, extraMaterialsCost: val})} style={{ border: '1px solid #e8e6e1', padding: '10px', borderRadius: '6px', width: '100%' }} />
                                                            </div>
                                                        </div>

                                                        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            {(quoteBuilder.customLines || []).map((line, idx) => (
                                                                <div key={idx} className="quote-builder-grid" style={{ alignItems: 'flex-start', position: 'relative', border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '8px' }}>
                                                                    <div className="input-group">
                                                                        <label style={{ fontSize: '0.8rem', color: '#4b5563', marginBottom: '2px', display: 'block' }}>Ekstra ydelse / Vare</label>
                                                                        <input type="text" placeholder="F.eks. Leje af stillads" value={line.description} onChange={(e) => {
                                                                            const newLines = [...quoteBuilder.customLines];
                                                                            newLines[idx].description = e.target.value;
                                                                            setQuoteBuilder({...quoteBuilder, customLines: newLines});
                                                                        }} style={{ border: '1px solid #e8e6e1', padding: '10px', borderRadius: '6px', width: '100%' }} />
                                                                    </div>
                                                                    <div className="input-group">
                                                                        <label style={{ fontSize: '0.8rem', color: '#4b5563', marginBottom: '2px', display: 'block' }}>Pris eks. moms (kr)</label>
                                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                                            <input type="number" placeholder="Pris (kr)" value={line.price || ''} onChange={(e) => {
                                                                                const newLines = [...quoteBuilder.customLines];
                                                                                newLines[idx].price = Number(e.target.value);
                                                                                setQuoteBuilder({...quoteBuilder, customLines: newLines});
                                                                            }} style={{ border: '1px solid #e8e6e1', padding: '10px', borderRadius: '6px', width: '100%' }} />
                                                                            <button onClick={() => {
                                                                                const newLines = [...quoteBuilder.customLines];
                                                                                newLines.splice(idx, 1);
                                                                                setQuoteBuilder({...quoteBuilder, customLines: newLines});
                                                                            }} style={{ background: '#fef2f2', border: '1px solid #e8e6e1', color: '#ef4444', padding: '10px', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>&times; Slet</button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <button onClick={() => setQuoteBuilder({...quoteBuilder, customLines: [...(quoteBuilder.customLines || []), { description: '', price: 0 }] })} style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed #94a3b8', color: '#6b7280', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Tilføj ekstra linje</button>
                                                        </div>

                                                        {(() => {
                                                            const totalExVat = (quoteBuilder.laborHours * quoteBuilder.hourlyRate) + quoteBuilder.materialCost + quoteBuilder.drivingCost + (quoteBuilder.extraMaterialsCost || 0) + (quoteBuilder.customLines || []).reduce((acc, l) => acc + (l.price || 0), 0);
                                                            const vat = totalExVat * 0.25;
                                                            const totalIncVat = totalExVat + vat;
                                                            return (
                                                                <div style={{ padding: '16px', background: '#e8e6e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', color: '#475569' }}>
                                                                        <span>Total ekskl. moms:</span>
                                                                        <span>{new Intl.NumberFormat('da-DK').format(totalExVat)} kr.</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', color: '#475569' }}>
                                                                        <span>Moms (25%):</span>
                                                                        <span>{new Intl.NumberFormat('da-DK').format(vat)} kr.</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', marginTop: '4px' }}>
                                                                        <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#0f172a' }}>Total inkl. moms:</span>
                                                                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1d4ed8' }}>
                                                                            {new Intl.NumberFormat('da-DK').format(totalIncVat)} kr.
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* PDF Customization UI */}
                                                        <div style={{ marginTop: '16px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(12px)' }}>
                                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1a1a1a' }}>Tilpas PDF-udseende til kunden</h4>
                                                            
                                                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '16px' }}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={!quoteBuilder.showDetailedBreakdown} 
                                                                    onChange={(e) => setQuoteBuilder({...quoteBuilder, showDetailedBreakdown: !e.target.checked})}
                                                                    style={{ width: '18px', height: '18px', marginTop: '2px' }}
                                                                />
                                                                <div>
                                                                    <strong style={{ display: 'block', fontSize: '0.95rem', color: '#1a1a1a' }}>Skjul detaljer (Vis kun samlet pris)</strong>
                                                                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Fravælger du detaljer, skjules tømrer-timer, materialer og ekstra ydelser på PDF'en. Kunden ser kun én samlet "Entreprise" pris.</span>
                                                                </div>
                                                            </label>

                                                            <div style={{ marginBottom: '16px' }}>
                                                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Tilbuddets gyldighed (dage)</label>
                                                                <input 
                                                                    type="number" 
                                                                    min="1"
                                                                    value={quoteBuilder.validityDays || 14} 
                                                                    onChange={(e) => setQuoteBuilder({...quoteBuilder, validityDays: parseInt(e.target.value) || 14})}
                                                                    style={{ width: '100px', padding: '10px', borderRadius: '6px', border: '1px solid #e8e6e1' }}
                                                                />
                                                                <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#6b7280' }}>Dage før tilbuddet udløber</span>
                                                            </div>

                                                            <div>
                                                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>Bemærkninger / Beskrivelse til kunden</label>
                                                                <textarea 
                                                                    value={quoteBuilder.customMessage || ''} 
                                                                    onChange={(e) => setQuoteBuilder({...quoteBuilder, customMessage: e.target.value})}
                                                                    placeholder="F.eks. 'Tak for god snak. I tilbuddet er der taget højde for...'"
                                                                    style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #e8e6e1', resize: 'vertical' }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '24px' }}>
                                                            <button  
                                                                className="btn-primary" 
                                                                style={{ width: '100%', padding: '16px 24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 'bold', border: 'none', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)', cursor: 'pointer' }}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setQuoteBuilder({...quoteBuilder, showPreview: true});
                                                                }}
                                                            >
                                                                {selectedLead.status === 'Sendt tilbud' ? 'Se PDF & Opdateringsmuligheder' : 'Generer & Gennemse Tilbud'}
                                                            </button>
                                                        </div>
                                                        {selectedLead.status === 'Sendt tilbud' && (
                                                            <div style={{ padding: '12px', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', fontWeight: '500', fontSize: '0.9rem', marginTop: '10px', textAlign: 'center' }}>
                                                                ✅ Et tilbud (PDF) ligger gemt på sagen. Tryk ovenfor for at ændre det.
                                                            </div>
                                                        )}

                                                        {selectedLead.status !== 'Sendt tilbud' && (
                                                            <div style={{ marginTop: '24px', borderTop: '1px solid #cbd5e1', paddingTop: '20px' }}>
                                                                <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#6b7280', textAlign: 'center', fontWeight: '500' }}>— Eller brug dit eget vante system —</p>
                                                                <div className="upload-system-grid">
                                                                    <input 
                                                                        type="file" 
                                                                        accept="application/pdf" 
                                                                        onChange={(e) => setSelectedPdfFile(e.target.files[0])}
                                                                        style={{ border: '1px dashed rgba(255, 255, 255, 0.4)', padding: '10px', borderRadius: '6px', flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(12px)', fontSize: '0.9rem', cursor: 'pointer', color: '#1a1a1a' }}
                                                                    />
                                                                    <button 
                                                                        style={{ padding: '0 24px', borderRadius: '6px', border: '1px solid #94a3b8', backgroundColor: '#f3f1ed', color: '#1a1a1a', cursor: selectedPdfFile ? 'pointer' : 'not-allowed', opacity: selectedPdfFile ? 1 : 0.5, fontWeight: 'bold' }}
                                                                        disabled={!selectedPdfFile || isUploadingPdf}
                                                                        onClick={() => handleUploadAndSendQuote(selectedLead.id, carpenterProfile ? carpenterProfile.slug : 'hvem-som-helst')}
                                                                    >
                                                                        {isUploadingPdf ? 'Sender...' : (selectedLead.status === 'Sendt tilbud' ? 'Sendt. Tilbud til kunde' : 'Upload dit eget tilbud')}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    )
                                                ) : (
                                                    <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#fff5f5', color: '#991b1b', borderRadius: '8px', border: '1px solid #f87171' }}>
                                                        <strong>Hov!</strong> Dette lead blev oprettet <em>før</em> vi integrerede Tilbuds-generatoren. Værdier til auto-udfyldelse mangler i databasen. Generer dog et nyt test-lead for at se det nye system.
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                        {isConfirmedCase(selectedLead) && (
                                            <div style={{ marginTop: '24px', borderTop: '2px solid #cbd5e1', paddingTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', textAlign: 'center' }}>Ordrestyring og Byggeproces</h3>
                                                <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', textAlign: 'center', maxWidth: '500px' }}>
                                                    Sagen er bekræftet! Al praktisk styring, materialebestilling og timeregistrering foregår inde i den dedikerede Ordrestyring.
                                                </p>
                                                <button 
                                                    onClick={() => {
                                                        setTargetCaseId(selectedLead.id);
                                                        setActiveTab('cases');
                                                        setSelectedLead(null);
                                                    }}
                                                    style={{ 
                                                        marginTop: '8px',
                                                        padding: '20px 32px', 
                                                        backgroundColor: '#1d4ed8', 
                                                        color: 'white', 
                                                        border: 'none', 
                                                        borderRadius: '16px', 
                                                        fontSize: '1.2rem', 
                                                        fontWeight: 'bold', 
                                                        cursor: 'pointer', 
                                                        boxShadow: '0 8px 24px rgba(29, 78, 216, 0.25)', 
                                                        transition: 'transform 0.1s, background 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e40af'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                                                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                                                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22 22 2"/><path d="M12 2l10 10-10 10-10-10 10-10z"/></svg>
                                                    Gå til Ordrestyring for denne sag
                                                </button>
                                            </div>
                                        )}

                                        {selectedLead.status === 'Bekræftet opgave' && (
                                            <div style={{ marginTop: '32px', borderTop: '2px solid #e2e8f0', paddingTop: '24px', display: 'flex', justifyContent: 'center' }}>
                                                <button 
                                                    onClick={() => {
                                                        updateLeadStatus(selectedLead.id, 'Historik');
                                                        setSelectedLead(null);
                                                    }} 
                                                    style={{ padding: '16px 32px', fontSize: '1.1rem', background: '#f3f1ed', color: '#374151', border: '2px solid #cbd5e1', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}
                                                    onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                                                    onMouseLeave={(e) => e.target.style.background = '#f1f5f9'}
                                                >
                                                    Afslut opgave (Flyt til Historik)
                                                </button>
                                            </div>
                                        )}

                                            <div style={{ marginTop: !isConfirmedCase(selectedLead) ? '32px' : '16px', borderTop: !isConfirmedCase(selectedLead) ? '2px solid #e2e8f0' : 'none', paddingTop: !isConfirmedCase(selectedLead) ? '24px' : '0', display: 'flex', justifyContent: 'center' }}>
                                                <button 
                                                    onClick={() => {
                                                        updateLeadStatus(selectedLead.id, 'Afbrudt Sag');
                                                        setSelectedLead(null);
                                                    }} 
                                                    style={{ padding: '12px 24px', fontSize: '1rem', background: 'transparent', color: '#64748b', border: '2px solid #cbd5e1', borderRadius: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                                                    onMouseEnter={(e) => { e.target.style.background = '#f1f5f9'; e.target.style.color = '#334155'; }}
                                                    onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#64748b'; }}
                                                >
                                                    Marker som tabt / afvist opgave
                                                </button>
                                            </div>

                                        {/* Slet sag (Permanent) */}
                                        <div style={{ marginTop: '32px', borderTop: '1px solid #fee2e2', paddingTop: '16px', display: 'flex', justifyContent: 'center' }}>
                                            <button 
                                                onClick={() => {
                                                    setShowDeleteConfirm(true);
                                                }}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                Slet kunde permanent
                                            </button>
                                        </div>

                                        {quoteBuilder && quoteBuilder.showPreview && (() => {
                                            const currentTotalExVat = (quoteBuilder.laborHours * quoteBuilder.hourlyRate) + quoteBuilder.materialCost + quoteBuilder.drivingCost + (quoteBuilder.extraMaterialsCost || 0) + (quoteBuilder.customLines || []).reduce((acc, l) => acc + (l.price || 0), 0);
                                            return createPortal(
                                            <div className="pdf-preview-wrapper" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000000', zIndex: 100000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', padding: '40px 20px', paddingBottom: '120px' }}>
                                                
                                                <PdfMobileWrapper>
                                                    <div ref={invoiceRef} style={{ width: '794px', minWidth: '794px', flexShrink: 0, minHeight: '1123px', padding: '60px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#1a1a1a', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
                                                        
                                                        {/* Invoice Header */}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e8e6e1', paddingBottom: '16px', marginBottom: '24px' }}>
                                                            <div>
                                                                {carpenterProfile?.logo_url ? (
                                                                    <img src={carpenterProfile.logo_url} alt="Logo" style={{ maxHeight: '50px', marginBottom: '8px' }} crossOrigin="anonymous" />
                                                                ) : (
                                                                    <h1 style={{ margin: 0, fontSize: '20px', color: '#1a1a1a' }}>{carpenterProfile?.company_name || 'Tømrervirksomhed'}</h1>
                                                                )}
                                                                <p style={{ margin: '2px 0', fontSize: '11px', color: '#6b7280' }}>CVR: {carpenterProfile?.cvr || 'Under oprettelse'}</p>
                                                                <p style={{ margin: '2px 0', fontSize: '11px', color: '#6b7280' }}>{carpenterProfile?.address || ''}</p>
                                                                <p style={{ margin: '2px 0', fontSize: '11px', color: '#6b7280' }}>{carpenterProfile?.phone || ''} | {carpenterProfile?.email || ''}</p>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <h2 style={{ margin: 0, fontSize: '22px', color: '#10b981' }}>TILBUD</h2>
                                                                <p style={{ margin: '4px 0', fontSize: '11px' }}><strong>Dato:</strong> {new Date().toLocaleDateString('da-DK')}</p>
                                                                <p style={{ margin: '4px 0', fontSize: '11px' }}><strong>Sagsnummer:</strong> {selectedLead.case_number || String(selectedLead.id).substring(0, 8)}</p>
                                                            </div>
                                                        </div>

                                                        {/* Customer Details */}
                                                        <div style={{ marginBottom: '32px' }}>
                                                            <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6b7280' }}>Kunde:</h3>
                                                            <strong style={{ fontSize: '13px', display: 'block' }}>{selectedLead.customer_name}</strong>
                                                            <span style={{ fontSize: '13px', display: 'block' }}>{selectedLead.customer_address}</span>
                                                            <span style={{ fontSize: '13px', display: 'block' }}>{selectedLead.customer_phone} | {selectedLead.customer_email}</span>
                                                        </div>

                                                        {/* Custom Message */}
                                                        {quoteBuilder.customMessage && quoteBuilder.customMessage.trim() !== '' && (
                                                            <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#f3f1ed', borderLeft: '3px solid #10b981', borderRadius: '4px' }}>
                                                                <p style={{ margin: 0, fontSize: '13px', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                                                    {quoteBuilder.customMessage}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Line Items Table */}
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
                                                            <thead>
                                                                <tr style={{ backgroundColor: '#f3f1ed', borderBottom: '2px solid #cbd5e1' }}>
                                                                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>Beskrivelse</th>
                                                                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>Antal/Mængde</th>
                                                                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>Enhedspris</th>
                                                                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {quoteBuilder.showDetailedBreakdown ? (
                                                                    <>
                                                                        <tr style={{ borderBottom: '1px solid #e8e6e1' }}>
                                                                            <td style={{ padding: '10px', fontSize: '12px' }}>Håndværker - Arbejdstid</td>
                                                                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>{quoteBuilder.laborHours} timer</td>
                                                                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>{quoteBuilder.hourlyRate} kr.</td>
                                                                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>{new Intl.NumberFormat('da-DK').format(quoteBuilder.laborHours * quoteBuilder.hourlyRate)} kr.</td>
                                                                        </tr>
                                                                        <tr style={{ borderBottom: '1px solid #e8e6e1' }}>
                                                                            <td style={{ padding: '10px', fontSize: '12px' }}>Materialer (ihht. besigtigelse)</td>
                                                                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>1 pck.</td>
                                                                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>{new Intl.NumberFormat('da-DK').format(quoteBuilder.materialCost)} kr.</td>
                                                                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>{new Intl.NumberFormat('da-DK').format(quoteBuilder.materialCost)} kr.</td>
                                                                        </tr>
                                                                        <tr style={{ borderBottom: '1px solid #e8e6e1' }}>
                                                                            <td style={{ padding: '10px', fontSize: '12px' }}>Kørsel, logistik og øvrigt</td>
                                                                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>1 stk.</td>
                                                                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>{new Intl.NumberFormat('da-DK').format(quoteBuilder.drivingCost)} kr.</td>
                                                                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>{new Intl.NumberFormat('da-DK').format(quoteBuilder.drivingCost)} kr.</td>
                                                                        </tr>
                                                                        <tr style={{ borderBottom: '1px solid #e8e6e1' }}>
                                                                            <td style={{ padding: '10px', fontSize: '12px' }}>Ekstra materialer (smådele)</td>
                                                                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>1 stk.</td>
                                                                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>{new Intl.NumberFormat('da-DK').format(quoteBuilder.extraMaterialsCost || 0)} kr.</td>
                                                                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>{new Intl.NumberFormat('da-DK').format(quoteBuilder.extraMaterialsCost || 0)} kr.</td>
                                                                        </tr>
                                                                        {(quoteBuilder.customLines || []).map((line, idx) => (
                                                                            <tr key={idx} style={{ borderBottom: '1px solid #e8e6e1' }}>
                                                                                <td style={{ padding: '10px', fontSize: '12px' }}>{line.description || 'Ekstra ydelser'}</td>
                                                                                <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>1 stk.</td>
                                                                                <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>{new Intl.NumberFormat('da-DK').format(line.price || 0)} kr.</td>
                                                                                <td style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>{new Intl.NumberFormat('da-DK').format(line.price || 0)} kr.</td>
                                                                            </tr>
                                                                        ))}
                                                                    </>
                                                                ) : (
                                                                    <tr style={{ borderBottom: '1px solid #e8e6e1' }}>
                                                                        <td style={{ padding: '10px', fontSize: '13px', fontWeight: 'bold' }}>Samlet entreprise på opgaven jf. aftale</td>
                                                                        <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>1 stk.</td>
                                                                        <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>{new Intl.NumberFormat('da-DK').format(currentTotalExVat || 0)} kr.</td>
                                                                        <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>{new Intl.NumberFormat('da-DK').format(currentTotalExVat || 0)} kr.</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>

                                                        {/* Totals */}
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                                                            <div style={{ width: '250px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px' }}>
                                                                    <span style={{ color: '#475569' }}>Subtotal (eks. moms)</span>
                                                                    <span>{new Intl.NumberFormat('da-DK').format(currentTotalExVat || 0)} kr.</span>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px' }}>
                                                                    <span style={{ color: '#475569' }}>Moms (25%)</span>
                                                                    <span>{new Intl.NumberFormat('da-DK').format((currentTotalExVat || 0) * 0.25)} kr.</span>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', marginTop: '8px', fontSize: '16px', fontWeight: 'bold' }}>
                                                                    <span>TOTAL AT BETALE</span>
                                                                    <span>{new Intl.NumberFormat('da-DK').format((currentTotalExVat || 0) * 1.25)} kr.</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div style={{ marginTop: 'auto', fontSize: '9px', color: '#6b7280', borderTop: '1px solid #e8e6e1', paddingTop: '12px', lineHeight: '1.4' }}>
                                                            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#374151', fontWeight: 'bold' }}>Tak for tilliden. Dette tilbud er gældende i {quoteBuilder.validityDays || 14} dage fra ovenstående dato.</p>
                                                            {quoteBuilder.laborHours > 0 && (
                                                                <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#0f172a', fontWeight: 'bold' }}>
                                                                    Estimeret varighed for udførelse: Ca. {Math.max(1, Math.ceil(quoteBuilder.laborHours / 37))} arbejdsuger. Den præcise opstartsdato aftales nærmere, når tilbuddet er bekræftet.
                                                                </p>
                                                            )}
                                                            <p style={{ margin: 0 }}>Arbejdet udføres i henhold til AB Forbruger (Almindelige Betingelser for byggearbejder), hvilket sikrer klare og trygge rammer for aftalen. Eventuelle uforudsete forhindringer (f.eks. skjult råd, svamp, ulovlige installationer eller asbest), der ikke med rimelighed kunne forudses ved tilbudsgivningen, er ikke inkluderet og vil blive udbedret i samråd til gældende timepris.</p>
                                                        </div>

                                                    </div>
                                                </PdfMobileWrapper>

                                                {/* ActionBar fixed til bunden for funktionalitet */}
                                                <div className="pdf-action-bar">
                                                        <div className="pdf-action-buttons">
                                                                <button 
                                                                    disabled={quoteBuilder.isGeneratingPdf}
                                                                    onClick={(e) => { e.stopPropagation(); setQuoteBuilder({...quoteBuilder, showPreview: false}); }} 
                                                                    style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                                                                >
                                                                    ← Tilbage og redigér
                                                                </button>
                                                                <button 
                                                                    className="email-preview-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setShowEmailPreview(true);
                                                                    }}
                                                                    style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                                >
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                                    E-mail forhåndsvisning
                                                                </button>
                                                            <button 
                                                                disabled={quoteBuilder.isGeneratingPdf}
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    setQuoteBuilder(p => ({...p, isGeneratingPdf: true, uploadStepText: '⏳ Tegner PDF...'}));
                                                                    
                                                                    const wrapper = invoiceRef.current?.parentElement?.parentElement;
                                                                    let oldStyles = {};
                                                                    if (wrapper) {
                                                                        oldStyles = {
                                                                            transform: wrapper.style.transform,
                                                                            marginBottom: wrapper.style.marginBottom,
                                                                            marginLeft: wrapper.style.marginLeft,
                                                                            marginRight: wrapper.style.marginRight
                                                                        };
                                                                        wrapper.style.transform = 'none';
                                                                        wrapper.style.marginBottom = '0px';
                                                                        wrapper.style.marginLeft = '0px';
                                                                        wrapper.style.marginRight = '0px';
                                                                        await new Promise(resolve => requestAnimationFrame(resolve));
                                                                    }

                                                                    try {
                                                                        const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true });
                                                                        const imgData = canvas.toDataURL('image/jpeg', 1.0);
                                                                        const pdfWidth = 210;
                                                                        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                                                                        
                                                                        const pdf = new jsPDF('p', 'mm', [210, Math.max(297, pdfHeight)]);
                                                                        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
                                                                        const pdfBlob = pdf.output('blob');
                                                                        
                                                                        setQuoteBuilder(p => ({...p, uploadStepText: '☁️ Gemmer sikkert i skyen...'}));

                                                                        const cleanProjectTitle = (categoryNames[selectedLead.project_category] || selectedLead.project_category).replace(/\//g, '-').replace(/\s+/g, '_');
                                                                        const cleanName = (selectedLead.customer_name || 'Kunde').split(' ')[0].replace(/[^a-zA-ZæøåÆØÅ]/g, '');
                                                                        const cleanAddress = (selectedLead.customer_address || 'Adresse').split(',')[0].replace(/[^a-zA-Z0-9æøåÆØÅ\s]/g, '').replace(/\s+/g, '_');
                                                                        
                                                                        const file = new File([pdfBlob], `Tilbud_${cleanProjectTitle}_${cleanName}_${cleanAddress}.pdf`, { type: 'application/pdf' });
                                                                        const slug = carpenterProfile ? carpenterProfile.slug : 'hvem-som-helst';
                                                                        
                                                                        const finalPrice = ((quoteBuilder.laborHours * quoteBuilder.hourlyRate) + quoteBuilder.materialCost + quoteBuilder.drivingCost + (quoteBuilder.extraMaterialsCost || 0) + (quoteBuilder.customLines || []).reduce((acc, l) => acc + (l.price || 0), 0)) * 1.25;
                                                                        
                                                                        const extraRawData = { 
                                                                            calc_data: {
                                                                                laborHours: quoteBuilder.laborHours,
                                                                                hourlyRate: quoteBuilder.hourlyRate,
                                                                                materialCostBase: quoteBuilder.materialCostBase,
                                                                                materialMarkup: quoteBuilder.materialMarkup,
                                                                                materialCost: quoteBuilder.materialCost,
                                                                                drivingCost: quoteBuilder.drivingCost,
                                                                                extraMaterialsCost: quoteBuilder.extraMaterialsCost,
                                                                                customLines: quoteBuilder.customLines,
                                                                                projects: quoteBuilder.subprojects,
                                                                            },
                                                                            quote_settings: { showDetailedBreakdown: quoteBuilder.showDetailedBreakdown, validityDays: quoteBuilder.validityDays || 14 },
                                                                            custom_message: quoteBuilder.customMessage
                                                                        };
                                                                        
                                                                        setQuoteBuilder(p => ({...p, uploadStepText: '📧 Sender e-mail...'}));
                                                                        await handleUploadAndSendQuote(selectedLead.id, slug, file, finalPrice, extraRawData, true);
                                                                        
                                                                        setQuoteBuilder(p => ({...p, isGeneratingPdf: false, showPreview: false}));
                                                                    } catch (err) {
                                                                        console.error("Fejl i PDF generering:", err);
                                                                        toast.error("Hov! Der skete en uventet fejl ifm PDF oprettelsen.");
                                                                        setQuoteBuilder(p => ({...p, isGeneratingPdf: false}));
                                                                    } finally {
                                                                        if (wrapper && oldStyles) {
                                                                            wrapper.style.transform = oldStyles.transform || '';
                                                                            wrapper.style.marginBottom = oldStyles.marginBottom || '';
                                                                            wrapper.style.marginLeft = oldStyles.marginLeft || '';
                                                                            wrapper.style.marginRight = oldStyles.marginRight || '';
                                                                        }
                                                                    }
                                                                }} 
                                                                style={{ padding: '16px 32px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: quoteBuilder.isGeneratingPdf ? 'not-allowed' : 'pointer', flex: 1, transition: 'background-color 0.2s', fontSize: '1rem', opacity: quoteBuilder.isGeneratingPdf ? 0.7 : 1, boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }}
                                                            >
                                                                {quoteBuilder.isGeneratingPdf ? quoteBuilder.uploadStepText : (selectedLead.status === 'Sendt tilbud' ? 'SENDT. TILBUD TIL KUNDE (Send igen)' : 'SEND TILBUD TIL KUNDE (PDF + Web)')}
                                                            </button>
                                                        </div>

                                                        {selectedLead.status === 'Sendt tilbud' && (
                                                            <>
                                                            <button 
                                                                disabled={quoteBuilder.isGeneratingPdf}
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    setQuoteBuilder(p => ({...p, isGeneratingPdf: true, uploadStepText: '⏳ Tegner PDF...'}));
                                                                    
                                                                    const wrapper = invoiceRef.current?.parentElement?.parentElement;
                                                                    let oldStyles = {};
                                                                    if (wrapper) {
                                                                        oldStyles = {
                                                                            transform: wrapper.style.transform,
                                                                            marginBottom: wrapper.style.marginBottom,
                                                                            marginLeft: wrapper.style.marginLeft,
                                                                            marginRight: wrapper.style.marginRight
                                                                        };
                                                                        wrapper.style.transform = 'none';
                                                                        wrapper.style.marginBottom = '0px';
                                                                        wrapper.style.marginLeft = '0px';
                                                                        wrapper.style.marginRight = '0px';
                                                                        await new Promise(resolve => requestAnimationFrame(resolve));
                                                                    }

                                                                    try {
                                                                        const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true });
                                                                        const pdf = new jsPDF('p', 'mm', 'a4');
                                                                        const imgData = canvas.toDataURL('image/jpeg', 1.0);
                                                                        
                                                                        const pdfWidth = pdf.internal.pageSize.getWidth();
                                                                        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                                                                        let heightLeft = pdfHeight;
                                                                        let position = 0;

                                                                        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
                                                                        heightLeft -= 297;

                                                                        while (heightLeft > 0) {
                                                                            position = heightLeft - pdfHeight;
                                                                            pdf.addPage();
                                                                            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
                                                                            heightLeft -= 297;
                                                                        }
                                                                        const pdfBlob = pdf.output('blob');
                                                                        
                                                                        setQuoteBuilder(p => ({...p, uploadStepText: '☁️ Opdaterer dokumentet...'}));

                                                                        const cleanProjectTitle = (categoryNames[selectedLead.project_category] || selectedLead.project_category).replace(/\//g, '-').replace(/\s+/g, '_');
                                                                        const cleanName = (selectedLead.customer_name || 'Kunde').split(' ')[0].replace(/[^a-zA-ZæøåÆØÅ]/g, '');
                                                                        const cleanAddress = (selectedLead.customer_address || 'Adresse').split(',')[0].replace(/[^a-zA-Z0-9æøåÆØÅ\s]/g, '').replace(/\s+/g, '_');
                                                                        
                                                                        const file = new File([pdfBlob], `Tilbud_${cleanProjectTitle}_${cleanName}_${cleanAddress}.pdf`, { type: 'application/pdf' });
                                                                        const slug = carpenterProfile ? carpenterProfile.slug : 'hvem-som-helst';
                                                                        
                                                                        const finalPrice = ((quoteBuilder.laborHours * quoteBuilder.hourlyRate) + quoteBuilder.materialCost + quoteBuilder.drivingCost + (quoteBuilder.extraMaterialsCost || 0) + (quoteBuilder.customLines || []).reduce((acc, l) => acc + (l.price || 0), 0)) * 1.25;
                                                                        
                                                                        const extraRawData = { 
                                                                            calc_data: {
                                                                                laborHours: quoteBuilder.laborHours,
                                                                                hourlyRate: quoteBuilder.hourlyRate,
                                                                                materialCostBase: quoteBuilder.materialCostBase,
                                                                                materialMarkup: quoteBuilder.materialMarkup,
                                                                                materialCost: quoteBuilder.materialCost,
                                                                                drivingCost: quoteBuilder.drivingCost,
                                                                                extraMaterialsCost: quoteBuilder.extraMaterialsCost,
                                                                                customLines: quoteBuilder.customLines,
                                                                                projects: quoteBuilder.subprojects,
                                                                            },
                                                                            quote_settings: { showDetailedBreakdown: quoteBuilder.showDetailedBreakdown, validityDays: quoteBuilder.validityDays || 14 },
                                                                            custom_message: quoteBuilder.customMessage
                                                                        };
                                                                        
                                                                        await handleUploadAndSendQuote(selectedLead.id, slug, file, finalPrice, extraRawData, false);
                                                                        toast.success("Tilbuddet er opdateret (kunden får altid vist det nyeste, når de åbner deres link).");
                                                                        setQuoteBuilder(p => ({...p, isGeneratingPdf: false, showPreview: false}));
                                                                    } catch (err) {
                                                                        console.error("Fejl i PDF generering:", err);
                                                                        toast.error("Hov! Der skete en uventet fejl.");
                                                                        setQuoteBuilder(p => ({...p, isGeneratingPdf: false}));
                                                                    } finally {
                                                                        if (wrapper && oldStyles) {
                                                                            wrapper.style.transform = oldStyles.transform || '';
                                                                            wrapper.style.marginBottom = oldStyles.marginBottom || '';
                                                                            wrapper.style.marginLeft = oldStyles.marginLeft || '';
                                                                            wrapper.style.marginRight = oldStyles.marginRight || '';
                                                                        }
                                                                    }
                                                                }} 
                                                                style={{ padding: '12px 24px', backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: quoteBuilder.isGeneratingPdf ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontSize: '0.9rem', width: '100%' }}
                                                            >
                                                                OPDATER TILBUD LIGE STILLE (Uden at sende e-mail)
                                                            </button>
                                                            <div style={{ textAlign: 'center', marginTop: '-4px', fontSize: '0.75rem', color: '#94a3b8' }}>
                                                                Perfekt hvis du lige har opdaget en tastefejl og kunden endnu ikke har åbnet e-mailen.
                                                            </div>
                                                        </>
                                                        )}
                                                    </div>
                                                </div>
                                        , document.body)})()}

                                    </div>
                                </div>
                            , document.body)}
                                </div> {/* Close card-body */}
                            </div> {/* Close settings-card */}
                        </div>
                    )}
                    
                    {activeTab === 'drawings' && (
                        <div className="dashboard-workspace fade-in" style={{ height: '100%' }}>
                            <DrawingsGallery myProfile={myProfile} />
                        </div>
                    )}
                    
                    {activeTab === 'map' && (
                        <div className="dashboard-workspace map-overview space-y-8 " style={{ maxWidth: '1200px', margin: '0 auto', height: '100%', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                            <div className="map-mobile-header glass-panel" style={{ padding: '24px', display: 'none', flexDirection: 'column', gap: '8px' }}>
                                <h2 style={{ margin: 0, color: '#1a1a1a', fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <MapPin size={28} color="#000" />
                                    Geografisk Overblik
                                </h2>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
                                    Se dine leads og nuværende forespørgsler direkte på Danmarkskortet.
                                </p>
                            </div>
                            <div className="settings-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                
                                <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div className="map-filter-panel glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
                                    {['admin', 'sales'].includes(effectiveRole) ? (
                                        <>
                                            <h4 style={{ margin: '0 0 16px', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: '600' }}>Filtrér visningen på kortet</h4>
                                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                <button 
                                                    onClick={() => setMapFilters(p => ({...p, showNew: !p.showNew}))}
                                                    style={{ 
                                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '30px', 
                                                        border: `1px solid ${mapFilters.showNew ? '#3b82f6' : '#e2e8f0'}`,
                                                        backgroundColor: mapFilters.showNew ? '#eff6ff' : '#f8fafc',
                                                        color: mapFilters.showNew ? '#1d4ed8' : '#64748b',
                                                        fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none'
                                                    }}
                                                >
                                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: mapFilters.showNew ? '#3b82f6' : '#cbd5e1' }} />
                                                    Nye forespørgsler
                                                </button>
                                                <button 
                                                    onClick={() => setMapFilters(p => ({...p, showSent: !p.showSent}))}
                                                    style={{ 
                                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '30px', 
                                                        border: `1px solid ${mapFilters.showSent ? '#eab308' : '#e2e8f0'}`,
                                                        backgroundColor: mapFilters.showSent ? '#fefce8' : '#f8fafc',
                                                        color: mapFilters.showSent ? '#a16207' : '#64748b',
                                                        fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none'
                                                    }}
                                                >
                                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: mapFilters.showSent ? '#eab308' : '#cbd5e1' }} />
                                                    Sendt tilbud
                                                </button>
                                                <button 
                                                    onClick={() => setMapFilters(p => ({...p, showConfirmed: !p.showConfirmed}))}
                                                    style={{ 
                                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '30px', 
                                                        border: `1px solid ${mapFilters.showConfirmed ? '#10b981' : '#e2e8f0'}`,
                                                        backgroundColor: mapFilters.showConfirmed ? '#ecfdf5' : '#f8fafc',
                                                        color: mapFilters.showConfirmed ? '#047857' : '#64748b',
                                                        fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none'
                                                    }}
                                                >
                                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: mapFilters.showConfirmed ? '#10b981' : '#cbd5e1' }} />
                                                    Bekræftet opgave
                                                </button>
                                                <button
                                                    onClick={() => setMapFilters(p => ({...p, showOnHold: !p.showOnHold}))}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '30px',
                                                        border: `1px solid ${mapFilters.showOnHold ? '#f97316' : '#e2e8f0'}`,
                                                        backgroundColor: mapFilters.showOnHold ? '#fff7ed' : '#f8fafc',
                                                        color: mapFilters.showOnHold ? '#c2410c' : '#64748b',
                                                        fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none'
                                                    }}
                                                >
                                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: mapFilters.showOnHold ? '#f97316' : '#cbd5e1' }} />
                                                    Sæt i bero
                                                </button>
                                            </div>
                                            <div className="hide-on-mobile" style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f3f1ed', borderRadius: '8px', borderLeft: '3px solid #cbd5e1', fontSize: '0.85rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                                <span>Opgaver i "Historik" og "Afbrudt Sag" er automatisk skjult for at holde kortet rent. Zoom ind hvis prikkerne ligger tæt.</span>
                                            </div>
                                        </>
                                    ) : (
                                        <h4 style={{ margin: '0 0 16px', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: '600' }}>Dine aktive byggepladser</h4>
                                    )}
                                </div>
                            
                            <div className="map-canvas-panel" style={{ flex: 1, border: '1px solid #e8e6e1', borderRadius: '14px', overflow: 'hidden', marginTop: '16px', position: 'relative', zIndex: 0 }}>
                                {!isLoaded ? (
                                    <div style={{ padding: '40px', textAlign: 'center' }}>Henter Google Maps HD miljøet...</div>
                                ) : loadError ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>Kunne ikke hente Google Maps. Tjek din API nøgle.</div>
                                ) : (
                                    <GoogleMap
                                      mapContainerStyle={mapContainerStyle}
                                      zoom={7}
                                      center={defaultCenter}
                                      options={{
                                          disableDefaultUI: false,
                                          zoomControl: true,
                                          streetViewControl: false,
                                          mapTypeControl: false,
                                      }}
                                    >
                                        <MarkerClusterer>
                                            {(clusterer) => (
                                                <>
                                                    {mapVisibleLeads.map(lead => {
                                                        const coords = geocodedLeads[lead.id];
                                                        if (!coords) return null; // Adresse ikke geokodet endnu
                                                        const s = lead.status || 'Ny forespørgsel';
                                                        let iconUrl = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
                                                        if (s === 'Sendt tilbud') iconUrl = 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
                                                        else if (s === 'Bekræftet opgave') iconUrl = 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
                                                        else if (s === 'Sæt i bero') iconUrl = 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png';
                                                        else if (s === 'Historik') iconUrl = 'http://maps.google.com/mapfiles/ms/icons/ltblue-dot.png';
                                                        return (
                                                            <Marker
                                                                key={lead.id}
                                                                position={coords}
                                                                title={lead.customer_name}
                                                                icon={{ url: iconUrl }}
                                                                clusterer={clusterer}
                                                                onClick={() => setSelectedMapLead(lead)}
                                                            />
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </MarkerClusterer>

                                        {selectedMapLead && geocodedLeads[selectedMapLead.id] && mapVisibleLeads.some(l => l.id === selectedMapLead.id) && (() => {
                                            const lead = selectedMapLead;
                                            const s = lead.status || 'Ny forespørgsel';
                                            const pill = s === 'Sendt tilbud' ? { bg: '#fefce8', col: '#a16207', label: 'Sendt tilbud' }
                                                : s === 'Bekræftet opgave' ? { bg: '#ecfdf5', col: '#047857', label: 'Bekræftet opgave' }
                                                : s === 'Sæt i bero' ? { bg: '#fff7ed', col: '#c2410c', label: 'Sæt i bero' }
                                                : { bg: '#eff6ff', col: '#1d4ed8', label: 'Ny forespørgsel' };
                                            const goToCase = ['Bekræftet opgave', 'Sæt i bero', 'Historik'].includes(s) || ['worker', 'apprentice'].includes(effectiveRole);
                                            const actionLabel = goToCase ? 'Åbn sag' : (s === 'Sendt tilbud' ? 'Åbn tilbud' : 'Åbn forespørgsel');
                                            const openIt = () => {
                                                setSelectedMapLead(null);
                                                if (goToCase) { setTargetCaseId(lead.id); setActiveTab('cases'); }
                                                else { handleSelectLead(lead); setActiveTab('leads'); }
                                            };
                                            return (
                                                <InfoWindow position={geocodedLeads[lead.id]} onCloseClick={() => setSelectedMapLead(null)}>
                                                    <div style={{ minWidth: '210px', fontFamily: 'inherit', padding: '2px' }}>
                                                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.98rem', lineHeight: 1.2 }}>{lead.customer_name || 'Ukendt kunde'}</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0 12px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: pill.col, background: pill.bg, padding: '3px 9px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{pill.label}</span>
                                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Sag {lead.case_number || String(lead.id).substring(0, 6)}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button onClick={openIt} style={{ flex: 1, padding: '9px 12px', borderRadius: '10px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>{actionLabel}</button>
                                                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.customer_address || '')}`} target="_blank" rel="noopener noreferrer" title="Åbn i Google Maps" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#2563eb', textDecoration: 'none' }}>
                                                                <MapPin size={16} />
                                                            </a>
                                                        </div>
                                                    </div>
                                                </InfoWindow>
                                            );
                                        })()}
                                    </GoogleMap>
                                )}
                            </div>
                            
                            {(() => {
                                // Samme filtrerede liste som prikkerne, så tallet følger filter-knapperne.
                                const shown = mapVisibleLeads;
                                const onMap = shown.filter(l => geocodedLeads[l.id]).length;
                                return (
                                    <div style={{ marginTop: '16px', display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        <span><strong style={{color: '#10b981'}}>{onMap}</strong> / {shown.length} adresser vist på kortet.</span>
                                    </div>
                                );
                            })()}
                                </div> {/* Close card-body */}
                            </div> {/* Close settings-card */}
                        </div>
                    )}
                    
                    {activeTab === 'settings' && !settingsData && (
                        <div className="placeholder-state">
                            <h3>Henter systemindstillinger...</h3>
                        </div>
                    )}
                    {activeTab === 'settings' && settingsData && (
                        <div className="dashboard-workspace settings-overview settings-grid">
                            
                            <div className="settings-card">
                                <div className="card-header">
                                    <div className="icon-wrapper">
                                        <Truck size={24} />
                                    </div>
                                    <h3>Kørsel & Logistik</h3>
                                </div>
                                <div className="card-body">
                                    <div className="input-group">
                                        <label>Firmaets Adresse (Dit Værksted/Kontor)</label>
                                        <div style={{ padding: '12px', background: '#f3f1ed', borderRadius: '8px', color: '#6b7280', border: '1px solid #e8e6e1', fontWeight: '500' }}>
                                            {carpenterProfile?.address || 'Ingen adresse angivet på profilen.'}
                                        </div>
                                        <span className="help-text">Dette er dit præcise startpunkt til kørselsberegning i overslagene. Adressen hentes direkte fra din Profil-fane.</span>
                                    </div>
                                    <div className="input-group">
                                        <label>Metode til Kørselsberegning</label>
                                        <select 
                                            value={settingsData.driving_calc_method || 'slitage'} 
                                            onChange={(e) => setSettingsData(prev => ({ ...prev, driving_calc_method: e.target.value }))}
                                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e8e6e1', width: '100%' }}
                                        >
                                            <option value="slitage">Slitage & Timer (Statens takst + din timepris under kørsel)</option>
                                            <option value="timer">Kun Timepris (Min. 1 time, rundes op til hele arbejdstimer)</option>
                                        </select>
                                        <span className="help-text">Vælg hvordan kørsel skal takseres i overslagene til kunderne.</span>
                                    </div>
                                    <div className="input-group" style={{ opacity: settingsData.driving_calc_method === 'timer' ? 0.4 : 1, pointerEvents: settingsData.driving_calc_method === 'timer' ? 'none' : 'auto' }}>
                                        <label>Slitage på Firmabil (DKK pr. kilometer)</label>
                                        <input type="number" step="0.1" name="vehicle_cost_per_km" value={settingsData.vehicle_cost_per_km || 3.80} onChange={(e) => setSettingsData(prev => ({ ...prev, vehicle_cost_per_km: parseFloat(e.target.value) }))} disabled={settingsData.driving_calc_method === 'timer'} />
                                        <span className="help-text">Statens kilometertakst. Systemet udregner afstanden, ganger med denne takst og lægger desuden din almindelige timepris til for køretiden!</span>
                                    </div>
                                    <div className="input-group">
                                        <label>Bortskaffelse på Trailer (DKK)</label>
                                        <input type="number" name="trailer_disposal_fee" value={settingsData.trailer_disposal_fee} onChange={handleChange} />
                                        <span className="help-text">Miljøtillæg hvis opgaven er lille og skraldet kan være på en trailer.</span>
                                    </div>
                                    <div className="input-group">
                                        <label>Containerleje (DKK)</label>
                                        <input type="number" name="container_disposal_fee" value={settingsData.container_disposal_fee} onChange={handleChange} />
                                        <span className="help-text">Fast pris for bestilling af standard container til byggeaffald.</span>
                                    </div>
                                </div>
                                <div className="card-footer">
                                    {/* Fjernet redundant knap -- gem håndteres nu kun i bunden */}
                                </div>
                            </div>

                            <div className="settings-card">
                                <div className="card-header">
                                    <div className="icon-wrapper">
                                        <Play size={24} />
                                    </div>
                                    <h3>Test Din Beregner</h3>
                                </div>
                                <div className="card-body">
                                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                                            Har du justeret dine priser, avancer eller sat nye varer inaktive? Åbn din personlige beregner i en test-simulator og tjek, at alting regner korrekt ud. Test-beregninger gemmes ikke som opgaver i dit system.
                                        </p>
                                        <button 
                                            onClick={() => setIsTestWizardOpen(true)}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                                                padding: '12px 24px', background: '#3b82f6', color: '#fff', 
                                                borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                                                alignSelf: 'flex-start', boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                                            }}
                                        >
                                            <Play size={16} /> Åbn Simulator
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="settings-card">
                                <div className="card-header">
                                    <div className="icon-wrapper">
                                        <Users size={24} />
                                    </div>
                                    <h3>Timepris & Avance</h3>
                                </div>
                                <div className="card-body">
                                    <div className="input-group">
                                        <label>Svendens Timepris (Ekskl. moms DKK)</label>
                                        <input type="number" name="hourly_rate" value={settingsData.hourly_rate} onChange={handleChange} />
                                        <span className="help-text">Denne pris danner grundlag for alle arbejdstimer i beregneren.</span>
                                    </div>
                                    <div className="input-group">
                                        <label>Materialeavance Multiplikator (eks. 1.15 = 15%)</label>
                                        <input type="number" step="0.01" name="material_markup" value={settingsData.material_markup} onChange={handleChange} />
                                        <span className="help-text">For at dække svind, skruer/lim og fortjeneste på indkøb af råmaterialer (træ, gips m.v.).</span>
                                    </div>
                                    <div className="input-group">
                                        <label>Materiel/Maskin-avance (eks. 1.05 = 5%)</label>
                                        <input type="number" step="0.01" name="equipment_markup" value={settingsData.equipment_markup || 1.05} onChange={handleChange} />
                                        <span className="help-text">Lavere avance for leje af dyrt eksternt materiel (stillads, lift, skurvogn m.v.) for ikke at tabe tilbuddene på grund af overpris.</span>
                                    </div>
                                    <div className="input-group">
                                        <label>Risiko/Projekt-Buffer Multiplikator (eks. 1.25 = 25%)</label>
                                        <input type="number" step="0.01" name="risk_margin" value={settingsData.risk_margin} onChange={handleChange} />
                                        <span className="help-text">Ekstra tidsramme beregneren tager, hvis kunden fx ikke kender dimensioner.</span>
                                    </div>
                                </div>
                                <div className="card-footer">
                                    <button className="btn-primary" onClick={handleSave}>{isSaving ? 'Gemmer...' : 'Gem Ændringer'}</button>
                                </div>
                                <div style={{ padding: '0 24px 24px 24px' }}>
                                    <CalculatorFaqAccordion />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'materials' && (
                        <div className="materials-mobile-header glass-panel" style={{ padding: '24px', display: 'none', flexDirection: 'column', gap: '8px' }}>
                            <h2 style={{ margin: 0, color: '#1a1a1a', fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Package size={28} color="#000" />
                                Materialer
                            </h2>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
                                Standard indkøbspriser ekskl. moms, som danner grundlag for materialeberegningen.
                            </p>
                        </div>
                    )}

                    {activeTab === 'materials' && isMaterialsLoading && (
                        <div className="placeholder-state">
                            <h3>Henter materialedata fra server...</h3>
                        </div>
                    )}
                    {/* Fejlhåndtering: Hvis det er hvidt skærm, vis hvorfor her! */}
                    {activeTab === 'materials' && !isMaterialsLoading && materialsData.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', background: '#fee2e2', borderRadius: '14px', color: '#b91c1c', border: '1px solid #f87171', margin: '20px' }}>
                           <h3>Hov! Kunne ikke oprette dine 40 standard-materialer.</h3>
                           <p>Der er et rettighedsproblem i din database der forhindrer systemet i at skubbe prislisten ind.</p>
                           <pre style={{textAlign: 'left', background: '#1e293b', color: '#10b981', padding: '15px', borderRadius: '8px', overflowX: 'auto', marginTop: '20px'}}>
                               {dbDebugLog}
                           </pre>
                        </div>
                    )}
                    {activeTab === 'materials' && !isMaterialsLoading && materialsData.length > 0 && (
                        <div className="dashboard-workspace materials-overview space-y-8 " style={{ maxWidth: '1200px', margin: '0 auto' }}>
                            <div className="settings-card">
                                
                                <div className="card-body">
                            <div className="settings-grid" style={{ alignItems: 'flex-start' }}>
                                {Object.keys(groupedMaterials).filter(k => k !== 'SYSTEM').map(catKey => (
                                    <div className="glass-panel" key={catKey} style={{ alignSelf: 'flex-start' }}>
                                        <div 
                                            className="card-header" 
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            onClick={() => toggleMaterialCategory(catKey)}
                                        >
                                            <div className="icon-wrapper">
                                                {getCategoryIcon(catKey, 20)}
                                            </div>
                                            <div className="card-title-group" style={{ flex: 1 }}>
                                                <h3 style={{ margin: 0 }}>{categoryNames[catKey] || catKey}</h3>
                                            </div>
                                            <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                {expandedMaterialCategories[catKey] ? '▲ Fold ind' : '▼ Fold ud'}
                                            </div>
                                        </div>
                                        {expandedMaterialCategories[catKey] && (
                                            <div className="card-body" style={{ borderTop: '1px solid #e8e6e1', paddingTop: '16px' }}>
                                                <p className="category-description text-muted" style={{ margin: '0 0 12px 0', fontSize: '0.85rem' }}>
                                                    {getTooltipText(catKey)}
                                                </p>
                                                
                                                <div style={{display: 'flex', alignItems: 'center', padding: '0 0 8px 0', borderBottom: '1px solid #e8e6e1', marginBottom: '12px', fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold'}}>
                                                    <span style={{ flex: '1' }}>Materiale</span>
                                                    <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '195px' }}>
                                                        <span style={{ width: '120px' }}>Indkøbspris</span>
                                                        <span>Aktiv</span>
                                                    </div>
                                                </div>
                                                
                                                {groupedMaterials[catKey].map(mat => {
                                                    const matName = mat.name || '';
                                                    const isItemActive = !matName.startsWith('INACTIVE||');
                                                    const cleanName = isItemActive ? matName : matName.replace('INACTIVE||', '');
                                                    return (
                                                        <div className="material-input-row" key={mat.id} style={{ opacity: isItemActive ? 1 : 0.6, background: isItemActive ? 'transparent' : '#f8fafc' }}>
                                                            <div style={{ flex: '1', minWidth: 0, paddingRight: '16px' }}>
                                                                {cleanName.includes('Sikkerhed') ? (
                                                                    <div className="tooltip-wrapper" style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '6px', flexWrap: 'wrap' }}>
                                                                        <label className="is-security" style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '6px', lineHeight: '1.4' }}>
                                                                            <Shield size={14} className="shield-icon" style={{ flexShrink: 0, marginTop: '3px' }} />
                                                                            <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{cleanName}</span>
                                                                        </label>
                                                                        <Info size={14} className="info-icon" style={{ flexShrink: 0 }} />
                                                                        <div className="tooltip-content">
                                                                            Beregneren bruger denne pris som en redningskrans...
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: '1.4' }}>
                                                                        {!isItemActive && <span style={{ flexShrink: 0, color: '#ef4444', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', border: '1px solid currentColor', borderRadius: '4px', padding: '2px 4px', marginTop: '2px' }}>Skjult</span>}
                                                                        <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{cleanName}</span>
                                                                    </label>
                                                                )}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '195px', flexShrink: 0 }}>
                                                                <div className="price-input-wrapper">
                                                                    <input 
                                                                        type="number" 
                                                                        value={mat.price} 
                                                                        onChange={(e) => handleMaterialChange(mat.id, e.target.value)}
                                                                    />
                                                                    <span>kr.</span>
                                                                </div>
                                                                <button 
                                                                    onClick={() => toggleMaterialActive(mat.id, mat.name)}
                                                                    disabled={isSaving}
                                                                    style={{
                                                                        background: isItemActive ? '#10b981' : '#e2e8f0',
                                                                        color: isItemActive ? 'white' : '#64748b',
                                                                        border: 'none',
                                                                        borderRadius: '20px',
                                                                        padding: '6px 12px',
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: 'bold',
                                                                        cursor: 'pointer',
                                                                        width: '80px'
                                                                    }}
                                                                >
                                                                    {isItemActive ? 'TÆNDT' : 'SLUKKET'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                </div> 
                                </div>
                                <div className="card-footer" style={{ display: 'flex', justifyContent: 'center', padding: '24px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 16px 16px', position: 'sticky', bottom: '-1px', zIndex: 10 }}>
                                    <button className="btn-primary" onClick={handleSaveMaterials} disabled={isSaving} style={{ padding: '12px 40px', fontSize: '1.1rem', borderRadius: '30px', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)', fontWeight: 'bold' }}>
                                        {isSaving ? 'Gemmer...' : 'Gem Alle Materialer'}
                                    </button>
                                </div>
                            </div> 
                        </div> 
                    )}

                    
                    {/* AI TRÆNING */}
                    {activeTab === 'ai-training' && (
                        <div className="tab-content fade-in">
                            <AiTrainingView carpenterId={carpenterProfile?.id} />
                        </div>
                    )}
                    
                    {/* INTEGRATIONER */}
                    {activeTab === 'integrations' && (
                        <div className="dashboard-workspace integrations-overview space-y-8 " style={{ maxWidth: '1200px', margin: '0 auto' }}>
                            <div className="settings-card">
                                
                                <div className="card-body">
                                    <div className="settings-grid">
                                <div className="glass-panel">
                                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => setExpandedIntegration(prev => prev === 'dinero' ? null : 'dinero')}>
                                        <div style={{ width: '40px', height: '40px', background: '#e0f2fe', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#0ea5e9' }}>
                                            <Link size={24} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '18px' }}>Dinero Regnskab</h3>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Overfør tilbud som fakturakladder</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {carpenterProfile?.dinero_api_key && carpenterProfile?.dinero_api_key !== 'pending_authorization' && (
                                                <span style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '14px', fontWeight: 'bold' }}>Forbundet</span>
                                            )}
                                            <svg style={{ transform: expandedIntegration === 'dinero' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </div>
                                    </div>
                                    {expandedIntegration === 'dinero' && (
                                        <div className="card-body" style={{ borderTop: '1px solid #f1f5f9', marginTop: '10px', paddingTop: '20px' }}>
                                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                                            Når du har bekræftet en opgave, kan du med ét klik overføre kunden og opgaven til dit Dinero regnskab som en fakturakladde. Tryk på knappen for at godkende adgangen.
                                        </p>
                                        
                                        {carpenterProfile?.dinero_api_key === 'pending_authorization' ? (
                                            <div style={{ padding: '16px', background: '#fef08a', color: '#854d0e', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <div className="spinner" style={{width: '20px', height: '20px', border: '2px solid #854d0e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div> Godkender hos Dinero...
                                            </div>
                                        ) : carpenterProfile?.dinero_api_key ? (
                                            <div style={{ padding: '16px', background: '#dcfce7', color: '#166534', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <CheckCircle size={20} /> Dinero er forbundet!
                                            </div>
                                        ) : (
                                            <button 
                                                className="primary-btn" 
                                                style={{ width: '100%', background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                                                onClick={() => {
                                                    const redirectUri = window.location.origin.includes('localhost') 
                                                        ? 'http://localhost:5173/dashboard?tab=integrations' 
                                                        : 'https://app.bisonframe.dk/dashboard?tab=integrations';
                                                    window.location.href = `https://connect.visma.com/connect/authorize?client_id=isv_bisonframe&response_type=code&scope=dineropublicapi:read%20dineropublicapi:write%20offline_access&redirect_uri=${encodeURIComponent(redirectUri)}&state=dinero`;
                                                }}
                                            >
                                                Log ind med Dinero
                                            </button>
                                        )}
                                        
                                        {carpenterProfile?.dinero_api_key && carpenterProfile.dinero_api_key !== 'pending_authorization' && (
                                            <VoucherAccountConfig system="dinero" carpenterProfile={carpenterProfile} setCarpenterProfile={setCarpenterProfile} />
                                        )}

                                        {carpenterProfile?.dinero_api_key && carpenterProfile.dinero_api_key !== 'pending_authorization' && (
                                            <button
                                                style={{ width: '100%', marginTop: '16px', padding: '10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer' }}
                                                onClick={async () => {
                                                    const { error } = await supabase.from('carpenter_secrets').upsert({ carpenter_id: carpenterProfile.id, dinero_api_key: null });
                                                    if (!error) setCarpenterProfile(prev => ({...prev, dinero_api_key: null}));
                                                }}
                                            >
                                                Afbryd forbindelse
                                            </button>
                                        )}
                                    </div>
                                    )}
                                </div>

                                <div className="glass-panel">
                                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => setExpandedIntegration(prev => prev === 'economic' ? null : 'economic')}>
                                        <div style={{ width: '40px', height: '40px', background: '#dcfce7', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#22c55e' }}>
                                            <Link size={24} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '18px' }}>e-conomic</h3>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Danmarks mest brugte regnskabsprogram</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {carpenterProfile?.economic_api_key && carpenterProfile?.economic_api_key !== 'pending_authorization' && (
                                                <span style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '14px', fontWeight: 'bold' }}>Forbundet</span>
                                            )}
                                            <svg style={{ transform: expandedIntegration === 'economic' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </div>
                                    </div>
                                    {expandedIntegration === 'economic' && (
                                        <div className="card-body" style={{ borderTop: '1px solid #f1f5f9', marginTop: '10px', paddingTop: '20px' }}>
                                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                                            Når du har bekræftet en opgave, kan du med ét klik overføre kunden og opgaven til dit e-conomic regnskab som en fakturakladde. Tryk på knappen for at godkende adgangen.
                                        </p>
                                        
                                        {carpenterProfile?.economic_api_key === 'pending_authorization' ? (
                                            <div style={{ padding: '16px', background: '#fef08a', color: '#854d0e', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <div className="spinner" style={{width: '20px', height: '20px', border: '2px solid #854d0e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div> Godkender hos e-conomic...
                                            </div>
                                        ) : carpenterProfile?.economic_api_key ? (
                                            <div style={{ padding: '16px', background: '#dcfce7', color: '#166534', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <CheckCircle size={20} /> e-conomic er forbundet!
                                            </div>
                                        ) : (
                                            <button 
                                                className="primary-btn" 
                                                style={{ width: '100%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                                                onClick={() => {
                                                    const redirectUri = 'https://app.bisonframe.dk/dashboard';
                                                    window.location.href = `https://secure.e-conomic.com/secure/api1/requestaccess.aspx?appPublicToken=RbZIC8LvlxRuRpCroMvVGpfBx93tNOHVCAV6YgXkuIY&redirectUrl=${encodeURIComponent(redirectUri)}`;
                                                }}
                                            >
                                                Log ind med e-conomic
                                            </button>
                                        )}
                                        
                                        {carpenterProfile?.economic_api_key && carpenterProfile.economic_api_key !== 'pending_authorization' && (
                                            <VoucherAccountConfig system="economic" carpenterProfile={carpenterProfile} setCarpenterProfile={setCarpenterProfile} />
                                        )}

                                        {carpenterProfile?.economic_api_key && carpenterProfile.economic_api_key !== 'pending_authorization' && (
                                            <button
                                                style={{ width: '100%', marginTop: '16px', padding: '10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer' }}
                                                onClick={async () => {
                                                    const { error } = await supabase.from('carpenter_secrets').upsert({ carpenter_id: carpenterProfile.id, economic_api_key: null });
                                                    if (!error) setCarpenterProfile(prev => ({...prev, economic_api_key: null}));
                                                }}
                                            >
                                                Afbryd forbindelse
                                            </button>
                                        )}
                                    </div>
                                    )}
                                </div>

                                <div className="glass-panel">
                                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => setExpandedIntegration(prev => prev === 'ordrestyring' ? null : 'ordrestyring')}>
                                        <div style={{ width: '40px', height: '40px', background: '#fce7f3', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#db2777' }}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '18px' }}>Ordrestyring</h3>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Sagsstyring og tidsregistrering</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {carpenterProfile?.ordrestyring_api_key && (
                                                <span style={{ fontSize: '12px', background: '#fce7f3', color: '#be185d', padding: '4px 10px', borderRadius: '14px', fontWeight: 'bold' }}>Forbundet</span>
                                            )}
                                            <svg style={{ transform: expandedIntegration === 'ordrestyring' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </div>
                                    </div>
                                    {expandedIntegration === 'ordrestyring' && (
                                        <div className="card-body" style={{ borderTop: '1px solid #f1f5f9', marginTop: '10px', paddingTop: '20px' }}>
                                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                                            Forbind Ordrestyring for automatisk at oprette kunder og sager, når et tilbud bekræftes. Du finder din API-nøgle inde i Ordrestyring under Indstillinger.
                                        </p>
                                        
                                        <div className="input-group" style={{ marginBottom: '16px' }}>
                                            <input 
                                                type="password" 
                                                value={carpenterProfile?.ordrestyring_api_key || ''} 
                                                onChange={(e) => setCarpenterProfile(prev => ({ ...prev, ordrestyring_api_key: e.target.value }))} 
                                                placeholder="Indsæt API-nøgle fra Ordrestyring" 
                                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e8e6e1' }}
                                            />
                                        </div>
                                        
                                        <button 
                                            className="primary-btn" 
                                            style={{ width: '100%', background: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                                            onClick={async () => {
                                                if (!carpenterProfile?.ordrestyring_api_key) return;
                                                const { error } = await supabase.from('carpenter_secrets').upsert({ carpenter_id: carpenterProfile.id, ordrestyring_api_key: carpenterProfile.ordrestyring_api_key });
                                                if (!error) {
                                                    alert("Ordrestyring API-nøgle gemt!");
                                                } else {
                                                    alert("Fejl ved gemning (Har du kørt SQL-scriptet?): " + error.message);
                                                }
                                            }}
                                        >
                                            Gem API-nøgle
                                        </button>
                                        
                                        {carpenterProfile?.ordrestyring_api_key && (
                                            <>
                                                <div style={{ marginTop: '16px', padding: '12px', background: '#fdf2f8', color: '#be185d', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '16px' }}>
                                                    Nøgle er gemt! ✅
                                                </div>
                                                <button 
                                                    style={{ width: '100%', padding: '10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer' }}
                                                    onClick={async () => {
                                                        const { error } = await supabase.from('carpenter_secrets').upsert({ carpenter_id: carpenterProfile.id, ordrestyring_api_key: null });
                                                        if (!error) setCarpenterProfile(prev => ({...prev, ordrestyring_api_key: null}));
                                                    }}
                                                >
                                                    Afbryd forbindelse
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    )}
                                </div>

                                <div className="glass-panel">
                                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => setExpandedIntegration(prev => prev === 'apacta' ? null : 'apacta')}>
                                        <div style={{ width: '40px', height: '40px', background: '#e0e7ff', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#4f46e5' }}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '18px' }}>Apacta</h3>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Sagsstyring og tidsregistrering</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {carpenterProfile?.apacta_api_key && (
                                                <span style={{ fontSize: '12px', background: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: '14px', fontWeight: 'bold' }}>Forbundet</span>
                                            )}
                                            <svg style={{ transform: expandedIntegration === 'apacta' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </div>
                                    </div>
                                    {expandedIntegration === 'apacta' && (
                                        <div className="card-body" style={{ borderTop: '1px solid #f1f5f9', marginTop: '10px', paddingTop: '20px' }}>
                                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                                            Forbind Apacta for automatisk at oprette kunder og projekter, når et tilbud bekræftes. Du finder din API-nøgle inde i Apacta under Indstillinger.
                                        </p>
                                        
                                        <div className="input-group" style={{ marginBottom: '16px' }}>
                                            <input 
                                                type="password" 
                                                value={carpenterProfile?.apacta_api_key || ''} 
                                                onChange={(e) => setCarpenterProfile(prev => ({ ...prev, apacta_api_key: e.target.value }))} 
                                                placeholder="Indsæt API-nøgle fra Apacta" 
                                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e8e6e1' }}
                                            />
                                        </div>
                                        
                                        <button 
                                            className="primary-btn" 
                                            style={{ width: '100%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                                            onClick={async () => {
                                                if (!carpenterProfile?.apacta_api_key) return;
                                                const { error } = await supabase.from('carpenter_secrets').upsert({ carpenter_id: carpenterProfile.company_id || carpenterProfile.id, apacta_api_key: carpenterProfile.apacta_api_key });
                                                if (!error) {
                                                    alert("Apacta API-nøgle gemt!");
                                                } else {
                                                    alert("Fejl ved gemning (Har du kørt SQL-scriptet?): " + error.message);
                                                }
                                            }}
                                        >
                                            Gem API-nøgle
                                        </button>
                                        
                                        {carpenterProfile?.apacta_api_key && (
                                            <>
                                                <div style={{ marginTop: '16px', padding: '12px', background: '#e0e7ff', color: '#3730a3', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '16px' }}>
                                                    Nøgle er gemt! ✅
                                                </div>
                                                <button 
                                                    style={{ width: '100%', padding: '10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer' }}
                                                    onClick={async () => {
                                                        const { error } = await supabase.from('carpenter_secrets').upsert({ carpenter_id: carpenterProfile.company_id || carpenterProfile.id, apacta_api_key: null });
                                                        if (!error) setCarpenterProfile(prev => ({...prev, apacta_api_key: null}));
                                                    }}
                                                >
                                                    Afbryd forbindelse
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    )}
                                </div>

                                <div className="glass-panel">
                                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => setExpandedIntegration(prev => prev === 'minuba' ? null : 'minuba')}>
                                        <div style={{ width: '40px', height: '40px', background: '#ecfdf5', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#10b981' }}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '18px' }}>Minuba</h3>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Ordrer, planlægning og sagsstyring</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {carpenterProfile?.minuba_api_key && (
                                                <span style={{ fontSize: '12px', background: '#ecfdf5', color: '#047857', padding: '4px 10px', borderRadius: '14px', fontWeight: 'bold' }}>Forbundet</span>
                                            )}
                                            <svg style={{ transform: expandedIntegration === 'minuba' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </div>
                                    </div>
                                    {expandedIntegration === 'minuba' && (
                                        <div className="card-body" style={{ borderTop: '1px solid #f1f5f9', marginTop: '10px', paddingTop: '20px' }}>
                                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                                            Forbind Minuba for automatisk at oprette kunder og opgaver (sager), når et tilbud bekræftes. Tryk på knappen for at godkende adgangen.
                                        </p>
                                        
                                        {carpenterProfile?.minuba_api_key === 'pending_authorization' ? (
                                            <div style={{ padding: '16px', background: '#ecfdf5', color: '#047857', borderRadius: '8px', textAlign: 'center', marginBottom: '16px' }}>
                                                Venter på godkendelse fra Minuba...
                                            </div>
                                        ) : !carpenterProfile?.minuba_api_key ? (
                                            <button 
                                                className="primary-btn" 
                                                style={{ width: '100%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                                                onClick={() => {
                                                    const clientId = 'clientId_N1xLuFzSOtsKKEsnOuvV4dweJQ8s2p1v';
                                                    const redirectUri = encodeURIComponent('https://bisonframe.dk/dashboard?integration=minuba');
                                                    window.location.href = `https://app.minuba.dk/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
                                                }}
                                            >
                                                Forbind til Minuba
                                            </button>
                                        ) : null}
                                        
                                        {carpenterProfile?.minuba_api_key && carpenterProfile.minuba_api_key !== 'pending_authorization' && (
                                            <>
                                                <button 
                                                    style={{ width: '100%', padding: '10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', marginTop: '16px' }}
                                                    onClick={async () => {
                                                        const { error } = await supabase.from('carpenter_secrets').upsert({ carpenter_id: carpenterProfile.company_id || carpenterProfile.id, minuba_api_key: null });
                                                        if (!error) setCarpenterProfile(prev => ({...prev, minuba_api_key: null}));
                                                    }}
                                                >
                                                    Slet nøgle / Afbryd forbindelse
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    )}
                                </div>
                                    </div>
                                </div> {/* Close card-body */}
                            </div> {/* Close settings-card */}
                        </div>
                    )}
                        </div>
                    )}
                </div>
            </main>

            {/* Feedback Modal Portal */}
            {isFeedbackModalOpen && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px' }} onClick={() => setIsFeedbackModalOpen(false)}>
                    <div style={{ backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(24px)', borderRadius: '20px', width: '100%', maxWidth: '500px', padding: '24px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setIsFeedbackModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
                        
                        <h2 style={{ margin: '0 0 16px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Hjælp os med at forbedre
                        </h2>
                        
                        <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            Sidder du med en tanke om, hvordan Bison Frame kan blive endnu bedre? Mangler der et materiale, eller er priserne skæve i dit lokalområde? Skriv det til os her!
                        </p>
                        
                        <textarea 
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="F.eks. 'Træpriserne for taghældninger er sat ca. 10% for lavt i Jylland...'"
                            style={{ width: '100%', height: '150px', padding: '16px', borderRadius: '14px', border: '1px solid #e8e6e1', resize: 'none', marginBottom: '24px', fontSize: '1rem', outline: 'none' }}
                        />
                        
                        <div style={{ background: '#f3f1ed', border: '1px dashed #cbd5e1', padding: '16px', borderRadius: '14px', marginBottom: '24px', fontSize: '0.9rem', color: '#6b7280' }}>
                            <strong style={{ color: '#1a1a1a' }}>Har du akut brug for hjælp?</strong><br />
                            Ring direkte til os på: <strong style={{ color: '#10b981' }}>40 26 50 02</strong>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsFeedbackModalOpen(false)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#6b7280', fontWeight: 'bold', cursor: 'pointer' }}>
                                Fortryd
                            </button>
                            <button 
                                onClick={handleSendFeedback} 
                                disabled={isSendingFeedback || !feedbackText.trim()}
                                style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 'bold', cursor: (!feedbackText.trim() || isSendingFeedback) ? 'not-allowed' : 'pointer', opacity: (!feedbackText.trim() || isSendingFeedback) ? 0.5 : 1 }}
                            >
                                {isSendingFeedback ? 'Sender...' : 'Send Feedback'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            
            {/* Create Lead Cancel Confirm Modal */}
            {showCreateLeadCancelConfirm && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100001, padding: '20px', animation: 'fadeIn 0.2s ease-out' }} onClick={() => setShowCreateLeadCancelConfirm(false)}>
                    <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center', transform: 'scale(1)', animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ width: '72px', height: '72px', backgroundColor: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '8px solid #fff', boxShadow: '0 0 0 1px #fee2e2' }}>
                            <span style={{ fontSize: '32px', lineHeight: 1 }}>⚠️</span>
                        </div>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.5rem', color: '#0f172a', fontWeight: 'bold' }}>Er du helt sikker?</h3>
                        <p style={{ margin: '0 0 32px 0', color: '#64748b', lineHeight: '1.6', fontSize: '1.05rem' }}>Hvis du lukker nu, mister du alt det arbejde, du lige har lavet i opgaven.</p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowCreateLeadCancelConfirm(false)} style={{ flex: 1, padding: '14px', background: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#475569', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}>Vent, bliv her</button>
                            <button onClick={() => { setShowCreateLeadCancelConfirm(false); setIsCreateLeadModalOpen(false); setCreateLeadMode(null); }} style={{ flex: 1, padding: '14px', background: '#ef4444', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(239,68,68,0.25)' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dc2626'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.transform = 'translateY(0)'; }}>Ja, slet det</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Create Lead Modal */}
            {isCreateLeadModalOpen && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: isMobile ? 'stretch' : 'center', zIndex: 100000, padding: isMobile ? '0' : '20px' }} onClick={() => {
                    if (createLeadMode === 'classic') {
                        setShowCreateLeadCancelConfirm(true);
                        return;
                    }
                    setIsCreateLeadModalOpen(false);
                    setCreateLeadMode(null);
                    if (createLeadMode === 'custom') {
                        toast.success('Din kladde er gemt sikkert.');
                    }
                }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(24px)', borderRadius: isMobile ? '0' : '20px', width: '100%', maxWidth: isMobile ? '100%' : '1000px', height: isMobile ? '100dvh' : 'auto', maxHeight: isMobile ? '100dvh' : '90vh', overflowY: 'auto', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => {
                    if (createLeadMode === 'custom' || createLeadMode === 'classic') {
                        setShowCreateLeadCancelConfirm(true);
                        return;
                    }
                    setIsCreateLeadModalOpen(false); 
                    setCreateLeadMode(null); 
                }} style={{ position: isMobile ? 'fixed' : 'absolute', top: isMobile ? 'calc(env(safe-area-inset-top) + 12px)' : '20px', right: isMobile ? '16px' : '20px', background: '#f3f1ed', border: 'none', fontSize: isMobile ? '1.4rem' : '1.2rem', width: isMobile ? '42px' : '36px', height: isMobile ? '42px' : '36px', borderRadius: '50%', cursor: 'pointer', color: '#6b7280', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100001, boxShadow: isMobile ? '0 2px 8px rgba(0,0,0,0.15)' : 'none' }}>×</button>
                        <div style={{ padding: '0' }}>
                            {createLeadMode === null && (
                                <CreateLeadSelector
                                    isMobile={isMobile}
                                    onSelectClassic={() => setCreateLeadMode('classic')}
                                    onSelectCustom={() => setCreateLeadMode('custom')}
                                />
                            )}
                            
                            {createLeadMode === 'classic' && (
                                <Wizard 
                                    carpenter={carpenterProfile} 
                                    isManualCreation={true} 
                                    onComplete={async () => {
                                        setIsCreateLeadModalOpen(false);
                                        setCreateLeadMode(null);
                                        toast.success('Ny kunde oprettet!');
                                        // Genindlæs leads
                                        const { data } = await supabase.from('leads').select('*').eq('carpenter_id', carpenterProfile.id).order('created_at', { ascending: false });
                                        if (data && data.length > 0) {
                                            setLeadsData(data.filter(l => l.status !== 'Slettet'));
                                            setActiveTab('leads');
                                            setLeadFilter('Ny forespørgsel');
                                            setSelectedLead(data[0]); // Vælg og åbn det nyeste lead automatisk!
                                        }
                                    }} 
                                />
                            )}

                            {createLeadMode === 'custom' && (
                                <CustomProjectCreator
                                    carpenter={carpenterProfile}
                                    isMobile={isMobile}
                                    onCancel={() => {
                                        setIsCreateLeadModalOpen(false);
                                        setCreateLeadMode(null);
                                        toast.success('Din kladde er gemt sikkert.');
                                    }}
                                    onComplete={async () => {
                                        setIsCreateLeadModalOpen(false);
                                        setCreateLeadMode(null);
                                        toast.success('Skræddersyet kunde oprettet!');
                                        const { data } = await supabase.from('leads').select('*').eq('carpenter_id', carpenterProfile.id).order('created_at', { ascending: false });
                                        if (data && data.length > 0) {
                                            setLeadsData(data.filter(l => l.status !== 'Slettet'));
                                            setActiveTab('leads');
                                            setLeadFilter('Ny forespørgsel');
                                            setSelectedLead(data[0]);
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Lead Confirm Modal */}
            {showDeleteConfirm && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px' }} onClick={() => setShowDeleteConfirm(false)}>
                    <div style={{ backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(24px)', borderRadius: '20px', width: '100%', maxWidth: '400px', padding: '32px', textAlign: 'center', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ width: '64px', height: '64px', backgroundColor: '#fff5f5', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 24px' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </div>
                        <h2 style={{ margin: '0 0 12px 0', color: '#1a1a1a', fontSize: '1.5rem' }}>Slet sag permanent?</h2>
                        <p style={{ color: '#6b7280', marginBottom: '32px', lineHeight: '1.5' }}>
                            Er du sikker på, at du vil slette <strong>{selectedLead?.customer_name}</strong> permanent? Dette kan ikke fortrydes.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setShowDeleteConfirm(false)}
                                style={{ flex: '1 1 140px', padding: '12px', borderRadius: '8px', border: '1px solid #e8e6e1', background: 'rgba(255, 255, 255, 0.4)', color: '#6b7280', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                Fortryd
                            </button>
                            <button 
                                onClick={async () => {
                                    const { error } = await supabase.from('leads').update({ status: 'Slettet' }).eq('id', selectedLead.id);
                                    if (error) {
                                        toast.error("Kunne ikke fjerne kunden.");
                                    } else {
                                        toast.success("Kunde fjernet permanent fra din oversigt.");
                                        setLeadsData(prev => prev.filter(l => l.id !== selectedLead.id));
                                        setShowDeleteConfirm(false);
                                        setSelectedLead(null);
                                    }
                                }}
                                style={{ flex: '1 1 140px', padding: '12px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                Ja, slet sag
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Email Preview Modal */}
            {showEmailPreview && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px' }} onClick={() => setShowEmailPreview(false)}>
                    <div style={{ backgroundColor: '#f1f5f9', borderRadius: '16px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '0', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ position: 'sticky', top: 0, background: '#ffffff', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>Forhåndsvisning af e-mail til kunden</h3>
                            <button onClick={() => setShowEmailPreview(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#64748b', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}><strong>Fra:</strong> {getCarpenterSenderName(carpenterProfile)}</div>
                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}><strong>Til:</strong> {selectedLead?.customer_email}</div>
                                <div style={{ fontSize: '13px', color: '#64748b' }}><strong>Emne:</strong> {selectedLead?.status === 'Sendt tilbud' ? `Dit opdaterede tilbud fra ${carpenterProfile?.company_name || 'Tømreren'} er klar` : `Dit tilbud fra ${carpenterProfile?.company_name || 'Tømreren'} er klar`}</div>
                            </div>
                            <div 
                                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}
                                dangerouslySetInnerHTML={{ __html: getCustomerOfferSentTemplate(selectedLead?.customer_name || 'Kunde', '#', selectedLead?.project_category || 'Opgave', carpenterProfile, '#', selectedLead?.status === 'Sendt tilbud', selectedLead?.case_number || String(selectedLead?.id).substring(0,8)) }}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Floating Trial Toast */}
            {trialDaysLeft > 0 && !isPaywallActive && effectiveRole === 'admin' && createPortal(
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`trial-toast-${activeTab}`} // Re-triggers animation on tab change
                        initial={{ opacity: 0, y: 50, x: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, x: 50, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.2 }}
                        style={{
                            position: 'fixed',
                            bottom: '32px',
                            right: '32px',
                            background: '#ffffff',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
                            zIndex: 10000,
                            width: '340px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)' }}></span>
                                <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a' }}>
                                    Gratis Prøve
                                </span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb', background: '#eff6ff', padding: '4px 10px', borderRadius: '12px' }}>
                                {trialDaysLeft} dage tilbage
                            </span>
                        </div>
                        <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
                            Du har brugt {30 - trialDaysLeft} ud af 30 dage. Tilknyt et kort i god tid for at undgå afbrydelser.
                        </p>
                        <button
                            onClick={() => setActiveTab('account_settings')}
                            style={{
                                marginTop: '4px',
                                width: '100%',
                                background: '#0f172a',
                                color: 'white',
                                border: 'none',
                                padding: '12px 16px',
                                borderRadius: '10px',
                                fontWeight: '600',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#1e293b'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#0f172a'}
                        >
                            <CreditCard size={16} />
                            Tilføj kortoplysninger
                        </button>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
            {activeTab === 'overview' && effectiveRole === 'admin' && (
                <MobileQuickShare carpenterProfile={carpenterProfile} />
            )}

            {/* DAGENS BESKED POP-UP */}
            {showDailyMessagePopup && unreadDailyMessages.length > 0 && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', animation: 'slideUp 0.3s ease-out', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MessageSquare size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 'bold' }}>Godmorgen, {myProfile?.name?.split(' ')[0] || 'Hold'}!</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#64748b' }}>Her er dine vigtige beskeder for i dag.</p>
                            </div>
                        </div>
                        
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
                            {unreadDailyMessages.map((msg, idx) => (
                                <div key={idx} style={{ padding: '16px', borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#3b82f6' }}>Sag {msg.caseNumber} - {msg.title}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Fra: {msg.author}</div>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '1rem', color: '#334155', lineHeight: '1.6' }}>"{msg.text}"</p>
                                </div>
                            ))}
                        </div>
                        
                        <div style={{ padding: '24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                            <button 
                                onClick={handleAcknowledgeDailyMessages}
                                style={{ width: '100%', padding: '16px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.transform = 'none'; }}
                            >
                                <CheckCircle size={20} /> OK, JEG HAR FORSTÅET
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            

            {isTestWizardOpen && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f8fafc', zIndex: 100000, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: 'calc(max(env(safe-area-inset-top), 16px)) 16px 12px 16px', display: 'flex', justifyContent: 'flex-end', position: 'sticky', top: 0, zIndex: 100001, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <button 
                            onClick={() => setIsTestWizardOpen(false)}
                            style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                        >
                            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', lineHeight: 1 }}>×</span>
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, maxWidth: '1000px', margin: '0 auto', width: '100%', backgroundColor: '#fff', display: 'flex', flexDirection: 'column' }}>
                            {/* Vi sender isTestMode med ned til Wizard */}
                            <Wizard carpenter={carpenterProfile} isTestMode={true} testSettings={settingsData} testMaterials={materialsData} onComplete={() => setIsTestWizardOpen(false)} />
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <PwaOnboarding />
        </div>
    );
};

export default Dashboard;

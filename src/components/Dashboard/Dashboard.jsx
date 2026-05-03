import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Home, Settings, Package, Users, Globe, Wrench, Menu, LogOut, User, Shield, ShieldAlert, Info, Truck, Check, CheckCircle, MapPin, Link, Bell, MessageSquare, FileText, ExternalLink, UploadCloud, Archive, Mail, Eye, Search, Sliders, CreditCard, Lock, Briefcase, Tent, LayoutGrid, AppWindow, DoorOpen, Layers, ArrowUpToLine, PanelRight, Utensils, PlusSquare, Car, AlignJustify, HardHat } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { QUESTIONS, initialCategories } from '../Wizard/questionsConfig';
import Wizard from '../Wizard/Wizard';
import { getFeedbackTemplate, getCustomerOfferSentTemplate, getCustomerRequestReceivedTemplate } from '../../utils/emailTemplates';
import AiTrainingView from './AiTrainingView';
import TeamManagement from './TeamManagement';
import OnboardingModal from './OnboardingModal';
import SetPasswordModal from './SetPasswordModal';
import SuperAdminView from './SuperAdminView';
import MyProfileView from './MyProfileView';
import SubscriptionSettings from './SubscriptionSettings';
import DashboardOverview from './DashboardOverview';

// Konfiguration til det nye Google Map
const MAP_LIBRARIES = ['places'];
const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '500px'
};
const defaultCenter = { lat: 56.2639, lng: 9.5018 }; // Midten af Danmark


const Dashboard = () => {
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

    // Håndter åbning af specifik opgave via URL fra e-mail (deep linking)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlLeadId = params.get('leadId');
        if (urlLeadId && leadsData.length > 0 && !selectedLead) {
            const leadToSelect = leadsData.find(l => String(l.id) === urlLeadId);
            if (leadToSelect) {
                setSelectedLead(leadToSelect);
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
    
    // carpenterProfile er firmaet (Mester), som dataene tilhører
    const [carpenterProfile, setCarpenterProfile] = useState(null);
    
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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [mapFilters, setMapFilters] = useState({ showNew: true, showSent: true, showConfirmed: true });
    
    const [quoteBuilder, setQuoteBuilder] = useState(null);
    const [integrationSuccessData, setIntegrationSuccessData] = useState(null);
    const invoiceRef = useRef(null);
    
    // Auth & Profile
    const [session, setSession] = useState(null);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    
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
        const tabParam = params.get('tab');
        if (tabParam === 'Bekræftet opgave') {
            setActiveTab('leads');
            setLeadFilter('Bekræftet opgave');
        } else if (tabParam === 'integrations') {
            setActiveTab('integrations');
            // Fjern parameteren så man kan skifte væk igen uden at blive låst
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // Tjek for Visma Connect / Dinero OAuth Callback
        const code = params.get('code');
        const state = params.get('state');
        if (code && state === 'dinero') {
            setActiveTab('integrations');
            // Fjern kode fra URL for renlighed, og undgå at låse fanen
            window.history.replaceState({}, document.title, window.location.pathname);
            
            console.log("Dinero auth kode modtaget, veksler til tokens...");
            
            // Giv brugeren en midlertidig indikator
            setCarpenterProfile(prev => prev ? {...prev, dinero_api_key: 'pending_authorization'} : null);
            
            // Kald Edge Function for at veksle code til access token
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session && session.user) {
                    const redirectUri = window.location.origin.includes('localhost') 
                        ? 'http://localhost:5173/dashboard?tab=integrations' 
                        : 'https://app.bisonframe.dk/dashboard?tab=integrations';
                        
                    supabase.functions.invoke('dinero-auth', {
                        body: { code: code, redirectUri: redirectUri }
                    }).then(({ data, error }) => {
                        if (error) {
                            console.error("Fejl fra dinero-auth:", error);
                            setCarpenterProfile(prev => prev ? {...prev, dinero_api_key: null} : null);
                            toast.error("Der skete en fejl under godkendelse hos Dinero. Prøv venligst igen.");
                        } else {
                            console.log("Dinero forbundet med succes!", data);
                            // Hent den friske profil fra databasen for at få den rigtige dinero_api_key ind i state
                            supabase.from('carpenters').select('*').eq('id', session.user.id).single()
                                .then(({ data: freshProfile, error: fetchError }) => {
                                    if (!fetchError && freshProfile) {
                                        setCarpenterProfile(freshProfile);
                                        // Fjern loading indikator fra URL'en
                                        window.history.replaceState({}, document.title, window.location.pathname);
                                    }
                                });
                        }
                    });
                }
            });
        }
        
        // Tjek for e-conomic Auth Callback (returnerer "token" i stedet for "code")
        const token = params.get('token');
        if (token) {
            setActiveTab('integrations');
            window.history.replaceState({}, document.title, window.location.pathname);
            
            console.log("e-conomic auth token modtaget, gemmer...");
            
            // Giv brugeren midlertidig indikator
            setCarpenterProfile(prev => prev ? {...prev, economic_api_key: 'pending_authorization'} : null);
            
            // For e-conomic er tokenet selve AgreementGrantToken, som kan gemmes direkte!
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session && session.user) {
                    supabase.from('carpenters')
                        .update({ economic_api_key: token })
                        .eq('id', session.user.id)
                        .then(({ error }) => {
                            if (!error) {
                                setCarpenterProfile(prev => prev ? {...prev, economic_api_key: token} : null);
                                console.log("e-conomic token gemt i database!");
                            } else {
                                console.error("Fejl ved gem af e-conomic token:", error);
                                setCarpenterProfile(prev => prev ? {...prev, economic_api_key: null} : null);
                            }
                        });
                }
            });
        }

        // Hent session først!
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
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
            
            for (const lead of toGeocode) {
                try {
                    // Google's geocoder
                    const response = await geocoder.geocode({ 
                        address: lead.customer_address,
                        componentRestrictions: { country: "DK" }
                    });
                    
                    if (response.results && response.results.length > 0) {
                        const location = response.results[0].geometry.location;
                        updated[lead.id] = { lat: location.lat(), lng: location.lng() }; // Google bruger {lat, lng} objekt
                    } else {
                        updated[lead.id] = null; // Markerer som null, hvis adr er fuldstændig uforståelig
                    }
                } catch (err) {
                    console.error("Google Geocoder fejl:", err);
                    updated[lead.id] = null;
                }
                // Ekstremt kort delay for maksimal kort-hastighed (vi smadrede den 300ms tjekning)
                await new Promise(r => setTimeout(r, 10));
            }
            setGeocodedLeads(prev => ({...prev, ...updated}));
        };
        performGeocoding();
    }, [leadsData, geocodedLeads, isLoaded]);

    useEffect(() => {
        if (selectedLead && selectedLead.raw_data?.calc_data) {
            setQuoteBuilder({
                laborHours: selectedLead.raw_data.calc_data.laborHours || 0,
                hourlyRate: selectedLead.raw_data.calc_data.hourlyRate || 0,
                materialCost: selectedLead.raw_data.calc_data.materialCost || 0,
                drivingCost: selectedLead.raw_data.calc_data.drivingCost || 0,
                customLines: [], 
                showPreview: false,
                isGeneratingPdf: false,
                showDetailedBreakdown: true,
                customMessage: ''
            });
        } else {
            setQuoteBuilder(null);
        }
    }, [selectedLead]);

    const initProfileAndData = async (authUser) => {
        const userId = authUser.id;
        // Tjek URL parametre for Admin-impersonation (Super-Brugere)
        const params = new URLSearchParams(window.location.search);
        const impersonateId = params.get('impersonate');
        
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
            userProfile = profile;
            setCarpenterProfile(profile);
            
            // Hvis det er en admin, hent deres medarbejdere til lead-fordeling
            if (profile.role === 'admin') {
                const { data: teamData } = await supabase.from('carpenters').select('*').eq('company_id', profile.company_id || profile.id);
                if (teamData) setTeamMembers(teamData);
            } else if (profile.role === 'accountant') {
                setLeadFilter('Bekræftet opgave');
                const { data: adminProfile } = await supabase.from('carpenters').select('economic_api_key, dinero_api_key').eq('id', profile.company_id).single();
                if (adminProfile) {
                    profile.economic_api_key = adminProfile.economic_api_key;
                    profile.dinero_api_key = adminProfile.dinero_api_key;
                    setCarpenterProfile(profile);
                }
            }

            // Tjek Onboarding (Vis kun hvis de mangler det, og det er ejeren selv)
            if (profile.has_completed_onboarding === false && !impersonateId) {
                setShowOnboarding(true);
            }
            // Tjek Password Skift (Kun for employees)
            if (profile.requires_password_change === true && !impersonateId) {
                setShowSetPassword(true);
            }

            // --- VIGTIGT: Hvis brugeren er en medarbejder, skal alle data-kald laves mod Mesterens firma-id ---
            if (profile.company_id) {
                targetId = profile.company_id;
            }

        } else {
            if (authUser?.email === 'team@bisoncompany.dk' && !impersonateId) {
                // Admin skal ikke have oprettet en tømrer-profil, men sendes til Admin panelet
                window.location.href = '/admin';
                return;
            }

            // Første gang tømreren logger ind, skabes hans hvid-mærke skab ud fra auth metadata!
            const metadata = authUser?.user_metadata || {};
            const baseSlug = metadata.company_name 
                ? metadata.company_name.toLowerCase().replace(/[^a-z0-9æøå-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') 
                : 'tomrer';
            const randomSuffix = Math.floor(Math.random() * 10000);
            
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
                has_completed_onboarding: false,
                success_message: 'Tusind tak for din henvendelse! Jeg går tilbuddet igennem hurtigst muligt.'
            };
            const { data, error } = await supabase.from('carpenters').upsert([newProfile], { onConflict: 'id' }).select().single();
            if (error) {
                 console.error("Oprettelsesfejl:", error);
                 // Ignorer fejlen visuelt hvis det bare var en overskrivning der fejlede, men prøv at hente profilen alligevel
                 if (error.code !== '23505') {
                     toast.error('Profil-Oprettelse i databasen blokeres: ' + JSON.stringify(error));
                 }
            }
            userProfile = data || newProfile;
            setCarpenterProfile(userProfile);

            if (userProfile.has_completed_onboarding === false && !impersonateId) {
                setShowOnboarding(true);
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
            setIsMaterialsLoading(true);
            const { data, error: firstSelectError } = await supabase.from('materials').select('*').eq('carpenter_id', targetId).order('category').order('id');
            
            const defaultMaterials = [
                // Tag
                { category: 'roof', name: 'Paptag', price: 450, carpenter_id: targetId },
                { category: 'roof', name: 'Tegl', price: 1100, carpenter_id: targetId },
                { category: 'roof', name: 'Stål', price: 500, carpenter_id: targetId },
                { category: 'roof', name: 'Tagplader (eternit asbest fri)', price: 450, carpenter_id: targetId },
                { category: 'roof', name: 'Decra', price: 600, carpenter_id: targetId },
                { category: 'roof', name: 'Betontagsten', price: 800, carpenter_id: targetId },
                { category: 'roof', name: 'Skiffer', price: 1200, carpenter_id: targetId },
                { category: 'roof', name: 'Sikkerhed (Buffer-pris)', price: 500, carpenter_id: targetId },

                // Vinduer
                { category: 'windows', name: 'Træ', price: 6000, carpenter_id: targetId },
                { category: 'windows', name: 'PVC / plast', price: 4500, carpenter_id: targetId },
                { category: 'windows', name: 'Aluminium', price: 8000, carpenter_id: targetId },
                { category: 'windows', name: 'Træ/alu (kombination)', price: 7500, carpenter_id: targetId },
                { category: 'windows', name: 'Stål', price: 10000, carpenter_id: targetId },
                { category: 'windows', name: 'Glas', price: 9500, carpenter_id: targetId },
                { category: 'windows', name: 'Gerigtsæt', price: 400, carpenter_id: targetId },
                { category: 'windows', name: 'Sikkerhed (Buffer-pris)', price: 6000, carpenter_id: targetId },

                // Gulve
                { category: 'floor', name: 'Træ', price: 600, carpenter_id: targetId },
                { category: 'floor', name: 'Massivt træ', price: 1200, carpenter_id: targetId },
                { category: 'floor', name: 'Parket', price: 750, carpenter_id: targetId },
                { category: 'floor', name: 'Laminat', price: 300, carpenter_id: targetId },
                { category: 'floor', name: 'Vinyl', price: 350, carpenter_id: targetId },
                { category: 'floor', name: 'Linoleum', price: 400, carpenter_id: targetId },
                { category: 'floor', name: 'Fliser (keramik/porcelæn)', price: 500, carpenter_id: targetId },
                { category: 'floor', name: 'Natursten', price: 1000, carpenter_id: targetId },
                { category: 'floor', name: 'Beton', price: 800, carpenter_id: targetId },
                { category: 'floor', name: 'Tæppe', price: 250, carpenter_id: targetId },
                { category: 'floor', name: 'Kork', price: 550, carpenter_id: targetId },
                { category: 'floor', name: 'Sikkerhed (Buffer-pris)', price: 400, carpenter_id: targetId },

                // Døre
                { category: 'doors', name: 'Træ', price: 4500, carpenter_id: targetId },
                { category: 'doors', name: 'Massivt træ', price: 7500, carpenter_id: targetId },
                { category: 'doors', name: 'Finér', price: 2500, carpenter_id: targetId },
                { category: 'doors', name: 'PVC / plast', price: 4000, carpenter_id: targetId },
                { category: 'doors', name: 'Aluminium', price: 8500, carpenter_id: targetId },
                { category: 'doors', name: 'Stål', price: 9500, carpenter_id: targetId },
                { category: 'doors', name: 'Glas', price: 9000, carpenter_id: targetId },
                { category: 'doors', name: 'Kompositmaterialer', price: 6500, carpenter_id: targetId },
                { category: 'doors', name: 'Dørgreb inkl roset', price: 350, carpenter_id: targetId },
                { category: 'doors', name: 'Sikkerhedslås (Yderdør)', price: 1200, carpenter_id: targetId },
                { category: 'doors', name: 'Dørtrin / Bundstykke', price: 250, carpenter_id: targetId },
                { category: 'doors', name: 'Gerigtsæt', price: 350, carpenter_id: targetId },
                { category: 'doors', name: 'Sikkerhed (Buffer-pris)', price: 5500, carpenter_id: targetId },

                // Terrasse
                { category: 'terrace', name: 'Trykimprægneret fyr', price: 250, carpenter_id: targetId },
                { category: 'terrace', name: 'Hardwood / Hårdttræ', price: 900, carpenter_id: targetId },
                { category: 'terrace', name: 'Komposit (vedligeholdelsesfrit biomateriale)', price: 1100, carpenter_id: targetId },
                { category: 'terrace', name: 'Tagterrasse plastfødder (pr m2 overslag)', price: 90, carpenter_id: targetId },
                { category: 'terrace', name: 'Punktfundament og støbemix (pr m2 overslag)', price: 150, carpenter_id: targetId },
                { category: 'terrace', name: 'Rækværk/Gelænder træ (pr løbende meter)', price: 400, carpenter_id: targetId },
                { category: 'terrace', name: 'Beslag til skjult montering (pr m2 overslag)', price: 120, carpenter_id: targetId },
                { category: 'terrace', name: 'Sikkerhed (Buffer-pris)', price: 400, carpenter_id: targetId },

                // Lofter
                { category: 'ceilings', name: 'Træloft (listeloft/paneler/rustikloft)', price: 300, carpenter_id: targetId },
                { category: 'ceilings', name: 'Gipsloft', price: 250, carpenter_id: targetId },
                { category: 'ceilings', name: 'Fibergipsloft (Fermacel)', price: 350, carpenter_id: targetId },
                { category: 'ceilings', name: 'Troldtekt (akustikloft)', price: 380, carpenter_id: targetId },
                { category: 'ceilings', name: 'Nedhængt loft (systemloft)', price: 450, carpenter_id: targetId },
                { category: 'ceilings', name: 'Akustikpaneler (lameller)', price: 750, carpenter_id: targetId },
                { category: 'ceilings', name: 'Sikkerhed (Buffer-pris)', price: 350, carpenter_id: targetId },

                // Facader
                { category: 'facades', name: 'Trykimprægneret', price: 300, carpenter_id: targetId },
                { category: 'facades', name: 'Superwood', price: 550, carpenter_id: targetId },
                { category: 'facades', name: 'Cedertræ / Hardwood', price: 950, carpenter_id: targetId },
                { category: 'facades', name: 'Thermowood', price: 650, carpenter_id: targetId },
                { category: 'facades', name: 'Sikkerhed (Buffer-pris)', price: 450, carpenter_id: targetId },
                
                // Køkken
                { category: 'kitchen', name: 'Køkken-element montering', price: 800, carpenter_id: targetId },
                { category: 'kitchen', name: 'Bordplade udskæring', price: 1200, carpenter_id: targetId },
                { category: 'kitchen', name: 'Sikkerhed (Buffer-pris)', price: 800, carpenter_id: targetId },

                // Tilbygning
                { category: 'extensions', name: 'Træbeklædning', price: 15000, carpenter_id: targetId },
                { category: 'extensions', name: 'Hardwood / Cedertræ', price: 18000, carpenter_id: targetId },
                { category: 'extensions', name: 'Skalmur / Mursten', price: 22000, carpenter_id: targetId },
                { category: 'extensions', name: 'Tillæg: Krybekælder (pr m2)', price: 500, carpenter_id: targetId },
                { category: 'extensions', name: 'Tillæg: Tag med hældning (pr m2)', price: 1000, carpenter_id: targetId },
                { category: 'extensions', name: 'Sikkerhed (Buffer-pris)', price: 18000, carpenter_id: targetId },

                // Anneks
                { category: 'annex', name: 'Trykimprægneret fyr', price: 3000, carpenter_id: targetId },
                { category: 'annex', name: 'Eksklusivt træ (Cedertræ/Hardwood)', price: 5500, carpenter_id: targetId },
                { category: 'annex', name: 'Vedligeholdelsesfrit (Komposit)', price: 4500, carpenter_id: targetId },
                { category: 'annex', name: 'Tillæg: Isolering/værksted (pr m2)', price: 1200, carpenter_id: targetId },
                { category: 'annex', name: 'Tillæg: Fuldt beboeligt/BR18 (pr m2)', price: 4000, carpenter_id: targetId },
                { category: 'annex', name: 'Tillæg: Sadel tag (pr m2)', price: 500, carpenter_id: targetId },
                { category: 'annex', name: 'Sikkerhed (Buffer-pris)', price: 4000, carpenter_id: targetId },

                // Carport
                { category: 'carport', name: 'Trækonstruktion', price: 20000, carpenter_id: targetId },
                { category: 'carport', name: 'Vedligeholdelsesfrit (Stål/Alu)', price: 35000, carpenter_id: targetId },
                { category: 'carport', name: 'Tillæg: Dobbelt carport (fast pris)', price: 15000, carpenter_id: targetId },
                { category: 'carport', name: 'Tillæg: Redskabsskur uisoleret (fast pris)', price: 8000, carpenter_id: targetId },
                { category: 'carport', name: 'Tillæg: Redskabsskur isoleret (fast pris)', price: 15000, carpenter_id: targetId },
                { category: 'carport', name: 'Sikkerhed (Buffer-pris)', price: 25000, carpenter_id: targetId },

                // Hegn
                { category: 'fence', name: 'Klinkehegn (Træ)', price: 600, carpenter_id: targetId },
                { category: 'fence', name: 'Lamelhegn (Træ)', price: 450, carpenter_id: targetId },
                { category: 'fence', name: 'Raftehegn', price: 800, carpenter_id: targetId },
                { category: 'fence', name: 'Komposit (Vedligeholdelsesfrit)', price: 1100, carpenter_id: targetId },
                { category: 'fence', name: 'Tillæg: Ekstra højde >1,8m (pr m)', price: 200, carpenter_id: targetId },
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
            } else if (data.length < defaultMaterials.length) {
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
            } else {
                setMaterialsData(data || []);
                const dbSysMat = (data || []).find(m => m.category === 'SYSTEM' && m.name && m.name.startsWith('DISABLED_CATEGORIES||'));
                if (dbSysMat) {
                    const str = dbSysMat.name.replace('DISABLED_CATEGORIES||', '');
                    setDisabledCategories(str ? str.split(',') : []);
                } else {
                    setDisabledCategories([]);
                }
            }
            setIsMaterialsLoading(false);
        }

        // Hent altid leads for at vise notifikations-badges i sidebar, uanset aktiv fane
        if (activeTab === 'leads') setIsLeadsLoading(true);
        const { data: leadsDataFetch } = await supabase.from('leads').select('*').eq('carpenter_id', targetId).order('created_at', { ascending: false });
        // Orphane leads fix:
        let workingLeads = leadsDataFetch || [];
        if (leadsDataFetch && leadsDataFetch.length < 2) { 
             await supabase.from('leads').update({ carpenter_id: targetId }).is('carpenter_id', null);
             const { data: nData } = await supabase.from('leads').select('*').eq('carpenter_id', targetId).order('created_at', { ascending: false });
             workingLeads = nData || [];
        }
        
        // --- Granulær Data-filtrering ---
        const userRole = profile?.role;
        const userPermissions = profile?.permissions || {};
        const isSelf = !impersonateId; // Kun filtrer hvis brugeren kigger på sit eget firmas data (ikke impersonate admin bypass hvis det findes)
        
        if (isSelf && userRole !== 'admin' && !userPermissions.view_all_leads) {
            if (userRole === 'accountant') {
                const confirmedStatuses = ['Accepteret', 'Vundet', 'Afsluttet'];
                workingLeads = workingLeads.filter(l => confirmedStatuses.includes(l.status));
            } else if (userRole === 'sales') {
                workingLeads = workingLeads.filter(l => l.assigned_to === userId);
            }
        }
        
        setLeadsData(workingLeads);
        if (activeTab === 'leads') setIsLeadsLoading(false);
    };

    const syncToAccounting = async (lead) => {
        if (!carpenterProfile) return;

        try {
            // Hvis Dinero er forbundet (og ikke 'pending_authorization')
            if (carpenterProfile.dinero_api_key && carpenterProfile.dinero_api_key !== 'pending_authorization') {
                console.log('--- DINERO BACKEND SYNC STARTER ---');
                
                // Vis loading overlay eller lign. hvis ønsket
                const { data, error } = await supabase.functions.invoke('dinero-invoice', {
                    body: { lead: lead }
                });

                if (error || (data && !data.success)) {
                    console.error("Dinero fejl:", error || data.error);
                    toast.error("Der opstod en fejl ved overførsel til Dinero: " + (error?.message || data?.error));
                } else {
                    toast.success(`Fakturakladde oprettet i Dinero! (ID: ${data.invoiceId})`);
                }

            } else if (carpenterProfile.economic_api_key && carpenterProfile.economic_api_key !== 'pending_authorization') {
                console.log('--- E-CONOMIC BACKEND SYNC STARTER ---');
                
                const { data, error } = await supabase.functions.invoke('economic-invoice', {
                    body: { lead: lead }
                });

                if (error || (data && !data.success)) {
                    console.error("e-conomic fejl:", error || data.error);
                    toast.error("Der opstod en fejl ved overførsel til e-conomic: " + (error?.message || data?.error));
                } else {
                    toast.success(`Fakturakladde oprettet i e-conomic! (ID: ${data.invoiceId})`);
                }
            } else {
                toast('Forbind dit regnskabsprogram for at overføre. Du sendes til indstillinger.', { icon: 'ℹ️' });
                setSelectedLead(null);
                setActiveTab('integrations');
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
                toast.success(`Sag oprettet i Ordrestyring! (Sagsnr: ${data.caseId})`, { id: "ordrestyring" });
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
                toast.success(`Projekt oprettet i Apacta! (Sagsnr: ${data.caseId})`, { id: "apacta" });
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
                toast.success(`Sag oprettet i Minuba! (Sagsnr: ${data.caseId})`, { id: "minuba" });
                
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
            const isFirstResponse = (leadToUpdate?.status || 'Ny forespørgsel') === 'Ny forespørgsel' && newStatus !== 'Ny forespørgsel';
            const updates = { status: newStatus };
            if (isFirstResponse && !leadToUpdate?.first_responded_at) {
                updates.first_responded_at = new Date().toISOString();
            }

            const { error } = await supabase.from('leads').update(updates).eq('id', leadId);
            if (error) throw error;
            
            setLeadsData(prev => prev.map(lead => {
                if (lead.id === leadId) {
                    const updatedLead = { ...lead, ...updates };
                    // Kør regnskabsintegrationen, hvis ordren er Vundet
                    if (newStatus === 'Vundet') {
                        syncToAccounting(updatedLead);
                    }
                    return updatedLead;
                }
                return lead;
            }));
        } catch(err) {
            toast.error('Fejl ved opdatering af kundestatus: ' + err.message);
        }
    };

    const handleUploadAndSendQuote = async (leadId, carpenterSlug, providedFile = null, finalPrice = null) => {
        const fileToUpload = providedFile || selectedPdfFile;
        if (!fileToUpload) {
            toast.error('Du skal vedhæfte en PDF, før du kan udsende tilbuddet!');
            return;
        }

        setIsUploadingPdf(true);
        try {
            const fileExt = fileToUpload.name.split('.').pop() || 'pdf';
            const fileName = `quote_${leadId}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(fileName, fileToUpload);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(fileName);

            const targetLead = leadsData.find(l => l.id === leadId);
            const currentRawData = targetLead.raw_data || {};
            const newRawData = { ...currentRawData, quote_pdf_url: publicUrl };
            if (finalPrice !== null) {
                newRawData.actual_quote_price = finalPrice;
            }

            const { error: updateError } = await supabase
                .from('leads')
                .update({ status: 'Sendt tilbud', raw_data: newRawData })
                .eq('id', leadId);

            if (updateError) throw updateError;

            // Udsend mail til kunden
            if (targetLead.customer_email && targetLead.customer_email !== 'Ukendt') {
                import('../../utils/sendEmail').then(({ sendEmail }) => {
                    const carpenterName = carpenterProfile?.company_name || carpenterProfile?.owner_name || 'Din Tømrer';
                    // Brug produktions URL hvis online, ellers window.location.origin (localhost)
                    const quoteUrl = `${window.location.origin}/${carpenterSlug}/tilbud/${targetLead.quote_token || leadId}`;
                    sendEmail({
                        to: targetLead.customer_email,
                        subject: `Dit tilbud fra ${carpenterName} er klar`,
                        html: getCustomerOfferSentTemplate(targetLead.customer_name, quoteUrl, targetLead.project_category, carpenterProfile),
                        fromName: carpenterName,
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
            address: carpenterProfile.address,
            dinero_api_key: carpenterProfile.dinero_api_key,
            economic_api_key: carpenterProfile.economic_api_key,
            ordrestyring_api_key: carpenterProfile.ordrestyring_api_key,
            apacta_api_key: carpenterProfile.apacta_api_key
        }).eq('id', carpenterProfile.id);
        
        setIsSaving(false);
        if(!error) toast.success('Profil og URL-link opdateret succesfuldt! 🚀');
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
    
    // --- SØGEFUNKTION & FILTRERING ---
    const filteredLeads = leadsData.filter(l => {
        const matchesStatus = (l.status || 'Ny forespørgsel') === leadFilter;
        if (!searchQuery) return matchesStatus;
        
        const query = searchQuery.toLowerCase();
        const categoryName = categoryNames[l.project_category] || l.project_category || '';
        
        const nameMatch = l.customer_name?.toLowerCase().includes(query);
        const addressMatch = l.customer_address?.toLowerCase().includes(query);
        const phoneMatch = String(l.customer_phone || '').toLowerCase().includes(query);
        const emailMatch = l.customer_email?.toLowerCase().includes(query);
        const categoryMatch = categoryName.toLowerCase().includes(query);
        
        return matchesStatus && (nameMatch || addressMatch || phoneMatch || emailMatch || categoryMatch);
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
                        created.setDate(created.getDate() + 14);
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
                return { title: 'Bison Team', desc: 'Administrer dine medarbejdere og deres adgangsniveau.' };
            case 'superadmin':
                return { title: 'Bizon Admin', desc: 'Håndter alle systemets brugere og konfiguration.' };
            case 'profile':
                return { title: 'Min Profil', desc: 'Administrer dine personlige oplysninger og præferencer.' };
            case 'account_settings':
                return { title: 'Konto Indstillinger', desc: 'Administrer din virksomheds indstillinger.' };
            default:
                return null;
        }
    };
    const headerInfo = getTabHeaderInfo();

    return (
        <div className="dashboard-layout">
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
                <SetPasswordModal 
                    profile={carpenterProfile} 
                    onComplete={() => {
                        setShowSetPassword(false);
                        setCarpenterProfile({...carpenterProfile, requires_password_change: false});
                    }} 
                />
            )}
            
            <aside className="dashboard-sidebar">
                <div className="sidebar-header">
                    <img src="/clean-transparent.png" alt="Bison Frame" className="brand-icon" style={{ width: 'auto', height: '36px', maxHeight: '36px', objectFit: 'contain' }} />
                    <h2>Bison Frame</h2>
                </div>
                <nav className="sidebar-nav">
                    <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
                        <Home size={20} /> Oversigt
                    </button>
                    {myProfile?.email === 'team@bisoncompany.dk' && (
                        <button className={activeTab === 'superadmin' ? 'active' : ''} onClick={() => setActiveTab('superadmin')}>
                            <ShieldAlert size={20} /> Bizon Admin
                        </button>
                    )}

                    <button className={activeTab === 'leads' ? 'active' : ''} onClick={() => setActiveTab('leads')} style={{ position: 'relative' }}>
                        <Users size={20} /> Kunder & Leads
                        {(() => {
                            const unreadCount = leadsData.filter(l => l.status === 'Ny forespørgsel' && l.is_read === false).length;
                            if (unreadCount > 0) {
                                return (
                                    <span style={{
                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                        backgroundColor: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold',
                                        padding: '2px 8px', borderRadius: '14px', minWidth: '24px', textAlign: 'center'
                                    }}>
                                        {unreadCount}
                                    </span>
                                );
                            }
                            return null;
                        })()}
                    </button>
                    {(carpenterProfile?.role !== 'accountant' || carpenterProfile?.permissions?.view_materials) && (
                        <>
                            <button className={activeTab === 'map' ? 'active' : ''} onClick={() => setActiveTab('map')}>
                                <MapPin size={20} /> Kortvisning
                            </button>
                            <button className={activeTab === 'materials' ? 'active' : ''} onClick={() => setActiveTab('materials')}>
                                <Package size={20} /> Materialer
                            </button>
                        </>
                    )}
                    {(carpenterProfile?.role === 'admin' || carpenterProfile?.permissions?.view_pricing) && (
                        <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
                            <Sliders size={20} /> Prisberegning
                        </button>
                    )}
                    {(carpenterProfile?.role !== 'sales' || carpenterProfile?.permissions?.view_integrations) && (
                        <button className={activeTab === 'integrations' ? 'active' : ''} onClick={() => setActiveTab('integrations')}>
                            <Link size={20} /> Integrationer
                        </button>
                    )}
                    {carpenterProfile?.role === 'admin' && (
                        <button className={activeTab === 'team' ? 'active' : ''} onClick={() => setActiveTab('team')}>
                            <HardHat size={20} /> Team & Medarbejdere
                        </button>
                    )}
                    
                    <div style={{ marginTop: 'auto' }}></div>
                </nav>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-topbar">
                    <div className="mobile-menu">
                        <Menu />
                    </div>

                    {headerInfo && activeTab !== 'overview' && (
                        <div className="page-title-section" style={{ flex: 1, paddingLeft: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h2 style={{ margin: '0 0 6px', fontSize: '1.75rem', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.5px' }}>{headerInfo.title}</h2>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{headerInfo.desc}</p>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {activeTab === 'leads' && (
                                    <button className="btn-primary" onClick={() => setIsCreateLeadModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        Opret Ny Kunde
                                    </button>
                                )}
                                {activeTab === 'materials' && !isMaterialsLoading && materialsData.length > 0 && (
                                    <button className="btn-primary" onClick={handleSaveMaterials}>
                                        {isSaving ? 'Gemmer...' : 'Gem Materialer'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="user-profile flex items-center gap-3 relative" style={{ marginLeft: 'auto' }}>
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
                                    {myProfile?.role === 'sales' ? 'Sælger / Projektleder' : myProfile?.role === 'accountant' ? 'Bogholder' : myProfile?.role === 'admin' && myProfile?.email === 'team@bisoncompany.dk' ? 'Bizon Admin' : 'Mester'}
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
                            <>
                                <div 
                                    style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
                                    onClick={() => setIsProfileMenuOpen(false)}
                                ></div>
                                <div 
                                    className="glass-panel"
                                    style={{ 
                                        position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
                                        width: '240px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px',
                                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)'
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
                            </>
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
                                    🚀
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

                {trialDaysLeft > 0 && !isPaywallActive && activeTab === 'overview' && (
                    <div style={{ margin: '20px 40px 0 40px', padding: '16px 24px', background: '#f7f6f3', border: '1px solid #e8e6e1', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontWeight: 'bold', fontSize: '15px' }}>
                                <span style={{ background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '14px', fontSize: '12px' }}>GRATIS PRØVE</span>
                                {14 - trialDaysLeft} ud af 14 dage brugt ({trialDaysLeft} dage tilbage)
                            </div>
                            <p style={{ color: '#9ca3af', margin: '4px 0 0 0', fontSize: '14px' }}>Når prøveperioden udløber, vil du blive bedt om at tilknytte et kort for at fortsætte uden afbrydelser.</p>
                        </div>
                        <button 
                            onClick={() => setActiveTab('account_settings')}
                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', whiteSpace: 'nowrap' }}
                        >
                            Vælg Pakke
                        </button>
                    </div>
                )}
                
                <div className="dashboard-content">
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
                        <div key={activeTab} className="smooth-fade-in" style={{ height: '100%' }}>
                        {activeTab === 'superadmin' && myProfile?.email === 'team@bisoncompany.dk' && (
                        <SuperAdminView />
                    )}
                    {activeTab === 'overview' && (
                        <DashboardOverview leadsData={leadsData} carpenterProfile={carpenterProfile} />
                    )}

                    {activeTab === 'team' && carpenterProfile?.role === 'admin' && (
                        <div className="tab-pane active" style={{ height: '100%', overflowY: 'auto', paddingRight: '10px' }}>
                            {carpenterProfile?.tier === 'enterprise' ? (
                                <TeamManagement profile={carpenterProfile} leadsData={leadsData} />
                            ) : (
                                <div className="settings-card" style={{ maxWidth: '600px', margin: '60px auto' }}>
                                    <div className="card-body" style={{ padding: '40px', textAlign: 'center' }}>
                                    <div style={{ width: '64px', height: '64px', background: '#fef2f2', color: '#ef4444', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px' }}>
                                        <Lock size={32} />
                                    </div>
                                    <h2 style={{ fontSize: '24px', color: '#1a1a1a', marginBottom: '16px' }}>Låst Premium Funktion</h2>
                                    <p style={{ color: '#6b7280', fontSize: '16px', lineHeight: '1.6', marginBottom: '32px' }}>
                                        "Team & Medarbejdere" funktionen er forbeholdt vores <strong>Enterprise</strong> pakkeløsning.<br/><br/>
                                        Få fuld kontrol over dit team, tildel opgaver og styr rettigheder ned til mindste detalje.
                                    </p>
                                    <button 
                                        onClick={() => setActiveTab('account_settings')}
                                        style={{ background: '#3b82f6', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                                    >
                                        Gå til Indstillinger for at opgradere
                                    </button>
                                    </div>
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
                        <div className="space-y-8" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                            {/* Vis kun firma-indstillinger hvis brugeren er ejer af firmaet (admin) */}
                            {myProfile.role === 'admin' && carpenterProfile && (
                                <div className="admin-settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    
                                    <div className="settings-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', alignItems: 'stretch', display: 'grid', gap: '32px' }}>
                                        <div className="settings-card">
                                            <div className="card-header">
                                                <div className="icon-wrapper">
                                                    <Shield size={24} />
                                                </div>
                                                <h3>Firmaoplysninger (Internt)</h3>
                                            </div>
                                            <div className="card-body">
                                                <div className="input-group">
                                                    <label>System Login E-mail (Brugernavn)</label>
                                                    <input 
                                                        type="text" 
                                                        value={new URLSearchParams(window.location.search).get('impersonate') ? 'Skjult under Admin-adgang' : (session?.user?.email || 'Ingen session')} 
                                                        disabled 
                                                    />
                                                </div>
                                                <div className="input-group">
                                                    <label>Firmanavn</label>
                                                    <input type="text" value={carpenterProfile.company_name || ''} onChange={(e) => setCarpenterProfile(prev => ({ ...prev, company_name: e.target.value }))} placeholder="Eks. Vestkystens Tømrer A/S" />
                                                </div>
                                                <div className="input-group">
                                                    <label>Ejer / Kontaktperson</label>
                                                    <input type="text" value={carpenterProfile.owner_name || ''} onChange={(e) => setCarpenterProfile(prev => ({ ...prev, owner_name: e.target.value }))} placeholder="Jens Jensen" />
                                                </div>
                                                <div className="input-group">
                                                    <label>Firma Adresse</label>
                                                    <input type="text" value={carpenterProfile.address || ''} onChange={(e) => setCarpenterProfile(prev => ({ ...prev, address: e.target.value }))} placeholder="Skovvejen 15, 8000 Aarhus" />
                                                </div>
                                                <div className="input-group">
                                                    <label>CVR-nummer</label>
                                                    <input type="text" value={carpenterProfile.cvr || ''} onChange={(e) => setCarpenterProfile(prev => ({ ...prev, cvr: e.target.value }))} placeholder="12345678" />
                                                </div>
                                                <div className="input-group">
                                                    <label>Telefonnummer</label>
                                                    <input type="text" value={carpenterProfile.phone || ''} onChange={(e) => setCarpenterProfile(prev => ({ ...prev, phone: e.target.value }))} placeholder="+45 12 34 56 78" />
                                                </div>
                                                <div className="input-group">
                                                    <label>Fakturerings E-mail</label>
                                                    <input type="text" value={carpenterProfile.email || ''} onChange={(e) => setCarpenterProfile(prev => ({ ...prev, email: e.target.value }))} placeholder="regnskab@mit-firma.dk" />
                                                </div>
                                            </div>
                                            <div className="card-footer">
                                                <button className="btn-primary" onClick={handleProfileSave}>{isSaving ? 'Gemmer...' : 'Gem Firma-Oplysninger'}</button>
                                            </div>
                                        </div>

                                        <div className="settings-card">
                                            <div className="card-header">
                                                <div className="icon-wrapper">
                                                    <Globe size={24} />
                                                </div>
                                                <h3>Kunde-Portal (Offentlig)</h3>
                                            </div>
                                            <div className="card-body">
                                                <div className="input-group">
                                                    <label>Dit kunde-link</label>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '0 12px', flex: 1 }}>
                                                            <span style={{ color: 'var(--text-muted)', userSelect: 'none' }}>bisonframe.dk/</span>
                                                            <input type="text" value={carpenterProfile.slug || ''} onChange={(e) => setCarpenterProfile(prev => ({ ...prev, slug: e.target.value }))} style={{ border: 'none', background: 'transparent', padding: '12px 0', flex: 1, outline: 'none', fontWeight: 'bold', color: 'var(--text-primary)' }} />
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(`https://bisonframe.dk/${carpenterProfile.slug || ''}`);
                                                                toast.success('Kunde-linket er kopieret til din udklipsholder!');
                                                            }}
                                                            className="btn-primary"
                                                        >Kopiér Link</button>
                                                    </div>
                                                    <span className="help-text">Dette er linket du sender til dine kunder, når de skal ind og have udført et lynhurtigt overslag.</span>
                                                </div>
                                                <div className="input-group">
                                                    <label>Dit Firmalogo (PNG/JPG)</label>
                                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                        {carpenterProfile.logo_url && (
                                                            <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)', backgroundColor: 'var(--card-bg)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                                                <img src={carpenterProfile.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                            </div>
                                                        )}
                                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} disabled={isUploadingLogo} style={{ width: '100%', fontSize: '0.9rem' }} />
                                                            {isUploadingLogo && <span className="help-text" style={{ color: 'var(--accent-primary)' }}>Uploader logo til databasen...</span>}
                                                        </div>
                                                    </div>
                                                    <span className="help-text">Det her vises i bekræftelsesmails og inde i kundeportalen.</span>
                                                </div>
                                                <div className="input-group">
                                                    <label>Personligt Billede / Portræt</label>
                                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                        {carpenterProfile.portrait_url && (
                                                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-light)', backgroundColor: 'var(--card-bg)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                                                <img src={carpenterProfile.portrait_url} alt="Portræt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </div>
                                                        )}
                                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'portrait')} disabled={isUploadingPortrait} style={{ width: '100%', fontSize: '0.9rem' }} />
                                                            {isUploadingPortrait && <span className="help-text" style={{ color: 'var(--accent-primary)' }}>Uploader portræt til databasen...</span>}
                                                        </div>
                                                    </div>
                                                    <span className="help-text">Menneskelighed konverterer! Det her vises ved siden af prisen i portalen.</span>
                                                </div>
                                                <div className="input-group">
                                                    <label>Afslutningsbesked til kunden</label>
                                                    <textarea value={carpenterProfile.success_message || ''} onChange={(e) => setCarpenterProfile(prev => ({ ...prev, success_message: e.target.value }))} rows="3" placeholder="Tusind tak fordi du valgte os! Vi vender tilbage hurtigst muligt med næste skridt."></textarea>
                                                </div>
                                            </div>
                                            <div className="card-footer">
                                                <button className="btn-primary" onClick={handleProfileSave}>{isSaving ? 'Gemmer...' : 'Gem Kunde-Portal'}</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nyt Panel til Valg af Kategorier / Arbejdsområder */}
                                    <div className="settings-card">
                                        <div className="card-header">
                                            <div className="icon-wrapper">
                                                <Wrench size={24} />
                                            </div>
                                            <h3>Dine Arbejdsområder (Filtrering)</h3>
                                        </div>
                                        <div className="card-body">
                                            <p className="help-text" style={{ marginBottom: '24px' }}>Vælg hvilke hovedkategorier kunden må se i din prisberegner. Sluk for dem du ikke tilbyder.</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                                {initialCategories.map(cat => {
                                                    const isActive = !disabledCategories.includes(cat.id);
                                                    return (
                                                        <div 
                                                            key={cat.id} 
                                                            onClick={() => toggleCategoryActive(cat.id)}
                                                            className="category-toggle-card"
                                                            style={{
                                                                padding: '16px',
                                                                borderRadius: 'var(--radius-md)',
                                                                border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                                                                backgroundColor: isActive ? 'var(--surface-bg)' : 'rgba(0,0,0,0.2)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '12px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                opacity: isSaving ? 0.6 : 1
                                                            }}
                                                        >
                                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-light)'}`, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent', flexShrink: 0 }}>
                                                                {isActive && <Check size={14} color="var(--bg-primary)" />}
                                                            </div>
                                                            <div>
                                                                <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '1rem' }}>{cat.label}</strong>
                                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{isActive ? 'Synlig for kunden' : 'Skjult i beregneren'}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Subscription Settings Container */}
                                    <div className="subscription-wrapper">
                                        <SubscriptionSettings />
                                    </div>

                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'leads' && (
                        <div className="space-y-8 animate-fadeIn" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                            <div className="settings-card">
                                
                                
                                <div className="card-body">
                                    {/* Pipeline Menu */}
                                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
                                    {['Ny forespørgsel', 'Sendt tilbud', 'Bekræftet opgave', 'Udgået opgave', 'Historik']
                                        .filter(status => carpenterProfile?.role !== 'accountant' || status === 'Bekræftet opgave' || status === 'Historik')
                                        .map(status => (
                                        <button 
                                            key={status} 
                                            onClick={() => setLeadFilter(status)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '20px',
                                                border: '1px solid',
                                                borderColor: leadFilter === status 
                                                    ? (status === 'Ny forespørgsel' ? '#3b82f6' : status === 'Sendt tilbud' ? '#eab308' : status === 'Bekræftet opgave' ? '#10b981' : status === 'Historik' ? '#6b7280' : '#ef4444') 
                                                    : 'rgba(255,255,255,0.2)',
                                                backgroundColor: leadFilter === status 
                                                    ? (status === 'Ny forespørgsel' ? 'rgba(59, 130, 246, 0.1)' : status === 'Sendt tilbud' ? 'rgba(234, 179, 8, 0.1)' : status === 'Bekræftet opgave' ? 'rgba(16, 185, 129, 0.1)' : status === 'Historik' ? 'rgba(107, 114, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)') 
                                                    : 'rgba(255,255,255,0.05)',
                                                color: leadFilter === status 
                                                    ? (status === 'Ny forespørgsel' ? '#60a5fa' : status === 'Sendt tilbud' ? '#facc15' : status === 'Bekræftet opgave' ? '#34d399' : status === 'Historik' ? '#9ca3af' : '#f87171') 
                                                    : 'var(--text-primary)',
                                                fontWeight: leadFilter === status ? 'bold' : 'normal',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                transition: 'all 0.2s',
                                                backdropFilter: 'blur(10px)'
                                            }}
                                        >
                                            {status}
                                            <span style={{ marginLeft: '8px', background: leadFilter === status ? (status === 'Ny forespørgsel' ? '#3b82f6' : status === 'Sendt tilbud' ? '#eab308' : status === 'Bekræftet opgave' ? '#10b981' : status === 'Historik' ? '#6b7280' : '#ef4444') : 'rgba(255,255,255,0.2)', color: leadFilter === status ? '#fff' : 'var(--text-secondary)', borderRadius: '10px', padding: '2px 8px', fontSize: '0.75rem' }}>
                                                {leadsData.filter(l => (l.status || 'Ny forespørgsel') === status).length}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                
                                <div style={{ marginBottom: '20px', position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                                    <Search size={20} />
                                </div>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        placeholder={`Søg i "${leadFilter}" på kundenavn, adresse, email, telefon eller opgavetype...`}
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
                                            style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            <div style={{ flex: '1 1 250px' }}>
                                                <h3 style={{ margin: '0 0 8px', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {lead.customer_name} 
                                                    <span style={{ 
                                                        fontSize: '0.75rem', padding: '4px 8px', borderRadius: '14px', fontWeight: 'bold',
                                                        backgroundColor: (lead.status || 'Ny forespørgsel') === 'Ny forespørgsel' ? '#eff6ff' : ((lead.status || '') === 'Sendt tilbud' ? '#fefce8' : (lead.status || '') === 'Bekræftet opgave' ? '#ecfdf5' : '#fef2f2'),
                                                        color: (lead.status || 'Ny forespørgsel') === 'Ny forespørgsel' ? '#2563eb' : ((lead.status || '') === 'Sendt tilbud' ? '#ca8a04' : (lead.status || '') === 'Bekræftet opgave' ? '#059669' : '#dc2626')
                                                    }}>{lead.status || 'Ny forespørgsel'}</span>
                                                    {(lead.status || 'Ny forespørgsel') === 'Ny forespørgsel' && lead.is_read === false && (
                                                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ef4444', color: '#fff', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                                                            NY
                                                        </span>
                                                    )}
                                                    {(lead.status === 'Sendt tilbud') && (
                                                        lead.opened_at ? (
                                                            <span style={{ fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #a7f3d0' }}>
                                                                <Eye size={14} /> Åbnet af kunde
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f3f1ed', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e8e6e1' }}>
                                                                <Mail size={14} /> Afventer kunde
                                                            </span>
                                                        )
                                                    )}
                                                </h3>
                                                <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '0.9rem' }}><strong>Opgave:</strong> {categoryNames[lead.project_category] || lead.project_category}</p>
                                                <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '0.9rem' }}><strong>Estimat givet:</strong> {lead.price_estimate}</p>
                                                <p style={{ margin: '0 0 0', color: '#6b7280', fontSize: '0.85rem' }}><em>Modtaget: {new Date(lead.created_at).toLocaleDateString('da-DK')} kl. {new Date(lead.created_at).toLocaleTimeString('da-DK', {hour: '2-digit', minute:'2-digit'})}</em></p>
                                            </div>
                                            <div style={{ flex: '1 1 250px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                <h4 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Kontaktinfo</h4>
                                                <p style={{ margin: '0 0 4px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>📞 {lead.customer_phone}</p>
                                                <p style={{ margin: '0 0 4px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>📧 {lead.customer_email}</p>
                                                <p style={{ margin: '0 0 4px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>🏠 {lead.customer_address}</p>
                                                <p style={{ margin: '0', color: '#60a5fa', fontSize: '0.9rem', fontWeight: 'bold' }}>🗓️ Ring/Besøg: {lead.contact_preference}</p>
                                            </div>
                                            <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div className="input-group">
                                                    <select 
                                                        value={lead.status || 'Ny forespørgsel'}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => { e.stopPropagation(); updateLeadStatus(lead.id, e.target.value); }}
                                                    >
                                                        <option value="Ny forespørgsel">Mappe: Ny forespørgsel</option>
                                                        <option value="Sendt tilbud">Mappe: Sendt tilbud</option>
                                                        <option value="Bekræftet opgave">Mappe: Bekræftet opgave</option>
                                                        <option value="Udgået opgave">Mappe: Udgået opgave</option>
                                                        <option value="Historik">Mappe: Historik (Afsluttet)</option>
                                                    </select>
                                                </div>

                                                {carpenterProfile?.role === 'admin' && teamMembers.length > 0 && (
                                                    <div className="input-group">
                                                        <select
                                                            value={lead.assigned_to || ''}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={async (e) => { 
                                                                e.stopPropagation(); 
                                                                const empId = e.target.value;
                                                                const { error } = await supabase.from('leads').update({ assigned_to: empId || null }).eq('id', lead.id);
                                                                if (!error) {
                                                                    setLeadsData(prev => prev.map(l => l.id === lead.id ? { ...l, assigned_to: empId || null } : l));
                                                                    toast.success("Lead tildelt!");
                                                                } else {
                                                                    toast.error("Fejl ved tildeling.");
                                                                }
                                                            }}
                                                        >
                                                            <option value="">Ikke tildelt</option>
                                                            {teamMembers.map(member => (
                                                                <option key={member.id} value={member.id}>👤 {member.owner_name} ({member.role})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                <button className="btn-primary" onClick={(e) => { e.stopPropagation(); handleSelectLead(lead); }}>
                                                    Se Opgavedetaljer
                                                </button>
                                                {/* Integrationsknapper vist dynamisk hvis de er valgt i indstillinger */}
                                                {lead.status === 'Bekræftet opgave' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                                        {carpenterProfile?.economic_api_key && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); syncToAccounting(lead); }}
                                                                style={{ padding: '8px', borderRadius: '8px', border: '1px solid #10b981', backgroundColor: '#ecfdf5', color: '#059669', fontWeight: 'bold', cursor: 'pointer', outline: 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                            >
                                                                <FileText size={16} /> Regnskabsprogram
                                                            </button>
                                                        )}
                                                        {carpenterProfile?.ordrestyring_token && (
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
                                                        {carpenterProfile?.apacta_api_key && (
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
                                    ))}
                                </div>
                            )}

                            {selectedLead && createPortal(
                                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setSelectedLead(null)}>
                                    <div style={{ backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(24px)', borderRadius: '20px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => setSelectedLead(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
                                        
                                        <h2 style={{ color: '#1a1a1a', borderBottom: '2px solid #e8e6e1', paddingBottom: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', paddingRight: '40px' }}>
                                            Kunde: {selectedLead.customer_name}
                                        </h2>

                                        {/* Manuel Overslag Email Afsendelse / Vis Tilbud */}
                                        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                            {selectedLead.status !== 'Bekræftet opgave' && (
                                                <button 
                                                    onClick={() => {
                                                        import('../../utils/sendEmail').then(({ sendEmail }) => {
                                                            const customerEmail = selectedLead.customer_email || selectedLead.raw_data?.customerDetails?.email;
                                                            if (!customerEmail || customerEmail === 'Ukendt') {
                                                                toast.error("Ingen e-mail fundet på denne kunde.");
                                                                return;
                                                            }
                                                            const carpenterName = carpenterProfile?.owner_name || carpenterProfile?.company_name || 'Tømrer';
                                                            sendEmail({
                                                                to: customerEmail,
                                                                subject: `Tak for din forespørgsel - ${carpenterName}`,
                                                                html: getCustomerRequestReceivedTemplate(selectedLead.customer_name, selectedLead.project_category, carpenterProfile),
                                                                fromName: carpenterName,
                                                                replyTo: carpenterProfile?.email
                                                            });
                                                            toast.success("Overslag sendt til kunden!");
                                                        });
                                                    }}
                                                    style={{
                                                        padding: '10px 16px', 
                                                        borderRadius: '8px', 
                                                        background: '#10b981', 
                                                        color: 'white', 
                                                        border: 'none', 
                                                        fontWeight: 'bold', 
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                                    SEND OVERSLAG TIL KUNDE
                                                </button>
                                            )}

                                            {['Sendt tilbud', 'Bekræftet opgave'].includes(selectedLead.status) && (
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
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', marginBottom: '32px' }}>
                                            {selectedLead.status === 'Bekræftet opgave' && (
                                                <>
                                                    {carpenterProfile?.economic_api_key && (
                                                        <button onClick={() => syncToAccounting(selectedLead)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', outline: 'none', transition: 'all 0.2s' }}>
                                                            <FileText size={18}/> Regnskab
                                                        </button>
                                                    )}

                                                    {carpenterProfile?.ordrestyring_token && (
                                                        selectedLead.ordrestyring_case_id ? (
                                                            <a href={ (String(selectedLead.ordrestyring_case_id).length >= 4 || Number(selectedLead.ordrestyring_case_id) > 1000) ? `https://system.ordrestyring.dk/cases?id=${selectedLead.ordrestyring_case_id}` : `https://system.ordrestyring.dk/cases` } target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#fdf2f8', color: '#be185d', border: '1px solid #db2777', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
                                                                <ExternalLink size={18} /> Åbn Ordrestyring
                                                            </a>
                                                        ) : (
                                                            <button onClick={() => syncToOrdrestyring(selectedLead)} style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#fdf2f8', color: '#be185d', border: '1px solid #db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                                <UploadCloud size={18} /> Ordrestyring
                                                            </button>
                                                        )
                                                    )}

                                                    {carpenterProfile?.apacta_api_key && (
                                                        selectedLead.apacta_case_id ? (
                                                            <a href={`https://control-panel.apacta.com/projects/${selectedLead.apacta_case_id}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #4f46e5', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
                                                                <ExternalLink size={18} /> Åbn Apacta
                                                            </a>
                                                        ) : (
                                                            <button onClick={() => syncToApacta(selectedLead)} style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                                <UploadCloud size={18} /> Apacta
                                                            </button>
                                                        )
                                                    )}

                                                    {carpenterProfile?.minuba_api_key && (
                                                        selectedLead.minuba_case_id ? (
                                                            <a href={`https://app.minuba.dk/`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
                                                                <ExternalLink size={18} /> Åbn Minuba
                                                            </a>
                                                        ) : (
                                                            <button onClick={() => syncToMinuba(selectedLead)} style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                                <UploadCloud size={18} /> Minuba
                                                            </button>
                                                        )
                                                    )}
                                                </>
                                            )}
                                            
                                            {selectedLead.raw_data?.quote_pdf_url && (
                                                <a href={selectedLead.raw_data.quote_pdf_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#f3f1ed', border: '1px solid #e8e6e1', color: '#374151', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
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
                                                    style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #e8e6e1', color: '#1d4ed8', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                                >
                                                    <Globe size={18} /> Kopiér Web-Link
                                                </button>
                                            )}
                                        </div>

                                        {selectedLead.status === 'Bekræftet opgave' && isLeadReadyForHistory(selectedLead) && (
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

                                        {selectedLead.status === 'Bekræftet opgave' && selectedLead.raw_data?.audit_trail && (
                                            <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #10b981', padding: '16px', borderRadius: '14px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                <div style={{ fontSize: '2rem' }}>⚖️</div>
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

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                                            <div style={{ padding: '16px', backgroundColor: '#f3f1ed', borderRadius: '14px' }}>
                                                <span style={{ fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kategori</span>
                                                <p style={{ margin: '4px 0 0', fontWeight: 'bold', color: '#1a1a1a', fontSize: '1.1rem' }}>{categoryNames[selectedLead.project_category] || selectedLead.project_category}</p>
                                            </div>
                                            <div style={{ padding: '16px', backgroundColor: '#f7f6f3', borderRadius: '14px', border: '1px solid #e8e6e1' }}>
                                                <span style={{ fontSize: '0.85rem', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auto-Estimat</span>
                                                <p style={{ margin: '4px 0 0', fontWeight: 'bold', color: '#1d4ed8', fontSize: '1.1rem' }}>{selectedLead.price_estimate}</p>
                                            </div>
                                        </div>

                                        <h3 style={{ color: '#374151', marginBottom: '16px' }}>Kundens Valg i Beregneren</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {selectedLead.raw_data && selectedLead.raw_data.details && (() => {
                                                const categoryQuestions = QUESTIONS[selectedLead.raw_data.category] || [];
                                                
                                                // 1. Vi looper KUN over de faktiske spørgsmål i den rækkefølge de ligger i `questionsConfig.js`
                                                // 2. Vi inkluderer også 'amount' helt i toppen manuelt!
                                                const details = selectedLead.raw_data.details;
                                                
                                                const renderElements = [];
                                                
                                                const renderRow = (label, rawValue, keyInput) => {
                                                    if (rawValue === undefined || rawValue === null || rawValue === '') return null;
                                                    
                                                    // Hvis det er et Array (F.eks filer/billeder der er gemt som Base64 i Step2Dynamic)
                                                    if (Array.isArray(rawValue)) {
                                                        const isFileArray = rawValue.length > 0 && typeof rawValue[0] === 'object' && rawValue[0].preview;
                                                        if (isFileArray) {
                                                            return (
                                                                <div key={keyInput} style={{ padding: '16px', border: '1px solid #e8e6e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                    <strong style={{ color: '#6b7280' }}>{label}</strong>
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                                                        {rawValue.map((file, idx) => (
                                                                            <a key={idx} href={file.preview} target="_blank" rel="noopener noreferrer" style={{ display: 'block', border: '1px solid #e8e6e1', borderRadius: '8px', overflow: 'hidden', width: '120px', height: '120px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                                                                <img 
                                                                                    src={file.preview} 
                                                                                    alt={file.name || 'Kundebillede'} 
                                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                                                    onError={(e) => {
                                                                                        e.target.onerror = null; 
                                                                                        e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'; 
                                                                                        e.target.style.objectFit = 'contain'; 
                                                                                        e.target.style.padding = '20px';
                                                                                    }}
                                                                                />
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null; // Skip non-file arrays as text
                                                    }
                                                    
                                                    let displayVal = rawValue.toString();
                                                    
                                                    // Oversæt yes/no
                                                    if (displayVal.toLowerCase() === 'yes') displayVal = 'Ja';
                                                    if (displayVal.toLowerCase() === 'no') displayVal = 'Nej';
                                                    
                                                    // Håndter Links og Orddeling
                                                    let finalValElement = <span style={{ color: '#1a1a1a', textAlign: 'right', fontWeight: '500', maxWidth: '55%', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{displayVal}</span>;
                                                    
                                                    if (displayVal.includes('http://') || displayVal.includes('https://') || displayVal.includes('www.')) {
                                                        const words = displayVal.split(' ');
                                                        const formattedWords = words.map((w, idx) => {
                                                            if (w.startsWith('http') || w.startsWith('www.')) {
                                                                const url = w.startsWith('www.') ? 'https://' + w : w;
                                                                return <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all', display: 'inline-block' }}>{w} </a>;
                                                            }
                                                            return w + ' ';
                                                        });
                                                        finalValElement = <span style={{ color: '#1a1a1a', textAlign: 'right', fontWeight: '500', maxWidth: '55%', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{formattedWords}</span>;
                                                    }
                                                    
                                                    return (
                                                        <div key={keyInput} style={{ padding: '16px', border: '1px solid #e8e6e1', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <strong style={{ color: '#6b7280', maxWidth: '40%' }}>{label}</strong>
                                                            {finalValElement}
                                                        </div>
                                                    );
                                                };
                                                
                                                // Gennemløb alle spørgsmålene præcis som i konfigurationen!
                                                categoryQuestions.forEach(q => {
                                                    const rowEl = renderRow(q.label, details[q.id], q.id);
                                                    if (rowEl) renderElements.push(rowEl);
                                                });
                                                
                                                if (details.isAiEstimate && details.chatLog) {
                                                    renderElements.push(
                                                        <div key="ai_chat" style={{ padding: '16px', border: '1px solid #e8e6e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            <strong style={{ color: '#6b7280' }}>Samtale med AI-Tømrer (Kundens Ønsker)</strong>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', padding: '8px', backgroundColor: '#f3f1ed', borderRadius: '6px' }}>
                                                                {details.chatLog.filter(m => m.role !== 'system').map((msg, idx) => (
                                                                    <div key={idx} style={{ 
                                                                        padding: '10px 14px', 
                                                                        borderRadius: '8px', 
                                                                        maxWidth: '90%', 
                                                                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                                        backgroundColor: msg.role === 'user' ? '#3b82f6' : '#e2e8f0',
                                                                        color: msg.role === 'user' ? 'white' : '#1e293b',
                                                                        fontSize: '0.95rem'
                                                                    }}>
                                                                        <strong style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '4px', display: 'block' }}>{msg.role === 'user' ? 'Kunde' : 'AI-Assistent'}</strong>
                                                                        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content.replace(/\[KLAR_TIL_TILBUD.*?\]/i, '').trim()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            
                                                            <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46' }}>
                                                                <strong>AI'ens skjulte estimat:</strong><br/>
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
                                                
                                                if (details.notes) {
                                                    renderElements.push(renderRow('Særlige forhold / Bemærkninger', details.notes, 'notes'));
                                                }

                                                if (details.photos && details.photos.length > 0) {
                                                    renderElements.push(
                                                        <div key="photos" style={{ padding: '16px', border: '1px solid #e8e6e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

                                        {/* QUOTE BUILDER SEKTION */}
                                        {selectedLead.status !== 'Bekræftet opgave' && (quoteBuilder ? (
                                            <div style={{ marginTop: '24px', padding: '24px', backgroundColor: '#f3f1ed', borderRadius: '14px', border: '1px solid #e8e6e1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <h3 style={{ margin: '0', color: '#1a1a1a' }}>Tilpas & Send Endeligt Tilbud</h3>
                                                <p style={{ margin: '0', color: '#6b7280', fontSize: '0.95rem' }}>Brug auto-estimatet som skabelon. Ret tallene til, og få systemet til at bygge PDF'en for dig.</p>
                                                
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '10px' }}>
                                                    <div className="input-group">
                                                        <label>Arbejdstimer (antal)</label>
                                                        <input type="number" value={quoteBuilder.laborHours} onChange={(e) => setQuoteBuilder({...quoteBuilder, laborHours: Number(e.target.value)})} style={{ border: '1px solid #e8e6e1', padding: '10px', borderRadius: '6px', width: '100%' }} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label>Timepris (kr)</label>
                                                        <input type="number" value={quoteBuilder.hourlyRate} onChange={(e) => setQuoteBuilder({...quoteBuilder, hourlyRate: Number(e.target.value)})} style={{ border: '1px solid #e8e6e1', padding: '10px', borderRadius: '6px', width: '100%' }} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label>Materialer eks. moms (kr)</label>
                                                        <input type="number" value={quoteBuilder.materialCost} onChange={(e) => setQuoteBuilder({...quoteBuilder, materialCost: Number(e.target.value)})} style={{ border: '1px solid #e8e6e1', padding: '10px', borderRadius: '6px', width: '100%' }} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label>Kørsel/Øvrigt eks. moms (kr)</label>
                                                        <input type="number" value={quoteBuilder.drivingCost} onChange={(e) => setQuoteBuilder({...quoteBuilder, drivingCost: Number(e.target.value)})} style={{ border: '1px solid #e8e6e1', padding: '10px', borderRadius: '6px', width: '100%' }} />
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {(quoteBuilder.customLines || []).map((line, idx) => (
                                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', alignItems: 'center' }}>
                                                            <div className="input-group">
                                                                <input type="text" placeholder="F.eks. Leje af stillads" value={line.description} onChange={(e) => {
                                                                    const newLines = [...quoteBuilder.customLines];
                                                                    newLines[idx].description = e.target.value;
                                                                    setQuoteBuilder({...quoteBuilder, customLines: newLines});
                                                                }} style={{ border: '1px solid #e8e6e1', padding: '10px', borderRadius: '6px', width: '100%' }} />
                                                            </div>
                                                            <div className="input-group" style={{ display: 'flex', gap: '8px' }}>
                                                                <input type="number" placeholder="Pris (kr)" value={line.price || ''} onChange={(e) => {
                                                                    const newLines = [...quoteBuilder.customLines];
                                                                    newLines[idx].price = Number(e.target.value);
                                                                    setQuoteBuilder({...quoteBuilder, customLines: newLines});
                                                                }} style={{ border: '1px solid #e8e6e1', padding: '10px', borderRadius: '6px', width: '100%' }} />
                                                                <button onClick={() => {
                                                                    const newLines = [...quoteBuilder.customLines];
                                                                    newLines.splice(idx, 1);
                                                                    setQuoteBuilder({...quoteBuilder, customLines: newLines});
                                                                }} style={{ background: '#fef2f2', border: '1px solid #e8e6e1', color: '#ef4444', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>✖</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => setQuoteBuilder({...quoteBuilder, customLines: [...(quoteBuilder.customLines || []), { description: '', price: 0 }] })} style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed #94a3b8', color: '#6b7280', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Tilføj ekstra linje</button>
                                                </div>

                                                <div style={{ padding: '16px', background: '#e8e6e1', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                                    <span style={{ fontWeight: 'bold' }}>Total inkl. 25% moms:</span>
                                                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1d4ed8' }}>
                                                        {new Intl.NumberFormat('da-DK').format(((quoteBuilder.laborHours * quoteBuilder.hourlyRate) + quoteBuilder.materialCost + quoteBuilder.drivingCost + (quoteBuilder.customLines || []).reduce((acc, l) => acc + (l.price || 0), 0)) * 1.25)} kr.
                                                    </span>
                                                </div>

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

                                                <button  
                                                    className="btn-primary" 
                                                    style={{ width: '100%', marginTop: '10px', background: '#10b981', opacity: selectedLead.status === 'Sendt tilbud' ? 0.5 : 1 }}
                                                    onClick={() => setQuoteBuilder({...quoteBuilder, showPreview: true})}
                                                    disabled={selectedLead.status === 'Sendt tilbud'}
                                                >
                                                    {selectedLead.status === 'Sendt tilbud' ? 'Tilbuddet er sendt' : 'Generer & Gennemse 👉'}
                                                </button>
                                                {selectedLead.status === 'Sendt tilbud' && (
                                                    <div style={{ padding: '12px', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', fontWeight: '500', fontSize: '0.9rem', marginTop: '10px', textAlign: 'center' }}>
                                                        ✅ Et tilbud (PDF) ligger gemt på sagen.
                                                    </div>
                                                )}

                                                {selectedLead.status !== 'Sendt tilbud' && (
                                                    <div style={{ marginTop: '24px', borderTop: '1px solid #cbd5e1', paddingTop: '20px' }}>
                                                        <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#6b7280', textAlign: 'center', fontWeight: '500' }}>— Eller brug dit eget vante system —</p>
                                                        <div style={{ display: 'flex', gap: '10px' }}>
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
                                                                {isUploadingPdf ? 'Sender...' : 'Upload dit eget tilbud'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#fff5f5', color: '#991b1b', borderRadius: '8px', border: '1px solid #f87171' }}>
                                                <strong>Hov!</strong> Dette lead blev oprettet <em>før</em> vi integrerede Tilbuds-generatoren. Værdier til auto-udfyldelse mangler i databasen. Generer dog et nyt test-lead for at se det nye system.
                                            </div>
                                        ))}

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
                                                    🏁 Afslut opgave (Flyt til Historik)
                                                </button>
                                            </div>
                                        )}

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

                                        {quoteBuilder && quoteBuilder.showPreview && createPortal(
                                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 100000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', padding: '40px 20px', paddingBottom: '120px' }}>
                                                
                                                <div style={{ width: '210mm', minHeight: '297mm', backgroundColor: '#ffffff', position: 'relative', boxShadow: '0 0 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
                                                    <div ref={invoiceRef} style={{ width: '210mm', height: '297mm', padding: '25mm', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#1a1a1a', fontFamily: 'sans-serif' }}>
                                                        
                                                        {/* Invoice Header */}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e8e6e1', paddingBottom: '20px', marginBottom: '30px' }}>
                                                            <div>
                                                                {carpenterProfile?.logo_url ? (
                                                                    <img src={carpenterProfile.logo_url} alt="Logo" style={{ maxHeight: '60px', marginBottom: '10px' }} crossOrigin="anonymous" />
                                                                ) : (
                                                                    <h1 style={{ margin: 0, fontSize: '24px', color: '#1a1a1a' }}>{carpenterProfile?.company_name || 'Tømrervirksomhed'}</h1>
                                                                )}
                                                                <p style={{ margin: '4px 0', fontSize: '12px', color: '#6b7280' }}>CVR: {carpenterProfile?.cvr || 'Under oprettelse'}</p>
                                                                <p style={{ margin: '4px 0', fontSize: '12px', color: '#6b7280' }}>{carpenterProfile?.address || ''}</p>
                                                                <p style={{ margin: '4px 0', fontSize: '12px', color: '#6b7280' }}>{carpenterProfile?.phone || ''} | {carpenterProfile?.email || ''}</p>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <h2 style={{ margin: 0, fontSize: '28px', color: '#10b981' }}>TILBUD</h2>
                                                                <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Dato:</strong> {new Date().toLocaleDateString('da-DK')}</p>
                                                                <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Projekt ID:</strong> #{String(selectedLead.id).substring(0, 8)}</p>
                                                            </div>
                                                        </div>

                                                        {/* Customer Details */}
                                                        <div style={{ marginBottom: '40px' }}>
                                                            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#6b7280' }}>Kunde:</h3>
                                                            <strong style={{ fontSize: '14px', display: 'block' }}>{selectedLead.customer_name}</strong>
                                                            <span style={{ fontSize: '14px', display: 'block' }}>{selectedLead.customer_address}</span>
                                                            <span style={{ fontSize: '14px', display: 'block' }}>{selectedLead.customer_phone} | {selectedLead.customer_email}</span>
                                                        </div>

                                                        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', borderBottom: '1px solid #cbd5e1', paddingBottom: '10px' }}>
                                                            Opgave: {categoryNames[selectedLead.project_category] || selectedLead.project_category}
                                                        </h3>

                                                        {/* Custom Message */}
                                                        {quoteBuilder.customMessage && quoteBuilder.customMessage.trim() !== '' && (
                                                            <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f3f1ed', borderLeft: '4px solid #10b981', borderRadius: '4px' }}>
                                                                <p style={{ margin: 0, fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                                                    {quoteBuilder.customMessage}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Line Items Table */}
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                                                            <thead>
                                                                <tr style={{ backgroundColor: '#f3f1ed', borderBottom: '2px solid #cbd5e1' }}>
                                                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>Beskrivelse</th>
                                                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>Antal/Mængde</th>
                                                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>Enhedspris</th>
                                                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {quoteBuilder.showDetailedBreakdown ? (
                                                                    <>
                                                                        <tr style={{ borderBottom: '1px solid #e8e6e1' }}>
                                                                            <td style={{ padding: '12px', fontSize: '14px' }}>Håndværker - Arbejdstid</td>
                                                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>{quoteBuilder.laborHours} timer</td>
                                                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>{quoteBuilder.hourlyRate} kr.</td>
                                                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>{new Intl.NumberFormat('da-DK').format(quoteBuilder.laborHours * quoteBuilder.hourlyRate)} kr.</td>
                                                                        </tr>
                                                                        <tr style={{ borderBottom: '1px solid #e8e6e1' }}>
                                                                            <td style={{ padding: '12px', fontSize: '14px' }}>Materialer (ihht. besigtigelse)</td>
                                                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>1 pck.</td>
                                                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>{new Intl.NumberFormat('da-DK').format(quoteBuilder.materialCost)} kr.</td>
                                                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>{new Intl.NumberFormat('da-DK').format(quoteBuilder.materialCost)} kr.</td>
                                                                        </tr>
                                                                        <tr style={{ borderBottom: '1px solid #e8e6e1' }}>
                                                                            <td style={{ padding: '12px', fontSize: '14px' }}>Kørsel, logistik og øvrigt</td>
                                                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>1 stk.</td>
                                                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>{new Intl.NumberFormat('da-DK').format(quoteBuilder.drivingCost)} kr.</td>
                                                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>{new Intl.NumberFormat('da-DK').format(quoteBuilder.drivingCost)} kr.</td>
                                                                        </tr>
                                                                        {(quoteBuilder.customLines || []).map((line, idx) => (
                                                                            <tr key={idx} style={{ borderBottom: '1px solid #e8e6e1' }}>
                                                                                <td style={{ padding: '12px', fontSize: '14px' }}>{line.description || 'Ekstra ydelser'}</td>
                                                                                <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>1 stk.</td>
                                                                                <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>{new Intl.NumberFormat('da-DK').format(line.price || 0)} kr.</td>
                                                                                <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>{new Intl.NumberFormat('da-DK').format(line.price || 0)} kr.</td>
                                                                            </tr>
                                                                        ))}
                                                                    </>
                                                                ) : (
                                                                    <tr style={{ borderBottom: '1px solid #e8e6e1' }}>
                                                                        <td style={{ padding: '12px', fontSize: '14px', fontWeight: 'bold' }}>Samlet entreprise på opgaven jf. aftale</td>
                                                                        <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>1 stk.</td>
                                                                        <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                                                                            {(() => {
                                                                                const subEx = (quoteBuilder.laborHours * quoteBuilder.hourlyRate) + quoteBuilder.materialCost + quoteBuilder.drivingCost + (quoteBuilder.customLines || []).reduce((acc, l) => acc + (l.price || 0), 0);
                                                                                return new Intl.NumberFormat('da-DK').format(subEx);
                                                                            })()} kr.
                                                                        </td>
                                                                        <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                                                                            {(() => {
                                                                                const subEx = (quoteBuilder.laborHours * quoteBuilder.hourlyRate) + quoteBuilder.materialCost + quoteBuilder.drivingCost + (quoteBuilder.customLines || []).reduce((acc, l) => acc + (l.price || 0), 0);
                                                                                return new Intl.NumberFormat('da-DK').format(subEx);
                                                                            })()} kr.
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>

                                                        {/* Totals */}
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                            {(() => {
                                                                const subTotalEx = (quoteBuilder.laborHours * quoteBuilder.hourlyRate) + quoteBuilder.materialCost + quoteBuilder.drivingCost + (quoteBuilder.customLines || []).reduce((acc, l) => acc + (l.price || 0), 0);
                                                                return (
                                                                    <div style={{ width: '300px' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', fontSize: '14px' }}>
                                                                            <span>Subtotal (eks. moms)</span>
                                                                            <span>{new Intl.NumberFormat('da-DK').format(subTotalEx)} kr.</span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', fontSize: '14px', borderBottom: '2px solid #e8e6e1' }}>
                                                                            <span>Moms (25%)</span>
                                                                            <span>{new Intl.NumberFormat('da-DK').format(subTotalEx * 0.25)} kr.</span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a' }}>
                                                                            <span>TOTAL AT BETALE</span>
                                                                            <span>{new Intl.NumberFormat('da-DK').format(subTotalEx * 1.25)} kr.</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>

                                                        <div style={{ position: 'absolute', bottom: '15mm', left: '25mm', right: '25mm', fontSize: '10px', color: '#6b7280', borderTop: '1px solid #e8e6e1', paddingTop: '15px', lineHeight: '1.4' }}>
                                                            <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#374151', fontWeight: 'bold' }}>Tak for tilliden. Dette tilbud er gældende i 30 dage fra ovenstående dato.</p>
                                                            <p style={{ margin: 0 }}>Arbejdet udføres i henhold til AB Forbruger (Almindelige Betingelser for byggearbejder), hvilket sikrer klare og trygge rammer for aftalen. Eventuelle uforudsete forhindringer (f.eks. skjult råd, svamp, ulovlige installationer eller asbest), der ikke med rimelighed kunne forudses ved tilbudsgivningen, er ikke inkluderet og vil blive udbedret i samråd til gældende timepris.</p>
                                                        </div>
                                                    </div>

                                                    {/* ActionBar fixed til bunden for funktionalitet */}
                                                    <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1e293b', padding: '16px 24px', borderRadius: '14px', display: 'flex', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 10001, alignItems: 'center' }}>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setQuoteBuilder({...quoteBuilder, showPreview: false}); }} 
                                                            style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            ← Tilbage og redigér
                                                        </button>
                                                        <button 
                                                            disabled={quoteBuilder.isGeneratingPdf}
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                setQuoteBuilder(p => ({...p, isGeneratingPdf: true}));
                                                                try {
                                                                    const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true });
                                                                    const pdf = new jsPDF('p', 'mm', 'a4');
                                                                    const imgData = canvas.toDataURL('image/jpeg', 1.0);
                                                                    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
                                                                    const pdfBlob = pdf.output('blob');
                                                                    
                                                                    const cleanProjectTitle = (categoryNames[selectedLead.project_category] || selectedLead.project_category).replace(/\//g, '-').replace(/\s+/g, '_');
                                                                    const cleanName = (selectedLead.customer_name || 'Kunde').split(' ')[0].replace(/[^a-zA-ZæøåÆØÅ]/g, '');
                                                                    const cleanAddress = (selectedLead.customer_address || 'Adresse').split(',')[0].replace(/[^a-zA-Z0-9æøåÆØÅ\s]/g, '').replace(/\s+/g, '_');
                                                                    
                                                                    const file = new File([pdfBlob], `Tilbud_${cleanProjectTitle}_${cleanName}_${cleanAddress}.pdf`, { type: 'application/pdf' });
                                                                    const slug = carpenterProfile ? carpenterProfile.slug : 'hvem-som-helst';
                                                                    
                                                                    const finalPrice = ((quoteBuilder.laborHours * quoteBuilder.hourlyRate) + quoteBuilder.materialCost + quoteBuilder.drivingCost + (quoteBuilder.customLines || []).reduce((acc, l) => acc + (l.price || 0), 0)) * 1.25;
                                                                    await handleUploadAndSendQuote(selectedLead.id, slug, file, finalPrice);
                                                                    
                                                                    setQuoteBuilder(p => ({...p, isGeneratingPdf: false, showPreview: false}));
                                                                } catch (err) {
                                                                    console.error("Fejl i PDF generering:", err);
                                                                    toast.error("Hov! Der skete en uventet fejl ifm PDF oprettelsen.");
                                                                    setQuoteBuilder(p => ({...p, isGeneratingPdf: false}));
                                                                }
                                                            }} 
                                                            style={{ padding: '16px 32px', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: quoteBuilder.isGeneratingPdf ? 'not-allowed' : 'pointer', flex: 1, transition: 'background-color 0.2s', fontSize: '1rem', opacity: quoteBuilder.isGeneratingPdf ? 0.7 : 1 }}
                                                        >
                                                            {quoteBuilder.isGeneratingPdf ? '⏳ Uploader PDF...' : 'GEM SOM STANDALONE PDF'}
                                                        </button>
                                                        
                                                        <button 
                                                            onClick={async () => {
                                                                try {
                                                                    setQuoteBuilder(p => ({...p, isGeneratingPdf: true}));
                                                                    
                                                                    const currentRawData = selectedLead.raw_data || {};
                                                                    const newRawData = { 
                                                                        ...currentRawData, 
                                                                        calc_data: {
                                                                            laborHours: quoteBuilder.laborHours,
                                                                            hourlyRate: quoteBuilder.hourlyRate,
                                                                            materialCost: quoteBuilder.materialCost,
                                                                            drivingCost: quoteBuilder.drivingCost,
                                                                        },
                                                                        quote_settings: quoteBuilder.settings,
                                                                        custom_message: quoteBuilder.customMessage
                                                                    };
                                                                    
                                                                    const { data, error } = await supabase.from('leads').update({ status: 'Sendt tilbud', raw_data: newRawData }).eq('id', selectedLead.id).select().single();
                                                                    if (error) throw error;
                                                                    
                                                                    const publicUrl = `${window.location.origin}/${carpenterProfile?.slug || 't'}/tilbud/${data.quote_token || data.id}`;
                                                                    
                                                                    setLeadsData(prev => prev.map(l => l.id === selectedLead.id ? data : l));
                                                                    setSelectedLead(data);
                                                                    
                                                                    setQuoteBuilder(p => ({...p, isGeneratingPdf: false, showPreview: false}));
                                                                    
                                                                    navigator.clipboard.writeText(publicUrl);
                                                                    toast.success("Tilbuddet er oprettet! Det interaktive kundelink er kopieret til din udklipsholder. \n\nDu kan også se linket under leadet.");
                                                                    
                                                                } catch (err) {
                                                                    console.error("Fejl ved oprettelse af web-tilbud:", err);
                                                                    toast.error("Der skete en fejl. Prøv igen.");
                                                                    setQuoteBuilder(p => ({...p, isGeneratingPdf: false}));
                                                                }
                                                            }}
                                                            disabled={quoteBuilder.isGeneratingPdf}
                                                            style={{ padding: '16px 32px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: quoteBuilder.isGeneratingPdf ? 'not-allowed' : 'pointer', flex: 2, transition: 'background-color 0.2s', fontSize: '1.1rem', opacity: quoteBuilder.isGeneratingPdf ? 0.7 : 1, boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }}
                                                        >
                                                            {quoteBuilder.isGeneratingPdf ? '⏳ GEMMER...' : 'OPRET INTERAKTIVT WEB-TILBUD (Anbefales)'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        , document.body)}

                                    </div>
                                </div>
                            , document.body)}
                                </div> {/* Close card-body */}
                            </div> {/* Close settings-card */}
                        </div>
                    )}
                    
                    {activeTab === 'map' && (
                        <div className="space-y-8 animate-fadeIn" style={{ maxWidth: '1200px', margin: '0 auto', height: '100%', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                            <div className="settings-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                
                                <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
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
                                    </div>
                                    <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f3f1ed', borderRadius: '8px', borderLeft: '3px solid #cbd5e1', fontSize: '0.85rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                        <span>Opgaver i "Historik" og "Udgået opgave" er automatisk skjult for at holde kortet rent. Zoom ind hvis prikkerne ligger tæt.</span>
                                    </div>
                                </div>
                            
                            <div style={{ flex: 1, border: '1px solid #e8e6e1', borderRadius: '14px', overflow: 'hidden', marginTop: '16px', position: 'relative', zIndex: 0 }}>
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
                                        {leadsData.filter(l => {
                                            if (l.status === 'Udgået opgave' || l.status === 'Historik') return false;
                                            if (l.status === 'Ny forespørgsel' && !mapFilters.showNew) return false;
                                            if (l.status === 'Sendt tilbud' && !mapFilters.showSent) return false;
                                            if (l.status === 'Bekræftet opgave' && !mapFilters.showConfirmed) return false;
                                            return true;
                                        }).map(lead => {
                                            const coords = geocodedLeads[lead.id];
                                            if (!coords) return null; // Har ikke fundet koordinater på adressen
                                            
                                            // Vælg farveikon baseret på status
                                            let iconUrl = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
                                            if (lead.status === 'Sendt tilbud') iconUrl = 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
                                            else if (lead.status === 'Bekræftet opgave') iconUrl = 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
                                            
                                            return (
                                                <Marker 
                                                    key={lead.id} 
                                                    position={coords}
                                                    title={lead.customer_name}
                                                    icon={{ url: iconUrl }}
                                                    onClick={() => {
                                                        handleSelectLead(lead);
                                                        setActiveTab('leads');
                                                    }}
                                                />
                                            );
                                        })}
                                    </GoogleMap>
                                )}
                            </div>
                            
                            <div style={{ marginTop: '16px', display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <span><strong style={{color: '#10b981'}}>{leadsData.filter(l => l.status !== 'Udgået opgave' && l.status !== 'Historik' && geocodedLeads[l.id]).length}</strong> / {leadsData.filter(l => l.status !== 'Udgået opgave' && l.status !== 'Historik').length} aktive adresser fundet på kortet.</span>
                            </div>
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
                        <div className="settings-grid">
                            
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
                                        <Bell size={24} />
                                    </div>
                                    <h3>Notifikationer & Alarmer</h3>
                                </div>
                                <div className="card-body">
                                    <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f3f1ed', borderRadius: '8px', border: '1px solid #e8e6e1' }}>
                                        <label className="toggle-switch" style={{ margin: 0 }}>
                                            <input 
                                                type="checkbox" 
                                                checked={settingsData.sms_notifications_enabled || false}
                                                onChange={(e) => {
                                                    const isChecked = e.target.checked;
                                                    setSettingsData(prev => ({ ...prev, sms_notifications_enabled: isChecked }));
                                                    if (isChecked) {
                                                        import('../../utils/sendEmail').then(({ sendEmail }) => {
                                                            sendEmail({
                                                                to: 'team@bisoncompany.dk',
                                                                subject: `🔥 FAKE DOOR: SMS Interesse fra ${carpenterProfile?.company_name || 'En tømrer'}`,
                                                                html: `<p>Tømrer <b>${carpenterProfile?.company_name || 'En tømrer'}</b> (Email: ${carpenterProfile?.email || 'Ukendt'}) har netop slået SMS-notifikationer TIL på deres dashboard.</p><p>Dette er et signal om, at featuren er efterspurgt! Husk at skrive til dem, at det er under udvikling, eller opsæt det manuelt.</p>`,
                                                                fromName: 'Bison Frame System'
                                                            });
                                                        });
                                                        toast.success("Interesse registreret! SMS-featuren er pt. i lukket betatest. Vi kontakter dig for opsætning.", { duration: 6000 });
                                                    }
                                                }}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#1a1a1a' }}>SMS ved Nye Opgaver</h4>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: '1.4' }}>Modtag en lynhurtig SMS på telefonen hver gang en kunde udfylder tilbudsberegneren, så du kan reagere hurtigt, mens du står på byggepladsen.</p>
                                        </div>
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
                                        <span className="help-text">For at dække tab og administration lægges dette lagt på rene materialepriser.</span>
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
                            </div>
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
                        <div className="space-y-8 animate-fadeIn" style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '195px' }}>
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
                                                                    <div className="tooltip-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                        <label className="is-security" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', lineHeight: '1.4' }}>
                                                                            <Shield size={14} className="shield-icon" style={{ flexShrink: 0 }} />
                                                                            <span>{cleanName}</span>
                                                                        </label>
                                                                        <Info size={14} className="info-icon" style={{ flexShrink: 0 }} />
                                                                        <div className="tooltip-content">
                                                                            Beregneren bruger denne pris som en redningskrans...
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: '1.4' }}>
                                                                        {!isItemActive && <span style={{ flexShrink: 0, color: '#ef4444', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', border: '1px solid currentColor', borderRadius: '4px', padding: '2px 4px', marginTop: '2px' }}>Skjult</span>}
                                                                        <span>{cleanName}</span>
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
                            </div> 
                        </div> 
                    )}

                    {activeTab !== 'profile' && activeTab !== 'leads' && activeTab !== 'map' && activeTab !== 'settings' && activeTab !== 'materials' && activeTab !== 'integrations' && activeTab !== 'ai-training' && (
                        <div className="placeholder-state">
                            <Package size={48} className="text-muted" />
                            <h2>Ukendt modul</h2>
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
                        <div className="space-y-8 animate-fadeIn" style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
                                            <button 
                                                style={{ width: '100%', padding: '10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer' }}
                                                onClick={async () => {
                                                    const { error } = await supabase.from('carpenters').update({ dinero_api_key: null }).eq('id', carpenterProfile.id);
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
                                            <button 
                                                style={{ width: '100%', padding: '10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer' }}
                                                onClick={async () => {
                                                    const { error } = await supabase.from('carpenters').update({ economic_api_key: null }).eq('id', carpenterProfile.id);
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
                                                const { error } = await supabase.from('carpenters').update({ ordrestyring_api_key: carpenterProfile.ordrestyring_api_key }).eq('id', carpenterProfile.id);
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
                                                        const { error } = await supabase.from('carpenters').update({ ordrestyring_api_key: null }).eq('id', carpenterProfile.id);
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
                                                const { error } = await supabase.from('carpenters').update({ apacta_api_key: carpenterProfile.apacta_api_key }).eq('id', carpenterProfile.id);
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
                                                        const { error } = await supabase.from('carpenters').update({ apacta_api_key: null }).eq('id', carpenterProfile.id);
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
                                            Forbind Minuba for automatisk at oprette kunder og opgaver (sager), når et tilbud bekræftes. Du finder din API-nøgle inde i Minuba.
                                        </p>
                                        
                                        <div className="input-group" style={{ marginBottom: '16px' }}>
                                            <input 
                                                type="password" 
                                                value={carpenterProfile?.minuba_api_key || ''} 
                                                onChange={(e) => setCarpenterProfile(prev => ({ ...prev, minuba_api_key: e.target.value }))} 
                                                placeholder="Indsæt API-nøgle fra Minuba" 
                                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e8e6e1' }}
                                            />
                                        </div>
                                        
                                        <button 
                                            className="primary-btn" 
                                            style={{ width: '100%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                                            onClick={async () => {
                                                if (!carpenterProfile?.minuba_api_key) return;
                                                const { error } = await supabase.from('carpenters').update({ minuba_api_key: carpenterProfile.minuba_api_key }).eq('id', carpenterProfile.id);
                                                if (!error) {
                                                    alert("Minuba API-nøgle gemt!");
                                                } else {
                                                    alert("Fejl ved gemning (Har du kørt SQL-scriptet?): " + error.message);
                                                }
                                            }}
                                        >
                                            Gem API-nøgle
                                        </button>
                                        
                                        {carpenterProfile?.minuba_api_key && (
                                            <>
                                                <div style={{ marginTop: '16px', padding: '12px', background: '#ecfdf5', color: '#047857', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '16px' }}>
                                                    Nøgle er gemt! ✅
                                                </div>
                                                <button 
                                                    style={{ width: '100%', padding: '10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer' }}
                                                    onClick={async () => {
                                                        const { error } = await supabase.from('carpenters').update({ minuba_api_key: null }).eq('id', carpenterProfile.id);
                                                        if (!error) setCarpenterProfile(prev => ({...prev, minuba_api_key: null}));
                                                    }}
                                                >
                                                    Afbryd forbindelse
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
                    <div style={{ backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(24px)', borderRadius: '20px', width: '100%', maxWidth: '500px', padding: '32px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setIsFeedbackModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
                        
                        <h2 style={{ margin: '0 0 16px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.5rem' }}>💡</span> Hjælp os med at forbedre
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

            {/* Create Lead Modal */}
            {isCreateLeadModalOpen && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px' }} onClick={() => setIsCreateLeadModalOpen(false)}>
                    <div style={{ backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(24px)', borderRadius: '20px', width: '100%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setIsCreateLeadModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#f3f1ed', border: 'none', fontSize: '1.2rem', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', color: '#6b7280', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>×</button>
                        <div style={{ padding: '0' }}>
                            <Wizard 
                                carpenter={carpenterProfile} 
                                isManualCreation={true} 
                                onComplete={async () => {
                                    setIsCreateLeadModalOpen(false);
                                    toast.success('Ny kunde oprettet!');
                                    // Genindlæs leads
                                    const { data } = await supabase.from('leads').select('*').eq('carpenter_id', carpenterProfile.id).order('created_at', { ascending: false });
                                    if (data) setLeadsData(data);
                                }} 
                            />
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
                                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e8e6e1', background: 'rgba(255, 255, 255, 0.4)', color: '#6b7280', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                Fortryd
                            </button>
                            <button 
                                onClick={async () => {
                                    const { error } = await supabase.from('leads').delete().eq('id', selectedLead.id);
                                    if (error) {
                                        toast.error("Kunne ikke slette kunden.");
                                    } else {
                                        toast.success("Kunde slettet permanent.");
                                        setLeadsData(prev => prev.filter(l => l.id !== selectedLead.id));
                                        setShowDeleteConfirm(false);
                                        setSelectedLead(null);
                                    }
                                }}
                                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                Ja, slet sag
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Dashboard;

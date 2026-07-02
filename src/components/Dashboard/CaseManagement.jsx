import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HardHat, CheckSquare, Camera, Clock, Briefcase, Calendar, MapPin, ArrowRight, ChevronDown, Package, Activity, AlertTriangle, Phone, FileImage, UserPlus, ChevronRight, TrendingUp, Plus, Trash2, ShieldAlert, User, ArrowLeft, DollarSign, PackageCheck, ClipboardList, CheckCircle, Upload, Save, Edit2, Wallet, FileText, Send, Receipt, Store, List, CreditCard, X, PenTool, MessageCircle, MessageSquare, Users, Download, Search, Bell, LogOut, Link2, Filter, Image as ImageIcon, Video, Mail, UploadCloud, Link as LinkIcon, ExternalLink, Settings, MoreHorizontal, Pause, RotateCcw, Megaphone, GripVertical, Mic, MicOff, Loader2, Lock, Volume2, Square } from 'lucide-react';
import { DndContext, closestCenter, TouchSensor, MouseSensor, useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MaterialList from './MaterialList';
import ManualMaterialsView from './ManualMaterialsView';
import AftalesedlerTab from './AftalesedlerTab';
import CaseDrawingsTab from './CaseDrawingsTab';
import AudioPlayerButton from '../Wizard/AudioPlayerButton';
import FrameSelect from '../ui/FrameSelect';
import BilagManager from './BilagManager';
import { SubcontractorModal } from './Subcontractors';
import { getFeatures } from '../../utils/features';
import { isReverseChargeLead } from '../../utils/caseFinance';
import ProfileCard from './ProfileCard';
import { fetchPayrollSettings, isDateLocked, formatDa, getEffectiveLockedUntil } from '../../utils/payroll';
import { useClickOutside } from '../../hooks/useClickOutside';
import { getRoleLabel } from '../../utils/roles';
import { buildCaseMessage, mutateCaseMessages } from '../../utils/caseMessages';
import { friendlyError, isOfflineError } from '../../utils/friendlyError';
import { enqueueMutation } from '../../utils/mutationQueue';
import { mutateLeadRawData } from '../../utils/leadRawData';
import { getChecklistForCategory, buildPhasesChecklist } from '../../utils/checklistGenerator';
import WorkBreakdownModal, { subManHours } from './WorkBreakdownModal';
import UserAvatar from '../ui/UserAvatar';
import SectionTour from './SectionTour';
import { shouldShowCoach } from './coachmarks';
import QuarterTimePicker from '../ui/QuarterTimePicker';
import { snapToQuarter } from '../../utils/timeUtils';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';

import toast from 'react-hot-toast';

// CustomSelect Component
// Re-written slightly to avoid scope minification issues in old Safari
const CustomSelect = function({ value, onChange, options, placeholder }) {
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

    const selectedOption = options.find(o => o.value === value) || options.flatMap(o => o.options || []).find(o => o.value === value);
    const label = selectedOption ? selectedOption.label : placeholder;
    const Icon = selectedOption?.icon;

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    padding: '12px 16px', 
                    borderRadius: '10px', 
                    border: isOpen ? '2px solid #3b82f6' : '1px solid #cbd5e1', 
                    backgroundColor: '#fff', 
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: value ? '#1e293b' : '#94a3b8',
                    transition: 'all 0.2s',
                    boxShadow: isOpen ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : 'none',
                    boxSizing: 'border-box'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    {Icon && <span style={{ display: 'flex', alignItems: 'center', color: selectedOption.color || '#64748b' }}>{Icon}</span>}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                </div>
                <ChevronDown size={18} style={{ color: '#64748b', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
            </div>

            {isOpen && (
                <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    marginTop: '8px', 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', 
                    border: '1px solid #e2e8f0',
                    zIndex: 100000,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    padding: '8px 0',
                    animation: 'fadeInDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {options.map((opt, i) => {
                        if (opt.isGroup) {
                            return (
                                <div key={i}>
                                    <div style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: i > 0 ? '8px' : '0' }}>
                                        {opt.label}
                                    </div>
                                    {opt.options.map(subOpt => (
                                        <div 
                                            key={subOpt.value}
                                            onClick={() => { onChange(subOpt.value); setIsOpen(false); }}
                                            style={{ 
                                                padding: '10px 16px', fontSize: '0.95rem', cursor: 'pointer', 
                                                backgroundColor: value === subOpt.value ? (subOpt.activeBg || '#f1f5f9') : 'transparent', 
                                                color: value === subOpt.value ? (subOpt.color || '#3b82f6') : '#1e293b', 
                                                fontWeight: value === subOpt.value ? '600' : '500',
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                transition: 'all 0.1s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = value === subOpt.value ? (subOpt.activeBg || '#f1f5f9') : '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === subOpt.value ? (subOpt.activeBg || '#f1f5f9') : 'transparent'}
                                        >
                                            {subOpt.icon && <span style={{ display: 'flex', alignItems: 'center', color: subOpt.color || '#64748b' }}>{subOpt.icon}</span>}
                                            {subOpt.label}
                                        </div>
                                    ))}
                                </div>
                            );
                        }
                        
                        return (
                            <div 
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                style={{ 
                                    padding: '10px 16px', fontSize: '0.95rem', cursor: 'pointer', 
                                    backgroundColor: value === opt.value ? (opt.activeBg || '#f1f5f9') : 'transparent', 
                                    color: value === opt.value ? (opt.color || '#3b82f6') : '#1e293b', 
                                    fontWeight: value === opt.value ? '600' : '500',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    transition: 'all 0.1s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = value === opt.value ? (opt.activeBg || '#f1f5f9') : '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === opt.value ? (opt.activeBg || '#f1f5f9') : 'transparent'}
                            >
                                {opt.icon && <span style={{ display: 'flex', alignItems: 'center', color: opt.color || '#64748b' }}>{opt.icon}</span>}
                                {opt.label}
                            </div>
                        );
                    })}
                </div>
            )}


        </div>
    );
};
// --- DND KIT SORTABLE COMPONENT ---
function SortableSubTask({ sub, stepId, handleTodoToggle, speakText, handleDeleteSubTask, handleEditSubTaskText, profile, speakingId }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(sub.text);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: sub.id, data: { type: 'SubTask', stepId } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: '14px 16px',
        backgroundColor: sub.done ? 'rgba(248, 250, 252, 0.7)' : '#ffffff',
        border: '1px solid', 
        borderColor: sub.done ? '#e2e8f0' : '#f1f5f9', 
        borderRadius: '10px', 
        opacity: isDragging ? 0.5 : (sub.done ? 0.75 : 1), 
        boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.1)' : (sub.done ? 'none' : '0 2px 6px rgba(0,0,0,0.02)'),
        marginBottom: '8px',
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            onMouseEnter={(e) => {
                if (!sub.done && !isDragging) {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }
            }}
            onMouseLeave={(e) => {
                if (!sub.done && !isDragging) {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%', minWidth: 0 }}>
                <div
                    {...attributes}
                    {...(isEditing ? {} : listeners)}
                    title="Hold inde og træk for at flytte"
                    style={{ padding: '10px 6px', minWidth: '34px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', marginLeft: '-6px', marginTop: '-4px', borderRadius: '8px', touchAction: 'none', cursor: isDragging ? 'grabbing' : 'grab', flexShrink: 0 }}
                >
                    <GripVertical size={20} />
                </div>
                <div 
                    onClick={(e) => { e.stopPropagation(); handleTodoToggle(stepId, sub.id); }}
                    style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '6px', 
                        border: sub.done ? 'none' : '2px solid #cbd5e1', 
                        backgroundColor: sub.done ? '#10b981' : '#fff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        transition: 'all 0.15s', 
                        cursor: 'pointer', 
                        flexShrink: 0, 
                        marginTop: '1px',
                        boxShadow: sub.done ? '0 2px 6px rgba(16, 185, 129, 0.4)' : 'inset 0 1px 2px rgba(0,0,0,0.05)'
                    }}
                >
                    {sub.done && <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.85rem' }}>✓</span>}
                </div>
                {isEditing ? (
                    <input 
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => {
                            setIsEditing(false);
                            if (editText.trim() !== '' && editText !== sub.text) {
                                handleEditSubTaskText(stepId, sub.id, editText.trim());
                            } else {
                                setEditText(sub.text);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setIsEditing(false);
                                if (editText.trim() !== '' && editText !== sub.text) {
                                    handleEditSubTaskText(stepId, sub.id, editText.trim());
                                } else {
                                    setEditText(sub.text);
                                }
                            }
                            if (e.key === 'Escape') {
                                setIsEditing(false);
                                setEditText(sub.text);
                            }
                        }}
                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking input
                        style={{
                            flex: 1,
                            padding: '4px 8px',
                            border: '1px solid #3b82f6',
                            borderRadius: '4px',
                            fontSize: '0.95rem',
                            outline: 'none',
                            fontFamily: 'inherit'
                        }}
                    />
                ) : (
                    <span 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if (profile?.role !== 'worker' && profile?.role !== 'apprentice') {
                                setIsEditing(true);
                            } else {
                                handleTodoToggle(stepId, sub.id);
                            }
                        }}
                        style={{ 
                            fontSize: '0.95rem', 
                            color: sub.done ? '#64748b' : '#1e293b', 
                            textDecoration: sub.done ? 'line-through' : 'none', 
                            cursor: 'pointer', 
                            flex: 1, 
                            lineHeight: '1.5',
                            transition: 'color 0.2s',
                            wordBreak: 'break-word',
                            minWidth: 0
                        }}
                    >
                        {sub.text}
                    </span>
                )}
                {subManHours(sub) > 0 && (
                    <span
                        title={`Estimeret ${sub.estHours} timer × ${Math.max(1, parseInt(sub.crew, 10) || 1)} mand`}
                        style={{ marginLeft: 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 800, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '3px 9px', borderRadius: '999px', whiteSpace: 'nowrap' }}
                    >
                        <Clock size={12} /> {subManHours(sub)} t
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <AudioPlayerButton text={sub.text} title="Læs op" />
                
                {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                    <>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setIsEditing(true); 
                            }}
                            title="Rediger"
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteSubTask(stepId, sub.id); }}
                            title="Slet"
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <Trash2 size={16} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
function SortableStep({ step, idx, handleToggleExpand, handleEditStepText, setStepToDelete, profile, children }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(step.text);
    
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: step.id, data: { type: 'Step' } });

    const subs = step.subTasks || [];
    const completedSub = subs.filter(s => s.done).length;
    const totalSub = subs.length;
    const isAllDone = totalSub > 0 && completedSub === totalSub;

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        position: 'relative',
        display: 'flex', 
        flexDirection: 'column', 
        backgroundColor: isAllDone ? 'rgba(240, 253, 244, 0.5)' : '#ffffff', 
        border: isAllDone ? '1px solid #6ee7b7' : '1px solid #e2e8f0', 
        borderRadius: '16px', 
        overflow: 'hidden',
        boxShadow: isDragging ? '0 10px 30px rgba(0,0,0,0.15)' : (isAllDone ? '0 4px 14px rgba(16, 185, 129, 0.1)' : '0 4px 12px rgba(0, 0, 0, 0.03)'),
        opacity: isDragging ? 0.6 : 1
    };

    return (
        <div ref={setNodeRef} style={style}>
            {/* Header / Accordion trigger */}
            <div 
                onClick={() => { if (!isEditing) handleToggleExpand(step.id); }}
                onMouseEnter={(e) => {
                    if (!isAllDone && !isDragging) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                    if (!isAllDone && !isDragging) e.currentTarget.style.backgroundColor = 'transparent';
                }}
                style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '18px 24px', 
                    backgroundColor: isAllDone ? 'rgba(16, 185, 129, 0.05)' : 'transparent', 
                    cursor: 'pointer', 
                    transition: 'background-color 0.2s ease',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '200px' }}>
                    {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                        <div
                            {...attributes}
                            {...(isEditing ? {} : listeners)}
                            title="Hold inde og træk for at flytte trinnet"
                            style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 6px', minWidth: '34px', minHeight: '40px', marginLeft: '-6px', borderRadius: '8px', touchAction: 'none', cursor: isDragging ? 'grabbing' : 'grab', flexShrink: 0 }}
                        >
                            <GripVertical size={22} />
                        </div>
                    )}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        backgroundColor: isAllDone ? '#10b981' : '#f1f5f9', 
                        color: isAllDone ? '#fff' : '#475569', 
                        fontSize: '0.85rem', 
                        fontWeight: 'bold',
                        boxShadow: isAllDone ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'inset 0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'all 0.3s',
                        flexShrink: 0
                    }}>
                        {isAllDone ? '✓' : (idx + 1)}
                    </div>
                    
                    {isEditing ? (
                        <input 
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={() => {
                                setIsEditing(false);
                                if (editText.trim() !== '' && editText !== step.text) {
                                    handleEditStepText(step.id, editText.trim());
                                } else {
                                    setEditText(step.text);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setIsEditing(false);
                                    if (editText.trim() !== '' && editText !== step.text) {
                                        handleEditStepText(step.id, editText.trim());
                                    } else {
                                        setEditText(step.text);
                                    }
                                }
                                if (e.key === 'Escape') {
                                    setIsEditing(false);
                                    setEditText(step.text);
                                }
                            }}
                            onPointerDown={(e) => e.stopPropagation()} // Prevent drag when interacting
                            style={{
                                flex: 1,
                                padding: '4px 8px',
                                border: '1px solid #3b82f6',
                                borderRadius: '6px',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                outline: 'none',
                                fontFamily: 'inherit'
                            }}
                        />
                    ) : (
                        <h5 
                            onClick={(e) => {
                                if (profile?.role !== 'worker' && profile?.role !== 'apprentice') {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                }
                            }}
                            style={{ margin: 0, fontSize: '1.1rem', color: isAllDone ? '#065f46' : '#0f172a', fontWeight: '700', letterSpacing: '-0.01em', cursor: 'text', wordBreak: 'break-word', minWidth: 0, flex: 1 }}
                        >
                            {step.text}
                        </h5>
                    )}
                    
                    <span style={{ 
                        fontSize: '0.8rem', 
                        color: isAllDone ? '#059669' : '#64748b', 
                        marginLeft: '4px',
                        backgroundColor: isAllDone ? '#d1fae5' : '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        flexShrink: 0
                    }}>
                        {completedSub} / {totalSub}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                        <>
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setIsEditing(true); 
                                }}
                                title="Rediger Trin"
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <Edit2 size={18} />
                            </button>
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setStepToDelete(step);
                                }}
                                title="Slet Trin"
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <Trash2 size={18} />
                            </button>
                        </>
                    )}
                    <ChevronDown 
                        size={20} 
                        style={{ 
                            color: isAllDone ? '#10b981' : '#94a3b8', 
                            transform: step.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', 
                            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                        }} 
                    />
                </div>
            </div>
            
            {/* Udklappet indhold */}
            <div 
                onPointerDown={(e) => e.stopPropagation()} // Stop drag for the expanded content
                style={{ 
                    maxHeight: step.isExpanded ? '2000px' : '0', 
                    opacity: step.isExpanded ? 1 : 0, 
                    overflow: 'hidden', 
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
                }}
            >
                {children}
            </div>
        </div>
    );
}

const isConfirmedCase = (lead) => {
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

// Rundtur for Sager & Ordrestyring (Bølge 2). Lyser hele afsnit op, åbner en
// eksempel-sag (mockup, IKKE en rigtig DB-sag) og går gennem ordrestyringen,
// så nye brugere uden sager kan opleve hele flowet. Kun desktop, første gang.
const CASES_DEMO_ID = '__bison_tour_demo_case__';
const CASES_DEMO_CASE = {
    id: CASES_DEMO_ID,
    case_number: '1042',
    status: 'Bekræftet opgave',
    created_at: new Date().toISOString(),
    customer_name: 'Bruns Byg ApS',
    customer_address: 'Byggevej 12, 8000 Aarhus C',
    project_category: 'Gulvarbejde',
    raw_data: {
        project_title: 'Nyt trægulv i stue',
        customerDetails: { customerType: 'erhverv', cvr: '12345678', fullName: 'Mads Bruns' },
        checklist: [
            { id: 'demo-todo-1', text: 'Opmåling og klargøring', done: true, subTasks: [] },
            { id: 'demo-todo-2', text: 'Levering af materialer', done: true, subTasks: [] },
            { id: 'demo-todo-3', text: 'Montering af gulv', done: false, subTasks: [] },
            { id: 'demo-todo-4', text: 'Slibning og oliebehandling', done: false, subTasks: [] },
            { id: 'demo-todo-5', text: 'Oprydning og aflevering', done: false, subTasks: [] },
        ],
        time_entries: [
            { id: 'demo-time-1', employeeId: 'demo-worker', hours: 16, date: new Date().toISOString().slice(0, 10), notes: 'Opmåling + klargøring' },
            { id: 'demo-time-2', employeeId: 'demo-worker', hours: 8, date: new Date().toISOString().slice(0, 10), notes: 'Levering af materialer' },
        ],
        // Eksempel-materialeliste, så Materialer-fanen viser rigtigt indhold under rundvisningen.
        material_list: [
            { listId: 'default', item: 'Egeplanke 14 mm', qty: 45, unit: 'm²', section: 'Hovedmaterialer' },
            { listId: 'default', item: 'Undergulv / trinlydsplade', qty: 45, unit: 'm²', section: 'Hovedmaterialer' },
            { listId: 'default', item: 'Gulvlim', qty: 6, unit: 'spand', section: 'Hovedmaterialer' },
            { listId: 'default', item: 'Hærdende gulvolie', qty: 3, unit: 'L', section: 'Tilbehør' },
            { listId: 'default', item: 'Fodliste eg', qty: 28, unit: 'm', section: 'Tilbehør' },
        ],
        material_lists_meta: [{ id: 'default', name: 'Materialeliste til Opgaven', price: '' }],
        // Et par log-linjer, så Byggeproces-fanen har indhold.
        logs: [
            { id: 'demo-log-1', status: 'green', text: 'Sag oprettet og overdraget til byggepladsen.', author: 'Systemet', date: new Date().toISOString() },
            { id: 'demo-log-2', status: 'green', text: 'Opmåling udført — gulvet er klar til montering.', author: 'Niklas', date: new Date().toISOString() },
        ],
        assigned_pm: [],
        assigned_workers: [],
        assigned_subcontractors: [],
        calc_data: { laborHours: 40 },
        is_manual_quote: false,
        confirmed_at: new Date().toISOString(),
        case_messages: [],
        details: { phases: [] },
    },
};

// Trin 0-3 er på listen; trin 4+ kræver at eksempel-sagen er åben (interiøret).
const CASES_TOUR_DETAIL_FROM = 4;
// Hvert interiør-trin kan skifte til en bestemt fane, så indholdet åbner ("bang").
const CASES_TOUR_STEPS = [
    { sel: '[data-tour="cases-header"]', placement: 'bottom', eyebrow: 'Sager & Ordrestyring', title: 'Her bor dine opgaver', body: 'Når en kunde accepterer et tilbud, bliver det automatisk til en sag her — klar til at blive styret fra start til faktura.' },
    { sel: '[data-tour="cases-tabs"]', placement: 'bottom', eyebrow: 'Overblik', title: 'Mine sager vs. alle sager', body: '"Mine sager" er dem, du selv er sat på. "Alle sager" viser hele firmaets — så du altid kan finde en sag og hjælpe til.' },
    { sel: '[data-tour="cases-search"]', placement: 'bottom', eyebrow: 'Find hurtigt', title: 'Søg på tværs', body: 'Søg på sagsnummer, kunde, adresse eller telefon — også når listen vokser.' },
    { sel: '[data-tour="cases-demo-card"]', placement: 'right', eyebrow: 'Sådan ser en sag ud', title: 'Et hurtigt overblik', body: 'Status, fremdrift, timer mod estimat og hvem der er på holdet. Tryk Næste, så åbner vi sagen og kigger indenfor.' },
    { sel: '[data-tour="case-detail-header"]', placement: 'bottom', subTab: 'todo', eyebrow: 'Inde i sagen', title: 'Du er nu inde i ordrestyringen', body: 'Alt om opgaven samlet her — kunde, status og hele forløbet. Vi kigger lige fanerne igennem.' },
    { sel: '[data-tour="case-tab-todo"]', placement: 'bottom', subTab: 'todo', eyebrow: 'Fane 1', title: 'Bygge To-Do (KS)', body: 'Kryds bygge-trin af efterhånden — fremdrift og kvalitetssikring følger automatisk med.' },
    { sel: '[data-tour="case-tab-materials"]', placement: 'bottom', subTab: 'materials', eyebrow: 'Fane 2', title: 'Materialer & Indkøb', body: 'Hold styr på materialelisten og send bestillinger — alt knyttet til den enkelte opgave.' },
    { sel: '[data-tour="case-tab-logs"]', placement: 'bottom', subTab: 'logs', eyebrow: 'Fane 3', title: 'Byggeproces', body: 'Tidslinje med log og ekstraarbejde — så I altid kan dokumentere, hvad der er sket på pladsen.' },
    { sel: '[data-tour="case-tab-timesheet"]', placement: 'bottom', subTab: 'timesheet', eyebrow: 'Fane 4', title: 'Timeregistrering', body: 'Registrér timer på sagen — klar til løn og fakturering.' },
    // De sidste tre faner vises kun (skifter ikke fane), så vi ikke loader fra
    // databasen på prøvesagen — man kan altid åbne dem på en rigtig sag.
    { sel: '[data-tour="case-tab-invoices"]', placement: 'bottom', eyebrow: 'Fane 5', title: 'Bilag', body: 'Saml kvitteringer og bilag på sagen — klar til bogføring og fakturering.' },
    { sel: '[data-tour="case-tab-extra-work"]', placement: 'bottom', eyebrow: 'Fane 6', title: 'Aftalesedler', body: 'Dokumentér ekstraarbejde som aftalesedler, så du altid kan fakturere det, der kommer til undervejs.' },
    { sel: '[data-tour="case-tab-drawings"]', placement: 'bottom', eyebrow: 'Fane 7', title: 'Tegninger', body: 'Hav tegninger og plantegninger lige ved hånden — knyttet direkte til sagen.' },
];

export default function CaseManagement({ targetCaseId, clearTargetCase, leads = [], profile, simulatedRole, syncToAccounting, onOpenInvoice, onOpenChat, onUpdateLead, isModalView = false, selectedLeadId = null, carpenterProfile, setCarpenterProfile, onCreateQuote, onCreateCase, onOpenMaterialBuilder }) {
    const [activeCases, setActiveCases] = useState([]);
    // Rundtur: aktiv ved første besøg (desktop, ikke i modal-visning).
    const [casesTourActive, setCasesTourActive] = useState(() => !isModalView && shouldShowCoach('cases_tour'));
    // Afslutnings-boks efter rundturen (CTA: lav et tilbud).
    const [showCasesTourEnd, setShowCasesTourEnd] = useState(false);
    const [caseViewTab, setCaseViewTab] = useState('mine'); // 'mine' = mine sager (standard), 'all' = alle firmaets bekræftede sager
    const [caseSearch, setCaseSearch] = useState('');
    const [selectedCaseIdState, setSelectedCaseIdState] = useState(null);
    // Under rundvisningen kan eksempel-sagen "åbnes" uden at den findes i DB/listen.
    const selectedCase = activeCases.find(c => c.id === selectedCaseIdState)
        || (casesTourActive && selectedCaseIdState === CASES_DEMO_ID ? CASES_DEMO_CASE : null);
    const [stepToDelete, setStepToDelete] = useState(null);

    const [activeSubTab, setActiveSubTab] = useState(['worker', 'apprentice', 'sales'].includes(profile?.role) ? 'timesheet' : 'todo'); // 'todo', 'materials', 'logs', 'timesheet', 'finance'
    const tabContentRef = useRef(null);

    // --- DND KIT SENSORS OG HANDLER ---
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const handleDragEndGlobal = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const type = active.data.current?.type;

        if (type === 'Step') {
            const oldIndex = todoList.findIndex(s => s.id === active.id);
            const newIndex = todoList.findIndex(s => s.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                const updatedTodoList = arrayMove(todoList, oldIndex, newIndex);
                setTodoList(updatedTodoList);
                saveCaseDataToDb({ checklist: updatedTodoList });
            }
        } else if (type === 'SubTask') {
            const stepId = active.data.current?.stepId;
            if (!stepId) return;

            const updatedTodoList = [...todoList];
            const stepIndex = updatedTodoList.findIndex(s => s.id === stepId);
            if (stepIndex === -1) return;

            const subs = updatedTodoList[stepIndex].subTasks || [];
            const oldIndex = subs.findIndex(s => s.id === active.id);
            const newIndex = subs.findIndex(s => s.id === over.id);

            updatedTodoList[stepIndex].subTasks = arrayMove(subs, oldIndex, newIndex);
            
            setTodoList(updatedTodoList);
            saveCaseDataToDb({ checklist: updatedTodoList });
        }
    };
    // ------------------------------------

    const [team, setTeam] = useState([]);

    // States til delegering
    const [pmIds, setPmIds] = useState([]);
    const [assignedWorkers, setAssignedWorkers] = useState([]);
    const [pmDropdownOpen, setPmDropdownOpen] = useState(false);
    const [workerDropdownOpen, setWorkerDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    // Luk "Skift Status"-dropdown'en ved klik/tap udenfor eller Escape.
    // (PM-/medarbejder-vælgerne er portal-modaler og lukker allerede på baggrunds-klik.)
    const statusDropdownRef = useRef(null);
    useClickOutside(statusDropdownRef, () => setIsStatusDropdownOpen(false), isStatusDropdownOpen);
    const [isSavingTeam, setIsSavingTeam] = useState(false);
    const [isSavedTeam, setIsSavedTeam] = useState(false);
    const [statusToChange, setStatusToChange] = useState(null);

    // Løn-lås: timer i en lønkørt periode kan ikke redigeres
    const [payrollSettings, setPayrollSettings] = useState(null);
    const lockedUntil = getEffectiveLockedUntil(payrollSettings);
    const isTimeLocked = (dateVal) => isDateLocked(dateVal, lockedUntil);

    // Profil-kort (kun arbejdsinfo) når man klikker på en person på holdet
    const [profilePerson, setProfilePerson] = useState(null);

    // Underleverandører på sagen (per sag — svende kan variere fra sag til sag)
    const [assignedSubs, setAssignedSubs] = useState([]);
    const [expandedSubId, setExpandedSubId] = useState(null);
    const [newSubWorker, setNewSubWorker] = useState({ name: '', phone: '' });

    // States til to-do
    const [todoList, setTodoList] = useState([]);
    const [newTodoText, setNewTodoText] = useState('');
    const [showHourCompare, setShowHourCompare] = useState(false);
    const [showBreakdownEdit, setShowBreakdownEdit] = useState(false);
    const editBreakdownRef = useRef(null); // seneste redigerede delopgaver, gemmes ved luk

    // States til logs
    const [logsList, setLogsList] = useState([]);
    const [newLogText, setNewLogText] = useState('');
    // Stemme-diktering til log-modalen (genbruger /api/process-voice)
    const logDictation = useVoiceDictation((text) => setNewLogText(prev => (prev ? prev + ' ' : '') + text));
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [logStatus, setLogStatus] = useState('green'); // 'green', 'yellow', 'red'
    const [logPhotos, setLogPhotos] = useState([]); // Previews (blob URLs)
    const [editingLogId, setEditingLogId] = useState(null);
    const [logToDelete, setLogToDelete] = useState(null);
    const [existingPhotos, setExistingPhotos] = useState([]);
    const [logFiles, setLogFiles] = useState([]); // Actual File objects
    const [isUploadingLog, setIsUploadingLog] = useState(false);

    // States til Fakturering (Finance)
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [subcontractors, setSubcontractors] = useState([]);
    const [subcontractorSearch, setSubcontractorSearch] = useState('');
    const [showInviteSubcontractorModal, setShowInviteSubcontractorModal] = useState(false);
    
    // DAILY MESSAGE STATE
    const [isDailyMessageOpen, setIsDailyMessageOpen] = useState(false);
    const [newDailyMessage, setNewDailyMessage] = useState('');
    
    useEffect(() => {
        if (selectedCase?.raw_data?.daily_message?.date) {
            const msgDate = new Date(selectedCase.raw_data.daily_message.date).toDateString();
            const today = new Date().toDateString();
            if (msgDate === today) {
                setNewDailyMessage(selectedCase.raw_data.daily_message.text || '');
            } else {
                setNewDailyMessage('');
            }
        } else {
            setNewDailyMessage('');
        }
    }, [selectedCase]);

    const handleSaveDailyMessage = async () => {
        if (!newDailyMessage.trim()) return;
        const msgData = {
            text: newDailyMessage,
            date: new Date().toISOString(),
            author: profile.name || profile.role,
            seen_by: [profile.id] // Mark as seen by the author immediately
        };
        
        const { data: latestData } = await supabase.from('leads').select('raw_data').eq('id', selectedCase.id).single();
        const currentRawData = latestData?.raw_data || selectedCase.raw_data || {};
        
        const updatedRawData = {
            ...currentRawData,
            daily_message: msgData
        };
        
        // Skriv FØRST — vis først "gemt" når det faktisk ER gemt (ellers lyver toasten
        // ved offline/fejl, og beskeden går tabt uden at nogen opdager det).
        const { error } = await supabase.from('leads').update({ raw_data: updatedRawData }).eq('id', selectedCase.id);
        if (error) {
            console.error('Kunne ikke gemme dagens besked:', error);
            toast.error(friendlyError(error, 'Kunne ikke gemme beskeden. Tjek din forbindelse og prøv igen.'));
            return;
        }

        onUpdateLead({ ...selectedCase, raw_data: updatedRawData });
        setIsDailyMessageOpen(false);
        toast.success("Dagens besked gemt!");
    };

    // --- Sags-beskeder (dagens huske-ting til hele holdet eller en bestemt person) ---
    const [msgRecipient, setMsgRecipient] = useState('all');
    const canSendMessage = ['admin', 'boss', 'sales'].includes(profile?.role);

    // Personer på sagen (projektledere + svende), til modtager-vælgeren.
    const caseRecipients = (() => {
        const pm = selectedCase?.raw_data?.assigned_pm;
        const pmArr = Array.isArray(pm) ? pm : (pm ? [pm] : []);
        const ids = [...new Set([...pmArr, ...((selectedCase?.raw_data?.assigned_workers) || [])].map(String))];
        return ids.map(id => {
            const m = team.find(t => String(t.id) === id);
            return { id, name: m?.owner_name || m?.company_name || 'Medarbejder', role: m?.role };
        });
    })();

    const handleSendCaseMessage = async () => {
        if (!newDailyMessage.trim() || !selectedCase) return;
        const author = { name: profile?.owner_name || profile?.name || profile?.company_name || 'Mester', role: profile?.role };
        const msg = buildCaseMessage({ text: newDailyMessage, forId: msgRecipient === 'all' ? null : msgRecipient, author });
        // Vis beskeden optimistisk med det samme, uanset net.
        const applyOptimistic = () => {
            const updatedRawData = { ...(selectedCase.raw_data || {}), case_messages: [ ...((selectedCase.raw_data?.case_messages) || []), msg ] };
            if (onUpdateLead) onUpdateLead({ ...selectedCase, raw_data: updatedRawData });
            setNewDailyMessage('');
            setMsgRecipient('all');
            setIsDailyMessageOpen(false);
        };
        try {
            await mutateCaseMessages({ leadId: selectedCase.id, add: [msg] });
            applyOptimistic();
            toast.success(msg.forId ? 'Besked sendt til medarbejderen!' : 'Besked sendt til holdet!');
        } catch (e) {
            // Offline: gem i køen (sendes automatisk når nettet er tilbage) i stedet
            // for at tabe beskeden. Beskeden er en ren, additiv RPC — sikker at afspille.
            if (isOfflineError(e)) {
                enqueueMutation('case_message', { leadId: String(selectedCase.id), add: [msg] });
                applyOptimistic();
                toast('Ingen forbindelse — beskeden sendes automatisk når du får net igen.', { icon: '📡', duration: 5000 });
            } else {
                console.error('Send besked fejl:', e);
                toast.error(friendlyError(e, 'Kunne ikke sende besked.'));
            }
        }
    };

    const [invoiceLines, setInvoiceLines] = useState([]);
    const [isReverseCharge, setIsReverseCharge] = useState(false);
    const [invoiceActionType, setInvoiceActionType] = useState('draft'); // 'draft' eller 'book_and_send'


    // States til timeregistrering
    const [timeEntries, setTimeEntries] = useState([]);
    const [newTime, setNewTime] = useState({ startTime: '07:00', endTime: '15:00', date: new Date().toISOString().substring(0, 10), desc: '', employeeId: '' });
    const [deductPause, setDeductPause] = useState(true);
    const [editingTimeId, setEditingTimeId] = useState(null);
    const [deletingTimeEntryId, setDeletingTimeEntryId] = useState(null);
    const [timeOverwriteWarning, setTimeOverwriteWarning] = useState(null);
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
    const [subRates, setSubRates] = useState({});          // subId -> timeløn (kr/time ekskl. moms) til fakturapris-kontrol
    const [ownCostRate, setOwnCostRate] = useState('');    // kostpris/time for eget hold (kun til sags-overblik, påvirker ikke løn)
    const [timeDateFilter, setTimeDateFilter] = useState(null);  // null = alle dage, ellers 'YYYY-MM-DD'

    // States til Mesterens ugentlige medarbejder-tidsstyring
    const [selectedEmployeeForTidslog, setSelectedEmployeeForTidslog] = useState('');

    // Mobil & Worker Check-in states
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [showTeamSheet, setShowTeamSheet] = useState(false);
    const [infoSheetType, setInfoSheetType] = useState(null);

    const getTabScrollTargets = (element) => {
        const candidates = [
            element?.closest?.('.tab-pane.active'),
            element?.closest?.('.dashboard-content'),
            document.scrollingElement,
            window
        ].filter(Boolean);

        return candidates.filter((candidate, index) => candidates.indexOf(candidate) === index);
    };

    const scrollTabContentIntoView = (tabId) => {
        const scrollOnce = () => {
            const target = tabContentRef.current?.firstElementChild || tabContentRef.current;
            if (!target) return;

            const offset = tabId === 'drawings' ? (isMobile ? -80 : -140) : (isMobile ? 12 : 24);
            const targetRect = target.getBoundingClientRect();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });

            getTabScrollTargets(target).forEach((scrollTarget) => {
                if (scrollTarget === window || scrollTarget === document.scrollingElement) {
                    const targetTop = targetRect.top + window.scrollY - offset;
                    window.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
                    return;
                }

                const parentRect = scrollTarget.getBoundingClientRect();
                scrollTarget.scrollTo({
                    top: Math.max(scrollTarget.scrollTop + targetRect.top - parentRect.top - offset, 0),
                    behavior: 'smooth'
                });
            });
        };

        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                scrollOnce();
                if (tabId === 'drawings') {
                    window.setTimeout(scrollOnce, 160);
                }
            });
        });
    };

    const handleSubTabChange = (tabId) => {
        setActiveSubTab(tabId);
        scrollTabContentIntoView(tabId);
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const isMobileWorker = ['worker', 'apprentice', 'sales'].includes(profile?.role) && isMobile;
    const activeCheckIn = timeEntries.find(t => t.employeeId === profile?.id && t.endTime === null);

    // Indlæs data
    useEffect(() => {
        const confirmed = leads.filter(l => isConfirmedCase(l));

        // Alle i firmaet kan nu se alle bekræftede sager (RLS afgrænser til eget firma).
        // Svende/lærlinge ser dog ikke tabte/afbrudte sager (irrelevant støj) — sælgere/ledere ser alt.
        const isFieldRole = ['worker', 'apprentice'].includes(profile?.role);
        const visible = (isFieldRole && !simulatedRole)
            ? confirmed.filter(c => c.status !== 'Afbrudt Sag')
            : confirmed;
        setActiveCases(visible);

        // Hent teamet (carpenters)
        fetchTeam();

        // Hent gemte underleverandører (eksterne partnere uden login)
        fetchSubcontractors();

        // Hent løn-lås (så låste timer ikke kan redigeres)
        const payCid = profile?.company_id || profile?.id;
        if (payCid) fetchPayrollSettings(payCid).then(setPayrollSettings);

        // Hvis det er modal-visning (vi har åbnet en sag direkte i lead detail modalen)
        if (isModalView && selectedLeadId) {
            setSelectedCaseIdState(selectedLeadId);
        }

        if (profile) {
            setNewTime(prev => ({ ...prev, employeeId: ['worker', 'apprentice', 'sales'].includes(profile.role) ? profile.id : '' }));
        }
    }, [leads, isModalView, selectedLeadId, profile, simulatedRole]);

    // Fra Dashboard (Active Tab)
    useEffect(() => {
        if (targetCaseId && !isModalView) {
            setSelectedCaseIdState(targetCaseId);
            clearTargetCase();
        }
    }, [targetCaseId, activeCases, isModalView, clearTargetCase]);
    // Indlæs sags-data når en sag vælges eller opdateres via Realtime
    useEffect(() => {
        if (selectedCaseIdState && selectedCase) {
            loadCaseData();
        }
    }, [selectedCaseIdState, selectedCase]);
    const fetchTeam = async () => {
        try {
            const companyId = profile.company_id || profile.id;
            const { data, error } = await supabase
                .from('carpenters')
                .select('*')
                .eq('company_id', companyId);

            if (!error && data) {
                const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isDev) {
                    const mockUsers = [
                        { id: 'mock-pm-1', owner_name: 'Christian (Projektleder)', role: 'sales' },
                        { id: 'mock-worker-1', owner_name: 'Niklas (Tømrersvend)', role: 'worker' },
                        { id: 'mock-worker-2', owner_name: 'Kasper (Tømrerlærling)', role: 'apprentice' },
                        { id: 'mock-acc-1', owner_name: 'Hanne (Bogholder)', role: 'accountant' }
                    ];
                    const enrichedData = [...data];
                    for (const mockUser of mockUsers) {
                        if (!enrichedData.find(u => u.id === mockUser.id)) {
                            enrichedData.push(mockUser);
                        }
                    }
                    setTeam(enrichedData);
                } else {
                    setTeam(data);
                }
            } else {
                throw new Error("Kunne ikke hente team");
            }
        } catch (err) {
            // Fallback for team på localhost ved API fejl
            setTeam([
                { id: profile.id, owner_name: profile.owner_name + ' (Dig)', role: 'admin' },
                { id: 'mock-pm-1', owner_name: 'Christian (Projektleder)', role: 'sales' },
                { id: 'mock-worker-1', owner_name: 'Niklas (Tømrersvend)', role: 'worker' },
                { id: 'mock-worker-2', owner_name: 'Kasper (Tømrerlærling)', role: 'apprentice' },
                { id: 'mock-acc-1', owner_name: 'Hanne (Bogholder)', role: 'accountant' }
            ]);
        }
    };

    const fetchSubcontractors = async () => {
        try {
            const companyId = profile.company_id || profile.id;
            const { data, error } = await supabase
                .from('subcontractors')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });
            if (!error && data) setSubcontractors(data);
        } catch (err) {
            // Tabellen findes måske ikke endnu — fejl ignoreres, så intet eksisterende går i stykker
            console.warn('Kunne ikke hente underleverandører:', err);
        }
    };

    const loadCaseData = () => {
        if (!selectedCase) return;
        const caseId = selectedCase.id;

        // 1. Indlæs Delegering (PM og Workers)
        const savedPm = selectedCase.raw_data?.assigned_pm || [];
        setPmIds(Array.isArray(savedPm) ? savedPm : (savedPm ? [savedPm] : []));
        const savedWorkers = selectedCase.raw_data?.assigned_workers || [];
        setAssignedWorkers(savedWorkers);
        const savedSubs = selectedCase.raw_data?.assigned_subcontractors || [];
        setAssignedSubs(Array.isArray(savedSubs) ? savedSubs : []);

        // 2. Indlæs To-Do Liste
        const savedTodo = selectedCase.raw_data?.checklist || [];
        if (savedTodo.length > 0) {
            if (savedTodo.some(t => !t.subTasks)) {
                const legacyNested = [{
                    id: 'legacy-step-1',
                    text: 'Gammel To-Do Liste (Importeret)',
                    isExpanded: true,
                    subTasks: savedTodo.map((old, i) => ({ id: old.id || `leg-${i}`, text: old.text, done: !!old.done }))
                }];
                setTodoList(legacyNested);
            } else {
                setTodoList(prev => {
                    return savedTodo.map(t => {
                        const existing = prev.find(p => p.id === t.id);
                        return { ...t, isExpanded: existing ? existing.isExpanded : false };
                    });
                });
            }
        } else {
            const defaultTodo = getDefaultChecklist(selectedCase);
            setTodoList(prev => {
                if (prev.length > 0 && prev[0].id !== 'legacy-step-1') return prev; 
                return defaultTodo.map(t => ({...t, isExpanded: false}));
            });
        }

        // 3. Indlæs Logbog
        const savedLogs = selectedCase.raw_data?.logs || [];
        if (savedLogs.length > 0) {
            setLogsList(savedLogs);
        } else {
            // Indlæs mock start-logs
            setLogsList([
                { id: 'log-start', status: 'green', text: 'Sag oprettet og overdraget til byggepladsen.', author: 'Systemet', date: selectedCase.created_at || new Date().toISOString() }
            ]);
        }

        // 4. Indlæs Timeregistreringer
        const savedTimes = selectedCase.raw_data?.time_entries || [];
        setTimeEntries(savedTimes);
    };

    // Standard To-Do opskrifter for faglige anvisninger, bygget dynamisk ud fra opgaven
        const getDefaultChecklist = (caseObj) => {
        const categoryMap = {
            'Nyt Gulv': 'floor', 'Gulv': 'floor', 'Nye Vinduer': 'windows', 'Vinduer': 'windows',
            'Nye Døre': 'doors', 'Døre': 'doors', 'Træterrasse': 'terrace', 'Terrasse': 'terrace',
            'Tagprojekt': 'roof', 'Tag': 'roof', 'Nyt Køkken': 'kitchen', 'Køkken': 'kitchen',
            'Renovering af badeværelse': 'bath', 'Badeværelse': 'bath', 'Nyt Badeværelse': 'bath',
            'Nye Lofter': 'ceilings', 'Lofter': 'ceilings', 'Ny Facadebeklædning': 'facades',
            'Facader': 'facades', 'Tilbygning': 'extensions', 'Anneks': 'annex', 'Annekser & Skure': 'annex',
            'Carport': 'carport', 'Hegn': 'fence'
        };
        const rawCat = caseObj.project_category || '';
        const category = categoryMap[rawCat] || rawCat;
        const d = caseObj.raw_data?.details || {};

        // Skræddersyede sager med etaper: byg bygge-to-do PR. ETAPE, så hvert fag
        // får sine egne byggetrin. Almindelige sager kører uændret (enkelt fag).
        const phases = caseObj.raw_data?.details?.phases;
        if (Array.isArray(phases) && phases.length > 0) {
            return buildPhasesChecklist(phases, d, category);
        }
        return getChecklistForCategory(category, d);
    };

    // Gemmer sagsoplysninger i Supabase/localStorage
    const handleStatusChange = async (newStatus, skipConfirm = false) => {
        if (!selectedCase) return;
        
        if (!skipConfirm) {
            setStatusToChange(newStatus);
            return;
        }

        // Ved bekræftelse sættes confirmed_at, så "dagen efter"-påmindelsen om
        // kalender-planlægning kan regne korrekt (kun hvis det ikke allerede er sat).
        const updatePayload = { status: newStatus };
        if (newStatus === 'Bekræftet opgave' && !selectedCase.raw_data?.confirmed_at) {
            const { data: latest } = await supabase.from('leads').select('raw_data').eq('id', selectedCase.id).single();
            updatePayload.raw_data = { ...(latest?.raw_data || selectedCase.raw_data || {}), confirmed_at: new Date().toISOString() };
        }

        const { error } = await supabase
            .from('leads')
            .update(updatePayload)
            .eq('id', selectedCase.id);

        if (error) {
            console.error('Fejl ved opdatering af status:', error);
            toast.error('Kunne ikke opdatere status');
        } else {
            toast.success(`Status ændret til ${newStatus}`);
            // Opdater lokalt så UI reagerer
            const updatedCase = { ...selectedCase, status: newStatus };
            // Vi trigger en state-opdatering for at tvinge et re-render, 
            // men da vi nu henter selectedCase fra leads prop automatisk, behøver vi ikke setSelectedCase.
            // Dog er new_time osv. stadig til stede, men vi overlader det egentlige gem til onUpdateLead nedstrøms
            // for at opdatere `leads` i `Dashboard`.
            if (onUpdateLead) onUpdateLead(updatedCase);
            // Da denne komponent kun viser Bekræftede opgaver, vil sagen forsvinde herfra
            // hvis den er sat i bero (selvom vi lige har åbnet for at den også kan vise "Sæt i bero").
            // For at sikre en smooth overgang:
            if (newStatus === 'Udgået opgave') {
                clearTargetCase(); // Gå tilbage
            }
        }
    };

    const saveCaseDataToDb = async (updatedFields) => {
        try {
            // Atomisk shallow-merge: kun de ændrede felter skrives server-side, så
            // samtidige ændringer af andre raw_data-nøgler ikke overskrives.
            const merged = await mutateLeadRawData(selectedCase.id, updatedFields);
            const updatedRawData = merged || { ...(selectedCase.raw_data || {}), ...updatedFields };
            const updatedCase = { ...selectedCase, raw_data: updatedRawData };
            // (Samme som ovenfor)
            if (onUpdateLead) onUpdateLead(updatedCase);
        } catch (err) {
            console.error('Kunne ikke gemme sagsdata:', err);
            // Local Storage fallback
            const localKey = `lead_case_data_${selectedCase.id}`;
            localStorage.setItem(localKey, JSON.stringify(updatedFields));
            
            const updatedCase = {
                ...selectedCase,
                raw_data: { ...(selectedCase.raw_data || {}), ...updatedFields }
            };
            // (Samme som ovenfor)
            if (onUpdateLead) onUpdateLead(updatedCase);
            toast.success('Gemt lokalt (Local Storage Fallback)');
        }
    };

    // Samtidigheds-sikker mutation af en liste i raw_data: henter altid den FRISKE
    // liste fra DB og fletter ændringen ind på element-niveau, så to brugere der
    // arbejder på samme sag samtidig ikke overskriver hinandens registreringer.
    const mutateCaseField = async (field, mutator, applyLocal) => {
        try {
            const { data: latestData } = await supabase.from('leads').select('raw_data').eq('id', selectedCase.id).single();
            const currentRawData = latestData?.raw_data || selectedCase.raw_data || {};
            const currentArr = Array.isArray(currentRawData[field]) ? currentRawData[field] : [];
            const newArr = mutator(currentArr);
            // Atomisk shallow-merge: kun DETTE felt skrives server-side, så samtidige
            // ændringer af ANDRE felter (fx time_entries) ikke overskrives (lost update).
            const merged = await mutateLeadRawData(selectedCase.id, { [field]: newArr });
            const updatedRawData = merged || { ...currentRawData, [field]: newArr };
            if (applyLocal) applyLocal(newArr);
            if (onUpdateLead) onUpdateLead({ ...selectedCase, raw_data: updatedRawData });
            return newArr;
        } catch (err) {
            console.error(`Kunne ikke gemme ${field}:`, err);
            toast.error(friendlyError(err, 'Kunne ikke gemme – tjek forbindelsen og prøv igen.'));
            return null;
        }
    };

    // Delegerings-håndtering
    const handleSaveAssignments = async () => {
        setIsSavingTeam(true);
        await saveCaseDataToDb({
            assigned_pm: pmIds,
            assigned_workers: assignedWorkers,
            assigned_subcontractors: assignedSubs
        });
        setIsSavingTeam(false);
        setIsSavedTeam(true);
        toast.success('Bemandingen er opdateret på sagen!');
        setTimeout(() => setIsSavedTeam(false), 2000);
    };

    const handleWorkerToggle = (workerId) => {
        if (assignedWorkers.includes(workerId)) {
            setAssignedWorkers(assignedWorkers.filter(id => id !== workerId));
        } else {
            setAssignedWorkers([...assignedWorkers, workerId]);
        }
    };

    // --- Underleverandører på sagen ---
    const attachSubcontractor = (sc) => {
        if (assignedSubs.some(s => s.id === sc.id)) {
            setAssignedSubs(assignedSubs.filter(s => s.id !== sc.id)); // toggle af
            return;
        }
        // Gem et snapshot af firma+mester på sagen, så oplysningerne bevares.
        // Hele holdet kommer med (mester + alle svende/lærlinge) — så "underleverandør
        // på sagen" altid betyder hele deres crew.
        setAssignedSubs([...assignedSubs, {
            id: sc.id,
            company_name: sc.company_name,
            trade: sc.trade || '',
            contact_name: sc.contact_name || '',
            contact_phone: sc.contact_phone || '',
            contact_email: sc.contact_email || '',
            workers: sc.workers || [],
            selected_workers: (sc.workers || []).map(w => w.id)
        }]);
    };

    const removeSubcontractor = (subId) => {
        setAssignedSubs(assignedSubs.filter(s => s.id !== subId));
    };

    // Nyoprettet underleverandør fra modal: gem i registret OG sæt på sagen
    const handleSubcontractorCreated = (saved) => {
        setSubcontractors(prev => prev.some(s => s.id === saved.id) ? prev : [saved, ...prev]);
        attachSubcontractor(saved);
    };

    const addSubWorker = (subId) => {
        if (!newSubWorker.name.trim()) { toast.error('Angiv et navn på svenden/lærlingen.'); return; }
        setAssignedSubs(assignedSubs.map(s => s.id === subId
            ? { ...s, workers: [...(s.workers || []), { id: `sw-${Date.now()}`, name: newSubWorker.name.trim(), phone: newSubWorker.phone.trim() }] }
            : s));
        setNewSubWorker({ name: '', phone: '' });
    };

    const removeSubWorker = (subId, workerId) => {
        setAssignedSubs(assignedSubs.map(s => s.id === subId
            ? { ...s, workers: (s.workers || []).filter(w => w.id !== workerId) }
            : s));
    };

    // To-Do / Checklist-håndtering
    const handleTodoToggle = (mainId, subId) => {
        const updated = todoList.map(step => {
            if (step.id === mainId) {
                const updatedSub = step.subTasks.map(sub => {
                    if (sub.id === subId) {
                        return { ...sub, done: !sub.done };
                    }
                    return sub;
                });
                return { ...step, subTasks: updatedSub };
            }
            return step;
        });
        setTodoList(updated);
        saveCaseDataToDb({ checklist: updated });
    };

    const handleAddTodo = (e) => {
        e.preventDefault();
        if (!newTodoText.trim()) return;

        const newMain = {
            id: `custom-main-${Date.now()}`,
            text: newTodoText.trim(),
            isExpanded: true,
            subTasks: []
        };

        const updated = [...todoList, newMain];
        setTodoList(updated);
        setNewTodoText('');
        saveCaseDataToDb({ checklist: updated });
        toast.success('Nyt hovedtrin tilføjet!');
    };

    const handleAddSubTask = (mainId, text) => {
        if (!text.trim()) return;
        const updated = todoList.map(step => {
            if (step.id === mainId) {
                return {
                    ...step,
                    subTasks: [...step.subTasks, { id: `custom-sub-${Date.now()}`, text: text.trim(), done: false }]
                };
            }
            return step;
        });
        setTodoList(updated);
        saveCaseDataToDb({ checklist: updated });
        toast.success('Underpunkt tilføjet');
    };

    const handleDeleteSubTask = (mainId, subId) => {
        const updated = todoList.map(step => {
            if (step.id === mainId) {
                return {
                    ...step,
                    subTasks: step.subTasks.filter(sub => sub.id !== subId)
                };
            }
            return step;
        });
        setTodoList(updated);
        saveCaseDataToDb({ checklist: updated });
        toast.success('Underpunkt slettet');
    };

    const handleDeleteStep = () => {
        if (!stepToDelete) return;
        const updated = todoList.filter(s => s.id !== stepToDelete.id);
        setTodoList(updated);
        saveCaseDataToDb({ checklist: updated });
        setStepToDelete(null);
        toast.success('Trin slettet');
    };

    const handleEditSubTaskText = (mainId, subId, newText) => {
        const updated = todoList.map(step => {
            if (step.id === mainId) {
                return {
                    ...step,
                    subTasks: step.subTasks.map(sub => 
                        sub.id === subId ? { ...sub, text: newText } : sub
                    )
                };
            }
            return step;
        });
        setTodoList(updated);
        saveCaseDataToDb({ checklist: updated });
        toast.success('Underpunkt opdateret');
    };

    const handleEditStepText = (stepId, newText) => {
        const updated = todoList.map(step => 
            step.id === stepId ? { ...step, text: newText } : step
        );
        setTodoList(updated);
        saveCaseDataToDb({ checklist: updated });
        toast.success('Byggetrin opdateret');
    };

    const handleToggleExpand = (mainId) => {
        setTodoList(todoList.map(step => step.id === mainId ? { ...step, isExpanded: !step.isExpanded } : step));
    };
    
    const [speakingId, setSpeakingId] = useState(null);
    const speakText = (text, id = null) => {
        if (!('speechSynthesis' in window)) {
            toast.error('Oplæsning understøttes desværre ikke af din browser.');
            return;
        }
        // Tryk igen på samme punkt → stop oplæsningen.
        if (id && speakingId === id) {
            window.speechSynthesis.cancel();
            setSpeakingId(null);
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'da-DK';
        utterance.rate = 0.9;
        utterance.onend = () => setSpeakingId(null);
        utterance.onerror = () => setSpeakingId(null);
        window.speechSynthesis.speak(utterance);
        setSpeakingId(id);
    };


    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length-1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    // Logbog-håndtering
    
    const deleteLog = (logId) => {
        setLogToDelete(logId);
    };

    const confirmDeleteLog = async () => {
        if (!logToDelete) return;
        await mutateCaseField('logs', arr => arr.filter(l => l.id !== logToDelete), setLogsList);
        setLogToDelete(null);
        toast.success('Status slettet');
    };

    const handleAddLog = async (e) => {
        e.preventDefault();
        if (!newLogText.trim()) return;

        setIsUploadingLog(true);
        const currentAuthor = team.find(t => t.id === profile.id)?.owner_name || team.find(t => t.id === profile.id)?.company_name || profile.owner_name || profile.company_name || 'Mester';
        
        let uploadedPhotoUrls = [];
        try {
            if (logFiles.length > 0) {
                toast.loading('Uploader fotos...', { id: 'upload-toast' });
                
                for (let i = 0; i < logFiles.length; i++) {
                    const file = logFiles[i];
                    const fileExt = file.name.split('.').pop() || 'jpg';
                    const fileName = `log_${selectedCase.id}_${Date.now()}_${i}.${fileExt}`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from('uploads')
                        .upload(fileName, file, { cacheControl: '3600', upsert: false });
                        
                    if (uploadError) throw uploadError;
                    
                    const { data: { publicUrl } } = supabase.storage
                        .from('uploads')
                        .getPublicUrl(fileName);
                        
                    uploadedPhotoUrls.push(publicUrl);
                }
                toast.dismiss('upload-toast');
            }
        } catch (error) {
            console.error("Fejl ved upload af fotos til logbog:", error);
            toast.error('Der skete en fejl under upload af fotos. Prøv igen.');
            setIsUploadingLog(false);
            return;
        }

        if (editingLogId) {
            const finalPhotos = [...existingPhotos, ...uploadedPhotoUrls];
            await mutateCaseField('logs', arr => arr.map(l => l.id === editingLogId ? {
                ...l,
                status: logStatus,
                text: newLogText.trim(),
                photos: finalPhotos
            } : l), setLogsList);
            toast.success('Loggen blev opdateret!');
            setEditingLogId(null);
            setIsLogModalOpen(false);
        } else {
            const newLog = {
                id: `log-${Date.now()}`,
                status: logStatus,
                text: newLogText.trim(),
                author: currentAuthor,
                authorRole: profile?.role || 'Uoplyst',
                authorId: profile?.id,
                date: new Date().toISOString(),
                photos: uploadedPhotoUrls
            };
            await mutateCaseField('logs', arr => [newLog, ...arr], setLogsList);
            toast.success('Dagens arbejde gemt!');
        }
        setNewLogText('');
        setLogPhotos([]);
        setLogFiles([]);
        setExistingPhotos([]);
        setIsUploadingLog(false);
    };

    const handleRealPhotoUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        // Convert to local object URLs for preview
        const newPhotos = files.map(file => URL.createObjectURL(file));
        setLogPhotos([...logPhotos, ...newPhotos]);
        setLogFiles([...logFiles, ...files]);
        
        toast.success(`${files.length} foto(s) vedhæftet og klar til upload!`);
        
        // Reset input so the same files can be selected again if needed
        e.target.value = null;
    };
    
    const removePhoto = (indexToRemove) => {
        setLogPhotos(logPhotos.filter((_, idx) => idx !== indexToRemove));
        setLogFiles(logFiles.filter((_, idx) => idx !== indexToRemove));
    };

    // Beregn "Timer i alt" automatisk ud fra start/slut og pause
    useEffect(() => {
        if (!newTime.startTime || !newTime.endTime) return;
        const s = new Date(`1970-01-01T${newTime.startTime}`);
        const e = new Date(`1970-01-01T${newTime.endTime}`);
        let diff = (e - s) / 3600000;
        if (diff < 0) diff += 24;
        if (deductPause) diff -= 0.5;
        if (diff < 0) diff = 0;
        setNewTime(prev => ({ ...prev, hours: String(Math.round(diff * 4) / 4) }));
    }, [newTime.startTime, newTime.endTime, deductPause]);

    // "Som i går": udfyld med seneste registrering på sagen, på dags dato
    const fillFromLastCase = () => {
        const empId = newTime.employeeId || profile?.id;
        const sorted = [...timeEntries].filter(t => t.employeeId === empId).sort((a, b) => new Date(b.date) - new Date(a.date));
        const last = sorted[0] || [...timeEntries].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (!last) { toast.error('Ingen tidligere registrering på sagen at kopiere.'); return; }
        setNewTime({ ...newTime, startTime: last.startTime || '07:00', endTime: last.endTime || '15:00', date: new Date().toISOString().substring(0, 10), desc: last.desc || '' });
        toast.success('Udfyldt som seneste registrering.');
    };

    // Slår en underleverandør-person op ud fra et syntetisk id
    // (sub:<subId>:mester  eller  sub:<subId>:w:<workerId>).
    const subPersonFromId = (id) => {
        if (typeof id !== 'string' || !id.startsWith('sub:')) return null;
        const parts = id.split(':');
        const sub = (assignedSubs || []).find(s => String(s.id) === parts[1]);
        if (!sub) return null;
        if (parts[2] === 'mester') return { name: sub.contact_name || sub.company_name, subId: sub.id, company: sub.company_name };
        if (parts[2] === 'w') {
            const w = (sub.workers || []).find(x => String(x.id) === parts.slice(3).join(':'));
            return { name: w?.name || 'Underleverandør', subId: sub.id, company: sub.company_name };
        }
        return null;
    };

    // Timeregistrering-håndtering
    const handleAddTimeEntry = async (e) => {
        e.preventDefault();

        const effectiveEmployeeId = newTime.employeeId || profile?.id;
        
        if (!newTime.startTime || !newTime.endTime || !effectiveEmployeeId) {
            toast.error('Udfyld venligst medarbejder, samt start- og sluttidspunkt');
            return;
        }

        if (isTimeLocked(newTime.date)) {
            toast.error(`Datoen er i en låst lønperiode (til og med ${formatDa(lockedUntil)}).`);
            return;
        }

        const emp = team.find(t => t.id === effectiveEmployeeId);
        let employeeName = emp?.owner_name || emp?.company_name || emp?.email;
        if (!employeeName) {
            const subP = subPersonFromId(effectiveEmployeeId);
            if (subP) employeeName = `${subP.name} (${subP.company})`;
        }
        if (!employeeName && editingTimeId) {
            const oldEntry = timeEntries.find(t => t.id === editingTimeId);
            if (oldEntry && oldEntry.employeeId === effectiveEmployeeId) {
                employeeName = oldEntry.employeeName;
            }
        }
        if (!employeeName) {
            employeeName = profile?.owner_name || profile?.company_name || 'Ukendt medarbejder';
        }

        const existingEntry = timeEntries.find(t => t.employeeId === effectiveEmployeeId && t.date === newTime.date && t.id !== editingTimeId);

        // Beregn timer
        const start = new Date(`${newTime.date}T${newTime.startTime}`);
        const end = new Date(`${newTime.date}T${newTime.endTime}`);
        let diffHours = (end - start) / (1000 * 60 * 60);
        if (diffHours < 0) {
            toast.error('Sluttid kan ikke være før starttid');
            return;
        }
        
        if (deductPause) {
            diffHours -= 0.5;
            if (diffHours < 0) diffHours = 0;
        }
        
        // Afrund til nærmeste kvarter
        diffHours = Math.round(diffHours * 4) / 4;

        // Manuel overskrivning af "Timer i alt" har forrang, ellers bruges den beregnede total
        const manualHours = parseFloat(String(newTime.hours ?? '').replace(',', '.'));
        const finalHours = (newTime.hours !== '' && newTime.hours != null && !isNaN(manualHours)) ? manualHours : diffHours;

        const fields = {
            startTime: snapToQuarter(newTime.startTime),
            endTime: snapToQuarter(newTime.endTime),
            hours: finalHours,
            date: newTime.date,
            desc: (newTime.desc || '').trim() || 'Almindeligt tømrerarbejde',
            employeeId: effectiveEmployeeId,
            employeeName: employeeName
        };

        if (existingEntry) {
            setTimeOverwriteWarning({ existingEntry, fields, employeeName, editingTimeId });
            return false; // Stop formen i at lukke modalen
        }

        if (editingTimeId) {
            // Flet mod frisk liste: opdater kun den ene registrering (rør ikke andres)
            await mutateCaseField('time_entries', arr => arr.map(t => t.id === editingTimeId ? { ...t, ...fields } : t), setTimeEntries);
            toast.success('Timeregistrering opdateret!');
            setEditingTimeId(null);
        } else {
            const entry = { id: `time-${Date.now()}`, ...fields };
            // Tilføj til frisk liste, så samtidige registreringer fra andre bevares
            await mutateCaseField('time_entries', arr => [entry, ...arr], setTimeEntries);
            toast.success('Timer registreret på sagen!');
        }

        setNewTime({ startTime: '07:00', endTime: '15:00', date: new Date().toISOString().substring(0, 10), desc: '', employeeId: ['worker', 'apprentice', 'sales'].includes(simulatedRole || profile?.role) ? profile.id : '' });
        return true;
    };

    const confirmTimeOverwrite = async () => {
        if (!timeOverwriteWarning) return;
        const { existingEntry, fields, editingTimeId } = timeOverwriteWarning;

        await mutateCaseField('time_entries', arr => {
            let newArr = [...arr];
            // Hvis vi var i gang med at redigere et indlæg (som vi nu ændrede datoen på), skal vi slette det gamle id
            if (editingTimeId && editingTimeId !== existingEntry.id) {
                newArr = newArr.filter(t => t.id !== editingTimeId);
            }
            // Overskriv den eksisterende post med de nye data
            return newArr.map(t => t.id === existingEntry.id ? { ...t, ...fields } : t);
        }, setTimeEntries);

        toast.success('Timeregistrering overskrevet!');
        setEditingTimeId(null);
        setNewTime({ startTime: '07:00', endTime: '15:00', date: new Date().toISOString().substring(0, 10), desc: '', employeeId: ['worker', 'apprentice', 'sales'].includes(simulatedRole || profile?.role) ? profile.id : '' });
        setTimeOverwriteWarning(null);
        setIsTimeModalOpen(false); // Luk modalen
    };

    const handleEditTime = (entry) => {
        if (isTimeLocked(entry.date)) {
            toast.error(`Timen er lønkørt og låst (til og med ${formatDa(lockedUntil)}).`);
            return;
        }
        setEditingTimeId(entry.id);
        setNewTime({
            startTime: entry.startTime,
            endTime: entry.endTime || '',
            date: entry.date,
            desc: entry.desc,
            employeeId: entry.employeeId
        });
        const sc = document.querySelector('.dashboard-content');
        if (sc && sc.scrollHeight > sc.clientHeight) {
            sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
    };

    const handleDeleteTime = (entryId) => {
        setDeletingTimeEntryId(entryId);
    };

    const confirmDeleteTime = async () => {
        if (!deletingTimeEntryId) return;
        const target = timeEntries.find(t => t.id === deletingTimeEntryId);
        if (target && isTimeLocked(target.date)) {
            toast.error('Timen er låst efter lønkørsel og kan ikke slettes.');
            setDeletingTimeEntryId(null);
            return;
        }
        // Slet kun den ene registrering mod frisk liste (rør ikke andres)
        await mutateCaseField('time_entries', arr => arr.filter(t => t.id !== deletingTimeEntryId), setTimeEntries);
        toast.success('Timeregistrering slettet.');
        setDeletingTimeEntryId(null);
    };

    const handleExportLonsystem = () => {
        // Filtrer underleverandører fra
        const payrollEntries = timeEntries.filter(entry => {
            const employee = team?.find(t => t.id === entry.employeeId);
            return employee?.role !== 'subcontractor';
        });

        if (payrollEntries.length === 0) {
            toast.error("Ingen løngivende timer at eksportere (Underleverandører ignoreres).");
            return;
        }

        // Simpel CSV format
        let csvContent = "data:text/csv;charset=utf-8,Dato,Medarbejder,Start,Slut,Timer,Beskrivelse\n";
        payrollEntries.forEach(row => {
            const rowStr = `${row.date},"${row.employeeName}",${row.startTime},${row.endTime},${row.hours},"${row.desc}"`;
            csvContent += rowStr + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Loen_Eksport_${selectedCase?.id}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Eksportér fil downloadet. Husk at disse ikke slettes automatisk her.");
    };
    const handleOpenInvoiceModal = (action) => {
        setInvoiceActionType(action);
        
        // Generer standard linjer
        const lines = [];
        
        // Linje 1: Oprindeligt tilbud
        lines.push({
            id: 'base',
            description: `Sag ${selectedCase?.case_number || String(selectedCase?.id).substring(0,8)}: ${selectedCase?.project_category || 'Tømreropgave'} - Oprindeligt tilbud`,
            priceExVat: Math.round(baseTotalPrice / 1.25)
        });

        // Linje 2..N: Byggeproces (Logbog) ekstraarbejde
        const changeOrders = logsList.filter(l => l.isChangeOrder && Number(l.extraPrice) > 0);
        changeOrders.forEach((co, idx) => {
            lines.push({
                id: `co_${idx}`,
                description: `Ekstraarbejde (Logbog): ${co.text.substring(0, 50)}${co.text.length > 50 ? '...' : ''}`,
                priceExVat: Math.round(Number(co.extraPrice) / 1.25)
            });
        });

        // Linje ..N: Nye Aftalesedler
        const extraAgreements = selectedCase?.raw_data?.extra_agreements || [];
        // Kun bekræftede aftalesedler kommer med på fakturaen ('bekraeftet' = underskrift
        // eller mail-bekræftelse; 'Godkendt' beholdes for bagudkompatibilitet).
        const approvedAgreements = extraAgreements.filter(a => a.status === 'bekraeftet' || a.status === 'Godkendt');
        approvedAgreements.forEach((agr, idx) => {
            if (agr.priceType === 'fast_pris' && Number(agr.amount) > 0) {
                lines.push({
                    id: `agr_${idx}`,
                    description: `Aftaleseddel: ${agr.title}`,
                    priceExVat: Math.round(Number(agr.amount) / 1.25)
                });
            } else if (agr.priceType === 'efter_regning') {
                // "Efter regning": brug den endelige pris hvis den er registreret, ellers 0 (udfyldes manuelt).
                const finalAmt = Number(agr.final_amount) || 0;
                lines.push({
                    id: `agr_regning_${idx}`,
                    description: `Aftaleseddel (Efter regning): ${agr.title}`,
                    priceExVat: finalAmt > 0 ? Math.round(finalAmt / 1.25) : 0
                });
            }
        });

        // Fratræk allerede faktureret som en negativ linje hvis vi vil (eller vi lader bare Mester rette)
        // invoiced_amount er allerede gemt EKSKL. moms (= summen af fakturalinjerne),
        // og linjerne her er også ekskl. moms — så fradraget skal være 1:1 (ingen /1.25,
        // ellers underfradrages aconto/efterfølgende fakturaer med momsens andel).
        const invoicedAmount = selectedCase?.raw_data?.invoiced_amount || 0;
        if (invoicedAmount > 0) {
            lines.push({
                id: 'already_invoiced',
                description: 'Allerede faktureret (Aconto) fratrækkes',
                priceExVat: -Math.round(invoicedAmount)
            });
        }

        setInvoiceLines(lines);
        setShowInvoiceModal(true);
    };
    const handleCheckIn = () => {
        const now = new Date();
        const entry = {
            id: `time-${Date.now()}`,
            startTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
            endTime: null,
            hours: 0,
            date: new Date().toISOString().substring(0, 10),
            desc: 'Aktiv tjek-ind (auto)',
            employeeId: profile?.id,
            employeeName: profile?.owner_name || profile?.company_name || 'Ukendt medarbejder'
        };
        const updated = [entry, ...timeEntries];
        setTimeEntries(updated);
        saveCaseDataToDb({ time_entries: updated });
        toast.success('Du er nu tjekket ind!');
    };

    const handleCheckOut = () => {
        const now = new Date();
        const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const entryIndex = timeEntries.findIndex(t => t.employeeId === profile?.id && t.endTime === null);
        if (entryIndex === -1) return;
        
        const entry = { ...timeEntries[entryIndex] };
        entry.endTime = nowTime;
        
        const start = new Date(`${entry.date}T${entry.startTime}`);
        const end = new Date(`${entry.date}T${entry.endTime}`);
        let diffHours = (end - start) / (1000 * 60 * 60);
        if (diffHours < 0) diffHours = 0;
        if (deductPause) { diffHours -= 0.5; if (diffHours < 0) diffHours = 0; }
        
        // Afrund til nærmeste kvarter
        entry.hours = Math.round(diffHours * 4) / 4;
        entry.desc = (newTime.desc || '').trim() || 'Arbejde udført (Tjek-ud)';
        
        const updated = [...timeEntries];
        updated[entryIndex] = entry;
        
        setTimeEntries(updated);
        setNewTime({ ...newTime, desc: '' });
        saveCaseDataToDb({ time_entries: updated });
        toast.success('Tjekket ud! Timerne er nu låst.');
    };

    // Beregn sagsfremskridt i procent
    const completedTodos = todoList.reduce((acc, step) => acc + (step.subTasks || []).filter(s => s.done).length, 0);
    const totalTodos = todoList.reduce((acc, step) => acc + (step.subTasks || []).length, 0);
    const progressPercent = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

    // Beregn tidsbudget overholdelse (inklusive godkendte aftalesedler)
    // Eget hold (firmaets medarbejdere). Underleverandører/gæster er BEVIDST ikke med her,
    // så deres timer ALDRIG blander sig med FORBRUG, timebudget eller løn for eget firma.
    const ownTeamIds = new Set([profile?.id, ...team.map(t => t.id)].filter(Boolean).map(String));
    const isOwnTeamEntry = (e) => ownTeamIds.has(String(e.employeeId));

    // FORBRUG = kun eget holds timer (mod eget timebudget).
    const totalActualHours = timeEntries
        .filter(isOwnTeamEntry)
        .filter(item => ['worker', 'apprentice', 'sales', 'guest'].includes(profile?.role) ? item.employeeId === profile.id : true)
        .reduce((sum, item) => sum + item.hours, 0);

    // Underleverandør-timer: alt registreret på folk uden for eget hold (mester + svende
    // via syntetiske id'er, eller en gæst der selv logger). Holdes 100% adskilt fra
    // FORBRUG/løn — bruges kun til den lilla boks + fakturapris-kontrol pr. underleverandør.
    const subcontractorHours = timeEntries
        .filter(e => !isOwnTeamEntry(e))
        .reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
    // Eget holds samlede timer (rolle-uafhængigt) — til det samlede sags-overblik.
    const ownTeamHours = timeEntries
        .filter(isOwnTeamEntry)
        .reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
    const subcontractorBreakdown = (assignedSubs || []).map(sub => {
        const hours = timeEntries.filter(e => {
            const p = subPersonFromId(e.employeeId);
            return p && String(p.subId) === String(sub.id);
        }).reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
        return { id: sub.id, company_name: sub.company_name, hours };
    }).filter(b => b.hours > 0);

    const baseBudgetedHours = parseFloat(selectedCase?.raw_data?.calc_data?.laborHours) || 40;
    // Selvlavede tilbud har ikke et beregnet timeestimat — vis kun de FAKTISKE timer.
    const isManualCase = !!selectedCase?.raw_data?.is_manual_quote;
    // Reelt timebudget = sagen har et faktisk beregnet time-estimat (ikke standard-40
    // og ikke et selvlavet tilbud). Ellers vises kun brugte timer, intet "tilbage"/budget.
    const hasHourBudget = !isManualCase && (parseFloat(selectedCase?.raw_data?.calc_data?.laborHours) > 0);
    const getBasePrice = (lead) => {
        if (!lead) return 0;
        const rd = lead.raw_data || {};
        // Manuel sag (uden tilbud): pris fra afregningsform, gemt ekskl. moms.
        // Privat → +25% moms; erhverv (CVR) → uden moms. Timepris = timer × timepris.
        if (rd.is_manual_case) {
            const toIncl = (ex) => isReverseChargeLead(lead) ? Math.round(ex) : Math.round(ex * 1.25);
            if (rd.billing_mode === 'hourly' && Number(rd.hourly_rate) > 0) {
                const hours = (rd.time_entries || []).reduce((s, e) => s + (Number(e.hours) || 0), 0);
                return toIncl(hours * Number(rd.hourly_rate));
            }
            if (rd.billing_mode === 'fixed' && Number(rd.fixed_price_ex_vat) > 0) {
                return toIncl(Number(rd.fixed_price_ex_vat));
            }
            return 0;
        }
        if (lead.raw_data?.calc_data?.totalPrice) {
            return parseFloat(lead.raw_data.calc_data.totalPrice) || 0;
        }
        if (lead.raw_data?.actual_quote_price) {
            return typeof lead.raw_data.actual_quote_price === 'number' 
                ? lead.raw_data.actual_quote_price 
                : parseInt(String(lead.raw_data.actual_quote_price).replace(/[^0-9]/g, '')) || 0;
        } else if (typeof lead.price_estimate === 'number') {
            return lead.price_estimate;
        } else {
            const priceStr = lead.price_estimate || '0';
            const firstPricePart = priceStr.split('-')[0] || priceStr;
            return parseInt(firstPricePart.replace(/[^0-9]/g, '')) || 0;
        }
    };
    const baseTotalPrice = getBasePrice(selectedCase);
    const totalExtraHours = logsList.filter(l => l.isChangeOrder).reduce((sum, item) => sum + (item.extraHours || 0), 0);
    const totalExtraPrice = logsList.filter(l => l.isChangeOrder).reduce((sum, item) => sum + (item.extraPrice || 0), 0);
    
    const budgetedHours = baseBudgetedHours + totalExtraHours;
    const hourBudgetRatio = budgetedHours > 0 ? (totalActualHours / budgetedHours) : 0;
    
    // Anomali: Hvis timer overstiger 80% af budget, men fremskridt er under 50%
    const hasTimeAnomalies = hourBudgetRatio > 0.8 && progressPercent < 50;

    // Filtrerede timer til mesterens ugentlige medarbejder-tidsstyring
    const getEmployeeTotalHoursThisWeek = (employeeId) => {
        return activeCases.reduce((sum, c) => {
            const entries = c.raw_data?.time_entries || [];
            const empEntries = entries.filter(e => e.employeeId === employeeId);
            return sum + empEntries.reduce((s, item) => s + item.hours, 0);
        }, 0);
    };

    // Materiale-status beregning
    const defaultMarkup = profile?.settings?.material_markup || 1.15;
    const originalBudget = selectedCase?.raw_data?.calc_data?.materialCostBase !== undefined
        ? parseFloat(selectedCase.raw_data.calc_data.materialCostBase)
        : Math.round((parseFloat(selectedCase?.raw_data?.calc_data?.materialCost) || 0) / defaultMarkup);
    const supplierInvoices = selectedCase?.raw_data?.supplier_invoices || [];
    const totalSpent = supplierInvoices
        .filter(inv => inv.category === 'Materialer' || !inv.category)
        .reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
    const budgetRemaining = originalBudget - totalSpent;
    const isOverBudget = budgetRemaining < 0;

    const materialListForOverview = selectedCase?.raw_data?.material_list || [];
    // Materialeposter (bilag m. kategori Materialer) der har en leveringsstatus tæller også med —
    // så manuelle sagers materialelister vises korrekt i overblikket. Kvitteringer uden
    // delivery_status (fx beregner-sagernes bilag) påvirker IKKE status, så intet regresser.
    const trackedMaterialInvoices = supplierInvoices.filter(inv => (inv.category === 'Materialer' || !inv.category) && inv.delivery_status);
    const totalMaterials = materialListForOverview.length + trackedMaterialInvoices.length;
    const orderedMaterials = materialListForOverview.filter(m => m.status === 'Bestilt' || m.status === 'Leveret').length
        + trackedMaterialInvoices.filter(inv => inv.delivery_status === 'Bestilt' || inv.delivery_status === 'Leveret').length;
    const deliveredMaterials = materialListForOverview.filter(m => m.status === 'Leveret').length
        + trackedMaterialInvoices.filter(inv => inv.delivery_status === 'Leveret').length;
    const notOrderedMaterials = totalMaterials - orderedMaterials;
    const materialProgress = totalMaterials > 0 ? Math.round((orderedMaterials / totalMaterials) * 100) : 0;

    // Marker alle materialer (liste + materialeposter) som leveret — direkte fra overblikskortet.
    const handleMarkAllMaterialsDelivered = async (e) => {
        e?.stopPropagation?.();
        try {
            // Hent friskt (ikke fra evt. forældet React-state) og flet kun de to
            // ændrede nøgler atomisk ind, så samtidige ændringer ikke overskrives.
            const { data: latestData } = await supabase.from('leads').select('raw_data').eq('id', selectedCase.id).single();
            const rdNow = latestData?.raw_data || selectedCase?.raw_data || {};
            const nextList = (rdNow.material_list || []).map(m => ({ ...m, status: 'Leveret' }));
            const nextInvoices = (rdNow.supplier_invoices || []).map(inv => ((inv.category === 'Materialer' || !inv.category) && inv.delivery_status) ? { ...inv, delivery_status: 'Leveret' } : inv);
            const merged = await mutateLeadRawData(selectedCase.id, { material_list: nextList, supplier_invoices: nextInvoices });
            onUpdateLead && onUpdateLead({ ...selectedCase, raw_data: merged || { ...rdNow, material_list: nextList, supplier_invoices: nextInvoices } });
            toast.success('Alle materialer markeret som leveret');
        } catch (err) {
            console.error('Kunne ikke opdatere materialer:', err);
            toast.error(friendlyError(err, 'Kunne ikke opdatere materialer. Prøv igen.'));
        }
    };
    const existingDeliveryEvent = Array.isArray(carpenterProfile?.raw_data?.calendar_events)
        ? carpenterProfile.raw_data.calendar_events.find(ev => ev.type === 'Materialelevering' && String(ev.relatedLeadId) === String(selectedCase?.id))
        : null;
    const existingDeliveryDate = existingDeliveryEvent ? existingDeliveryEvent.date : '';

    const handleAddDeliveryToCalendar = async (e) => {
        try {
            const dateString = e?.target?.value || e;
            if (!dateString || typeof dateString !== 'string') return;
            
            const existingEvents = Array.isArray(carpenterProfile?.raw_data?.calendar_events) 
                ? carpenterProfile.raw_data.calendar_events 
                : [];
                
            const existingEventIndex = existingEvents.findIndex(ev => ev.type === 'Materialelevering' && String(ev.relatedLeadId) === String(selectedCase?.id));

            let updatedEvents = [...existingEvents];
            let actionText = 'tilføjet';
            
            if (existingEventIndex >= 0) {
                updatedEvents[existingEventIndex] = {
                    ...updatedEvents[existingEventIndex],
                    date: dateString
                };
                actionText = 'opdateret i';
            } else {
                const newEvent = {
                    id: Date.now().toString(),
                    title: 'Levering af materialer - Sag ' + (selectedCase?.case_number || (selectedCase?.id ? String(selectedCase.id).substring(0,4) : 'Ny')),
                    type: 'Materialelevering',
                    date: dateString,
                    startTime: '08:00',
                    endTime: '09:00',
                    participants: ['all'],
                    description: 'Automatisk oprettet fra materialeliste.',
                    relatedLeadId: selectedCase?.id || null
                };
                updatedEvents.push(newEvent);
            }
            
            const updatedRawData = { ...(carpenterProfile?.raw_data || {}), calendar_events: updatedEvents };
            
            const { error: dbError } = await supabase.from('carpenters').update({ raw_data: updatedRawData }).eq('id', carpenterProfile?.id);
            if (dbError) throw new Error(dbError.message);
            
            if (setCarpenterProfile) setCarpenterProfile({ ...carpenterProfile, raw_data: updatedRawData });
            
            const parts = dateString.split('-');
            if (parts.length === 3) {
                toast.success(`Levering d. ${parts[2]}/${parts[1]}/${parts[0]} er ${actionText} kalenderen!`);
            } else {
                toast.success(`Levering er ${actionText} kalenderen!`);
            }
            if (typeof setInfoSheetType === 'function') setInfoSheetType(null);
        } catch (error) {
            console.error('Calendar add error:', error);
            toast.error('Kunne ikke tilføje til kalender: ' + (error.message || 'Ukendt fejl'));
        }
    };

    // Økonomi Totaler
    const totalToBill = baseTotalPrice > 0 ? (baseTotalPrice + totalExtraPrice) : (totalExtraPrice > 0 ? totalExtraPrice : 0);
    
    // Timer Totaler
    const remainingHours = budgetedHours - totalActualHours;
    const isOvertime = remainingHours < 0;

    const handleLineChange = (id, field, value) => {
        setInvoiceLines(prev => prev.map(line => line.id === id ? { ...line, [field]: value } : line));
    };

    const handleAddLine = () => {
        setInvoiceLines(prev => [...prev, { id: `manual_${Date.now()}`, description: '', priceExVat: 0 }]);
    };

    const handleRemoveLine = (id) => {
        setInvoiceLines(prev => prev.filter(line => line.id !== id));
    };
    const handleConvertToAconto = () => {
        const total = invoiceLines.reduce((sum, line) => sum + Number(line.priceExVat || 0), 0);
        const percent = window.prompt("Indtast Aconto procent (fx 30 for 30%):", "30");
        if (percent && !isNaN(percent)) {
            const acontoAmount = Math.round(total * (Number(percent) / 100));
            setInvoiceLines([{
                id: `aconto_${Date.now()}`,
                description: `Acontobetaling (${percent}%) vedr. Sag ${selectedCase?.case_number || String(selectedCase?.id).substring(0,8)} (${selectedCase?.project_category || 'opgave'})`,
                priceExVat: acontoAmount
            }]);
        }
    };

    const totalInvoiceExVat = invoiceLines.reduce((sum, line) => sum + Number(line.priceExVat || 0), 0);
    const totalInvoiceVat = isReverseCharge ? 0 : Math.round(totalInvoiceExVat * 0.25);

    // --- Sagsoverblik: Mine/Alle + søgning + Aktive/Afsluttede ---
    const isMyCase = (c) => {
        if (!profile?.id) return false;
        // Mester/ejer (admin/boss) ejer og har overblik over ALLE firmaets sager → alt er "mine sager".
        // Respekterer simulér-rolle: tester mester som fx svend, ses svendens tildelings-udsnit i stedet.
        const effectiveRole = simulatedRole || profile.role;
        if (effectiveRole === 'admin' || effectiveRole === 'boss') return true;
        const workers = c.raw_data?.assigned_workers || [];
        const pm = c.raw_data?.assigned_pm;
        const pmArr = Array.isArray(pm) ? pm : (pm ? [pm] : []);
        if (workers.includes(profile.id) || pmArr.includes(profile.id)) return true;
        // Eller jeg har selv ført timer på sagen
        return (c.raw_data?.time_entries || []).some(t => t.employeeId === profile.id);
    };
    const matchesCaseSearch = (c) => {
        const q = caseSearch.trim().toLowerCase();
        if (!q) return true;
        return [
            c.case_number, c.id, c.customer_name, c.customer_address,
            c.customer_phone, c.customer_email, c.project_category,
            c.raw_data?.project_title
        ].some(f => f != null && String(f).toLowerCase().includes(q));
    };
    const ACTIVE_STATUSES = ['Bekræftet opgave', 'Sæt i bero'];
    const myCasesCount = activeCases.filter(isMyCase).length;
    const baseCaseList = caseViewTab === 'mine' ? activeCases.filter(isMyCase) : activeCases;
    const searchedCases = baseCaseList.filter(matchesCaseSearch);
    const aktiveSager = searchedCases.filter(c => ACTIVE_STATUSES.includes(c.status));
    const afsluttedeSager = searchedCases.filter(c => !ACTIVE_STATUSES.includes(c.status));

    const renderCaseCard = (c) => {
        const todos = c.raw_data?.checklist || [];
        const comp = todos.filter(t => t.done).length;
        const pct = todos.length > 0 ? Math.round((comp / todos.length) * 100) : 0;
        const hrs = (c.raw_data?.time_entries || []).reduce((sum, item) => sum + item.hours, 0);
        const estHrs = parseFloat(c.raw_data?.calc_data?.laborHours) || 40;

        // Status-farver (delt mellem desktop- og mobil-varianten)
        const statusStyle = c.status === 'Sæt i bero'
            ? { label: 'Sat i bero', bg: '#fff7ed', color: '#ea580c', border: '#fdba74' }
            : c.status === 'Historik'
            ? { label: 'Afsluttet', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
            : c.status === 'Afbrudt Sag'
            ? { label: 'Tabt / Afvist', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' }
            : { label: 'Aktiv Sag', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
        const overtime = !c.raw_data?.is_manual_quote && hrs > estHrs;
        const timeLabel = `${hrs} t${c.raw_data?.is_manual_quote ? '' : ` / ${estHrs} t`}`;

        // --- MOBIL: kompakt, skimbart kort ---
        if (isMobile) {
            const pmIds = Array.isArray(c.raw_data?.assigned_pm) ? c.raw_data.assigned_pm : (c.raw_data?.assigned_pm ? [c.raw_data.assigned_pm] : []);
            const crew = [
                ...pmIds.map(id => ({ id, isPm: true, m: team.find(t => t.id === id) })),
                ...((c.raw_data?.assigned_workers || []).map(id => ({ id, isPm: false, m: team.find(t => t.id === id) }))),
            ].filter(x => x.m);
            return (
                <div
                    key={c.id}
                    onClick={() => setSelectedCaseIdState(c.id)}
                    className="mobile-case-card"
                    style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e8e6e1', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', WebkitTapHighlightColor: 'transparent' }}
                >
                    {/* Linje 1: status + dato */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ padding: '3px 9px', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '30px', background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}>
                            {statusStyle.label}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {new Date(c.created_at).toLocaleDateString('da-DK')}
                        </span>
                    </div>

                    {/* Linje 2: titel */}
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Sag {c.case_number || String(c.id).substring(0,8)} - {c.raw_data?.project_title || c.project_category}
                    </h4>

                    {/* Linje 3: kunde + adresse (én linje) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#6b7280', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 600, color: '#475569', flexShrink: 0 }}>
                            {c.customer_name || (c.raw_data?.customerDetails?.customerType === 'erhverv' ? 'Virksomhed' : 'Privatkunde')}
                        </span>
                        {c.customer_address && (
                            <>
                                <span style={{ color: '#cbd5e1', flexShrink: 0 }}>·</span>
                                <MapPin size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.customer_address)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>{c.customer_address}</a>
                            </>
                        )}
                    </div>

                    {/* Linje 4: fremdrift + timer i én fod-række */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: '#10b981', transition: 'width 0.3s' }} />
                            </div>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4b5563', flexShrink: 0 }}>{pct}%</span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', flexShrink: 0 }}>·</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: overtime ? '#ef4444' : '#1e293b', flexShrink: 0 }}>{timeLabel}</span>
                        {crew.length > 0 && (
                            <div style={{ display: 'flex', flexShrink: 0, paddingLeft: '4px' }}>
                                {crew.slice(0, 3).map((x, i) => (
                                    <div key={x.id} title={`${x.m.owner_name || x.m.company_name || 'Ukendt'}${x.isPm ? ' (PM)' : ''}`} style={{ marginLeft: i === 0 ? 0 : '-6px', borderRadius: '50%', border: x.isPm ? '1.5px solid #2563eb' : '1.5px solid #ffffff', boxShadow: '0 0 0 1px #ffffff' }}>
                                        <UserAvatar name={x.m.owner_name || x.m.company_name || ''} avatarUrl={x.m.avatar_url} size={20} ring={false} />
                                    </div>
                                ))}
                                {crew.length > 3 && (
                                    <div style={{ marginLeft: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#f1f5f9', border: '1.5px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#64748b' }}>+{crew.length - 3}</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div
                key={c.id}
                onClick={() => setSelectedCaseIdState(c.id)}
                style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
                className="hover:scale-[1.01] hover:shadow-lg"
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    {c.status === 'Sæt i bero' ? (
                        <span style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '30px', background: '#fff7ed', color: '#ea580c', border: '1px solid #fdba74' }}>
                            Sat i bero
                        </span>
                    ) : c.status === 'Historik' ? (
                        <span style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '30px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                            Afsluttet
                        </span>
                    ) : c.status === 'Afbrudt Sag' ? (
                        <span style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '30px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                            Tabt / Afvist
                        </span>
                    ) : (
                        <span style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '30px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                            Aktiv Sag
                        </span>
                    )}
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {new Date(c.created_at).toLocaleDateString('da-DK')}
                    </span>
                </div>

                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 'bold', color: '#1a1a1a' }}>
                    Sag {c.case_number || String(c.id).substring(0,8)} - {c.raw_data?.project_title || c.project_category}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {c.raw_data?.customerDetails?.customerType === 'erhverv' ? (
                            <>
                                <span style={{ background: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>Erhverv</span>
                                {c.customer_name || 'Virksomhed'}
                            </>
                        ) : (
                            <>Kunde: {c.customer_name || 'Privatkunde'}</>
                        )}
                    </span>
                    <span style={{ fontSize: '0.825rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} style={{ color: '#94a3b8' }} /> <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.customer_address || '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => e.target.style.textDecoration = 'underline'} onMouseLeave={(e) => e.target.style.textDecoration = 'none'} onClick={(e) => e.stopPropagation()}>{c.customer_address || 'Adresse ikke angivet'}</a>
                    </span>
                </div>

                {/* Færdiggørelses-bar */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px', fontWeight: '500' }}>
                        <span>Fremdrift (To-Do)</span>
                        <strong>{pct}%</strong>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#10b981', transition: 'width 0.3s' }} />
                    </div>
                </div>

                {/* Time status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#6b7280', borderTop: '1px solid #f1f1ef', paddingTop: '12px', marginBottom: '12px' }}>
                    <span>Timer registreret:</span>
                    <strong style={{ color: (!c.raw_data?.is_manual_quote && hrs > estHrs) ? '#ef4444' : '#1e293b' }}>
                        {hrs} t{c.raw_data?.is_manual_quote ? '' : ` / ${estHrs} t`}
                    </strong>
                </div>

                {/* Mandskab overblik */}
                {(c.raw_data?.assigned_pm?.length > 0 || c.raw_data?.assigned_workers?.length > 0) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid #f1f1ef', paddingTop: '12px' }}>
                        {/* PMs */}
                        {(Array.isArray(c.raw_data.assigned_pm) ? c.raw_data.assigned_pm : [c.raw_data.assigned_pm]).map(pmId => {
                            const m = team.find(t => t.id === pmId);
                            if (!m) return null;
                            return (
                                <span key={pmId} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '500' }}>
                                    <UserAvatar name={m.owner_name || m.company_name || ''} avatarUrl={m.avatar_url} size={16} ring={false} />
                                    {m.owner_name || m.company_name || 'Ukendt'} (PM)
                                </span>
                            );
                        })}
                        {/* Workers */}
                        {(c.raw_data.assigned_workers || []).map(wId => {
                            const m = team.find(t => t.id === wId);
                            if (!m) return null;
                            return (
                                <span key={wId} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#f8fafc', color: '#475569', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid #e2e8f0' }}>
                                    <UserAvatar name={m.owner_name || m.company_name || ''} avatarUrl={m.avatar_url} size={16} ring={false} />
                                    {m.owner_name || m.company_name || 'Ukendt'}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="dashboard-workspace case-management-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            <style>{`
                .case-tab-content {
                    animation: fadeIn 0.4s ease-out;
                }
                .glass-panel-tab {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                    padding: 24px;
                }
                .hover-lift {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .hover-lift:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                }
                .log-card {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    border-radius: 12px;
                    padding: 16px;
                    background-color: #ffffff;
                    border: 1px solid #e2e8f0;
                }
                .log-card:hover {
                    transform: translateX(4px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    border-color: #cbd5e1;
                }
                .timesheet-row {
                    transition: all 0.2s ease;
                }
                .timesheet-row:hover {
                    background-color: #f1f5f9 !important;
                    border-radius: 8px;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                /* Mobil sagskort — Frame-stil: glas, blødt, taktilt */
                .mobile-case-card {
                    background: rgba(255,255,255,0.72) !important;
                    backdrop-filter: blur(12px) saturate(140%);
                    -webkit-backdrop-filter: blur(12px) saturate(140%);
                    transition: transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.18s ease, border-color 0.18s ease;
                }
                .mobile-case-card:active {
                    transform: scale(0.975);
                    box-shadow: 0 6px 18px rgba(16,185,129,0.14) !important;
                    border-color: #a7f3d0 !important;
                }
                /* Kompakt mobil-header knap */
                .mobile-create-btn { transition: transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.18s ease; }
                .mobile-create-btn:active { transform: scale(0.94); box-shadow: 0 4px 12px rgba(16,185,129,0.35); }
            `}</style>
            
            {/* OVERBYGNING ELLER MODAL LUK-KNAP */}
            {!selectedCase ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {isMobile ? (
                        /* MOBIL: slank header-række med kompakt "Opret sag" i hjørnet */
                        <div data-tour="cases-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '2px 2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <HardHat size={18} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.02em' }}>Sager</h3>
                            </div>
                            {onCreateCase && !['worker', 'apprentice'].includes(profile?.role) && (
                                <button onClick={onCreateCase} className="mobile-create-btn"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '999px', border: 'none', background: 'linear-gradient(145deg,#10b981,#059669)', color: '#fff', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 6px 16px rgba(16,185,129,0.28)', flexShrink: 0, whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent' }}>
                                    <Plus size={16} strokeWidth={2.5} /> Opret sag
                                </button>
                            )}
                        </div>
                    ) : (
                    <div data-tour="cases-header" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <HardHat size={24} />
                        </div>
                        <div style={{ flex: '1 1 240px' }}>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 'bold', color: '#1a1a1a' }}>Sager & Ordrestyring</h3>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Fuld native styring af alle dine bekræftede tømreropgaver, lærlinge-KS, materialebestillinger og timeregistreringer.</p>
                        </div>
                        {/* Opret en sag direkte — uden at skulle sende et tilbud først (timepris-flow). */}
                        {onCreateCase && !['worker', 'apprentice'].includes(profile?.role) && (
                            <button onClick={onCreateCase}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 18px', borderRadius: '12px', border: 'none', background: 'linear-gradient(145deg,#10b981,#059669)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(16,185,129,0.25)', flexShrink: 0, whiteSpace: 'nowrap' }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}>
                                <Plus size={18} /> Opret sag
                            </button>
                        )}
                    </div>
                    )}

                    {/* Eksempel-sag — vises kun under rundvisningen, så nye brugere uden sager
                        stadig kan se hvordan en sag ser ud. Ikke en rigtig DB-sag. */}
                    {casesTourActive && (
                        <div style={{ position: 'relative', maxWidth: '380px' }}>
                            <span style={{ position: 'absolute', top: '-10px', left: '16px', zIndex: 1, background: '#0f172a', color: '#fff', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '20px' }}>Eksempel</span>
                            <div data-tour="cases-demo-card" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <span style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '30px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>Aktiv Sag</span>
                                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{new Date().toLocaleDateString('da-DK')}</span>
                                </div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 'bold', color: '#1a1a1a' }}>Sag 1042 - Nyt trægulv i stue</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ background: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>Erhverv</span>
                                        Bruns Byg ApS
                                    </span>
                                    <span style={{ fontSize: '0.825rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={14} style={{ color: '#94a3b8' }} /> Byggevej 12, 8000 Aarhus C
                                    </span>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px', fontWeight: '500' }}>
                                        <span>Fremdrift (To-Do)</span>
                                        <strong>60%</strong>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ width: '60%', height: '100%', background: '#10b981' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#6b7280', borderTop: '1px solid #f1f1ef', paddingTop: '12px', marginBottom: '12px' }}>
                                    <span>Timer registreret:</span>
                                    <strong style={{ color: '#1e293b' }}>24 t / 40 t</strong>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid #f1f1ef', paddingTop: '12px' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '500' }}>
                                        <UserAvatar name="Christian" size={16} ring={false} /> Christian (PM)
                                    </span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#f8fafc', color: '#475569', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid #e2e8f0' }}>
                                        <UserAvatar name="Niklas" size={16} ring={false} /> Niklas
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sagsliste overblik */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Faner (Mine / Alle) + søgning */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div data-tour="cases-tabs" style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px', gap: '4px' }}>
                                <button onClick={() => setCaseViewTab('mine')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem', background: caseViewTab === 'mine' ? '#ffffff' : 'transparent', color: caseViewTab === 'mine' ? '#0f172a' : '#64748b', boxShadow: caseViewTab === 'mine' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                                    Mine sager{myCasesCount > 0 ? ` (${myCasesCount})` : ''}
                                </button>
                                <button onClick={() => setCaseViewTab('all')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem', background: caseViewTab === 'all' ? '#ffffff' : 'transparent', color: caseViewTab === 'all' ? '#0f172a' : '#64748b', boxShadow: caseViewTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                                    Alle sager ({activeCases.length})
                                </button>
                            </div>
                            <div data-tour="cases-search" style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '1 1 280px', maxWidth: isMobile ? 'none' : '420px' }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                                <input
                                    type="text"
                                    value={caseSearch}
                                    onChange={(e) => setCaseSearch(e.target.value)}
                                    placeholder="Søg på sagsnr, kunde, adresse, telefon…"
                                    style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        {activeCases.length === 0 ? (
                            <div style={{ padding: '64px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', color: '#6b7280' }}>
                                <HardHat size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Ingen bekræftede sager endnu</p>
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                    Når en kunde accepterer et tilbud, skifter status automatisk, og sagen vil fremgå her for hele holdet.
                                </p>
                                {onCreateCase && !['worker', 'apprentice'].includes(profile?.role) && (
                                    <button onClick={onCreateCase}
                                        style={{ marginTop: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(145deg,#10b981,#059669)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(16,185,129,0.25)' }}>
                                        <Plus size={18} /> Opret en sag uden tilbud
                                    </button>
                                )}
                            </div>
                        ) : (caseViewTab === 'mine' && myCasesCount === 0 && !caseSearch.trim()) ? (
                            <div style={{ padding: '48px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', color: '#6b7280' }}>
                                <HardHat size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Du er ikke på nogen sager endnu</p>
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                    Skift til <button onClick={() => setCaseViewTab('all')} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '600', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Alle sager</button> for at finde en sag og registrere timer.
                                </p>
                            </div>
                        ) : searchedCases.length === 0 ? (
                            <div style={{ padding: '48px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', color: '#6b7280' }}>
                                <Search size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>Ingen sager matcher din søgning{caseSearch.trim() ? ` "${caseSearch.trim()}"` : ''}.</p>
                            </div>
                        ) : (
                            <>
                                {/* AKTIVE SAGER */}
                                {aktiveSager.length > 0 && (
                                    <div>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                                            Aktive sager ({aktiveSager.length})
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: isMobile ? '12px' : '20px' }}>
                                            {aktiveSager.map(renderCaseCard)}
                                        </div>
                                    </div>
                                )}

                                {/* AFSLUTTEDE SAGER */}
                                {afsluttedeSager.length > 0 && (
                                    <div>
                                        <h4 style={{ margin: '24px 0 12px 0', fontSize: '0.95rem', fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }} />
                                            Afsluttede sager ({afsluttedeSager.length})
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: isMobile ? '12px' : '20px' }}>
                                            {afsluttedeSager.map(renderCaseCard)}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            ) : (
                /* MOBIL & DESKTOP WRAPPER */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* --- MOBIL APPLE-STYLE HEADER & WIDGETS --- */}
                    {isMobile && selectedCase && (
                        <div style={{ paddingBottom: '16px' }}>
                            {/* Luksus Apple-style Floating Pill Header */}
                            <div style={{ position: 'sticky', top: '12px', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', zIndex: 40, border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', margin: '0 12px 16px 12px', borderRadius: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', minHeight: '60px' }}>
                                <button onClick={() => setSelectedCaseIdState(null)} style={{ background: 'none', border: 'none', padding: '4px', margin: '-4px', color: '#007AFF', display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', zIndex: 2 }}>
                                    <ArrowLeft size={28} strokeWidth={2.5} />
                                </button>
                                <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', padding: '0 60px' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#000000', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Sag {selectedCase.case_number || String(selectedCase.id).substring(0,6)}</h2>
                                    <span style={{ fontSize: '0.75rem', color: '#8E8E93', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{selectedCase.customer_name || 'Kunde'}</span>
                                </div>
                                <button onClick={() => setShowActionSheet(true)} style={{ background: 'none', border: 'none', padding: '4px', margin: '-4px', color: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', zIndex: 2 }}>
                                    <MoreHorizontal size={28} strokeWidth={2.5} />
                                </button>
                            </div>

                            {selectedCase.status === 'Sæt i bero' && (
                                <div style={{ margin: '0 12px 16px 12px', backgroundColor: '#fff7ed', border: '1px solid #fdba74', padding: '16px', borderRadius: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style={{ color: '#ea580c', display: 'flex', alignItems: 'center', marginTop: '2px' }}><Pause size={24} /></div>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', color: '#9a3412', fontSize: '1rem', fontWeight: 'bold' }}>Sagen er sat i bero</h4>
                                        <p style={{ margin: 0, color: '#c2410c', fontSize: '0.85rem', lineHeight: '1.4' }}>
                                            Sagen er på pause. Tidsregistrering kan stadig udføres ved akut behov, men rådfør dig altid med mester først.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Dashboard Widgets (Små Bobler Række) */}
                            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', padding: '20px 0', margin: '0 -16px' }}>
                                {/* Time Bubble */}
                                <div onClick={() => setInfoSheetType('time')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <Clock size={20} />
                                    </div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#475569' }}>{totalActualHours} t.</span>
                                </div>

                                {/* Material Bubble */}
                                {!['worker', 'apprentice'].includes(profile?.role) && (
                                    <div onClick={() => setInfoSheetType('materials')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <PackageCheck size={20} />
                                        </div>
                                        <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#475569' }}>{totalMaterials === 0 ? '–' : (deliveredMaterials === totalMaterials ? 'Leveret' : (notOrderedMaterials === 0 ? 'Bestilt' : 'Mangler'))}</span>
                                    </div>
                                )}

                                {/* Team Bubble */}
                                <div onClick={() => setShowTeamSheet(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <Users size={20} />
                                    </div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#475569' }}>{(selectedCase.raw_data?.assigned_workers?.length || 0) + (selectedCase.raw_data?.assigned_pm ? 1 : 0)} mand</span>
                                </div>

                                {/* Material Budget Bubble */}
                                {!['worker', 'apprentice'].includes(profile?.role) && (
                                    <div onClick={() => setInfoSheetType('finance')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <Package size={20} />
                                        </div>
                                        <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#475569' }}>{(originalBudget/1000).toFixed(0)}k</span>
                                    </div>
                                )}
                            </div>

                            {/* Dagens Besked Vist Fast Hvis Der er en Ulæst */}
                            {selectedCase?.raw_data?.daily_message && new Date(selectedCase.raw_data.daily_message.date).toDateString() === new Date().toDateString() && (
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px', padding: '16px', display: 'flex', gap: '12px' }}>
                                        <MessageCircle size={24} color="#2563eb" style={{ flexShrink: 0 }} />
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#1e3a8a', fontWeight: 'bold' }}>Dagens Besked</h4>
                                                <AudioPlayerButton text={selectedCase.raw_data.daily_message.text} title="Læs besked op" />
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#1e40af', lineHeight: '1.5' }}>{selectedCase.raw_data.daily_message.text}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PORTALS FOR OVERLAYS SO THEY ESCAPE ANY CONTAINER BOUNDS */}
                            {showActionSheet && createPortal(
                                <div onClick={() => setShowActionSheet(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 99999, backdropFilter: 'blur(2px)', animation: 'fadeIn 0.2s ease-out' }}>
                                    <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 16px))', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                        <div style={{ width: '40px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', margin: '0 auto 24px auto' }} />
                                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#64748b', fontWeight: '600' }}>Handlinger</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <button onClick={() => { setShowActionSheet(false); onOpenChat && onOpenChat(selectedCase.id); }} style={{ padding: '16px', background: '#eff6ff', border: 'none', borderRadius: '16px', fontSize: '1rem', fontWeight: '600', color: '#2563eb', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <MessageSquare size={20} color="#2563eb" /> Åben Chat
                                            </button>
                                            <button onClick={() => { setShowActionSheet(false); setIsDailyMessageOpen(true); }} style={{ padding: '16px', background: '#f8fafc', border: 'none', borderRadius: '16px', fontSize: '1rem', fontWeight: '600', color: '#0f172a', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <MessageCircle size={20} color="#3b82f6" /> Dagens Besked
                                            </button>
                                            {['admin', 'accountant', 'boss', 'sales'].includes(profile?.role) && (
                                                <button onClick={() => { setShowActionSheet(false); onOpenInvoice && onOpenInvoice(selectedCase.id); }} style={{ padding: '16px', background: '#f8fafc', border: 'none', borderRadius: '16px', fontSize: '1rem', fontWeight: '600', color: '#0f172a', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <DollarSign size={20} color="#10b981" /> Opret Faktura
                                                </button>
                                            )}
                                            {['admin', 'sales'].includes(profile?.role) && selectedCase.status !== 'Afbrudt Sag' && (
                                                selectedCase.status === 'Sæt i bero' ? (
                                                    <button onClick={() => { setShowActionSheet(false); handleStatusChange('Bekræftet opgave'); }} style={{ padding: '16px', background: '#ecfdf5', border: 'none', borderRadius: '16px', fontSize: '1rem', fontWeight: '600', color: '#059669', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <CheckCircle size={20} color="#10b981" /> Genoptag Sag (Aktiv)
                                                    </button>
                                                ) : (
                                                    <button onClick={() => { setShowActionSheet(false); handleStatusChange('Sæt i bero'); }} style={{ padding: '16px', background: '#fff7ed', border: 'none', borderRadius: '16px', fontSize: '1rem', fontWeight: '600', color: '#ea580c', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <Pause size={20} color="#ea580c" /> Sæt i bero
                                                    </button>
                                                )
                                            )}
                                            {['admin', 'sales'].includes(profile?.role) && selectedCase.status !== 'Afbrudt Sag' && (
                                                <button onClick={() => { setShowActionSheet(false); handleStatusChange('Afbrudt Sag'); }} style={{ padding: '16px', background: '#fef2f2', border: 'none', borderRadius: '16px', fontSize: '1rem', fontWeight: '600', color: '#ef4444', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <AlertTriangle size={20} color="#ef4444" /> Afbryd Sag (Konkurs)
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>,
                                document.body
                            )}

                            {/* INFO SHEETS PORTAL (Timer, Indkøb, Økonomi) */}
                            {infoSheetType && createPortal(
                                <div onClick={() => setInfoSheetType(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 99999, backdropFilter: 'blur(2px)', animation: 'fadeIn 0.2s ease-out' }}>
                                    <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 16px))', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                        <div style={{ width: '40px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', margin: '0 auto 24px auto' }} />
                                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            {infoSheetType === 'time' && <><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock color="#d97706" /> Timer</span></>}
                                            {infoSheetType === 'materials' && <><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PackageCheck color="#2563eb" /> Materialer & Indkøb</span></>}
                                            {infoSheetType === 'finance' && <><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Package color="#059669" /> Materialer</span></>}
                                            <button onClick={() => setInfoSheetType(null)} style={{ background: 'none', border: 'none', color: '#94a3b8' }}><X size={20}/></button>
                                        </h3>
                                        
                                        {infoSheetType === 'time' && (
                                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
                                                <h1 style={{ margin: '0 0 8px 0', fontSize: '2.5rem', fontWeight: '800', color: '#0f172a' }}>{totalActualHours} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>{hasHourBudget ? <>/ {budgetedHours} t.</> : 't.'}</span></h1>
                                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Registrerede timer af holdet</p>
                                                <button onClick={() => { setInfoSheetType(null); handleSubTabChange('timesheet'); }} style={{ marginTop: '16px', width: '100%', padding: '12px', background: '#d97706', color: '#fff', borderRadius: '12px', fontWeight: 'bold', border: 'none' }}>Gå til Timeregistrering</button>
                                            </div>
                                        )}
                                        {infoSheetType === 'materials' && (
                                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
                                                {deliveredMaterials === totalMaterials && totalMaterials > 0 ? (
                                                    <>
                                                        <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', fontWeight: '800', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><CheckCircle size={28} /> Ordre er leveret</h1>
                                                    </>
                                                ) : orderedMaterials === totalMaterials && totalMaterials > 0 ? (
                                                    <>
                                                        <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', fontWeight: '800', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><PackageCheck size={28} /> Ordre er bestilt</h1>
                                                    </>
                                                ) : (
                                                    <>
                                                        <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', fontWeight: '800', color: orderedMaterials > 0 ? '#2563eb' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Package size={26} /> {totalMaterials === 0 ? 'Ingen materialer endnu' : (orderedMaterials > 0 ? 'Delvist bestilt' : 'Ikke bestilt endnu')}</h1>
                                                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Se materialelisten for detaljer</p>
                                                    </>
                                                )}
                                                
                                                <button onClick={() => { setInfoSheetType(null); handleSubTabChange('materials'); }} style={{ marginTop: '24px', width: '100%', padding: '14px', background: '#2563eb', color: '#fff', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Gå til materialeliste</button>
                                                
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                                    <div style={{ position: 'relative', flex: 1 }}>
                                                        <input 
                                                            type="date" 
                                                            id="case-delivery-date-input"
                                                            defaultValue={existingDeliveryDate}
                                                            onChange={(e) => {
                                                                const placeholder = document.getElementById('case-delivery-placeholder');
                                                                if (placeholder) placeholder.style.display = e.target.value ? 'none' : 'flex';
                                                            }}
                                                            style={{ 
                                                                width: '100%',
                                                                padding: '14px', 
                                                                border: '1px solid #cbd5e1', 
                                                                borderRadius: '12px', 
                                                                backgroundColor: '#f8fafc',
                                                                color: '#0f172a',
                                                                outline: 'none',
                                                                fontWeight: '600',
                                                                boxSizing: 'border-box'
                                                            }}
                                                        />
                                                        <div id="case-delivery-placeholder" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', display: existingDeliveryDate ? 'none' : 'flex', alignItems: 'center', paddingLeft: '14px', backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '500', fontSize: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                                            Vælg dato
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            const input = document.getElementById('case-delivery-date-input');
                                                            if (input && input.value) {
                                                                handleAddDeliveryToCalendar(input.value);
                                                                input.value = '';
                                                            } else {
                                                                toast.error('Vælg venligst en dato først');
                                                            }
                                                        }}
                                                        style={{ 
                                                            padding: '0 24px', 
                                                            background: '#2563eb', 
                                                            color: '#fff', 
                                                            borderRadius: '12px', 
                                                            fontWeight: 'bold', 
                                                            border: 'none', 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center', 
                                                            cursor: 'pointer' 
                                                        }}>
                                                        Tilføj
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {infoSheetType === 'finance' && (
                                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
                                                <h1 style={{ margin: '0 0 8px 0', fontSize: '2.5rem', fontWeight: '800', color: '#0f172a' }}>{(originalBudget/1000).toFixed(0)}k <span style={{ fontSize: '1rem', color: '#94a3b8' }}>DKK</span></h1>
                                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Estimeret materialebudget</p>
                                                <button onClick={() => { setInfoSheetType(null); handleSubTabChange('materials'); }} style={{ marginTop: '16px', width: '100%', padding: '12px', background: '#059669', color: '#fff', borderRadius: '12px', fontWeight: 'bold', border: 'none' }}>Gå til Materialer</button>
                                            </div>
                                        )}
                                    </div>
                                </div>,
                                document.body
                            )}

                            {/* Team Sheet Overlay PORTAL (Beautiful Mobile Telephone Book) */}
                            {showTeamSheet && createPortal(
                                <div onClick={() => setShowTeamSheet(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 99999, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease-out' }}>
                                    <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 16px))', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                                        
                                        <div style={{ width: '48px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', margin: '0 auto 24px auto' }} />
                                        
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', fontWeight: '800' }}>Holdet på sagen</h3>
                                            <button onClick={() => setShowTeamSheet(false)} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <X size={18}/>
                                            </button>
                                        </div>
                                        
                                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            
                                            {/* PROJEKTLEDERE */}
                                            {pmIds.length > 0 && (
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projektledere</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        {pmIds.map(pmId => {
                                                            const m = team.find(t => t.id === pmId);
                                                            if (!m) return null;
                                                            return (
                                                                <div key={pmId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#eff6ff', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
                                                                    <div onClick={() => setProfilePerson({ name: m.owner_name || m.company_name || 'Ukendt', role: 'Projektleder', phone: m.phone, email: m.email })} style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                                                                        <UserAvatar name={m.owner_name || m.company_name || ''} avatarUrl={m.avatar_url} size={44} />

                                                                        <div>
                                                                            <div style={{ fontWeight: '700', color: '#1e3a8a', fontSize: '1.05rem' }}>{m.owner_name || m.company_name || 'Ukendt'}</div>
                                                                            <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '600' }}>Projektleder</div>
                                                                        </div>
                                                                    </div>
                                                                    {m.phone && (
                                                                        <a href={`tel:${m.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: '#ffffff', color: '#3b82f6', border: '1px solid #bfdbfe', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)' }}>
                                                                            <Phone size={18} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* HÅNDVÆRKERE */}
                                            {assignedWorkers.length > 0 && (
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px', marginTop: pmIds.length > 0 ? '8px' : '0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Byggehold (Svende & Lærlinge)</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        {assignedWorkers.map(wId => {
                                                            const m = team.find(t => t.id === wId);
                                                            if (!m) return null;
                                                            return (
                                                                <div key={wId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                                                                    <div onClick={() => setProfilePerson({ name: m.owner_name || m.company_name || 'Ukendt', role: m.role === 'apprentice' ? 'Tømrerlærling' : 'Tømrersvend', phone: m.phone, email: m.email })} style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                                                                        <UserAvatar name={m.owner_name || m.company_name || ''} avatarUrl={m.avatar_url} size={44} />

                                                                        <div>
                                                                            <div style={{ fontWeight: '700', color: '#334155', fontSize: '1.05rem' }}>{m.owner_name || m.company_name || 'Ukendt'}</div>
                                                                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Håndværker</div>
                                                                        </div>
                                                                    </div>
                                                                    {m.phone && (
                                                                        <a href={`tel:${m.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: '#ffffff', color: '#64748b', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                                            <Phone size={18} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* UNDERLEVERANDØRER */}
                                            {assignedSubs.length > 0 && (
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px', marginTop: (pmIds.length > 0 || assignedWorkers.length > 0) ? '8px' : '0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Underleverandører</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        {assignedSubs.map(sub => {
                                                            const selectedWorkers = (sub.workers || []).filter(w => (sub.selected_workers || []).includes(w.id));
                                                            return (
                                                            <div key={sub.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: '#f5f3ff', borderRadius: '20px', border: '1px solid #ddd6fe' }}>
                                                                <div onClick={() => setProfilePerson({ name: sub.company_name, role: sub.trade || 'Underleverandør', phone: sub.contact_phone, email: sub.contact_email })} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(139, 92, 246, 0.3)' }}>
                                                                            {(sub.company_name || '?').charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontWeight: '700', color: '#5b21b6', fontSize: '1.05rem' }}>{sub.company_name}</div>
                                                                            <div style={{ fontSize: '0.8rem', color: '#8b5cf6', fontWeight: '600' }}>{sub.trade || 'Underleverandør'}</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Kontaktperson */}
                                                                {sub.contact_name && (
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '16px', marginTop: '8px', borderLeft: '2px solid rgba(139, 92, 246, 0.2)' }}>
                                                                        <div onClick={() => setProfilePerson({ name: sub.contact_name, role: 'Mester (' + sub.company_name + ')', phone: sub.contact_phone, email: sub.contact_email })} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}>
                                                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                                                {sub.contact_name.charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#4c1d95' }}>{sub.contact_name}</div>
                                                                                <div style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>Mester</div>
                                                                            </div>
                                                                        </div>
                                                                        {sub.contact_phone && (
                                                                            <a href={`tel:${sub.contact_phone}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#ffffff', color: '#8b5cf6', borderRadius: '20px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #ddd6fe', boxShadow: '0 2px 4px rgba(139, 92, 246, 0.1)' }}>
                                                                                <Phone size={12} /> Ring
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {/* Valgte svende */}
                                                                {selectedWorkers.map(w => (
                                                                    <div key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '16px', marginTop: '4px', borderLeft: '2px solid rgba(139, 92, 246, 0.2)' }}>
                                                                        <div onClick={() => setProfilePerson({ name: w.name, role: w.role + ' (' + sub.company_name + ')', phone: w.phone, email: w.email })} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}>
                                                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                                                {w.name.charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#4c1d95' }}>{w.name}</div>
                                                                                <div style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>{w.role}</div>
                                                                            </div>
                                                                        </div>
                                                                        {w.phone && (
                                                                            <a href={`tel:${w.phone}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#ffffff', color: '#8b5cf6', borderRadius: '20px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #ddd6fe', boxShadow: '0 2px 4px rgba(139, 92, 246, 0.1)' }}>
                                                                                <Phone size={12} /> Ring
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );})}
                                                    </div>
                                                </div>
                                            )}

                                            {pmIds.length === 0 && assignedWorkers.length === 0 && assignedSubs.length === 0 && (
                                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                                                        <Users size={32} color="#94a3b8" />
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#475569' }}>Ingen tilføjet til sagen endnu</p>
                                                    <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>Tilføj medarbejdere og underleverandører for at give dem adgang.</p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* REDIGER HOLD KNAP (Kun for PM/Admin) */}
                                        {(!['worker', 'apprentice'].includes(profile?.role)) && (
                                            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                                <button 
                                                    onClick={() => { setShowTeamSheet(false); setWorkerDropdownOpen(true); }}
                                                    style={{ width: '100%', padding: '16px', background: '#1a1a1a', color: 'white', borderRadius: '20px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                                                >
                                                    <Users size={20} />
                                                    Rediger Holdet
                                                </button>
                                            </div>
                                        )}
                                        
                                    </div>
                                </div>,
                                document.body
                            )}

                            {/* MOBILE DAILY MESSAGE PORTAL (For empty states and reading) */}
                            {isDailyMessageOpen && isMobile && createPortal(
                                <div onClick={() => setIsDailyMessageOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 99999, backdropFilter: 'blur(2px)', animation: 'fadeIn 0.2s ease-out' }}>
                                    <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 16px))', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                        <div style={{ width: '40px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', margin: '0 auto 24px auto' }} />
                                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MessageCircle color="#3b82f6" /> Dagens Besked</span>
                                            <button onClick={() => setIsDailyMessageOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8' }}><X size={20}/></button>
                                        </h3>
                                        
                                        {(() => {
                                            const msg = selectedCase?.raw_data?.daily_message;
                                            const isToday = msg?.date && new Date(msg.date).toDateString() === new Date().toDateString();
                                            const canWrite = ['admin', 'accountant', 'boss', 'sales'].includes(profile?.role);
                                            
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    {isToday ? (
                                                        <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                                                            <p style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#1e3a8a', lineHeight: '1.5' }}>{msg.text}</p>
                                                            <div style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Skrevet af: {msg.author}</div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b' }}>
                                                            Der er ikke skrevet nogen besked for i dag endnu.
                                                        </div>
                                                    )}
                                                    
                                                    {canWrite && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                                                            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>Send besked for i dag</label>
                                                            <CustomSelect
                                                                value={msgRecipient}
                                                                onChange={setMsgRecipient}
                                                                placeholder="Vælg modtager..."
                                                                options={[
                                                                    { value: 'all', label: 'Hele holdet på sagen', icon: <Megaphone size={16} />, color: '#d97706', activeBg: '#fef3c7' },
                                                                    ...caseRecipients.map(r => ({
                                                                        value: r.id,
                                                                        label: `${r.name}${r.role ? ` · ${getRoleLabel(r.role)}` : ''}`,
                                                                        icon: <User size={16} />,
                                                                        color: '#3b82f6',
                                                                        activeBg: '#eff6ff'
                                                                    }))
                                                                ]}
                                                            />
                                                            <textarea
                                                                value={newDailyMessage}
                                                                onChange={(e) => setNewDailyMessage(e.target.value)}
                                                                placeholder="F.eks. Husk fugepistol..."
                                                                rows={3}
                                                                style={{ padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', resize: 'none' }}
                                                            />
                                                            <button
                                                                onClick={handleSendCaseMessage}
                                                                style={{ padding: '14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
                                                            >
                                                                {msgRecipient === 'all' ? 'Send til holdet' : 'Send besked'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>,
                                document.body
                            )}

                            {/* Apple style animations */}
                            <style>{`
                                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                            `}</style>

                        </div>
                    )}

                    {/* --- DESKTOP HEADER & DASHBOARD --- */}
                    <div style={{ display: isMobile ? 'none' : 'flex', flexDirection: 'column', gap: '20px' }}>

                    
                    {/* SAGS DETALJER HEADER */}
                    {selectedCase.status === 'Afbrudt Sag' && (
                        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid #ef4444', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.1)', marginBottom: '16px' }}>
                            <div style={{ padding: '10px', background: '#ef4444', color: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AlertTriangle size={28} />
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0', color: '#b91c1c', fontSize: '1.15rem', fontWeight: 'bold' }}>⚠️ SAG AFBRUDT: Produktionen er stoppet.</h4>
                                <p style={{ margin: 0, color: '#991b1b', fontSize: '0.95rem' }}>Sagen er afbrudt (Konkurs/Aflyst). Kun økonomisk afvikling er åben. Fanerne 'To-Do' og 'Aftalesedler' er låst for ændringer.</p>
                            </div>
                        </div>
                    )}
                    <div data-tour="case-detail-header" style={{ padding: '24px', backgroundColor: selectedCase.status === 'Afbrudt Sag' ? '#fef2f2' : '#ffffff', borderRadius: '16px', border: selectedCase.status === 'Afbrudt Sag' ? '1px solid #fca5a5' : '1px solid #e8e6e1', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                        <div>
                            <button
                                onClick={() => !isModalView && setSelectedCaseIdState(null)}
                                style={{ 
                                    display: isModalView ? 'none' : 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    background: '#f8fafc', 
                                    border: '1px solid #e2e8f0', 
                                    color: '#475569', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem', 
                                    padding: '6px 14px', 
                                    borderRadius: '9999px',
                                    fontWeight: '500',
                                    marginBottom: '12px',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                            >
                                <ArrowLeft size={16} /> Tilbage til sagsliste
                            </button>
                            {selectedCase.status === 'Sæt i bero' && (
                                <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fdba74', padding: '16px', borderRadius: '16px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                    <div style={{ color: '#ea580c', display: 'flex', alignItems: 'center', marginTop: '2px' }}><Pause size={28} /></div>
                                    <div>
                                        <h4 style={{ margin: '0 0 6px 0', color: '#9a3412', fontSize: '1.1rem', fontWeight: 'bold' }}>Sagen er sat i bero</h4>
                                        <p style={{ margin: 0, color: '#c2410c', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                            Sagen er i øjeblikket på pause pga. afventning eller en konflikt. Tidsregistrering og opgaver <b>kan stadig udføres</b> ved akut behov, men rådfør dig altid med projektlederen inden du fortsætter arbejdet.
                                        </p>
                                    </div>
                                </div>
                            )}
                            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', fontWeight: 'bold', color: '#1a1a1a' }}>
                                Sag {selectedCase.case_number || String(selectedCase.id).substring(0,8)} - {selectedCase.raw_data?.project_title || selectedCase.project_category}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '0.9rem' }}>
                                <MapPin size={14} style={{ color: '#94a3b8' }} /> <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCase.customer_address || '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => e.target.style.textDecoration = 'underline'} onMouseLeave={(e) => e.target.style.textDecoration = 'none'} onClick={(e) => e.stopPropagation()}>{selectedCase.customer_address || 'Adresse ikke angivet'}</a> 
                                <span style={{ color: '#cbd5e1' }}>|</span> 
                                <strong>
                                    {selectedCase.raw_data?.customerDetails?.customerType === 'erhverv' ? (
                                        <><span style={{ background: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', marginRight: '6px' }}>Erhverv</span>
                                        {selectedCase.customer_name} (CVR: {selectedCase.raw_data?.customerDetails?.cvr}) - Kontakt: {selectedCase.raw_data?.customerDetails?.fullName}</>
                                    ) : (
                                        <>Kunde: {selectedCase.customer_name || 'Privatkunde'}</>
                                    )}
                                </strong>
                            </div>
                        </div>
                        
                        {/* Status bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button
                                onClick={() => onOpenChat && onOpenChat(selectedCase.id)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '99px',
                                    border: '1px solid rgba(37, 99, 235, 0.2)',
                                    background: 'rgba(37, 99, 235, 0.1)',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    color: '#2563eb',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(37, 99, 235, 0.1)'; }}
                            >
                                <MessageSquare size={16} /> Åben Chat
                            </button>

                            {/* DAGENS BESKED PILL */}
                            <div style={{ position: 'relative' }}>
                                {(() => {
                                    const msg = selectedCase?.raw_data?.daily_message;
                                    const isToday = msg?.date && new Date(msg.date).toDateString() === new Date().toDateString();
                                    const hasUnread = isToday && !(msg.seen_by || []).includes(profile?.id);
                                    const canWrite = ['admin', 'accountant', 'boss', 'sales'].includes(profile?.role);
                                    
                                    if (!isToday && !canWrite) return null;
                                    
                                    return (
                                        <button 
                                            onClick={() => setIsDailyMessageOpen(!isDailyMessageOpen)}
                                            style={{ 
                                                padding: '8px 16px', 
                                                borderRadius: '99px', 
                                                border: hasUnread ? '1px solid #3b82f6' : '1px solid #e2e8f0', 
                                                background: hasUnread ? '#eff6ff' : '#fff', 
                                                fontSize: '0.85rem', 
                                                fontWeight: '600', 
                                                color: hasUnread ? '#2563eb' : '#475569', 
                                                cursor: 'pointer', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '8px',
                                                boxShadow: hasUnread ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <MessageCircle size={16} /> Dagens Besked {hasUnread && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}/>}
                                        </button>
                                    );
                                })()}
                                
                                {isDailyMessageOpen && !isMobile && (
                                    <div style={{ 
                                        position: 'absolute', 
                                        top: '100%', 
                                        right: 0, 
                                        marginTop: '12px', 
                                        width: '320px',
                                        background: 'rgba(255, 255, 255, 0.95)',
                                        backdropFilter: 'blur(12px)', 
                                        border: '1px solid #e2e8f0', 
                                        borderRadius: '16px', 
                                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
                                        padding: '16px', 
                                        zIndex: 100,
                                        animation: 'slideDown 0.2s ease-out'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}><MessageCircle size={16} /> Dagens Besked</h4>
                                            <button onClick={() => setIsDailyMessageOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16}/></button>
                                        </div>
                                        
                                        {(() => {
                                            const msg = selectedCase?.raw_data?.daily_message;
                                            const isToday = msg?.date && new Date(msg.date).toDateString() === new Date().toDateString();
                                            const canWrite = ['admin', 'accountant', 'boss', 'sales'].includes(profile?.role);
                                            
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {isToday && (
                                                        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                                            <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>{msg.text}</p>
                                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Skrevet af: {msg.author}</div>
                                                        </div>
                                                    )}
                                                    
                                                    {canWrite && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: isToday ? '8px' : '0' }}>
                                                            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Send besked for i dag</label>
                                                            <CustomSelect
                                                                value={msgRecipient}
                                                                onChange={setMsgRecipient}
                                                                placeholder="Vælg modtager..."
                                                                options={[
                                                                    { value: 'all', label: 'Hele holdet på sagen', icon: <Megaphone size={16} />, color: '#d97706', activeBg: '#fef3c7' },
                                                                    ...caseRecipients.map(r => ({
                                                                        value: r.id,
                                                                        label: `${r.name}${r.role ? ` · ${getRoleLabel(r.role)}` : ''}`,
                                                                        icon: <User size={16} />,
                                                                        color: '#3b82f6',
                                                                        activeBg: '#eff6ff'
                                                                    }))
                                                                ]}
                                                            />
                                                            <textarea
                                                                value={newDailyMessage}
                                                                onChange={(e) => setNewDailyMessage(e.target.value)}
                                                                placeholder="F.eks. Husk fugepistol..."
                                                                rows={3}
                                                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'none' }}
                                                            />
                                                            <button
                                                                onClick={handleSendCaseMessage}
                                                                style={{ padding: '8px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                                            >
                                                                {msgRecipient === 'all' ? 'Send til holdet' : 'Send besked'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>

                            {['admin', 'accountant', 'boss', 'sales'].includes(profile?.role) && (
                                <button
                                    onClick={() => onOpenInvoice && onOpenInvoice(selectedCase.id)}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #059669', background: '#10b981', fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.3)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)'; }}
                                >
                                    <DollarSign size={16} /> Opret Faktura
                                </button>
                            )}
                            {['admin', 'sales'].includes(profile?.role) && (
                                <div ref={statusDropdownRef} style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        Skift Status <ChevronRight size={14} style={{ transform: isStatusDropdownOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                    </button>
                                    {isStatusDropdownOpen && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '8px', zIndex: 50, minWidth: '220px' }}>
                                            {selectedCase.status !== 'Afbrudt Sag' ? (
                                                <>
                                                    {selectedCase.status === 'Sæt i bero' ? (
                                                        <button 
                                                            onClick={() => { handleStatusChange('Bekræftet opgave'); setIsStatusDropdownOpen(false); }}
                                                            style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#059669', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#ecfdf5'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <CheckCircle size={16}/> Genoptag Sag (Aktiv)
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => { handleStatusChange('Sæt i bero'); setIsStatusDropdownOpen(false); }}
                                                            style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#f97316', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#fff7ed'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            Sæt i bero
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => { 
                                                            handleStatusChange('Afbrudt Sag');
                                                            setIsStatusDropdownOpen(false);
                                                        }}
                                                        style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <AlertTriangle size={16}/> Afbryd Sag (Konkurs)
                                                    </button>
                                                </>
                                            ) : (
                                                <button 
                                                    onClick={() => { handleStatusChange('Historik', true); setIsStatusDropdownOpen(false); toast.success('Sagen er flyttet til Historik og kan nu genoptages derfra.'); }}
                                                    style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#10b981', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#ecfdf5'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <CheckCircle size={16}/> Genoptag Sag (Lås op)
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>Færdiggørelse:</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '120px', height: '8px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ width: `${progressPercent}%`, height: '100%', background: '#10b981' }} />
                                    </div>
                                    <strong style={{ fontSize: '0.9rem', color: '#1a1a1a' }}>{progressPercent}%</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* OVERBLIK / DASHBOARD (NYT DESIGN) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                        
                        {/* 1. Tidsregistrering */}
                        <div 
                            onClick={() => handleSubTabChange('timesheet')}
                            style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column' }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#10b981'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#e8e6e1'; }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1a1a1a', fontWeight: 'bold' }}>Tidsregistrering</h4>
                                    {!['worker', 'apprentice'].includes(profile?.role) && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{hasHourBudget ? 'Status på timebudgettet' : 'Timer brugt på opgaven'}</span>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a1a1a' }}>
                                        {totalActualHours} {hasHourBudget ? <span style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 'normal' }}>/ {budgetedHours} timer</span> : 'timer'}
                                    </div>
                                </div>
                                {!['worker', 'apprentice'].includes(profile?.role) && hasHourBudget && <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: isOvertime ? '#ef4444' : '#10b981' }}>{Math.round(hourBudgetRatio * 100)}%</span>}
                            </div>
                            {!['worker', 'apprentice'].includes(profile?.role) && hasHourBudget && (
                                <>
                                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
                                        <div style={{ width: `${Math.min(100, hourBudgetRatio * 100)}%`, height: '100%', background: isOvertime ? '#ef4444' : '#10b981', transition: 'width 0.5s ease' }} />
                                    </div>
                                    <div style={{ marginTop: 'auto', fontSize: '0.85rem', fontWeight: '500', color: isOvertime ? '#ef4444' : '#059669', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: isOvertime ? '#fef2f2' : '#ecfdf5', padding: '8px 12px', borderRadius: '8px' }}>
                                        {isOvertime ? (
                                            <>Advarsel: Budgettet er overskredet med {Math.abs(remainingHours)} timer!</>
                                        ) : (
                                            <>Du har {remainingHours} timer tilbage at gøre godt med.</>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>


                        {/* 3. Materialer */}
                        {!['worker', 'apprentice'].includes(profile?.role) && (
                            <div 
                                onClick={() => handleSubTabChange('materials')}
                            style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e8e6e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column' }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#e8e6e1'; }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Package size={20} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1a1a1a', fontWeight: 'bold' }}>Materialer</h4>
                                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Indkøbs- & leveringsstatus</span>
                                </div>
                            </div>
                            {/* Status uden antal: er materialerne bestilt? er de leveret? */}
                            {totalMaterials === 0 ? (
                                <div style={{ marginTop: 'auto', fontSize: '0.85rem', color: '#94a3b8', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', fontStyle: 'italic' }}>
                                    Ingen materialer tilføjet endnu
                                </div>
                            ) : (
                                <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {(() => {
                                        const allOrdered = notOrderedMaterials === 0;
                                        const allDelivered = deliveredMaterials === totalMaterials;
                                        const pill = (active, labelActive, labelInactive) => (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700, color: active ? '#166534' : '#64748b', backgroundColor: active ? '#f0fdf4' : '#f1f5f9', border: `1px solid ${active ? '#bbf7d0' : '#e2e8f0'}` }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: active ? '#22c55e' : '#cbd5e1' }} />
                                                {active ? labelActive : labelInactive}
                                            </div>
                                        );
                                        return (
                                            <>
                                                {pill(allOrdered, 'Bestilt', 'Ikke bestilt endnu')}
                                                {pill(allDelivered, 'Leveret', 'Ikke leveret endnu')}
                                                {!allDelivered && (
                                                    <button
                                                        onClick={handleMarkAllMaterialsDelivered}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700, color: '#fff', backgroundColor: '#10b981', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; }}
                                                    >
                                                        <CheckCircle size={15} /> Marker alle leveret
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Budget Oversigt */}
                            {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Forbrugt / Budget</div>
                                        <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 'bold' }}>{totalSpent.toLocaleString('da-DK')} <span style={{ color: '#94a3b8', fontWeight: 'normal', fontSize: '0.8rem' }}>/ {originalBudget.toLocaleString('da-DK')} kr.</span></div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Restbudget</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: isOverBudget ? '#ef4444' : '#10b981' }}>{budgetRemaining > 0 ? '+' : ''}{budgetRemaining.toLocaleString('da-DK')} kr.</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        )}
                    </div>

                    {/* ANOMALI ADVARSEL HVIS TIMER SKRIDER */}
                    {hasTimeAnomalies && hasHourBudget && (
                        <div style={{ padding: '16px 20px', backgroundColor: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <ShieldAlert size={24} />
                            <div>
                                <strong style={{ display: 'block', fontSize: '0.9rem' }}>Advarsel: Timebudgettet skrider!</strong>
                                <span style={{ fontSize: '0.8rem' }}>Sagen har brugt {totalActualHours} t ud af det estimerede budget på {budgetedHours} t ({Math.round(hourBudgetRatio * 100)}%), men bygge-to-do listen er kun {progressPercent}% færdig. Kontroller eventuelt tidsregistreringerne eller pladsen.</span>
                            </div>
                        </div>
                    )}

                    {/* MANDSKABS DELEGERING BAR (NYT DESIGN) */}
                    <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>Holdet på sagen</h3>
                            {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                <button 
                                    onClick={handleSaveAssignments}
                                    style={{ 
                                        padding: '8px 16px', 
                                        backgroundColor: isSavedTeam ? '#10b981' : '#0f172a', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '8px', 
                                        fontSize: '0.85rem', 
                                        fontWeight: 'bold', 
                                        cursor: isSavingTeam ? 'wait' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {isSavedTeam ? '✓ Gemt' : isSavingTeam ? 'Gemmer...' : 'Gem holdet'}
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            {/* Rendér Projektledere først, derefter Byggehold */}
                            {[...pmIds, ...assignedWorkers].map(memberId => {
                                const w = team.find(t => t.id === memberId);
                                if (!w) return null;
                                
                                const isPM = pmIds.includes(memberId);
                                const roleColors = {
                                    'admin': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', label: 'Admin' },
                                    'sales': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', label: 'Projektleder' },
                                    'worker': { bg: '#dcfce7', text: '#166534', border: '#86efac', label: 'Tømrersvend' },
                                    'apprentice': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc', label: 'Lærling' }
                                };
                                const roleInfo = isPM ? roleColors['sales'] : (roleColors[w.role] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db', label: 'Medarbejder' });
                                
                                const displayName = w.owner_name || w.company_name || 'Ukendt';
                                const initials = displayName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();

                                return (
                                    <div key={memberId}
                                        onClick={() => setProfilePerson({ name: displayName, role: roleInfo.label, phone: w.phone, email: w.email })}
                                        title="Se kontaktkort"
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'none'; }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: roleInfo.bg, color: roleInfo.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', border: `1px solid ${roleInfo.border}` }}>
                                            {initials}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#0f172a' }}>{displayName}</div>
                                            <div style={{ fontSize: '0.75rem', color: roleInfo.text, fontWeight: '600', textTransform: 'uppercase' }}>{roleInfo.label}</div>
                                        </div>
                                        {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if (isPM) setPmIds(pmIds.filter(id => id !== memberId));
                                                    else handleWorkerToggle(memberId);
                                                }}
                                                style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#94a3b8', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                                title="Fjern fra holdet"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Tilføj Medarbejder Knap */}
                            {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setWorkerDropdownOpen(!workerDropdownOpen)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#ffffff', color: '#475569', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', height: '100%' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                    >
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</div>
                                        Tilføj til holdet
                                    </button>

                                    {workerDropdownOpen && createPortal(
                                        <div onClick={() => setWorkerDropdownOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out', padding: '16px' }}>
                                            <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                                                
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                                    <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>Tilføj Medarbejdere</h3>
                                                    <button 
                                                        onClick={() => setWorkerDropdownOpen(false)}
                                                        style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>

                                                <div style={{ overflowY: 'auto', paddingRight: '8px', flex: 1 }}>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8', padding: '8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projektledere</div>
                                                    {team.filter(t => t.role === 'sales' || t.role === 'admin').map(pm => {
                                                        const isSelected = pmIds.includes(pm.id);
                                                        return (
                                                            <div 
                                                                key={pm.id} 
                                                                onClick={() => {
                                                                    if (isSelected) setPmIds(pmIds.filter(id => id !== pm.id));
                                                                    else setPmIds([...pmIds, pm.id]);
                                                                }}
                                                                style={{ padding: '16px', margin: '4px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px', backgroundColor: isSelected ? '#eff6ff' : '#f8fafc', border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0', transition: 'all 0.1s' }}
                                                            >
                                                                <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: isSelected ? 'none' : '1px solid #cbd5e1', backgroundColor: isSelected ? '#3b82f6' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    {isSelected && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                                                                </div>
                                                                <span style={{ fontSize: '1.05rem', color: isSelected ? '#1d4ed8' : '#334155', fontWeight: isSelected ? 'bold' : '600' }}>{pm.owner_name || pm.company_name || pm.email || 'Ukendt'}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    
                                                    <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '16px 0' }}></div>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8', padding: '8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Byggehold (Svende & Lærlinge)</div>
                                                    {team.filter(t => t.role === 'worker' || t.role === 'apprentice').map(worker => {
                                                        const isAssigned = assignedWorkers.includes(worker.id);
                                                        return (
                                                            <div 
                                                                key={worker.id} 
                                                                onClick={() => handleWorkerToggle(worker.id)}
                                                                style={{ padding: '16px', margin: '4px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px', backgroundColor: isAssigned ? '#eff6ff' : '#f8fafc', border: isAssigned ? '2px solid #3b82f6' : '1px solid #e2e8f0', transition: 'all 0.1s' }}
                                                            >
                                                                <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: isAssigned ? 'none' : '1px solid #cbd5e1', backgroundColor: isAssigned ? '#3b82f6' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    {isAssigned && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                                                                </div>
                                                                <span style={{ fontSize: '1.05rem', color: isAssigned ? '#1d4ed8' : '#334155', fontWeight: isAssigned ? 'bold' : '600' }}>{worker.owner_name || worker.company_name || worker.email || 'Ukendt'}</span>
                                                            </div>
                                                        );
                                                    })}

                                                    <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '16px 0' }}></div>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8', padding: '8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Eksterne underleverandører</div>
                                                    {subcontractors.map(sc => {
                                                        const isAttached = assignedSubs.some(s => s.id === sc.id);
                                                        const attachedSub = assignedSubs.find(s => s.id === sc.id);
                                                        const hasWorkers = sc.workers && sc.workers.length > 0;
                                                        const isExpanded = isAttached && hasWorkers;
                                                        
                                                        const toggleWorker = (e, workerId) => {
                                                            e.stopPropagation();
                                                            const updated = assignedSubs.map(s => {
                                                                if (s.id === sc.id) {
                                                                    const currentSelected = s.selected_workers || [];
                                                                    const newSelected = currentSelected.includes(workerId)
                                                                        ? currentSelected.filter(id => id !== workerId)
                                                                        : [...currentSelected, workerId];
                                                                    return { ...s, selected_workers: newSelected };
                                                                }
                                                                return s;
                                                            });
                                                            setAssignedSubs(updated);
                                                        };

                                                        return (
                                                            <div key={sc.id} style={{ display: 'flex', flexDirection: 'column', margin: '4px 0', backgroundColor: isAttached ? '#f5f3ff' : '#f8fafc', borderRadius: '12px', border: isAttached ? '2px solid #8b5cf6' : '1px solid #e2e8f0', transition: 'all 0.1s', overflow: 'hidden' }}>
                                                                <div
                                                                    onClick={() => attachSubcontractor(sc)}
                                                                    style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                                                                >
                                                                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: isAttached ? 'none' : '1px solid #cbd5e1', backgroundColor: isAttached ? '#8b5cf6' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        {isAttached && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                                                                    </div>
                                                                    <div style={{ flex: 1 }}>
                                                                        <span style={{ fontSize: '1.05rem', color: isAttached ? '#6d28d9' : '#334155', fontWeight: isAttached ? 'bold' : '600' }}>
                                                                            {sc.company_name}{sc.trade ? ` · ${sc.trade}` : ''}
                                                                        </span>
                                                                        {isAttached && <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '2px' }}>Mester / Kontaktperson er altid valgt</div>}
                                                                    </div>
                                                                    {hasWorkers && (
                                                                        <div style={{ color: isAttached ? '#8b5cf6' : '#94a3b8', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                <AnimatePresence>
                                                                    {isExpanded && (
                                                                        <motion.div 
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            style={{ overflow: 'hidden', borderTop: '1px solid rgba(139, 92, 246, 0.2)', backgroundColor: 'rgba(255,255,255,0.5)' }}
                                                                        >
                                                                            <div style={{ padding: '12px 16px 16px 48px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Vælg specifikke svende</div>
                                                                                {sc.workers.map(w => {
                                                                                    const isSelected = (attachedSub.selected_workers || []).includes(w.id);
                                                                                    return (
                                                                                        <div 
                                                                                            key={w.id} 
                                                                                            onClick={(e) => toggleWorker(e, w.id)}
                                                                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'transparent', transition: 'background 0.1s' }}
                                                                                        >
                                                                                            <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: isSelected ? 'none' : '1px solid #cbd5e1', backgroundColor: isSelected ? '#8b5cf6' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                                {isSelected && <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                                                                                            </div>
                                                                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                                                                <span style={{ fontSize: '0.95rem', color: isSelected ? '#5b21b6' : '#475569', fontWeight: isSelected ? 600 : 500 }}>{w.name} <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>({w.role})</span></span>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        );
                                                    })}
                                                    <div
                                                        onClick={() => { setWorkerDropdownOpen(false); setShowInviteSubcontractorModal(true); }}
                                                        style={{ padding: '16px', margin: '4px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px dashed #cbd5e1', color: '#7c3aed', fontWeight: 600, fontSize: '1rem', transition: 'all 0.1s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f3ff'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <Plus size={18} /> Opret ny underleverandør
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                                    <button 
                                                        onClick={() => { setWorkerDropdownOpen(false); handleSaveAssignments(); }}
                                                        style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 'bold', fontSize: '1.05rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                                                    >
                                                        Gem hold
                                                    </button>
                                                </div>
                                            </div>
                                        </div>,
                                        document.body
                                    )}
                                </div>
                            )}

                            {/* Tomt hold besked */}
                            {(pmIds.length === 0 && assignedWorkers.length === 0 && assignedSubs.length === 0) && (
                                <div style={{ display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic', padding: '12px 0' }}>
                                    Der er endnu ikke tilføjet nogen til sagen...
                                </div>
                            )}
                        </div>

                        {/* EKSTERNE UNDERLEVERANDØRER PÅ SAGEN */}
                        {assignedSubs.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <Store size={16} /> Eksterne underleverandører ({assignedSubs.length})
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                                    {assignedSubs.map(sub => {
                                        const isOpen = expandedSubId === sub.id;
                                        const workers = sub.workers || [];
                                        const canEdit = profile?.role !== 'worker' && profile?.role !== 'apprentice';
                                        return (
                                            <div key={sub.id} style={{ border: '1px solid #ede9fe', borderRadius: '14px', background: '#ffffff', overflow: 'hidden', boxShadow: '0 2px 4px rgba(124,58,237,0.04)' }}>
                                                {/* Header: firma + mester */}
                                                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                                        <div
                                                            onClick={() => setProfilePerson({ name: sub.contact_name || sub.company_name, role: `Underleverandør${sub.trade ? ` · ${sub.trade}` : ''}`, phone: sub.contact_phone, email: sub.contact_email })}
                                                            title="Se kontaktkort"
                                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                                                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                <Store size={19} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', lineHeight: 1.2 }}>{sub.company_name}</div>
                                                                {sub.trade && <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#7c3aed', marginTop: '2px' }}>{sub.trade}</div>}
                                                            </div>
                                                        </div>
                                                        {canEdit && (
                                                            <button onClick={() => removeSubcontractor(sub.id)} title="Fjern fra sagen"
                                                                style={{ background: '#ffffff', border: '1px solid #e2e8f0', color: '#94a3b8', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', flexShrink: 0, transition: 'all 0.2s' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>×</button>
                                                        )}
                                                    </div>
                                                    {/* Mester kontakt */}
                                                    {(sub.contact_name || sub.contact_phone) && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569', background: '#faf9ff', padding: '8px 10px', borderRadius: '10px' }}>
                                                            <HardHat size={15} style={{ color: '#7c3aed', flexShrink: 0 }} />
                                                            <span style={{ fontWeight: 600 }}>{sub.contact_name || 'Mester'}</span>
                                                            {sub.contact_phone && (
                                                                <a href={`tel:${sub.contact_phone}`} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>
                                                                    <Phone size={13} /> {sub.contact_phone}
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Svende/lærlinge på denne sag */}
                                                <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 16px', background: '#fcfcfd' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: workers.length ? '8px' : '0' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Svende på sagen ({workers.length})</span>
                                                        {canEdit && (
                                                            <button onClick={() => { setExpandedSubId(isOpen ? null : sub.id); setNewSubWorker({ name: '', phone: '' }); }}
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: '#7c3aed', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                                                                <Plus size={14} /> Tilføj svend
                                                            </button>
                                                        )}
                                                    </div>

                                                    {workers.map(w => (
                                                        <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '0.85rem', color: '#334155' }}>
                                                            <User size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                            <span style={{ fontWeight: 500 }}>{w.name}</span>
                                                            {w.phone && (
                                                                <a href={`tel:${w.phone}`} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#475569', textDecoration: 'none' }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.color = '#7c3aed'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}>
                                                                    <Phone size={12} /> {w.phone}
                                                                </a>
                                                            )}
                                                            {canEdit && (
                                                                <button onClick={() => removeSubWorker(sub.id, w.id)} title="Fjern svend"
                                                                    style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px', display: 'flex', marginLeft: w.phone ? '0' : 'auto', transition: 'color 0.2s' }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}>
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {workers.length === 0 && !isOpen && (
                                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', paddingTop: '2px' }}>Ingen svende tilføjet på denne sag endnu.</div>
                                                    )}

                                                    {/* Inline tilføj-formular */}
                                                    {isOpen && canEdit && (
                                                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                                                            <input
                                                                value={newSubWorker.name}
                                                                onChange={(e) => setNewSubWorker({ ...newSubWorker, name: e.target.value })}
                                                                placeholder="Navn på svend/lærling"
                                                                onKeyDown={(e) => e.key === 'Enter' && addSubWorker(sub.id)}
                                                                style={{ flex: '1 1 130px', minWidth: 0, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                                                                autoFocus
                                                            />
                                                            <input
                                                                value={newSubWorker.phone}
                                                                onChange={(e) => setNewSubWorker({ ...newSubWorker, phone: e.target.value })}
                                                                placeholder="Telefon"
                                                                onKeyDown={(e) => e.key === 'Enter' && addSubWorker(sub.id)}
                                                                style={{ flex: '1 1 90px', minWidth: 0, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                                                            />
                                                            <button onClick={() => addSubWorker(sub.id)}
                                                                style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: '#7c3aed', color: 'white', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                                                                Tilføj
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                        Husk at trykke "Gem holdet" for at gemme ændringer i underleverandører og svende.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Modal: opret ny underleverandør direkte fra sagen */}
                    <SubcontractorModal
                        open={showInviteSubcontractorModal}
                        onClose={() => setShowInviteSubcontractorModal(false)}
                        companyId={profile.company_id || profile.id}
                        onSaved={handleSubcontractorCreated}
                        leadId={selectedCase.id}
                        invitedByCompanyId={profile.company_id || profile.id}
                    />

                    {/* Profil-kort (kun arbejdsinfo) */}
                    <ProfileCard open={!!profilePerson} onClose={() => setProfilePerson(null)} person={profilePerson} />

                                        </div> {/* END DESKTOP HEADER & DASHBOARD */}

                    {/* CASE WORKSPACE TABS */}
                                        {/* MODERN HORIZONTAL TABS (2026 DESIGN) */}
                    {(() => {
                        const caseTabs = [
                            { id: 'todo', label: selectedCase.status === 'Afbrudt Sag' ? 'Bygge To-Do (Låst)' : 'Bygge To-Do (KS)', mobileLabel: 'To-Do', icon: <CheckSquare size={isMobile ? 22 : 18} />, color: '#64748b', activeColor: '#10b981', activeBg: '#ecfdf5', show: true },
                            { id: 'materials', label: 'Materialer & Indkøb', mobileLabel: 'Materialer', icon: <PackageCheck size={isMobile ? 22 : 18} />, color: '#3b82f6', activeColor: '#3b82f6', activeBg: '#eff6ff', show: profile?.role !== 'worker' && profile?.role !== 'apprentice' && getFeatures(carpenterProfile?.business_type).materials },
                            { id: 'logs', label: 'Byggeproces', mobileLabel: 'Proces', icon: <ClipboardList size={isMobile ? 22 : 18} />, color: '#16a34a', activeColor: '#16a34a', activeBg: '#f0fdf4', show: true },
                            { id: 'timesheet', label: 'Timeregistrering', mobileLabel: 'Timer', icon: <Clock size={isMobile ? 22 : 18} />, color: '#d946ef', activeColor: '#d946ef', activeBg: '#fdf4ff', show: true },
                            { id: 'invoices', label: 'Bilag', mobileLabel: 'Bilag', icon: <Receipt size={isMobile ? 22 : 18} />, color: '#f59e0b', activeColor: '#f59e0b', activeBg: '#fef3c7', show: profile?.role !== 'worker' && profile?.role !== 'apprentice' },
                            { id: 'extra-work', label: selectedCase.status === 'Afbrudt Sag' ? 'Aftalesedler (Låst)' : 'Aftalesedler', mobileLabel: 'Aftaler', icon: <PenTool size={isMobile ? 22 : 18} />, color: '#8b5cf6', activeColor: '#8b5cf6', activeBg: '#f5f3ff', show: profile?.role !== 'worker' && profile?.role !== 'apprentice' },
                            { id: 'drawings', label: 'Tegninger', mobileLabel: 'Tegninger', icon: <FileImage size={isMobile ? 22 : 18} />, color: '#0ea5e9', activeColor: '#0ea5e9', activeBg: '#e0f2fe', show: true }
                        ].filter(tab => tab.show);

                        const tabContent = (
                            <div data-tour="case-tabs-nav" className="case-workspace-tabs modern-tab-scroll case-bottom-nav" style={{
                                display: 'flex', 
                                gap: isMobile ? '4px' : '10px', 
                                flexWrap: isMobile ? 'nowrap' : 'wrap', 
                                paddingTop: isMobile ? '7px' : '4px', 
                                paddingBottom: isMobile ? '7px' : '8px', 
                                WebkitOverflowScrolling: 'touch', 
                                scrollbarWidth: 'none', 
                                msOverflowStyle: 'none', 
                                marginBottom: isMobile ? '0' : '16px', 
                                marginTop: isMobile ? '0' : '24px',
                                overflowX: isMobile ? 'visible' : 'auto',
                                
                                /* Mobile bottom navigation */
                                ...(isMobile ? {
                                    position: 'fixed',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    backgroundColor: '#ffffff',
                                    borderTop: '1px solid #e2e8f0',
                                    borderRadius: 0,
                                    zIndex: 99999,
                                    paddingLeft: '6px',
                                    paddingRight: '6px',
                                    paddingBottom: 'max(7px, env(safe-area-inset-bottom))',
                                    justifyContent: 'space-between',
                                    alignItems: 'stretch',
                                    minHeight: 'calc(72px + env(safe-area-inset-bottom))',
                                    boxShadow: '0 -8px 24px rgba(15, 23, 42, 0.08)',
                                    touchAction: 'manipulation',
                                    boxSizing: 'border-box'
                                } : {})
                            }}>
                                <style>{`
                                    .modern-tab-scroll::-webkit-scrollbar { display: none; }
                                `}</style>
                                {caseTabs.map(tab => {
                                    const isActive = activeSubTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            data-tour={`case-tab-${tab.id}`}
                                            onClick={() => handleSubTabChange(tab.id)}
                                            aria-label={tab.label}
                                            aria-current={isActive ? 'page' : undefined}
                                            style={isMobile ? {
                                                /* MOBILE TAB STYLES */
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px',
                                                background: isActive ? tab.activeBg : 'transparent',
                                                border: isActive ? `1px solid ${tab.activeColor}22` : '1px solid transparent', 
                                                borderRadius: '14px',
                                                padding: '8px 2px', 
                                                cursor: 'pointer', 
                                                transition: 'background 0.18s ease, color 0.18s ease, transform 0.18s ease, border-color 0.18s ease', 
                                                flex: '1 1 0',
                                                minWidth: '46px',
                                                minHeight: '58px',
                                                color: isActive ? tab.activeColor : '#64748b',
                                                WebkitTapHighlightColor: 'transparent',
                                                touchAction: 'manipulation',
                                                boxShadow: isActive ? '0 8px 18px rgba(15, 23, 42, 0.08)' : 'none'
                                            } : { 
                                                /* DESKTOP TAB STYLES */
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '8px', 
                                                padding: '10px 16px', 
                                                border: isActive ? `1px solid ${tab.activeColor}` : '1px solid #e2e8f0', 
                                                background: isActive ? tab.activeBg : '#ffffff', 
                                                borderRadius: '30px',
                                                fontSize: '0.85rem', 
                                                fontWeight: '600', 
                                                cursor: 'pointer', 
                                                color: isActive ? tab.activeColor : '#64748b',
                                                boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                whiteSpace: 'nowrap',
                                                flex: '1 1 auto',
                                                justifyContent: 'center'
                                            }}
                                            onPointerDown={isMobile ? (e) => {
                                                e.currentTarget.style.transform = 'scale(0.96)';
                                            } : undefined}
                                            onPointerUp={isMobile ? (e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                            } : undefined}
                                            onPointerLeave={isMobile ? (e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                            } : undefined}
                                            onMouseEnter={isMobile ? undefined : (e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)'; e.currentTarget.style.backdropFilter = 'blur(12px)';
                                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                }
                                            }}
                                            onMouseLeave={isMobile ? undefined : (e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.backdropFilter = 'none';
                                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }
                                            }}
                                        >
                                            <span style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: isMobile ? '26px' : 'auto',
                                                height: isMobile ? '24px' : 'auto'
                                            }}>{tab.icon}</span>
                                            {!isMobile && tab.label}
                                            {isMobile && (
                                                <span style={{
                                                    maxWidth: '100%',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    fontSize: '0.62rem',
                                                    lineHeight: 1,
                                                    fontWeight: isActive ? 800 : 700,
                                                    letterSpacing: 0,
                                                    color: isActive ? tab.activeColor : '#64748b'
                                                }}>
                                                    {tab.mobileLabel}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                        
                        return isMobile ? createPortal(tabContent, document.body) : tabContent;
                    })()}

                    {/* CASE WORKSPACE TABS INDHOLD */}
                    <div ref={tabContentRef} data-tour="case-tab-content" style={{ padding: '8px 0' }}>
                        
                        {/* TAB 1: TO-DO / CHECKLIST */}
                        {activeSubTab === 'todo' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', pointerEvents: selectedCase.status === 'Afbrudt Sag' ? 'none' : 'auto', opacity: selectedCase.status === 'Afbrudt Sag' ? 0.7 : 1, backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e8e6e1' }}>
                                {!isMobile && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0, color: '#1a1a1a' }}>Udførelsesmetode & Bygge-anvisninger</h4>
                                        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                            Checklister sikrer overensstemmelse med Byg Garanti og mindsker fejl.
                                        </span>
                                    </div>
                                )}

                                {/* Delopgaver & timer: redigér (altid) + sammenlign estimeret vs. faktisk (når der er estimater). */}
                                {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => setShowBreakdownEdit(true)}
                                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(15,23,42,0.12)'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                            style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '12px', borderRadius: '12px', border: '1px dashed #cbd5e1', background: '#fff', color: '#334155', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', transition: 'all .15s' }}
                                        >
                                            <Edit2 size={16} /> Redigér delopgaver & timer
                                        </button>
                                        {todoList.some(s => (s.subTasks || []).some(t => subManHours(t) > 0)) && (
                                            <button
                                                onClick={() => setShowHourCompare(true)}
                                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(14,165,233,0.18)'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#bae6fd'; }}
                                                style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '12px', borderRadius: '12px', border: '1px solid #bae6fd', background: 'linear-gradient(180deg, #f0f9ff, #ffffff)', color: '#0369a1', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', transition: 'all .15s' }}
                                            >
                                                <TrendingUp size={17} /> Sammenlign timer
                                            </button>
                                        )}
                                    </div>
                                )}

                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndGlobal}>
                                    <SortableContext items={todoList.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {todoList.map((step, idx) => {
                                                const subs = step.subTasks || [];
                                                
                                                return (
                                                    <SortableStep 
                                                        key={step.id} 
                                                        step={step} 
                                                        idx={idx} 
                                                        handleToggleExpand={handleToggleExpand}
                                                        handleEditStepText={handleEditStepText}
                                                        setStepToDelete={setStepToDelete}
                                                        profile={profile}
                                                    >
                                                        <div style={{ padding: '0 24px 20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            <div style={{ height: '1px', backgroundColor: (subs.length > 0 && subs.filter(s => s.done).length === subs.length) ? 'rgba(16, 185, 129, 0.2)' : '#f1f5f9', marginBottom: '8px' }}></div>
                                                            <SortableContext items={subs.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                                                {subs.map((sub) => (
                                                                    <SortableSubTask 
                                                                        key={sub.id} 
                                                                        sub={sub} 
                                                                        stepId={step.id} 
                                                                        handleTodoToggle={handleTodoToggle} 
                                                                        speakText={speakText} 
                                                                        handleDeleteSubTask={handleDeleteSubTask} 
                                                                        handleEditSubTaskText={handleEditSubTaskText}
                                                                        profile={profile}
                                                                        speakingId={speakingId}
                                                                    />
                                                                ))}
                                                            </SortableContext>
                                                            
                                                            {/* Tilføj underpunkt knap (kun for admin/mester) */}
                                                            {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                                                <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
                                                                    <input 
                                                                        type="text"
                                                                        placeholder="+ Tilføj et underpunkt (tryk Enter for at gemme)..."
                                                                        style={{ width: '100%', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: '#f8fafc' }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                                handleAddSubTask(step.id, e.target.value);
                                                                                e.target.value = '';
                                                                            }
                                                                        }}
                                                                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag when focusing input
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </SortableStep>
                                                );
                                            })}
                                        </div>
                                    </SortableContext>
                                </DndContext>

                                {/* TILFØJ CUSTOM HOVEDTRIN */}
                                {(profile?.role !== 'worker' && profile?.role !== 'apprentice') && (
                                    <form onSubmit={handleAddTodo} style={{ display: 'flex', gap: '12px', borderTop: '1px solid #f1f1ef', paddingTop: '20px', marginTop: '10px' }}>
                                        <input 
                                            type="text"
                                            value={newTodoText}
                                            onChange={(e) => setNewTodoText(e.target.value)}
                                            placeholder="Tilføj et helt nyt bygge-trin på denne sag..."
                                            style={{ flex: 1, border: '1px solid #e8e6e1', padding: '12px 16px', borderRadius: '8px', fontSize: '0.95rem' }}
                                        />
                                        <button 
                                            type="submit"
                                            style={{ backgroundColor: '#1a1a1a', color: '#fff', border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                        >
                                            Tilføj trin
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}

                        {/* Redigér delopgaver & timer — også for manuelle/gamle sager. Gemmes ved luk. */}
                        {showBreakdownEdit && (
                            <WorkBreakdownModal
                                mode="edit"
                                steps={todoList}
                                onChange={(next) => { editBreakdownRef.current = next; setTodoList(next); }}
                                onClose={() => {
                                    setShowBreakdownEdit(false);
                                    if (editBreakdownRef.current) { saveCaseDataToDb({ checklist: editBreakdownRef.current }); editBreakdownRef.current = null; }
                                }}
                                hourlyRate={parseFloat(selectedCase?.raw_data?.calc_data?.hourlyRate) || parseFloat(selectedCase?.raw_data?.hourly_rate) || parseFloat(carpenterProfile?.hourly_rate) || parseFloat(carpenterProfile?.raw_data?.hourly_rate) || 550}
                            />
                        )}

                        {/* Sammenlign-timer popup — læse-visning, auto-fordeling fra "done"-delopgaver */}
                        {showHourCompare && (
                            <WorkBreakdownModal
                                mode="compare"
                                steps={todoList}
                                onClose={() => setShowHourCompare(false)}
                                hourlyRate={parseFloat(selectedCase?.raw_data?.calc_data?.hourlyRate) || parseFloat(selectedCase?.raw_data?.hourly_rate) || parseFloat(carpenterProfile?.hourly_rate) || parseFloat(carpenterProfile?.raw_data?.hourly_rate) || 550}
                                actualHours={totalActualHours}
                            />
                        )}

                        {/* TAB 2: MATERIALER — PDF-først for manuelle tilbud, ellers redigerbar liste */}
                        {activeSubTab === 'materials' && profile?.role !== 'worker' && profile?.role !== 'apprentice' && (
                            selectedCase?.raw_data?.is_manual_quote ? (
                                <ManualMaterialsView
                                    lead={selectedCase}
                                    profile={profile}
                                    onUpdate={onUpdateLead}
                                    onOpenBuilder={onOpenMaterialBuilder}
                                />
                            ) : (
                                <MaterialList
                                    lead={selectedCase}
                                    profile={profile}
                                    simpleView={true}
                                    onUpdate={onUpdateLead}
                                    onAddDeliveryToCalendar={handleAddDeliveryToCalendar}
                                    existingDeliveryDate={existingDeliveryDate}
                                    onOpenBuilder={onOpenMaterialBuilder}
                                />
                            )
                        )}

                        {/* TAB 3: LIVE BYGGEPROCES (Apple-agtig Timeline) */}
                        {activeSubTab === 'logs' && (
                            <div className="case-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'stretch' }}>
                                
                                {/* TIMELINE LOG */}
                                <div className="glass-panel-tab" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0, color: '#1a1a1a', fontSize: '1.2rem' }}>Projektets byggeproces</h4>
                                        {profile?.role !== 'apprentice' && (
                                            <button 
                                                onClick={() => {
                                                setEditingLogId(null);
                                                setLogStatus('green');
                                                setNewLogText('');
                                                setLogPhotos([]);
                                                setLogFiles([]);
                                                setExistingPhotos([]);
                                                setIsLogModalOpen(true);
                                            }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#1a1a1a', color: 'white', border: 'none', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            >
                                                <Plus size={18} /> Tilføj status
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        {logsList.length === 0 ? (
                                            <p style={{ color: '#6b7280', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>Ingen log-opdateringer endnu.</p>
                                        ) : (
                                            logsList.map(log => {
                                                const displayRole = getRoleLabel(log.authorRole);
                                                                  
                                                return (
                                                <div key={log.id} style={{ display: 'flex', gap: '16px' }}>
                                                    {/* Avatar */}
                                                    <div style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold', color: '#475569', border: '1px solid #e2e8f0', position: 'relative' }}>
                                                        {getInitials(log.author)}
                                                        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', borderRadius: '50%', background: log.status === 'red' ? '#ef4444' : (log.status === 'yellow' ? '#f59e0b' : '#10b981'), border: '2px solid white' }} />
                                                    </div>
                                                    
                                                    {/* Content */}
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                            <div>
                                                                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{log.author}</strong>
                                                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{displayRole}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                                    {new Date(log.date).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })} kl. {new Date(log.date).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {(profile?.id === log.authorId || profile?.role === 'admin') && (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                                                                        <button onClick={() => {
                                                                            setEditingLogId(log.id);
                                                                            setLogStatus(log.status || 'green');
                                                                            setNewLogText(log.text || '');
                                                                            setExistingPhotos(log.photos || []);
                                                                            setLogPhotos([]);
                                                                            setLogFiles([]);
                                                                            setIsLogModalOpen(true);
                                                                        }} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'} onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'} title="Rediger">
                                                                            <Edit2 size={12} />
                                                                        </button>
                                                                        <button onClick={() => deleteLog(log.id)} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'} onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'} title="Slet">
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div style={{ padding: '14px', backgroundColor: log.isChangeOrder ? '#fef2f2' : '#f8fafc', borderRadius: '0 16px 16px 16px', border: log.isChangeOrder ? '1px solid #fca5a5' : '1px solid #f1f5f9' }}>
                                                            {log.isChangeOrder && (
                                                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#be123c', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                    Aftaleseddel Tilføjet
                                                                </div>
                                                            )}
                                                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', lineHeight: '1.5' }}>
                                                                {log.text}
                                                            </p>
                                                            
                                                            {log.isChangeOrder && (
                                                                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ffe4e6', color: '#be123c', fontSize: '0.85rem', fontWeight: '600' }}>
                                                                    <span>+{log.extraHours} timer</span>
                                                                    <span>+{log.extraPrice} kr.</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {log.photos && log.photos.length > 0 && (
                                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                                {log.photos.map((photo, pIdx) => (
                                                                    <a key={pIdx} href={photo} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                                        <img src={photo} alt="Fremdrift" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )})
                                        )}
                                    </div>
                                </div>
                                
                                {/* MODAL TIL AT SKRIVE LOG */}
                                {isLogModalOpen && createPortal(
                                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
                                        <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)', maxHeight: '90vh', overflowY: 'auto' }}>
                                            
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>Skriv status fra pladsen</h3>
                                                <button 
                                                    onClick={() => setIsLogModalOpen(false)}
                                                    style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            <form onSubmit={(e) => { handleAddLog(e); setIsLogModalOpen(false); }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                {/* Status farvevælger */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Drift-status</label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                                        {[
                                                            { id: 'green', label: 'OK', color: '#10b981' },
                                                            { id: 'yellow', label: 'Info/Obs', color: '#f59e0b' },
                                                            { id: 'red', label: 'Stop/Problem', color: '#ef4444' }
                                                        ].map(s => (
                                                            <button
                                                                key={s.id}
                                                                type="button"
                                                                className="hover-lift"
                                                                onClick={() => setLogStatus(s.id)}
                                                                style={{ padding: '12px', border: logStatus === s.id ? `2px solid ${s.color}` : '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.9rem', cursor: 'pointer', background: logStatus === s.id ? 'white' : '#f8fafc', fontWeight: 'bold', color: logStatus === s.id ? s.color : '#64748b', transition: 'all 0.2s' }}
                                                            >
                                                                {s.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Beskrivelse</label>
                                                    <textarea 
                                                        rows={5}
                                                        value={newLogText}
                                                        onChange={(e) => setNewLogText(e.target.value)}
                                                        placeholder="Hvad er der lavet i dag? Er der opstået problemer?"
                                                        style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', fontSize: '0.95rem', resize: 'none', backgroundColor: '#f8fafc', color: '#0f172a', outline: 'none', transition: 'all 0.2s' }}
                                                        onFocus={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                                                        onBlur={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                                    />
                                                </div>

                                                {/* Indtal status (stemme) — rund tryk-for-at-tale knap */}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
                                                    <button
                                                        type="button"
                                                        onClick={logDictation.isProcessing ? undefined : logDictation.toggle}
                                                        disabled={logDictation.isProcessing}
                                                        aria-label="Indtal status"
                                                        style={{ width: '68px', height: '68px', borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: logDictation.isProcessing ? 'wait' : 'pointer', color: logDictation.isProcessing ? '#475569' : '#ffffff', background: logDictation.isRecording ? '#ef4444' : (logDictation.isProcessing ? '#e2e8f0' : 'linear-gradient(135deg, #10b981, #059669)'), boxShadow: logDictation.isProcessing ? 'none' : (logDictation.isRecording ? 'none' : '0 6px 16px rgba(16,185,129,0.35)'), animation: logDictation.isRecording ? 'micPulse 1.5s ease-in-out infinite' : 'none', transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s', transform: 'scale(1)' }}
                                                        onMouseEnter={(e) => { if (!logDictation.isRecording && !logDictation.isProcessing) { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(16,185,129,0.45)'; } }}
                                                        onMouseLeave={(e) => { if (!logDictation.isRecording && !logDictation.isProcessing) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16,185,129,0.35)'; } }}
                                                    >
                                                        {logDictation.isProcessing
                                                            ? <Loader2 size={28} className="animate-spin" />
                                                            : (logDictation.isRecording ? <MicOff size={28} /> : <Mic size={28} />)}
                                                    </button>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: logDictation.isRecording ? '#ef4444' : '#64748b', transition: 'color 0.2s' }}>
                                                        {logDictation.isProcessing
                                                            ? 'Skriver det ned…'
                                                            : (logDictation.isRecording ? 'Optager… tryk for at stoppe' : 'Tryk for at indtale')}
                                                    </span>
                                                </div>

                                                {/* Rigtigt Foto-upload */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Vedhæft byggeplads-foto (valgfrit)</label>
                                                    
                                                    <label className="hover-lift" style={{ padding: '14px', border: '1px dashed #cbd5e1', borderRadius: '12px', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: '#f8fafc', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600', transition: 'all 0.2s' }}
                                                           onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                                                           onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                                    >
                                                        <Camera size={18} /> Upload foto fra kamera/telefon
                                                        <input 
                                                            type="file" 
                                                            multiple 
                                                            accept="image/*" 
                                                            style={{ display: 'none' }} 
                                                            onChange={handleRealPhotoUpload}
                                                        />
                                                    </label>
                                                    
                                                    {(logPhotos.length > 0 || existingPhotos.length > 0) && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>✓ {logPhotos.length + existingPhotos.length} foto(s) valgt</p>
                                                            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                                                                {existingPhotos.map((photo, idx) => (
                                                                    <div key={`ext-${idx}`} style={{ position: 'relative', flexShrink: 0 }}>
                                                                        <img src={photo} alt="Existing" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                                                                        <button type="button" onClick={() => setExistingPhotos(existingPhotos.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', padding: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>✕</button>
                                                                    </div>
                                                                ))}
                                                                {logPhotos.map((photo, idx) => (
                                                                    <div key={`new-${idx}`} style={{ position: 'relative', flexShrink: 0 }}>
                                                                        <img src={photo} alt="Upload preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                                                                        <button type="button" onClick={() => removePhoto(idx)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', padding: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>✕</button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <button 
                                                    type="submit"
                                                    disabled={isUploadingLog}
                                                    className="hover-lift"
                                                    style={{ padding: '16px', backgroundColor: isUploadingLog ? '#94a3b8' : '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: isUploadingLog ? 'not-allowed' : 'pointer', marginTop: '12px', boxShadow: isUploadingLog ? 'none' : '0 4px 12px rgba(16,185,129,0.3)' }}
                                                >
                                                    {isUploadingLog ? 'Gemmer status...' : 'Gem dagens arbejde'}
                                                </button>
                                            </form>
                                        </div>
                                    </div>,
                                    document.body
                                )}
                            </div>
                        )}

{/* TAB 4: TIMEREGISTRERING (Apple-agtigt Redesign) */}
                        {activeSubTab === 'timesheet' && (
                            <div className="case-tab-content" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }}>
                                
                                {/* TIMEOUT OVERSIGT */}
                                <div className="glass-panel-tab" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {(() => {
                                        const myTotalHours = timeEntries.filter(t => t.employeeId === profile?.id).reduce((sum, t) => sum + parseFloat(t.hours || 0), 0).toFixed(2);
                                        // Begrænset visning (kun egne timer): svend, lærling OG gæst (underleverandør).
                                        const isWorker = ['worker', 'apprentice', 'guest'].includes(profile?.role);
                                        
                                        return (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: isWorker ? 'center' : 'space-around', alignItems: 'center', marginBottom: '24px', padding: '20px 0', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0', gap: '16px' }}>
                                                    
                                                    {!isWorker && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Users size={22} />
                                                        </div>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forbrug</div>
                                                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: (hasHourBudget && totalActualHours > budgetedHours) ? '#ef4444' : '#0f172a' }}>{totalActualHours} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>{hasHourBudget ? <>/ {budgetedHours} t</> : 't'}</span></div>
                                                        </div>
                                                    </div>
                                                    )}

                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <User size={22} />
                                                        </div>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dine timer</div>
                                                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>{myTotalHours} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>t</span></div>
                                                        </div>
                                                    </div>

                                                    {!isWorker && hasHourBudget && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <TrendingUp size={22} />
                                                        </div>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.7rem', color: '#9f1239', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overforbrug</div>
                                                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#be123c' }}>+{Math.max(0, totalActualHours - budgetedHours).toFixed(1)} <span style={{ fontSize: '0.8rem', color: '#9f1239', fontWeight: '600' }}>t</span></div>
                                                        </div>
                                                    </div>
                                                    )}

                                                    {!isWorker && (assignedSubs.length > 0 || subcontractorHours > 0) && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Store size={22} />
                                                        </div>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Underlev. timer</div>
                                                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#7c3aed' }}>{subcontractorHours.toFixed(2)} <span style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: '600' }}>t</span></div>
                                                        </div>
                                                    </div>
                                                    )}
                                                </div>

                                                <button 
                                                    onClick={() => setIsTimeModalOpen(true)}
                                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', backgroundColor: '#1a1a1a', color: 'white', border: 'none', borderRadius: '20px', fontSize: '1.05rem', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                >
                                                    <Plus size={20} /> Tilføj timer
                                                </button>
                                            </>
                                        );
                                    })()}

                                    {/* Underleverandør-forbrug + fakturapris-kontrol (kun mester/kontor/PL) */}
                                    {!['worker', 'apprentice', 'guest'].includes(simulatedRole || profile?.role) && subcontractorBreakdown.length > 0 && (
                                        <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '16px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <Store size={16} /> Underleverandør-forbrug
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#7c3aed', lineHeight: 1.5 }}>Indtast timeløn, så beregnes fakturaprisen — til at sammenligne med den faktura underleverandøren sender.</p>
                                            {subcontractorBreakdown.map(b => {
                                                const rate = parseFloat(String(subRates[b.id] ?? '').replace(/\./g, '').replace(',', '.')) || 0;
                                                const exVat = b.hours * rate;
                                                const vat = exVat * 0.25;
                                                return (
                                                    <div key={b.id} style={{ background: '#fff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                            <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{b.company_name}</strong>
                                                            <span style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: 700 }}>{b.hours.toFixed(2)} timer</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                            <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Timeløn (ekskl. moms)</label>
                                                            <div style={{ position: 'relative' }}>
                                                                <input inputMode="decimal" value={subRates[b.id] ?? ''} onChange={(e) => setSubRates(prev => ({ ...prev, [b.id]: e.target.value.replace(/[^0-9.,]/g, '') }))} placeholder="Fx 450" style={{ width: '120px', padding: '8px 40px 8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' }} />
                                                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>kr.</span>
                                                            </div>
                                                        </div>
                                                        {rate > 0 && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', fontSize: '0.88rem' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}><span>Ekskl. moms</span><span>{Math.round(exVat).toLocaleString('da-DK')} kr.</span></div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}><span>Moms (25%)</span><span>{Math.round(vat).toLocaleString('da-DK')} kr.</span></div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#7c3aed' }}><span>Inkl. moms</span><span>{Math.round(exVat + vat).toLocaleString('da-DK')} kr.</span></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Samlet på sagen: alle timer (eget hold + underleverandører) + kostpris.
                                        Rent overblik — påvirker ikke løn, budget eller fakturaer. */}
                                    {!['worker', 'apprentice', 'guest'].includes(simulatedRole || profile?.role) && (ownTeamHours > 0 || subcontractorHours > 0) && (() => {
                                        const ownRate = parseFloat(String(ownCostRate).replace(/\./g, '').replace(',', '.')) || 0;
                                        const ownCost = ownTeamHours * ownRate;
                                        const subCost = subcontractorBreakdown.reduce((s, b) => {
                                            const r = parseFloat(String(subRates[b.id] ?? '').replace(/\./g, '').replace(',', '.')) || 0;
                                            return s + b.hours * r;
                                        }, 0);
                                        const totalHours = ownTeamHours + subcontractorHours;
                                        const totalCost = ownCost + subCost;
                                        const revenueEx = baseTotalPrice ? (isReverseChargeLead(selectedCase) ? baseTotalPrice : baseTotalPrice / 1.25) : 0;
                                        const margin = revenueEx - totalCost;
                                        const row = (label, value, opts = {}) => (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: opts.big ? '0.98rem' : '0.9rem', fontWeight: opts.big ? 800 : 500, color: opts.color || '#475569', ...(opts.border ? { borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '2px' } : {}) }}>
                                                <span>{label}</span><span>{value}</span>
                                            </div>
                                        );
                                        return (
                                            <div style={{ background: 'linear-gradient(135deg,#f8fafc,#f5f3ff)', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    <Activity size={16} style={{ color: '#7c3aed' }} /> Samlet på sagen
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Timer i alt</span>
                                                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{totalHours.toFixed(2)} <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>t</span></span>
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Eget hold {ownTeamHours.toFixed(2)} t · Underleverandører {subcontractorHours.toFixed(2)} t</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                                                    <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Kostpris eget hold (kr/time)</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input inputMode="decimal" value={ownCostRate} onChange={(e) => setOwnCostRate(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="Fx 350" style={{ width: '120px', padding: '8px 40px 8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' }} />
                                                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>kr.</span>
                                                    </div>
                                                </div>
                                                {(ownRate > 0 || subCost > 0) && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {ownRate > 0 && row('Eget hold', `${Math.round(ownCost).toLocaleString('da-DK')} kr.`)}
                                                        {subCost > 0 && row('Underleverandører', `${Math.round(subCost).toLocaleString('da-DK')} kr.`)}
                                                        {row('Samlet kostpris (ekskl. moms)', `${Math.round(totalCost).toLocaleString('da-DK')} kr.`, { big: true, color: '#0f172a', border: true })}
                                                        {revenueEx > 0 && row('Sagens pris (ekskl. moms)', `${Math.round(revenueEx).toLocaleString('da-DK')} kr.`)}
                                                        {revenueEx > 0 && row('Dækningsbidrag', `${Math.round(margin).toLocaleString('da-DK')} kr.`, { big: true, color: margin >= 0 ? '#059669' : '#dc2626' })}
                                                    </div>
                                                )}
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>Kun til overblik — påvirker ikke løn, timebudget eller fakturaer.</p>
                                            </div>
                                        );
                                    })()}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {(() => {
                                            const role = simulatedRole || profile?.role;
                                            const canSeeAll = !['worker', 'apprentice', 'guest'].includes(role);
                                            let entries = canSeeAll ? timeEntries : timeEntries.filter(e => e.employeeId === profile?.id);
                                            if (timeDateFilter) entries = entries.filter(e => e.date === timeDateFilter);
                                            const byDate = {};
                                            entries.forEach(e => { (byDate[e.date] = byDate[e.date] || []).push(e); });
                                            const dates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));
                                            return (
                                                <>
                                                    {timeEntries.length > 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                                            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Vælg dag</label>
                                                            <input type="date" value={timeDateFilter || ''} onChange={(e) => setTimeDateFilter(e.target.value || null)} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.88rem', color: '#0f172a' }} />
                                                            {timeDateFilter && <button type="button" onClick={() => setTimeDateFilter(null)} style={{ fontSize: '0.8rem', color: '#7c3aed', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700 }}>Ryd</button>}
                                                        </div>
                                                    )}
                                                    {entries.length === 0 ? (
                                                        <p style={{ color: '#6b7280', fontSize: '0.9rem', fontStyle: 'italic', padding: '40px 16px', textAlign: 'center' }}>{timeDateFilter ? 'Ingen timer registreret på den valgte dag.' : 'Ingen arbejdstimer er registreret endnu.'}</p>
                                                    ) : dates.map(date => (
                                                        <div key={date} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'capitalize', marginTop: '4px' }}>
                                                                {new Date(date).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                                <span style={{ color: '#a78bfa', fontWeight: 700, marginLeft: '8px' }}>· {byDate[date].reduce((s, e) => s + (parseFloat(e.hours) || 0), 0).toFixed(2)} t</span>
                                                            </div>
                                                            {byDate[date].map(entry => (
                                                <div 
                                                    key={entry.id} 
                                                    className="timesheet-row log-card"
                                                    style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                                            <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{entry.employeeName}</strong>
                                                            <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '6px' }}>
                                                                <Clock size={12} /> {entry.startTime} - {entry.endTime || 'Nu'}
                                                            </span>
                                                            <span style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '20px', background: entry.endTime ? '#eff6ff' : '#ecfdf5', color: entry.endTime ? '#2563eb' : '#059669', fontWeight: 'bold' }}>
                                                                {entry.endTime ? `${entry.hours} timer` : 'I gang'}
                                                            </span>
                                                        </div>
                                                        {entry.desc && <span style={{ fontSize: '0.9rem', color: '#475569', fontStyle: 'italic' }}>"{entry.desc}"</span>}
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500' }}>
                                                            {new Date(entry.date).toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                        </span>
                                                        {isTimeLocked(entry.date) ? (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }} title={`Lønkørt og låst til og med ${formatDa(lockedUntil)}`}>
                                                                <Lock size={12} /> Låst
                                                            </span>
                                                        ) : (!['worker', 'apprentice'].includes(simulatedRole || profile?.role) || entry.employeeId === profile?.id) && (
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button 
                                                                    onClick={() => { handleEditTime(entry); setIsTimeModalOpen(true); }} 
                                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; }}
                                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                                                                    title="Ret timer"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteTime(entry.id)} 
                                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                                                    title="Slet timer"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                                        </div>
                                                    ))}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* MODAL TIL AT REGISTRERE TIMER MANUELT */}
                                {isTimeModalOpen && createPortal(
                                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out', padding: '16px' }}>
                                        <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)', maxHeight: '90vh', overflowY: 'auto' }}>
                                            
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {editingTimeId ? <Edit2 size={24} color="#3b82f6" /> : <Clock size={24} color="#3b82f6" />}
                                                    {editingTimeId ? 'Ret timeregistrering' : 'Registrer timer'}
                                                </h3>
                                                <button 
                                                    onClick={() => { setIsTimeModalOpen(false); setEditingTimeId(null); }}
                                                    style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            {/* SOM I GÅR KNAP LIGGER ØVERST */}
                                            {!editingTimeId && (
                                                <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f1f5f9' }}>
                                                    <button type="button" onClick={fillFromLastCase}
                                                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '16px', border: '1px solid #ddd6fe', background: '#f5f3ff', color: '#6d28d9', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(109, 40, 217, 0.1)' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.transform = 'none'; }}>
                                                        <RotateCcw size={18} /> Som i går
                                                    </button>
                                                </div>
                                            )}
                                            
                                            <form onSubmit={async (e) => { const success = await handleAddTimeEntry(e); if (success) setIsTimeModalOpen(false); }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                {(!['worker', 'apprentice'].includes(simulatedRole || profile?.role)) && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Medarbejder (Hvem)</label>
                                                        <FrameSelect
                                                            value={newTime.employeeId}
                                                            onChange={(v) => setNewTime({ ...newTime, employeeId: v })}
                                                            placeholder="-- Vælg medarbejder --"
                                                            options={(() => {
                                                                const allWorkers = [...team];
                                                                if (profile && !allWorkers.some(w => w.id === profile.id)) {
                                                                    allWorkers.unshift(profile);
                                                                }
                                                                const opts = allWorkers.map(worker => ({
                                                                    value: worker.id,
                                                                    label: `${worker.owner_name || worker.company_name || worker.email || 'Ukendt'}${worker.id === profile?.id ? ' (Dig)' : ''}`,
                                                                }));
                                                                // Underleverandørens folk (mester + svende) — så man kan registrere
                                                                // deres faktisk udførte timer på sagen.
                                                                (assignedSubs || []).forEach(sub => {
                                                                    if (sub.contact_name || sub.contact_email) {
                                                                        opts.push({ value: `sub:${sub.id}:mester`, label: `${sub.contact_name || sub.company_name} · ${sub.company_name} (Underleverandør)` });
                                                                    }
                                                                    (sub.workers || []).forEach(w => {
                                                                        opts.push({ value: `sub:${sub.id}:w:${w.id}`, label: `${w.name || 'Svend'} · ${sub.company_name} (Underleverandør)` });
                                                                    });
                                                                });
                                                                return opts;
                                                            })()}
                                                        />
                                                    </div>
                                                )}

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Starttid</label>
                                                        <QuarterTimePicker
                                                            value={newTime.startTime}
                                                            onChange={(val) => setNewTime(prev => ({ ...prev, startTime: val }))}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Sluttid</label>
                                                        <QuarterTimePicker
                                                            value={newTime.endTime}
                                                            onChange={(val) => setNewTime(prev => ({ ...prev, endTime: val }))}
                                                        />
                                                    </div>
                                                </div>

                                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#0f172a', cursor: 'pointer', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                                    <input 
                                                        type="checkbox"
                                                        checked={deductPause}
                                                        onChange={(e) => setDeductPause(e.target.checked)}
                                                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#3b82f6' }}
                                                    />
                                                    <span style={{ fontWeight: '600' }}>Fratræk 30 min. frokostpause</span>
                                                </label>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px' }}>
                                                    <div>
                                                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a' }}>Timer i alt</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Beregnes automatisk — kan rettes</div>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        step="0.25"
                                                        min="0"
                                                        value={newTime.hours ?? ''}
                                                        onChange={(e) => setNewTime({ ...newTime, hours: e.target.value })}
                                                        style={{ width: '100px', padding: '12px', borderRadius: '12px', border: '2px solid #bfdbfe', textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, color: '#2563eb', outline: 'none', background: '#fff' }}
                                                    />
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Dato</label>
                                                    <input 
                                                        type="date"
                                                        value={newTime.date}
                                                        onChange={(e) => setNewTime({ ...newTime, date: e.target.value })}
                                                        style={{ padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', color: '#0f172a', width: '100%', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}
                                                    />
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Arbejdsopgave (Valgfri)</label>
                                                    <textarea 
                                                        rows="3"
                                                        value={newTime.desc}
                                                        onChange={(e) => setNewTime({ ...newTime, desc: e.target.value })}
                                                        placeholder="F.eks. 'Opsat gipslofter og spartlet'"
                                                        style={{ padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical', color: '#0f172a', width: '100%', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}
                                                    />
                                                </div>

                                                <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                                                    <button 
                                                        type="submit"
                                                        style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: '#1a1a1a', color: '#fff', fontWeight: 'bold', fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#000000'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                    >
                                                        <Save size={20} />
                                                        {editingTimeId ? 'Gem ændringer' : 'Gem Tidsregistrering'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>,
                                    document.body
                                )}
                            </div>
                        )}

{/* TAB 5: LEVERANDØRBILAG */}
                        {activeSubTab === 'invoices' && (
                            <div className="case-tab-content">
                                <BilagManager
                                    lead={selectedCase}
                                    profile={profile}
                                    onUpdateLead={onUpdateLead}
                                    isMobile={isMobile}
                                    onGoToInvoice={() => {
                                        if (onOpenInvoice) {
                                            onOpenInvoice(selectedCase.id);
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {/* TAB 6: AFTALESEDLER (EKSTRAARBEJDE) */}
                        {activeSubTab === 'extra-work' && profile?.role !== 'worker' && profile?.role !== 'apprentice' && (
                            <div className="case-tab-content" style={{ pointerEvents: selectedCase.status === 'Afbrudt Sag' ? 'none' : 'auto', opacity: selectedCase.status === 'Afbrudt Sag' ? 0.7 : 1 }}>
                                <AftalesedlerTab
                                    selectedCase={selectedCase}
                                    profile={profile}
                                    carpenterProfile={carpenterProfile}
                                    onUpdateCase={onUpdateLead}
                                    isMobile={isMobile}
                                />
                            </div>
                        )}

                        {/* TAB 7: TEGNINGER & SKITSER */}
                        {activeSubTab === 'drawings' && (
                            <div className="case-tab-content">
                                <CaseDrawingsTab
                                    selectedCase={selectedCase}
                                    profile={profile}
                                    isMobile={isMobile}
                                />
                            </div>
                        )}


                    </div>

                </div>
            )}
        {/* MODAL: Bekræft Fakturering */}
        {/* MODAL: Visuel Fakturakladde Editor (A4 Paper Style) */}
        {showInvoiceModal && (
            <div className="dashboard-modal-overlay invoice-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', overflowY: 'auto' }}>
                <div className="dashboard-modal-panel invoice-modal-panel" style={{ backgroundColor: 'white', borderRadius: '4px', padding: '0', maxWidth: '850px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0,0,0,0.1)', maxHeight: '95vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Fixed Toolbar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: invoiceActionType === 'book_and_send' ? '#dc2626' : '#0f172a' }}>
                            {invoiceActionType === 'book_and_send' ? <ShieldAlert size={24} /> : <PackageCheck size={24} />}
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                                {invoiceActionType === 'book_and_send' ? 'Advarsel: Du er ved at låse og udsende faktura' : 'Gennemgå og opret fakturakladde'}
                            </h3>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={handleConvertToAconto}
                                style={{ padding: '8px 16px', backgroundColor: 'white', color: '#3b82f6', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                                Skift til Rate/Aconto %
                            </button>
                            <button 
                                onClick={() => setShowInvoiceModal(false)}
                                style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#475569', border: 'none', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Luk
                            </button>
                        </div>
                    </div>

                    {/* Paper Area */}
                    <div style={{ padding: '60px 80px', backgroundColor: 'white', minHeight: '600px' }}>
                        
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '60px' }}>
                            <div>
                                <h1 style={{ fontSize: '2.5rem', margin: '0 0 8px 0', color: '#0f172a', letterSpacing: '-1px' }}>FAKTURA</h1>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Dato: {new Date().toLocaleDateString('da-DK')}</p>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Fakturanr: {invoiceActionType === 'draft' ? '(Kladde)' : 'Genereres automatisk'}</p>
                            </div>
                            <div style={{ textAlign: 'right', color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                <strong style={{ color: '#0f172a', fontSize: '1.1rem' }}>Faktureres til:</strong><br/>
                                {selectedCase?.customer_name || 'Ukendt Kunde'}<br/>
                                {selectedCase?.raw_data?.customerDetails?.customerType === 'erhverv' && (
                                    <>CVR: {selectedCase.raw_data.customerDetails.cvr}<br/></>
                                )}
                                {selectedCase?.customer_address || 'Adresse ikke oplyst'}<br/>
                                {selectedCase?.customer_email || 'Email ikke oplyst'}<br/>
                                {selectedCase?.customer_phone || ''}
                            </div>
                        </div>

                        {/* Editor Table */}
                        <div style={{ marginBottom: '60px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #0f172a' }}>
                                        <th style={{ padding: '12px 0', textAlign: 'left', color: '#0f172a', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Beskrivelse</th>
                                        <th style={{ padding: '12px 0', textAlign: 'right', color: '#0f172a', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', width: '200px' }}>Netto Pris</th>
                                        <th style={{ padding: '12px 0', width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoiceLines.map((line) => (
                                        <tr key={line.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '16px 0' }}>
                                                <input 
                                                    type="text" 
                                                    value={line.description}
                                                    onChange={(e) => handleLineChange(line.id, 'description', e.target.value)}
                                                    placeholder="Skriv beskrivelse af arbejdet her..."
                                                    style={{ width: '100%', padding: '8px', border: '1px dashed transparent', borderRadius: '4px', fontSize: '1.05rem', color: '#334155', backgroundColor: 'transparent', outline: 'none', transition: 'all 0.2s' }}
                                                    onFocus={(e) => { e.target.style.border = '1px dashed #cbd5e1'; e.target.style.backgroundColor = '#f8fafc'; }}
                                                    onBlur={(e) => { e.target.style.border = '1px dashed transparent'; e.target.style.backgroundColor = 'transparent'; }}
                                                />
                                            </td>
                                            <td style={{ padding: '16px 0', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', padding: '6px 8px', borderRadius: '4px', border: '1px dashed transparent', transition: 'all 0.2s' }}>
                                                    <input 
                                                        type="number" 
                                                        value={line.priceExVat}
                                                        onChange={(e) => handleLineChange(line.id, 'priceExVat', e.target.value)}
                                                        style={{ width: '100px', border: 'none', backgroundColor: 'transparent', textAlign: 'right', fontSize: '1.05rem', color: '#0f172a', fontWeight: '500', outline: 'none' }}
                                                    />
                                                    <span style={{ color: '#64748b', fontSize: '1rem' }}>kr.</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 0', textAlign: 'right' }}>
                                                <button 
                                                    onClick={() => handleRemoveLine(line.id)}
                                                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                                                    title="Slet linje"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ marginTop: '16px' }}>
                                <button 
                                    onClick={handleAddLine}
                                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', padding: '8px', borderRadius: '4px' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <Plus size={16} /> Tilføj ekstra linje
                                </button>
                            </div>
                        </div>

                        {/* Totals Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            {/* Moms indstillinger */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', backgroundColor: isReverseCharge ? '#fef2f2' : '#f8fafc', borderRadius: '8px', border: `1px solid ${isReverseCharge ? '#fca5a5' : '#e2e8f0'}`, transition: 'all 0.2s' }}>
                                <input 
                                    type="checkbox" 
                                    id="reverseCharge" 
                                    checked={isReverseCharge}
                                    onChange={(e) => setIsReverseCharge(e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <label htmlFor="reverseCharge" style={{ cursor: 'pointer', fontSize: '0.95rem', color: isReverseCharge ? '#991b1b' : '#475569', fontWeight: isReverseCharge ? 'bold' : 'normal' }}>
                                    Erhvervskunde (Omvendt Betalingspligt - 0% Moms)
                                </label>
                            </div>

                            <div style={{ width: '350px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#475569', fontSize: '1rem' }}>
                                    <span>Samlet Netto (Ekskl. moms)</span>
                                    <span>{totalInvoiceExVat.toLocaleString('da-DK')} kr.</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#475569', fontSize: '1rem', borderBottom: '2px solid #e2e8f0' }}>
                                    <span>Moms ({isReverseCharge ? '0%' : '25%'})</span>
                                    <span>{totalInvoiceVat.toLocaleString('da-DK')} kr.</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', color: '#0f172a', fontSize: '1.4rem', fontWeight: 'bold' }}>
                                    <span>Total (Inkl. moms)</span>
                                    <span>{(totalInvoiceExVat + totalInvoiceVat).toLocaleString('da-DK')} kr.</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Footer */}
                        <div style={{ marginTop: '80px', paddingTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => {
                                    setShowInvoiceModal(false);
                                    if (syncToAccounting) {
                                        syncToAccounting(selectedCase, invoiceActionType, invoiceLines, isReverseCharge);
                                    } else {
                                        toast.error("Faktureringsmodulet er ikke tilgængeligt her.");
                                    }
                                }}
                                style={{ padding: '16px 32px', borderRadius: '8px', backgroundColor: invoiceActionType === 'book_and_send' ? '#10b981' : '#0f172a', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                                }}
                            >
                                {invoiceActionType === 'book_and_send' ? 'Ja, Bogfør & Udsend Nu' : 'Gem som Kladde i Regnskab'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
            
        {/* MODAL TIL SLETNING AF TIMER */}
        {timeOverwriteWarning && createPortal(
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 1000000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.3s ease-out' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                        <AlertTriangle size={32} />
                    </div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>Overskriv timer?</h3>
                    <p style={{ margin: '0 0 24px 0', fontSize: '1rem', color: '#475569', lineHeight: 1.5 }}>
                        Der er allerede registreret timer for <strong>{timeOverwriteWarning.employeeName}</strong> på denne dato. Vil du overskrive disse data?
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={() => setTimeOverwriteWarning(null)}
                            style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer' }}
                        >
                            Annuller
                        </button>
                        <button 
                            onClick={confirmTimeOverwrite}
                            style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: '#e11d48', color: 'white', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.2)' }}
                        >
                            Overskriv
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {deletingTimeEntryId && createPortal(
            <div className="dashboard-modal-overlay delete-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
                <div className="dashboard-modal-panel" style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                        <Trash2 size={32} color="#ef4444" />
                    </div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: 'bold' }}>
                        Slet timeregistrering?
                    </h3>
                    <p style={{ margin: '0 0 32px 0', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>
                        Er du sikker på, at du vil slette denne registrering? Dette kan ikke fortrydes.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                        <button 
                            onClick={() => setDeletingTimeEntryId(null)}
                            style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                            onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                        >
                            Annuller
                        </button>
                        <button 
                            onClick={confirmDeleteTime}
                            style={{ flex: 1, padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                            onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
                        >
                            Ja, slet
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}
        {/* MODAL TIL BEKRÆFTELSE AF STATUS ÆNDRING */}
        {statusToChange && createPortal(
            <div className="dashboard-modal-overlay delete-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
                <div className="dashboard-modal-panel" style={{ width: '100%', maxWidth: '440px', background: '#fff', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: statusToChange === 'Sæt i bero' ? '#fff7ed' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: statusToChange === 'Sæt i bero' ? '0 0 0 8px rgba(234, 88, 12, 0.1)' : '0 0 0 8px rgba(239, 68, 68, 0.1)' }}>
                        {statusToChange === 'Sæt i bero' ? <Pause size={36} color="#ea580c" /> : <AlertTriangle size={36} color="#ef4444" />}
                    </div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.4rem', color: '#0f172a', fontWeight: '800' }}>
                        Er du helt sikker?
                    </h3>
                    <p style={{ margin: '0 0 24px 0', color: '#475569', fontSize: '1rem', lineHeight: '1.5' }}>
                        Du er ved at ændre statussen til <strong style={{ color: statusToChange === 'Sæt i bero' ? '#ea580c' : '#ef4444' }}>{statusToChange === 'Afbrudt Sag' ? 'Afbrudt Sag (Konkurs / Aflyst)' : statusToChange}</strong>.<br/><br/>
                        {statusToChange === 'Afbrudt Sag' || statusToChange === 'Udgået opgave' 
                            ? <span>Dette vil <strong style={{ color: '#0f172a' }}>stoppe al produktion</strong> øjeblikkeligt og fjerne sagen fra svendenes telefoner, så de ikke længere kan registrere timer på den.</span>
                            : <span>Dette vil sætte opgaven på pause. Du kan altid genoptage den senere ved at ændre statussen tilbage.</span>
                        }
                    </p>
                    <div style={{ display: 'flex', gap: '16px', width: '100%', marginTop: '8px' }}>
                        <button 
                            onClick={() => setStatusToChange(null)}
                            style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '14px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                            onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                        >
                            Nej, annuller
                        </button>
                        <button 
                            onClick={() => {
                                handleStatusChange(statusToChange, true);
                                setStatusToChange(null);
                            }}
                            style={{ flex: 1, padding: '14px', background: statusToChange === 'Sæt i bero' ? '#ea580c' : '#ef4444', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: statusToChange === 'Sæt i bero' ? '0 4px 6px rgba(234, 88, 12, 0.2)' : '0 4px 6px rgba(239, 68, 68, 0.2)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = statusToChange === 'Sæt i bero' ? '#c2410c' : '#dc2626'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = statusToChange === 'Sæt i bero' ? '0 6px 12px rgba(234, 88, 12, 0.3)' : '0 6px 12px rgba(239, 68, 68, 0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = statusToChange === 'Sæt i bero' ? '#ea580c' : '#ef4444'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = statusToChange === 'Sæt i bero' ? '0 4px 6px rgba(234, 88, 12, 0.2)' : '0 4px 6px rgba(239, 68, 68, 0.2)'; }}
                        >
                            Ja, skift status
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}

            {/* SLET LOG MODAL (Bison Frame Design) */}
            {logToDelete && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out', padding: '20px' }}>
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                            <AlertTriangle size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.4rem', color: '#0f172a', fontWeight: '800' }}>Slet status?</h3>
                        <p style={{ margin: '0 0 32px 0', color: '#64748b', fontSize: '1rem', lineHeight: '1.5' }}>
                            Er du sikker på, at du vil slette denne statusopdatering? Handlingen kan ikke fortrydes.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setLogToDelete(null)} style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#475569', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}>Annuller</button>
                            <button onClick={confirmDeleteLog} style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: '#ef4444', color: '#ffffff', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>Slet</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* SLET TRIN MODAL (Bison Frame Design) */}
            {stepToDelete && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out', padding: '20px' }}>
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                            <AlertTriangle size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.4rem', color: '#0f172a', fontWeight: '800' }}>Slet trin?</h3>
                        <p style={{ margin: '0 0 32px 0', color: '#64748b', fontSize: '1rem', lineHeight: '1.5' }}>
                            Er du sikker på, at du vil slette dette trin i udførelsesmetoden? Både overskriften og alle underpunkter slettes permanent.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setStepToDelete(null)} style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#475569', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}>Annuller</button>
                            <button onClick={handleDeleteStep} style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: '#ef4444', color: '#ffffff', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>Slet Trin</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Rundtur for Sager & Ordrestyring — lever UDEN FOR liste/detalje-grenen,
                så den overlever når eksempel-sagen åbnes (skift mellem liste og interiør). */}
            {casesTourActive && !isModalView && (
                <SectionTour
                    tourKey="cases_tour"
                    steps={CASES_TOUR_STEPS}
                    onStepChange={(i) => {
                        // Trin 4+ foregår inde i sagen: åbn eksempel-sagen + skift til den
                        // fane trinnet handler om, så indholdet åbner ("bang").
                        if (i >= CASES_TOUR_DETAIL_FROM) {
                            if (selectedCaseIdState !== CASES_DEMO_ID) setSelectedCaseIdState(CASES_DEMO_ID);
                            const tab = CASES_TOUR_STEPS[i]?.subTab;
                            if (tab) setActiveSubTab(tab);
                        } else if (selectedCaseIdState === CASES_DEMO_ID) {
                            setSelectedCaseIdState(null);
                        }
                    }}
                    onDone={(skipped) => {
                        setCasesTourActive(false);
                        if (selectedCaseIdState === CASES_DEMO_ID) setSelectedCaseIdState(null);
                        if (!skipped) setShowCasesTourEnd(true);
                    }}
                />
            )}

            {/* Afslutning på Sager-rundturen — centreret boks med CTA. */}
            {showCasesTourEnd && createPortal(
                <div onClick={() => setShowCasesTourEnd(false)} style={{ position: 'fixed', inset: 0, zIndex: 100100, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 470, background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Det var ordrestyringen</div>
                        <p style={{ margin: '0 0 14px', color: '#475569', lineHeight: 1.55, fontSize: '0.94rem' }}>
                            Eksempel-sagen forsvinder nu — herfra ser du kun dine egne, rigtige sager.
                        </p>
                        {/* Lille bygmand-figur (ren SVG) — giver afslutningen lidt liv. */}
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 14px' }}>
                            <svg width="96" height="96" viewBox="0 0 120 120" role="img" aria-label="Bygmand med hjelm" style={{ filter: 'drop-shadow(0 6px 14px rgba(15,23,42,0.12))' }}>
                                <circle cx="60" cy="60" r="60" fill="#ecfdf5" />
                                {/* skuldre / sikkerhedsvest */}
                                <path d="M26 120 V104 C26 87 41 79 60 79 C79 79 94 87 94 104 V120 Z" fill="#10b981" />
                                {/* refleks-striber */}
                                <rect x="39" y="92" width="4.5" height="28" rx="2" fill="#fde68a" />
                                <rect x="76.5" y="92" width="4.5" height="28" rx="2" fill="#fde68a" />
                                {/* shirt-krave */}
                                <path d="M51 80 L60 91 L69 80 L64 78 H56 Z" fill="#0f172a" />
                                {/* hals */}
                                <rect x="53" y="66" width="14" height="16" rx="6" fill="#e8b489" />
                                {/* ører */}
                                <circle cx="40" cy="54" r="4.5" fill="#f4c8a0" />
                                <circle cx="80" cy="54" r="4.5" fill="#f4c8a0" />
                                {/* ansigt */}
                                <circle cx="60" cy="54" r="20" fill="#f4c8a0" />
                                {/* øjne */}
                                <circle cx="53" cy="54" r="2.6" fill="#0f172a" />
                                <circle cx="67" cy="54" r="2.6" fill="#0f172a" />
                                {/* smil */}
                                <path d="M52 61 Q60 68 68 61" stroke="#0f172a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
                                {/* hjelm-skygge */}
                                <ellipse cx="60" cy="40" rx="28" ry="7" fill="#f59e0b" />
                                {/* hjelm-kuppel */}
                                <path d="M40 41 C40 26 48 17 60 17 C72 17 80 26 80 41 Z" fill="#f59e0b" />
                                {/* hjelm-detaljer */}
                                <path d="M60 17 V41" stroke="#d97706" strokeWidth="2.6" strokeLinecap="round" />
                                <path d="M48 41 C48 31 52 25 60 25 C68 25 72 31 72 41" stroke="#d97706" strokeWidth="2" fill="none" opacity="0.55" />
                            </svg>
                        </div>
                        <p style={{ margin: '0 0 20px', color: '#475569', lineHeight: 1.55, fontSize: '0.94rem' }}>
                            Sådan får du din <strong>første sag</strong>: send et tilbud. Når kunden godkender det, bliver det helt automatisk til en sag her i ordrestyringen — klar til at blive styret fra start til faktura.
                        </p>
                        {onCreateQuote && (
                            <button onClick={() => { setShowCasesTourEnd(false); onCreateQuote(); }}
                                style={{ width: '100%', padding: '14px', cursor: 'pointer', border: 'none', background: 'linear-gradient(145deg,#10b981,#059669)', color: '#fff', borderRadius: 14, fontWeight: 800, fontSize: '0.98rem', boxShadow: '0 8px 20px rgba(16,185,129,0.3)', marginBottom: 8 }}>
                                Lav et tilbud
                            </button>
                        )}
                        <button onClick={() => setShowCasesTourEnd(false)}
                            style={{ width: '100%', padding: 12, background: 'none', border: 'none', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                            Luk
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// ============================================================================
// FileDropzone.jsx — genbrugelig træk-og-slip-uploadzone (Bison Frame-stil).
// Ét sted for ALLE fil-/PDF-uploads: skjult <input type=file> + klik-for-at-vælge
// + ægte drag-and-drop (onDragOver/Leave/Drop) + den fælles dashed-border-visning
// (grå → grøn når fil valgt). Hvert brugssted giver blot sin egen onFiles-handler
// (uændret base64- eller Supabase-Storage-logik).
//
// Brug:
//   <FileDropzone accept="application/pdf,image/*" onFiles={(files) => ...}
//      selectedName={form.file_name} title="Vælg PDF eller billede"
//      hint="Valgfrit — fx listen fra Davidsen" />
//
// - onFiles(fileArray): kaldes med et Array af File-objekter (også ved klik).
//   Ved multiple=false gives kun det første; ellers alle.
// - selectedName: vis "valgt/skift fil"-tilstand. Kan være en streng eller antal.
// - accept: mime/endelser (default pdf+billede). Filer der ikke matcher frafiltreres.
// - children: valgfri custom-indhold der erstatter standard-teksten (beholder rammen).
// ============================================================================
import React, { useRef, useState, useCallback } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';

// Simpelt mime/endelses-tjek mod accept-listen. "image/*" matcher alle image/-typer.
const matchesAccept = (file, accept) => {
    if (!accept || accept.trim() === '') return true;
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();
    return accept.split(',').map(s => s.trim().toLowerCase()).some(rule => {
        if (!rule) return false;
        if (rule.startsWith('.')) return name.endsWith(rule);
        if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, rule.indexOf('/*') + 1));
        return type === rule;
    });
};

export default function FileDropzone({
    accept = 'application/pdf,image/*',
    multiple = false,
    onFiles,
    selectedName = null,
    title = 'Vælg fil',
    hint = '',
    changeHint = 'Træk en ny fil hertil eller klik for at skifte',
    disabled = false,
    icon = null,
    minHeight,
    children = null,
}) {
    const inputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const emit = useCallback((fileList) => {
        if (disabled || !onFiles) return;
        let files = Array.from(fileList || []).filter(f => matchesAccept(f, accept));
        if (!files.length) return;
        if (!multiple) files = [files[0]];
        onFiles(files);
    }, [accept, multiple, onFiles, disabled]);

    const hasSelection = !!selectedName;

    return (
        <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            onClick={() => !disabled && inputRef.current?.click()}
            onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); inputRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (!disabled && e.dataTransfer?.files?.length) emit(e.dataTransfer.files);
            }}
            style={{
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: `2px dashed ${isDragging ? '#3b82f6' : (hasSelection ? '#86efac' : '#cbd5e1')}`,
                background: isDragging ? '#eff6ff' : (hasSelection ? '#f0fdf4' : '#f8fafc'),
                borderRadius: '14px',
                padding: '22px',
                textAlign: 'center',
                transition: 'all 0.2s',
                opacity: disabled ? 0.6 : 1,
                ...(minHeight ? { minHeight } : {}),
            }}
            onMouseEnter={(e) => { if (!disabled && !isDragging && !hasSelection) { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.background = '#f1f5f9'; } }}
            onMouseLeave={(e) => { if (!isDragging && !hasSelection) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; } }}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                disabled={disabled}
                style={{ display: 'none' }}
                onChange={(e) => { emit(e.target.files); e.target.value = ''; }}
            />
            {children ? children : hasSelection ? (
                <>
                    <CheckCircle2 size={28} color="#22c55e" style={{ margin: '0 auto' }} />
                    <div style={{ marginTop: '8px', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                        {typeof selectedName === 'string' ? selectedName : 'Fil valgt'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{changeHint}</div>
                </>
            ) : (
                <>
                    {icon || <Upload size={28} color={isDragging ? '#3b82f6' : '#94a3b8'} style={{ margin: '0 auto' }} />}
                    <div style={{ marginTop: '8px', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{title}</div>
                    {hint ? <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>{hint}</div> : null}
                </>
            )}
        </div>
    );
}

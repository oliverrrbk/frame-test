import React, { useState } from 'react';

// Initialer ud fra navn: "Hans Pedersen" -> "HP", "Hans" -> "HA".
function getInitials(name = '') {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Stabil, behagelig farve ud fra navnet (samme person = samme farve).
const PALETTE = [
    ['#dbeafe', '#1d4ed8'], ['#dcfce7', '#15803d'], ['#fef3c7', '#b45309'],
    ['#fae8ff', '#a21caf'], ['#ffe4e6', '#be123c'], ['#cffafe', '#0e7490'],
    ['#ede9fe', '#6d28d9'], ['#ffedd5', '#c2410c'],
];
function colorFor(name = '') {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
}

/**
 * Genbrugelig profil-avatar: viser billedet (avatar_url) hvis det findes,
 * ellers initialer på en farvet cirkel. Bruges overalt hvor en person vises,
 * så profilbilledet følger med gennem hele systemet.
 *
 * Props: name, avatarUrl (eller src), size (px), ring (bool), style, title.
 */
export default function UserAvatar({ name = '', avatarUrl, src, size = 36, ring = true, style = {}, title }) {
    const url = avatarUrl || src;
    const [failed, setFailed] = useState(false);
    const [bg, fg] = colorFor(name || '');

    const base = {
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxShadow: ring ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
        border: ring ? '2px solid rgba(255,255,255,0.9)' : 'none',
        boxSizing: 'border-box',
        ...style,
    };

    if (url && !failed) {
        return (
            <div style={base} title={title || name}>
                <img
                    src={url}
                    alt={name || 'profil'}
                    onError={() => setFailed(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </div>
        );
    }

    return (
        <div
            style={{ ...base, background: bg, color: fg, fontWeight: 700, fontSize: Math.max(9, Math.round(size * 0.4)), letterSpacing: '0.02em' }}
            title={title || name}
        >
            {getInitials(name)}
        </div>
    );
}

// ============================================================================
// Tailwind — bygges nu IND i appen (build-time) i stedet for cdn.tailwindcss.com.
// Configen her er porteret 1:1 fra det gamle inline <script id="tailwind-config">
// i index.html (samme farver/fonte/darkMode), og versionen (3.4.17 + forms +
// container-queries) matcher præcis den CDN'et serverede. Design-outputtet er
// derfor identisk — det ligger bare i vores egen hash-navngivne CSS-fil, så
// designet ikke kan forsvinde pga. adblockere, CDN-nedetid eller offline.
// ============================================================================
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            colors: {
                'tertiary-container': '#f77113',
                'on-background': '#2b3437',
                'inverse-primary': '#ffffff',
                'on-primary-container': '#525151',
                'surface': '#f8f9fa',
                'tertiary-dim': '#8b3b00',
                'on-primary': '#faf7f6',
                'on-tertiary-fixed-variant': '#421800',
                'on-secondary-fixed-variant': '#0057bd',
                'on-secondary': '#f9f8ff',
                'primary': '#5f5e5e',
                'tertiary': '#9e4400',
                'surface-container-low': '#f1f4f6',
                'surface-container': '#eaeff1',
                'tertiary-fixed': '#f77113',
                'on-tertiary-container': '#321000',
                'on-secondary-container': '#004eaa',
                'on-surface': '#2b3437',
                'primary-dim': '#535252',
                'primary-container': '#e5e2e1',
                'error': '#9f403d',
                'error-dim': '#4e0309',
                'background': '#f8f9fa',
                'secondary-container': '#d8e2ff',
                'on-surface-variant': '#586064',
                'tertiary-fixed-dim': '#e56500',
                'surface-container-high': '#e2e9ec',
                'surface-bright': '#f8f9fa',
                'surface-dim': '#d1dce0',
                'on-primary-fixed': '#403f3f',
                'secondary-fixed': '#d8e2ff',
                'inverse-surface': '#0c0f10',
                'primary-fixed-dim': '#d7d4d3',
                'on-primary-fixed-variant': '#5c5b5b',
                'secondary-dim': '#004fad',
                'secondary': '#005bc4',
                'outline-variant': '#abb3b7',
                'error-container': '#fe8983',
                'surface-container-highest': '#dbe4e7',
                'on-error-container': '#752121',
                'secondary-fixed-dim': '#c3d4ff',
                'on-tertiary-fixed': '#000000',
                'on-secondary-fixed': '#003c86',
                'outline': '#737c7f',
                'surface-variant': '#dbe4e7',
                'on-tertiary': '#fff7f5',
                'primary-fixed': '#e5e2e1',
                'on-error': '#fff7f6',
                'inverse-on-surface': '#9b9d9e',
                'surface-container-lowest': '#ffffff',
                'surface-tint': '#5f5e5e',
            },
            fontFamily: {
                headline: ['Inter'],
                body: ['Inter'],
                label: ['Inter'],
            },
        },
    },
    plugins: [forms, containerQueries],
};

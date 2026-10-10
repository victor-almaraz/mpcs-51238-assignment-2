import localFont from 'next/font/local';

/*
 * Self-hosted, open-licence fonts (licences in ./fonts/):
 *   TeX Gyre Heros Condensed Bold (GUST Font License), display: heavy condensed capitals
 *   for widget and dialog titles.
 *   TeX Gyre Heros (GUST Font License): interface text, set heavy, and the page title.
 * Subset to Latin and converted to WOFF2. Each defines a CSS variable that tokens.css
 * reads into --ds-font-display and --ds-font-sans.
 */
const herosCondensed = localFont({
  src: [{ path: './fonts/TeXGyreHerosCn-Latin-Bold.woff2', weight: '700', style: 'normal' }],
  variable: '--font-lgc-display',
  display: 'swap',
  fallback: ['Arial Narrow', 'sans-serif'],
});

const heros = localFont({
  src: [
    { path: './fonts/TeXGyreHeros-Latin-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/TeXGyreHeros-Latin-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-lgc-sans',
  display: 'swap',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
});

/** Class for the element that carries data-ds="light-grain-color". */
export const fontClassName = `${herosCondensed.variable} ${heros.variable}`;

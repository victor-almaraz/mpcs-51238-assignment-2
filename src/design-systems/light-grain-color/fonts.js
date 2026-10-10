import localFont from 'next/font/local';

/*
 * Self-hosted, open-licence fonts (licences in ./fonts/):
 *   TeX Gyre Heros Condensed Bold (GUST Font License), display: heavy condensed capitals
 *   for widget and dialog titles.
 *   TeX Gyre Heros (GUST Font License): interface text, set heavy.
 *   The Heros files are subset to Latin and converted to WOFF2.
 *   Sporting Grotesque Bold (SIL OFL 1.1, Velvetyne), the page title: wide, heavy capitals
 *   like a film's title card. The foundry's own web file, unmodified (the licence reserves
 *   the font name, so the file is not subset).
 * Each defines a CSS variable that tokens.css reads into --ds-font-hero, --ds-font-display
 * and --ds-font-sans.
 */
const sportingGrotesque = localFont({
  src: [{ path: './fonts/Sporting_Grotesque-Bold_web.woff2', weight: '700', style: 'normal' }],
  variable: '--font-lgc-hero',
  display: 'swap',
  fallback: ['Arial Black', 'sans-serif'],
});

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
export const fontClassName = `${sportingGrotesque.variable} ${herosCondensed.variable} ${heros.variable}`;

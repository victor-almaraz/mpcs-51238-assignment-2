import localFont from 'next/font/local';

/*
 * Self-hosted, open-licence fonts (licences in ./fonts/):
 *   Ostrich Sans (SIL OFL 1.1), display: tall condensed capitals.
 *   TeX Gyre Adventor (GUST Font License), interface text: geometric sans in the
 *   Art Deco line; subset to Latin and converted to WOFF2.
 * Each defines a CSS variable that tokens.css reads into --ds-font-display and
 * --ds-font-sans.
 */
const ostrichSans = localFont({
  src: [
    { path: './fonts/OstrichSans-Light.woff', weight: '300', style: 'normal' },
    { path: './fonts/OstrichSans-Medium.woff', weight: '500', style: 'normal' },
    { path: './fonts/OstrichSans-Black.woff', weight: '900', style: 'normal' },
  ],
  variable: '--font-cf-display',
  display: 'swap',
  fallback: ['Arial Narrow', 'sans-serif'],
});

const texGyreAdventor = localFont({
  src: [
    { path: './fonts/TeXGyreAdventor-Latin-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/TeXGyreAdventor-Latin-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-cf-sans',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

/** Class for the element that carries data-ds="contrast-form". */
export const fontClassName = `${ostrichSans.variable} ${texGyreAdventor.variable}`;

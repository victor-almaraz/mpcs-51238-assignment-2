import './globals.css';

export const metadata = {
  title: {
    default: 'Synth Rack',
    template: '%s · Synth Rack',
  },
  description: 'A browser synthesizer rack with several synthesis types.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

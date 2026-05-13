import './globals.css';

export const metadata = {
  title: 'Polla Pequiven Mundial 2026',
  description: 'La polla del Mundial 2026. Predice, compite, gana.',
  applicationName: 'Polla Pequiven',
  openGraph: {
    title: 'Polla Pequiven Mundial 2026',
    description: 'Predice la Copa del Mundo 2026. 48 selecciones, 104 partidos, un pote.',
    type: 'website',
    locale: 'es_VE',
  },
  twitter: {
    card: 'summary',
    title: 'Polla Pequiven Mundial 2026',
    description: 'Predice la Copa del Mundo 2026.',
  },
  robots: { index: false, follow: false },
  icons: { icon: '/pequiven-logo.png', apple: '/pequiven-logo.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

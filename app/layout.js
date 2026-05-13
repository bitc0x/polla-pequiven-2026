import './globals.css';

export const metadata = {
  title: 'Polla Pequiven Mundial 2026',
  description: 'La polla del Mundial 2026. Predice, compite, gana.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

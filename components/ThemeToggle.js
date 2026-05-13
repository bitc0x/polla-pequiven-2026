'use client';

import { useEffect, useState } from 'react';
import { Icon } from './Icon';

/**
 * Light/dark theme toggle. Defaults to dark.
 * Shows sun in dark mode (click to go light), moon in light mode (click to go dark).
 * Persists choice in localStorage.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('polla-theme');
      const initial = saved === 'light' ? 'light' : 'dark';
      setTheme(initial);
      document.documentElement.setAttribute('data-theme', initial);
    } catch {}
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('polla-theme', next); } catch {}
  }

  // Avoid hydration mismatch by rendering a stable placeholder on the server
  if (!mounted) {
    return (
      <button className="icon-btn" type="button" aria-label="Cambiar tema" title="Cambiar tema">
        <Icon name="sun" />
      </button>
    );
  }

  const label = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  return (
    <button
      className="icon-btn"
      type="button"
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}

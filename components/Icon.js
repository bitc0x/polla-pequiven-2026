'use client';

// Lightweight inline icon set. Stroke-based, 24x24 viewBox, currentColor.
export function Icon({ name, size = 16 }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (name) {
    case 'sun':
      return (
        <svg {...props} aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case 'moon':
      return (
        <svg {...props} aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      );
    case 'music':
      return (
        <svg {...props} aria-hidden="true">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'music-off':
      return (
        <svg {...props} aria-hidden="true">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
          <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...props} aria-hidden="true">
          <path d="M3 12a9 9 0 0 1 15.5-6.36L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.36L3 16M3 21v-5h5" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...props} aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props} aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case 'venmo':
      return (
        <svg {...props} aria-hidden="true" fill="currentColor" stroke="none">
          <path d="M19.5 4.2c.7 1.1 1 2.3 1 3.9 0 5-4.3 11.5-7.8 16.1H4.7L1.5 4.5l7-.7 1.7 13.5c1.6-2.6 3.5-6.7 3.5-9.5 0-1.5-.3-2.6-.7-3.4l6.5-.2z" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...props} aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...props} aria-hidden="true">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...props} aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    default:
      return null;
  }
}

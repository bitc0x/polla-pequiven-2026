'use client';

// Deterministic player avatar: 2-letter initials on a colored circle.
// Color is derived from a hash of the name so the same name always
// gets the same color across sessions.

const PALETTE = [
  '#C8102E', '#FF1E3C', '#FFD100', '#00247D', '#34C759',
  '#D4AF37', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899',
  '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#A855F7',
];

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function initials(name) {
  const cleaned = String(name || '').trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, size = 36 }) {
  const color = PALETTE[hashStr(String(name || '')) % PALETTE.length];
  const fontSize = Math.max(10, Math.round(size * 0.4));
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: fontSize,
      }}
      aria-label={`Avatar de ${name}`}
    >
      {initials(name)}
    </div>
  );
}

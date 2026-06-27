interface CategoryIconProps {
  icon: string;
  className?: string;
}

// SVG markup strings rendered via dangerouslySetInnerHTML so Dark Reader's
// injected attributes never trigger hydration mismatches (same approach as
// the launcher's AppIcon).
const ICON_HTML: Record<string, string> = {
  cart: '<path d="M3 4h2l2.4 10.4a1 1 0 0 0 1 .8h7.7a1 1 0 0 0 1-.78L20 7H6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="19" r="1.3" fill="currentColor"/><circle cx="17" cy="19" r="1.3" fill="currentColor"/>',
  home: '<path d="M4 11l8-6 8 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9h12v-9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="10" y="14" width="4" height="5" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  car: '<path d="M5 11l1.5-4h11L19 11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="11" width="18" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="7.5" cy="17" r="1.5" fill="currentColor"/><circle cx="16.5" cy="17" r="1.5" fill="currentColor"/>',
  food: '<path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7 11v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M16 3c-2 1-2 5-2 7h4c0-2 0-6-2-7zM16 10v11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  bag: '<path d="M6 8h12l-1 12H7L6 8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  play: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>',
  heart: '<path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 9h13a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="12.5" r="1" fill="currentColor"/>',
  laptop: '<rect x="5" y="5" width="14" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 18h18l-1.5-2.5h-15z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  chart: '<path d="M4 4v16h16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7 15l3-4 3 2 4-6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  tag: '<path d="M4 4h7l9 9-7 7-9-9V4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/>',
};

const DEFAULT_HTML = ICON_HTML.tag;

export function CategoryIcon({ icon, className = "" }: CategoryIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: ICON_HTML[icon] ?? DEFAULT_HTML }}
    />
  );
}

export const ICON_KEYS = Object.keys(ICON_HTML);

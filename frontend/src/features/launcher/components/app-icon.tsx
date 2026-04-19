interface AppIconProps {
  icon: string;
  className?: string;
}

const ICON_PATHS: Record<string, React.ReactNode> = {
  task: (
    <g>
      <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="1.5" fill="none" stroke="currentColor" />
      <path d="M8 10l2 2 4-4" strokeWidth="1.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="16" x2="16" y2="16" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
    </g>
  ),
  finance: (
    <g>
      <rect x="4" y="14" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.5" />
      <rect x="9" y="10" width="3" height="10" rx="0.5" fill="currentColor" opacity="0.7" />
      <rect x="14" y="6" width="3" height="14" rx="0.5" fill="currentColor" />
      <path d="M5 8l4-3 4 2 4-4" strokeWidth="1.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="19" cy="3" r="1.5" fill="currentColor" />
    </g>
  ),
  board: (
    <g>
      <rect x="2" y="4" width="5" height="16" rx="1" strokeWidth="1.2" fill="none" stroke="currentColor" />
      <rect x="9" y="4" width="5" height="12" rx="1" strokeWidth="1.2" fill="none" stroke="currentColor" />
      <rect x="16" y="4" width="5" height="8" rx="1" strokeWidth="1.2" fill="none" stroke="currentColor" />
      <line x1="4" y1="7" x2="5.5" y2="7" strokeWidth="1" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
      <line x1="4" y1="9.5" x2="5.5" y2="9.5" strokeWidth="1" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
      <line x1="4" y1="12" x2="5.5" y2="12" strokeWidth="1" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
      <line x1="11" y1="7" x2="12.5" y2="7" strokeWidth="1" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
      <line x1="11" y1="9.5" x2="12.5" y2="9.5" strokeWidth="1" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
      <line x1="18" y1="7" x2="19.5" y2="7" strokeWidth="1" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
    </g>
  ),
};

const DEFAULT_ICON = (
  <g>
    <circle cx="12" cy="12" r="8" strokeWidth="1.5" fill="none" stroke="currentColor" />
    <path d="M12 8v4l2 2" strokeWidth="1.5" fill="none" stroke="currentColor" strokeLinecap="round" />
  </g>
);

export function AppIcon({ icon, className = "" }: AppIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[icon] ?? DEFAULT_ICON}
    </svg>
  );
}

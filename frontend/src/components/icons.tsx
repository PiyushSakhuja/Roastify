type IconProps = { className?: string };

export function SpotifyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.12" />
      <path
        d="M6.5 9.8c3.2-.9 7.1-.6 9.9 1M7 13c2.6-.7 5.8-.5 8.1.8M7.5 16c2.1-.5 4.6-.4 6.4.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GitHubIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.12" />
      <path
        d="M12 5.5c-3.6 0-6.5 2.9-6.5 6.5 0 2.9 1.9 5.3 4.4 6.2.3.1.4-.1.4-.3v-1.2c-1.8.4-2.2-.8-2.2-.8-.3-.7-.7-.9-.7-.9-.6-.4 0-.4 0-.4.7 0 1 .7 1 .7.6 1 1.5.7 1.9.6.1-.5.2-.7.4-.9-1.4-.2-2.9-.7-2.9-3.2 0-.7.2-1.3.7-1.7-.1-.2-.3-.9.1-1.9 0 0 .6-.2 1.9.7a6.4 6.4 0 0 1 3.4 0c1.3-.9 1.9-.7 1.9-.7.4 1 .1 1.7.1 1.9.4.5.7 1 .7 1.7 0 2.5-1.5 3-2.9 3.2.2.2.4.6.4 1.2v1.8c0 .2.1.4.4.3 2.5-.9 4.4-3.3 4.4-6.2 0-3.6-2.9-6.5-6.5-6.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SteamIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.12" />
      <circle cx="9" cy="15" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="15.5" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.9 13.7 13.4 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function ValorantIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.12" />
      <path
        d="M5 7.5 11 15h2.2L7.2 7.5H5Zm7.4 0 6 9.6-2 2.4L10.5 9.9l2-2.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function MoviesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.12" />
      <rect x="6" y="7" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 10h12M9 7v3M14 7v3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" strokeDasharray="2 3" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

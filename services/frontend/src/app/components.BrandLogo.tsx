export function BrandLogo(): JSX.Element {
  return (
    <svg
      viewBox="0 0 128 128"
      role="img"
      aria-label="National Port-to-Shelf logo"
      className="brand-mark"
    >
      <defs>
        <linearGradient id="brandArc" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2E8B57" />
          <stop offset="100%" stopColor="#00B8D9" />
        </linearGradient>
      </defs>
      <path
        d="M63 15c25 0 47 14 58 36l-14 6C98 37 82 25 63 25 37 25 16 46 16 72c0 11 4 22 12 31l-10 10C7 101 1 87 1 72 1 40 31 15 63 15Z"
        fill="url(#brandArc)"
      />
      <path d="M72 20c18 5 33 20 38 39l-13 5c-4-14-15-25-29-29l4-15Z" fill="#2E8B57" />
      <path
        d="M60 52 36 64l4 9 20-10v31H46c8 9 20 14 34 14 4 0 8 0 12-1L64 90V63l20 10 4-9-24-12-2-1-2 1Z"
        fill="#1AA36B"
      />
      <circle cx="63" cy="50" r="6" fill="#F47C3C" />
      <circle cx="35" cy="64" r="6" fill="#F47C3C" />
      <circle cx="91" cy="64" r="6" fill="#F47C3C" />
      <circle cx="84" cy="31" r="5" fill="#F47C3C" />
      <path
        d="M42 118c11-18 33-26 48-19-5 5-9 11-12 18-11 2-23 2-36 1Z"
        fill="#2E8B57"
        opacity="0.95"
      />
    </svg>
  );
}

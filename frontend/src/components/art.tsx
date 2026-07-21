/* Hand-drawn SVG art in the spirit of tutu promo assets (no external CDNs). */

export function BellArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 300" className={className} aria-hidden>
      <defs>
        <linearGradient id="bellDome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f7ff" />
          <stop offset="35%" stopColor="#c7cde4" />
          <stop offset="70%" stopColor="#8e97ba" />
          <stop offset="100%" stopColor="#5d6584" />
        </linearGradient>
        <linearGradient id="bellBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff8a3d" />
          <stop offset="100%" stopColor="#e85d04" />
        </linearGradient>
        <linearGradient id="tag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e6e9f8" />
          <stop offset="50%" stopColor="#b9c0dd" />
          <stop offset="100%" stopColor="#8a93b8" />
        </linearGradient>
      </defs>

      {/* chain */}
      <path
        d="M120 40 q40 -30 90 -8"
        fill="none"
        stroke="#c3c9e2"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray="1 12"
      />
      {/* keyring */}
      <circle cx="212" cy="34" r="16" fill="none" stroke="#cdd3ea" strokeWidth="7" />

      {/* luggage tag */}
      <g transform="rotate(-14 95 120)">
        <rect x="55" y="70" width="80" height="110" rx="12" fill="url(#tag)" />
        <rect x="55" y="70" width="80" height="110" rx="12" fill="none" stroke="#ffffff55" strokeWidth="2" />
        <circle cx="95" cy="88" r="7" fill="#251d8f" opacity="0.35" />
      </g>

      {/* bell dome */}
      <g transform="translate(60 40)">
        <ellipse cx="150" cy="212" rx="118" ry="18" fill="#000" opacity="0.25" />
        <path d="M40 190 a110 105 0 0 1 220 0 Z" fill="url(#bellDome)" />
        {/* highlight */}
        <path d="M78 120 a85 85 0 0 1 60 -52 q14 -4 8 6 a95 95 0 0 0 -52 50 q-8 12 -16 -4Z" fill="#ffffff" opacity="0.75" />
        {/* button */}
        <rect x="138" y="52" width="24" height="16" rx="6" fill="#aeb6d6" />
        <circle cx="150" cy="48" r="12" fill="#dfe4f6" />
        {/* orange base */}
        <path d="M28 190 h244 a12 12 0 0 1 12 12 v6 a12 12 0 0 1 -12 12 H28 a12 12 0 0 1 -12 -12 v-6 a12 12 0 0 1 12 -12Z" fill="url(#bellBase)" />
        <path d="M40 220 h220 a10 10 0 0 1 10 10 v2 H30 v-2 a10 10 0 0 1 10 -10Z" fill="#5b48e8" />
      </g>
    </svg>
  )
}

export function TurbineArt({ className = '' }: { className?: string }) {
  const blades = Array.from({ length: 9 })
  return (
    <svg viewBox="0 0 220 220" className={className} aria-hidden>
      <defs>
        <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff9a3d" />
          <stop offset="100%" stopColor="#f05800" />
        </linearGradient>
        <radialGradient id="face" cx="0.5" cy="0.4" r="0.8">
          <stop offset="0%" stopColor="#b3a6ff" />
          <stop offset="100%" stopColor="#7b68ff" />
        </radialGradient>
      </defs>

      {/* outer rim */}
      <circle cx="110" cy="110" r="100" fill="url(#rim)" />
      <circle cx="110" cy="110" r="82" fill="url(#face)" />

      {/* turbine blades */}
      <g transform="translate(110 110)">
        {blades.map((_, i) => (
          <path
            key={i}
            d="M0 -12 q34 -26 62 -12 q-24 26 -58 24 Z"
            fill="#d9d2ff"
            opacity="0.9"
            transform={`rotate(${(360 / blades.length) * i})`}
          />
        ))}
        <circle r="26" fill="#4b3fd6" />
        <circle r="26" fill="none" stroke="#ffffff44" strokeWidth="3" />
      </g>

      {/* needle */}
      <g transform="rotate(35 110 110)">
        <path d="M110 110 L104 30 q6 -10 12 0 Z" fill="#8CE24A" />
        <circle cx="110" cy="110" r="10" fill="#8CE24A" />
      </g>

      {/* tick marks on rim */}
      {Array.from({ length: 12 }).map((_, i) => (
        <rect
          key={i}
          x="108"
          y="14"
          width="4"
          height="12"
          rx="2"
          fill="#ffffff"
          opacity="0.85"
          transform={`rotate(${i * 30} 110 110)`}
        />
      ))}
    </svg>
  )
}

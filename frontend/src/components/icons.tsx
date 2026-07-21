import type { SVGProps } from 'react'

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...p,
})

export const IconPlane = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M10.5 13.5 3 12l1-2 6.5 1L15 6c.8-.8 2.2-1 2.8-.4.6.6.4 2-.4 2.8l-4.9 4.5 1 6.5-2 1-1.5-7.4-3 2.7L5 20l-1-1 1.3-2.5c.2-.4.5-.8.9-1.1l4.3-1.9Z" />
  </svg>
)

export const IconTrain = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="6" y="3" width="12" height="14" rx="3" />
    <path d="M6 11h12" />
    <path d="M9 7h6" />
    <path d="M8.5 21 10 17M15.5 21 14 17" />
    <circle cx="9" cy="14" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="15" cy="14" r="0.6" fill="currentColor" stroke="none" />
  </svg>
)

export const IconBus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="13" rx="2.5" />
    <path d="M4 12h16" />
    <path d="M7 20v-3M17 20v-3" />
    <circle cx="8" cy="15" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="16" cy="15" r="0.6" fill="currentColor" stroke="none" />
  </svg>
)

export const IconSuburban = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 16V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
    <path d="M5 11h14" />
    <path d="M12 4v7" />
    <path d="M8 21l1.5-3M16 21l-1.5-3" />
  </svg>
)

export const IconHotel = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 18v-6a2 2 0 0 1 2-2h9a4 4 0 0 1 4 4v4" />
    <path d="M3 14h18" />
    <path d="M3 18h18" />
    <path d="M7 10V8a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v2" />
  </svg>
)

export const IconMic = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M6 11a6 6 0 0 0 12 0" />
    <path d="M12 17v4M9 21h6" />
  </svg>
)

export const IconSend = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 12 20 4l-6 16-3-7-7-1Z" />
  </svg>
)

export const IconSpark = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </svg>
)

export const IconArrow = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const IconHeart = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 15.5 12 20 12 20Z" />
  </svg>
)

export const IconLogin = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
    <path d="M10 12H3M7 8l-4 4 4 4" />
  </svg>
)

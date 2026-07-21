import Header from './components/Header'
import Home from './components/Home'
import Results from './components/Results'
import AssistantPanel from './components/AssistantPanel'
import SeatmapModal from './components/SeatmapModal'
import { useStore } from './store'

export default function App() {
  const page = useStore((s) => s.page)
  return (
    <div className="tutu-hero min-h-screen">
      {/* SVG-фильтр преломления для Liquid Glass (работает в Chromium) */}
      <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="lq-dist" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
            <feTurbulence type="fractalNoise" baseFrequency="0.004 0.004" numOctaves="1" seed="92" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="3" result="soft" />
            <feDisplacementMap in="SourceGraphic" in2="soft" scale="28" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <Header />
      {page === 'home' ? <Home /> : <Results />}
      <AssistantPanel />
      <SeatmapModal />
    </div>
  )
}

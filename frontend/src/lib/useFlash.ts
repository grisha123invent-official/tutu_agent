import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'

/** Returns a className that briefly flashes when the assistant writes `field`. */
export function useFlash(field: string): string {
  const ts = useStore((s) => s.highlighted[field])
  const [on, setOn] = useState(false)
  const prev = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (ts && ts !== prev.current) {
      prev.current = ts
      setOn(true)
      const t = setTimeout(() => setOn(false), 900)
      return () => clearTimeout(t)
    }
  }, [ts])

  return on ? 'tutu-fill-flash' : ''
}

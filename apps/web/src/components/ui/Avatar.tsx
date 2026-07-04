import { cn, hashIndex } from '@/lib/utils'
import { useState } from 'react'

// Initials-fallback ink colors, warm and muted for the paper palette.
const INK = ['#6E6142', '#5C4EA8', '#5A6E3A', '#8A6D1F', '#A3382B', '#2B5C9E']

/** DiceBear "Notionists" hand-drawn portrait, seeded by the author's name. */
function avatarUrl(name: string): string {
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=transparent`
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

/**
 * A small pasted-in "photo": a rectangular paper frame holding the author's
 * DiceBear portrait, tinted like an aging print. `framed` adds the hand-placed
 * tilt + drop shadow. The initials show until the portrait loads (or if it
 * fails — offline / blocked).
 */
export function Avatar({
  name,
  size = 32,
  height,
  className,
  framed = false,
  cover = false,
}: {
  name: string
  size?: number
  /** Frame height; defaults to `size` (square). Set taller for a 3×4 photo. */
  height?: number
  className?: string
  framed?: boolean
  /** Fill the frame (cover, top-anchored) with no inner padding/border — for the
   *  large "3×4" detail photo. Chips use contain-fit inside a bordered frame. */
  cover?: boolean
}) {
  const h = height ?? size
  const fg = INK[hashIndex(name, INK.length)]!
  const rot = (hashIndex(name, 7) - 3) * 0.7
  const pad = cover ? 0 : Math.max(2, Math.round(size * 0.08))
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-paper-chip font-serif font-medium',
        cover ? '' : 'border border-line-chip',
        className,
      )}
      style={{
        width: size,
        height: h,
        color: fg,
        fontSize: size * 0.34,
        transform: framed ? `rotate(${rot}deg)` : undefined,
        boxShadow: framed ? '1px 1px 0 rgba(34,29,20,0.12)' : undefined,
        filter: 'saturate(0.75) sepia(0.12)',
      }}
      title={name}
    >
      <span aria-hidden style={{ opacity: loaded && !failed ? 0 : 1 }}>
        {initialsOf(name)}
      </span>
      {!failed && (
        <img
          src={avatarUrl(name)}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className={cn('absolute', cover ? 'object-cover object-top' : 'object-contain')}
          style={{
            top: pad,
            right: pad,
            bottom: pad,
            left: pad,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}

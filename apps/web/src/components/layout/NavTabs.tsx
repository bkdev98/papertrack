import { NAV_TABS, type NavTab, type SubCountKey } from '@/app/nav'
import { cn } from '@/lib/utils'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export interface NavCounts {
  papers: number
  finance: number
  notif: number
  subCounts: Record<SubCountKey, number>
}

function isActive(pathname: string, tab: NavTab): boolean {
  if (tab.match === '/') return pathname === '/'
  return pathname === tab.match || pathname.startsWith(`${tab.match}/`)
}

export function NavTabs({ counts }: { counts: NavCounts }) {
  const { pathname } = useLocation()

  const badgeFor = (tab: NavTab): number | null => {
    if (tab.badge === 'papers') return counts.papers
    if (tab.badge === 'finance') return counts.finance
    if (tab.badge === 'notif') return counts.notif
    return null
  }

  return (
    <nav aria-label="Điều hướng" className="no-scrollbar overflow-x-auto">
      {/* Padding + positioning context live on this inner wrapper, sized to the
          full scroll width (w-max min-w-full), so the hairline's insets resolve
          against the whole strip instead of the scroller's client width — it must
          span every tab even when the strip overflows and scrolls on phones.
          pt (not mt) so the hover lift + active tab's upward shadow have room
          inside the overflow-x clip box instead of being cut off at the top edge. */}
      <div className="relative w-max min-w-full px-6 pt-4 max-sm:px-4 sm:px-12">
        {/* One continuous thin brown hairline across the whole strip. Drawn ABOVE
            the inactive tabs (z-5) so it reads as a single line instead of dashes
            peeking through the gaps; the active folder sits higher (z-6) and covers
            its slice, opening the tab into the page below. */}
        <div className="pointer-events-none absolute inset-x-6 bottom-0 z-[5] h-px bg-ink max-sm:inset-x-4 sm:inset-x-12" />
        <ul className="relative flex items-end gap-1">
          {NAV_TABS.map((tab) => (
            <TabFolder
              key={tab.key}
              tab={tab}
              active={isActive(pathname, tab)}
              badge={badgeFor(tab)}
              pathname={pathname}
              subCounts={counts.subCounts}
            />
          ))}
        </ul>
      </div>
    </nav>
  )
}

/**
 * One folder-tab. Its sub-items live *inside* the same bordered container as the
 * parent label; when the tab is active the folder expands to reveal them by
 * animating a measured `max-width` (the design's `childMax`) — so the border
 * wraps parent + children as a single open folder, never a detached row.
 */
function TabFolder({
  tab,
  active,
  badge,
  pathname,
  subCounts,
}: {
  tab: NavTab
  active: boolean
  badge: number | null
  pathname: string
  subCounts: NavCounts['subCounts']
}) {
  const hasChildren = !!tab.children?.length
  const contentRef = useRef<HTMLDivElement>(null)
  const liRef = useRef<HTMLLIElement>(null)
  const [childWidth, setChildWidth] = useState(0)

  // On phones the strip overflows and scrolls, so after navigation (tap on a
  // partially visible tab, deep link, in-page link) the active folder can sit
  // off-screen. Nudge it horizontally into view. This scrolls ONLY the nav's own
  // overflow-x container (scrollBy, never scrollIntoView) so it can never touch
  // the window's vertical scroll, and it early-returns unless the strip actually
  // overflows — so on desktop, where every tab fits, the effect is a strict no-op.
  useEffect(() => {
    if (!active) return
    const li = liRef.current
    const scroller = li?.closest('nav')
    if (!li || !scroller || scroller.scrollWidth <= scroller.clientWidth) return
    const liBox = li.getBoundingClientRect()
    const scBox = scroller.getBoundingClientRect()
    const pad = 16
    let delta = 0
    if (liBox.left < scBox.left + pad) delta = liBox.left - scBox.left - pad
    else if (liBox.right > scBox.right - pad) delta = liBox.right - scBox.right + pad
    if (delta === 0) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollBy({ left: delta, behavior: reduce ? 'auto' : 'smooth' })
  }, [active])

  // Track the sub-items' natural width so the folder animates open to exactly
  // that (the design's `childMax`). A ResizeObserver re-measures whenever the
  // content resizes — on web-font settle and when a count's digit width changes
  // ("· 34" → "· 150") — so the last underline is never clipped.
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!hasChildren || !el) return
    const measure = () => setChildWidth((prev) => (prev === el.offsetWidth ? prev : el.offsetWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasChildren])

  return (
    <li
      ref={liRef}
      className={cn(
        'relative flex h-[39px] shrink-0 items-center rounded-t-[5px] border border-b-0 transition-all duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]',
        active
          ? 'z-[6] border-ink bg-paper px-4 shadow-[0_-2px_5px_rgba(34,29,20,0.06)]'
          : 'z-[1] border-[#A79D85] bg-tab px-3 hover:-translate-y-0.5 hover:bg-tab-hover',
      )}
    >
      {/* red top mark on the active folder — straddles the top border line
          (top:-1.5px in the original) rather than sitting below it */}
      {active && (
        <span className="pointer-events-none absolute inset-x-3.5 top-[-1.5px] h-[2.5px] rounded-[2px] bg-seal" />
      )}

      <Link
        to={tab.to}
        aria-current={active ? 'page' : undefined}
        className={cn(
          // max-sm:py-2.5 grows the tap target to ~full folder height: the Link is
          // a flex item of the items-center li, so symmetric vertical padding keeps
          // the label centered exactly where it is today — zero visual shift.
          'relative whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[1.5px] transition-colors max-sm:py-2.5',
          active ? 'text-ink' : 'text-muted hover:text-ink',
        )}
      >
        {tab.label}
        {badge != null && badge > 0 && <span className="text-seal"> · {badge}</span>}
      </Link>

      {hasChildren && (
        <div
          className="flex items-center overflow-hidden transition-[max-width,opacity] duration-[450ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]"
          style={{ maxWidth: active ? childWidth : 0, opacity: active ? 1 : 0 }}
          aria-hidden={!active}
        >
          <div ref={contentRef} className="flex w-max shrink-0 items-center gap-[13px] pl-[14px]">
            <span className="h-[15px] w-px shrink-0 bg-line" />
            {tab.children!.map((child) => {
              const childActive = pathname === child.to
              const count = child.countKey ? subCounts[child.countKey] : 0
              return (
                <Link
                  key={child.to}
                  to={child.to}
                  tabIndex={active ? undefined : -1}
                  aria-current={childActive ? 'page' : undefined}
                  className={cn(
                    'whitespace-nowrap border-b-[1.5px] pb-0.5 font-serif text-[14px] italic transition-colors',
                    childActive
                      ? 'border-seal font-semibold text-ink'
                      : 'border-transparent text-muted hover:text-ink',
                  )}
                >
                  {child.label}
                  {/* Show `· N` only when the count is non-zero, matching the design. */}
                  {count > 0 && (
                    <span className="ml-1 font-mono text-[11.5px] font-normal not-italic text-seal">
                      · {count}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </li>
  )
}

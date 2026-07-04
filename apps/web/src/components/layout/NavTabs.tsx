import { NAV_TABS, type NavTab, type SubCountKey } from '@/app/nav'
import { cn } from '@/lib/utils'
import { useLayoutEffect, useRef, useState } from 'react'
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
    <nav
      aria-label="Điều hướng"
      // pt (not mt) so the hover lift + active tab's upward shadow have room
      // inside the overflow-x clip box instead of being cut off at the top edge.
      className="no-scrollbar relative overflow-x-auto px-6 pt-4 sm:px-12"
    >
      {/* One continuous thin brown hairline across the whole strip. Drawn ABOVE
          the inactive tabs (z-5) so it reads as a single line instead of dashes
          peeking through the gaps; the active folder sits higher (z-6) and covers
          its slice, opening the tab into the page below. */}
      <div className="pointer-events-none absolute inset-x-6 bottom-0 z-[5] h-px bg-ink sm:inset-x-12" />
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
  const [childWidth, setChildWidth] = useState(0)

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
          'relative whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[1.5px] transition-colors',
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

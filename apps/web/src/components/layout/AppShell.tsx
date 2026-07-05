import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { useInventory, useNotifications, useOverview, useSettlement } from '@/lib/queries'
import { Outlet, useLocation } from 'react-router-dom'
import { Masthead } from './Masthead'
import { type NavCounts, NavTabs } from './NavTabs'

export function AppShell() {
  const overview = useOverview()
  const notifs = useNotifications()
  const settle = useSettlement()
  const inv = useInventory()
  const { pathname } = useLocation()

  const s = overview.data?.stats
  const counts: NavCounts = {
    papers: s?.inprocCount ?? 0,
    finance: (settle.data?.collect.count ?? 0) + (settle.data?.pay.count ?? 0),
    notif: notifs.data?.urgent.length ?? 0,
    subCounts: {
      inprocess: s?.inprocCount ?? 0,
      finished: s?.finishedCount ?? 0,
      rejected: s?.rejectedCount ?? 0,
      all: s?.total ?? 0,
      journals: inv.data?.journals ?? 0,
      conferences: inv.data?.conferences ?? 0,
      specialIssues: inv.data?.specialIssues ?? 0,
      authors: inv.data?.authors ?? 0,
    },
  }

  return (
    <div className="paper-texture flex min-h-screen flex-col">
      <Masthead />
      <NavTabs counts={counts} />
      <main className="flex-1 px-6 pb-20 pt-7 max-sm:px-4 sm:px-12">
        {/* Keyed by path so a failed route resets when the user navigates elsewhere. */}
        <RouteErrorBoundary key={pathname}>
          <Outlet />
        </RouteErrorBoundary>
      </main>
      <footer className="px-6 pb-6 text-center font-mono text-[8.5px] tracking-[1.4px] text-faint max-sm:px-4 sm:px-12">
        ❦ &nbsp;PaperTrack by VREX STUDIO
      </footer>
    </div>
  )
}

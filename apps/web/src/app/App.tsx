import { AppShell } from '@/components/layout/AppShell'
import { AuthGate } from '@/features/auth/AuthGate'
import { OverviewScreen } from '@/features/overview/OverviewScreen'
import { setUnauthorizedHandler } from '@/lib/api'
import { qk, useAuthMe } from '@/lib/queries'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { OverlayProvider } from './overlays'

// The Overview screen is the landing route, so it ships in the main bundle.
// The rest are code-split per route — the kanban's @dnd-kit and the heavier
// catalog/finance/data screens only load when the user navigates to them.
const PapersScreen = lazy(() =>
  import('@/features/papers/PapersScreen').then((m) => ({ default: m.PapersScreen })),
)
const CatalogScreen = lazy(() =>
  import('@/features/catalog/CatalogScreen').then((m) => ({ default: m.CatalogScreen })),
)
const FinanceScreen = lazy(() =>
  import('@/features/finance/FinanceScreen').then((m) => ({ default: m.FinanceScreen })),
)
const NotificationsScreen = lazy(() =>
  import('@/features/notifications/NotificationsScreen').then((m) => ({
    default: m.NotificationsScreen,
  })),
)
const DataScreen = lazy(() =>
  import('@/features/data/DataScreen').then((m) => ({ default: m.DataScreen })),
)

function BootSplash() {
  return (
    <div className="paper-texture flex min-h-screen items-center justify-center">
      <span className="font-serif text-[15px] italic text-muted">Đang mở sổ…</span>
    </div>
  )
}

/** Lightweight fallback while a route chunk streams in. */
function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <span className="font-serif text-[14px] italic text-muted">Đang lật trang…</span>
    </div>
  )
}

export function App() {
  const me = useAuthMe()
  const qc = useQueryClient()

  useEffect(() => {
    setUnauthorizedHandler(() => qc.setQueryData(qk.auth, { authenticated: false }))
  }, [qc])

  if (me.isPending) return <BootSplash />
  if (!me.data?.authenticated) {
    return <AuthGate onUnlocked={() => qc.invalidateQueries({ queryKey: qk.auth })} />
  }

  return (
    <OverlayProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<OverviewScreen />} />
          <Route path="/so-bai-bao" element={<Navigate to="/so-bai-bao/dang-xu-ly" replace />} />
          <Route
            path="/so-bai-bao/:group"
            element={
              <Suspense fallback={<RouteFallback />}>
                <PapersScreen />
              </Suspense>
            }
          />
          <Route path="/danh-muc" element={<Navigate to="/danh-muc/tap-chi" replace />} />
          <Route
            path="/danh-muc/:kind"
            element={
              <Suspense fallback={<RouteFallback />}>
                <CatalogScreen />
              </Suspense>
            }
          />
          <Route path="/tai-chinh" element={<Navigate to="/tai-chinh/thu-chi" replace />} />
          <Route
            path="/tai-chinh/:kind"
            element={
              <Suspense fallback={<RouteFallback />}>
                <FinanceScreen />
              </Suspense>
            }
          />
          <Route
            path="/thong-bao"
            element={
              <Suspense fallback={<RouteFallback />}>
                <NotificationsScreen />
              </Suspense>
            }
          />
          <Route
            path="/du-lieu"
            element={
              <Suspense fallback={<RouteFallback />}>
                <DataScreen />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </OverlayProvider>
  )
}

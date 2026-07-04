import { CATALOG_SLUGS, type CatalogKind } from '@/app/nav'
import type { ComponentType } from 'react'
import { useParams } from 'react-router-dom'
import { AuthorsScreen } from './AuthorsScreen'
import { ConferencesScreen } from './ConferencesScreen'
import { JournalsScreen } from './JournalsScreen'
import { SpecialIssuesScreen } from './SpecialIssuesScreen'
import { CatalogProvider } from './catalog-context'

const SCREENS: Record<CatalogKind, ComponentType> = {
  journals: JournalsScreen,
  conferences: ConferencesScreen,
  specialIssues: SpecialIssuesScreen,
  authors: AuthorsScreen,
}

/** Resolves the `:kind` slug and renders the matching Danh mục sub-screen. */
export function CatalogScreen() {
  const { kind = 'tap-chi' } = useParams()
  const resolved = CATALOG_SLUGS[kind] ?? 'journals'
  const Screen = SCREENS[resolved]
  // Key by kind so switching sub-nav resets any open drawer/modal.
  // Constrained to the same width as Tài chính (settle) rather than full-bleed.
  return (
    <CatalogProvider key={resolved} kind={resolved}>
      <div className="mx-auto max-w-[1000px]">
        <Screen />
      </div>
    </CatalogProvider>
  )
}

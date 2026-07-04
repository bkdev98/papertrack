import { FINANCE_SLUGS } from '@/app/nav'
import { useParams } from 'react-router-dom'
import { CostsScreen } from './CostsScreen'
import { RewardsScreen } from './RewardsScreen'
import { SettleScreen } from './SettleScreen'

/** Tài chính router — /tai-chinh/:kind → settle | costs | rewards. */
export function FinanceScreen() {
  const { kind = 'thu-chi' } = useParams()
  const resolved = FINANCE_SLUGS[kind] ?? 'settle'
  if (resolved === 'costs') return <CostsScreen />
  if (resolved === 'rewards') return <RewardsScreen />
  return <SettleScreen />
}

import { PATHS } from '@/app/nav'
import { useOverlays } from '@/app/overlays'
import { useAiStatus } from '@/lib/queries'
import { formatDateLong } from '@papertrack/shared'
import { Link } from 'react-router-dom'

export function Masthead() {
  const { openCreatePaper, openAsk } = useOverlays()
  const aiEnabled = useAiStatus().data?.enabled ?? false
  return (
    <header className="px-6 pt-5 sm:px-12">
      <div className="flex flex-wrap items-center gap-4">
        <Link to={PATHS.overview} className="flex items-baseline gap-2.5">
          <span className="text-[22px] leading-none text-seal">❧</span>
          <span className="font-brand text-[32px] leading-none tracking-[0.2px] text-ink">
            PaperTrack
          </span>
        </Link>
        <span className="hidden whitespace-nowrap text-[13px] italic text-muted sm:inline">
          sổ theo dõi công bố khoa học — khoa Công nghệ thông tin
        </span>
        <span className="ml-auto hidden text-[13px] italic text-muted md:inline">
          {formatDateLong()}
        </span>
        <div className="ml-auto flex items-center gap-2.5 md:ml-0">
          {aiEnabled && (
            <button
              type="button"
              onClick={openAsk}
              aria-label="Hỏi sổ — trò chuyện với sổ"
              className="group relative inline-flex cursor-pointer items-center gap-1.5 rounded-[3px_8px] border-[1.5px] border-seal bg-[rgba(163,56,43,0.045)] px-3.5 py-[7.5px] text-seal transition-all duration-[180ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-seal hover:text-paper hover:shadow-[4px_4px_0_rgba(163,56,43,0.28)] active:translate-x-0 active:translate-y-0 active:scale-[0.97]"
            >
              <span className="text-[13px] leading-none transition-transform duration-300 group-hover:rotate-[14deg]">
                ❧
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-[1.4px]">Hỏi sổ</span>
            </button>
          )}
          <button
            type="button"
            onClick={openCreatePaper}
            className="shadow-stamp cursor-pointer bg-ink px-4 py-[9px] font-mono text-[10.5px] uppercase tracking-[1px] text-paper transition-all duration-[180ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_rgba(163,56,43,0.85)] active:scale-[0.97]"
          >
            + Thêm bài báo
          </button>
        </div>
      </div>
      <div className="double-rule mt-4" />
    </header>
  )
}

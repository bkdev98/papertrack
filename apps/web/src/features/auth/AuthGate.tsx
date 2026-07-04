import { ApiError, api } from '@/lib/api'
import { type FormEvent, useState } from 'react'

export function AuthGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [unlocking, setUnlocking] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  const today = new Date().toLocaleDateString('vi-VN')
  const fileNo = `${new Date().getFullYear()}/CNTT-07`

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (unlocking || unlocked) return
    setUnlocking(true)
    try {
      await api.auth.login(pw)
      setUnlocked(true)
      setTimeout(onUnlocked, 900)
    } catch (err) {
      if (err instanceof ApiError) {
        setError((n) => n + 1)
        setAttempts((n) => n + 1)
        setPw('')
      }
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="paper-texture flex min-h-screen flex-col items-center justify-center px-6 py-10 font-serif text-ink">
      {/* Texture accents */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(84,72,50,0.08) 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed font-mono font-semibold select-none"
        style={{
          right: -40,
          top: '16%',
          fontSize: 120,
          letterSpacing: 14,
          color: 'rgba(34,29,20,0.035)',
          transform: 'rotate(90deg)',
          transformOrigin: 'center',
        }}
      >
        MẬT
      </div>
      <div
        className="pointer-events-none fixed left-[52px] top-[30px] animate-pt-fade font-mono text-[9px] tracking-[2px] text-faint"
        style={{ animationDelay: '0.9s' }}
      >
        HỒ SƠ Nº {fileNo}
      </div>

      <div className="relative w-full max-w-[460px] text-center">
        {/* Masthead */}
        <div className="animate-pt-ink" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-baseline justify-center gap-2.5">
            <span className="text-[26px] leading-none text-seal">❧</span>
            <span className="font-brand text-[44px] leading-none tracking-[0.2px]">PaperTrack</span>
          </div>
          <div className="mt-1.5 text-[13.5px] italic text-muted">
            sổ theo dõi công bố khoa học — khoa Công nghệ thông tin
          </div>
          <div className="mt-[18px] border-t-2 border-ink" />
          <div className="mt-[3px] border-t border-ink" />
        </div>

        {/* Seal */}
        <div className="relative mt-8 flex justify-center">
          <div
            className="absolute right-[16px] top-[64px] w-[52px] origin-left animate-pt-draw border-t-[1.5px] border-seal/60"
            style={{ transform: 'rotate(-6deg)', animationDelay: '1.6s' }}
          />
          <div
            className="absolute right-[-8px] top-[38px] animate-pt-fade whitespace-nowrap font-script text-[17px] font-semibold text-seal"
            style={{ transform: 'rotate(-6deg)', animationDelay: '1.4s' }}
          >
            lưu hành nội bộ!
          </div>
          <div
            className="flex h-28 w-28 animate-pt-stamp items-center justify-center rounded-full border-[2.5px] border-seal text-seal"
            style={{ mixBlendMode: 'multiply', animationDelay: '0.55s' }}
          >
            <div className="flex h-[94px] w-[94px] flex-col items-center justify-center gap-[3px] rounded-full border border-dashed border-seal">
              <span className="font-mono text-[8.5px] tracking-[2px]">NIÊM PHONG</span>
              <span className="font-display text-[30px] leading-none">❧</span>
              <span className="font-mono text-[8.5px] tracking-[2px]">KHOA CNTT</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div
          className="mt-8"
          style={{
            animation: error ? 'ptShake 0.45s both' : 'ptUp 0.7s 0.35s var(--ease-paper) both',
          }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[1.8px] text-muted">
            Sổ đã niêm phong — nhập mật khẩu để mở
          </div>
          <form onSubmit={submit} className="mt-5 flex flex-col items-stretch gap-4">
            <div className="relative text-left">
              <input
                type={show ? 'text' : 'password'}
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value)
                  setError(0)
                }}
                placeholder="nhập mật khẩu…"
                autoFocus
                className="w-full bg-transparent px-0.5 py-2 pr-9 font-serif text-[19px] text-ink outline-none transition-colors placeholder:italic placeholder:text-faint"
                style={{
                  borderBottom: `1.5px solid ${error ? 'var(--color-seal)' : 'var(--color-ink)'}`,
                  letterSpacing: show ? '0.3px' : '3px',
                }}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer p-1 font-serif text-[15px] italic text-muted transition-colors hover:text-seal"
              >
                {show ? 'ẩn' : 'hiện'}
              </button>
              <div
                className="absolute inset-x-0 bottom-[-1.5px] h-[1.5px] origin-left bg-seal transition-transform duration-[400ms]"
                style={{ transform: `scaleX(${error ? 1 : 0})` }}
              />
            </div>

            {error > 0 && (
              <div className="flex animate-pt-fade items-center justify-center gap-3">
                <span
                  className="inline-block font-script text-[17px] font-semibold text-seal"
                  style={{ transform: 'rotate(-2deg)' }}
                >
                  sai rồi!
                </span>
                <span className="text-[13px] italic text-muted">
                  {attempts >= 3
                    ? `đã sai ${attempts} lần — liên hệ quản trị viên nhé`
                    : 'mật khẩu chưa đúng, thử lại'}
                </span>
                <span
                  className="flex items-center gap-[3px]"
                  style={{ transform: 'rotate(-2deg)' }}
                  title="số lần sai"
                >
                  {Array.from({ length: attempts }, (_, i) => {
                    const fifth = (i + 1) % 5 === 0
                    return (
                      <span
                        key={i}
                        className="inline-block h-[14px] w-[1.5px] bg-seal"
                        style={{
                          transform: `rotate(${fifth ? '68deg' : '0deg'})`,
                          marginLeft: fifth ? '-16px' : i % 5 === 0 && i > 0 ? '8px' : '0px',
                        }}
                      />
                    )
                  })}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={unlocking}
              className="shadow-stamp self-center cursor-pointer bg-ink px-8 py-3 font-mono text-[11px] uppercase tracking-[1.5px] text-paper transition-all duration-[180ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_rgba(163,56,43,0.85)] active:scale-[0.97] disabled:opacity-55"
            >
              {unlocking ? 'Đang mở…' : 'Mở sổ'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-11 animate-pt-fade" style={{ animationDelay: '1s' }}>
          <div className="border-t border-rule" />
          <div className="mt-2 flex justify-between font-mono text-[8.5px] tracking-[1.4px] text-faint">
            <span>LƯU HÀNH NỘI BỘ</span>
            <span>{today}</span>
          </div>
        </div>
      </div>

      {unlocked && (
        <div className="fixed inset-0 z-50 flex animate-pt-fade items-center justify-center bg-[rgba(245,241,230,0.72)] backdrop-blur-[2px]">
          <div
            className="animate-pt-stamp rounded border-[3px] border-seal px-9 py-3.5 font-mono text-[22px] uppercase tracking-[5px] text-seal"
            style={{ mixBlendMode: 'multiply', animationDelay: '0.1s' }}
          >
            Đã mở khóa
          </div>
        </div>
      )}
    </div>
  )
}

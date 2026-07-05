import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, Ref } from 'react'

type Variant = 'primary' | 'ghost' | 'ghost-red' | 'text'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  ref?: Ref<HTMLButtonElement>
}

const base =
  'inline-flex items-center justify-center gap-2 font-mono uppercase tracking-[1px] cursor-pointer ' +
  'transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] active:scale-[0.97] ' +
  'disabled:opacity-55 disabled:pointer-events-none select-none'

const sizes: Record<Size, string> = {
  sm: 'text-[10px] px-3 py-1.5 max-sm:min-h-10',
  md: 'text-[10.5px] px-4 py-[9px] max-sm:min-h-11',
}

const variants: Record<Variant, string> = {
  primary:
    'bg-ink text-paper shadow-stamp hover:-translate-x-0.5 hover:-translate-y-0.5 ' +
    'hover:shadow-[5px_5px_0_rgba(163,56,43,0.85)]',
  ghost:
    'border border-line text-ink bg-transparent hover:border-ink hover:bg-[rgba(163,56,43,0.05)]',
  'ghost-red': 'border border-seal text-seal bg-transparent hover:bg-seal hover:text-paper',
  text: 'text-seal normal-case tracking-normal font-serif italic px-0 py-0 hover:underline underline-offset-4 max-sm:-my-2 max-sm:py-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      className={cn(base, variant !== 'text' && sizes[size], variants[variant], className)}
      {...props}
    />
  )
}

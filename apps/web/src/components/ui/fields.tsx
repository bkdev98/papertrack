import { cn } from '@/lib/utils'
import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const fieldBase =
  'w-full bg-transparent font-serif text-[15px] max-sm:text-[16px] text-ink outline-none transition-colors ' +
  'border-b border-dotline focus:border-seal placeholder:italic placeholder:text-faint'

export function Field({
  label,
  hint,
  children,
  className,
  full,
}: {
  label?: ReactNode
  hint?: ReactNode
  children: ReactNode
  className?: string
  full?: boolean
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is passed in as children and wrapped by this label
    <label className={cn('flex flex-col gap-1.5', full && 'col-span-full', className)}>
      {label && (
        <span className="font-mono text-[9px] uppercase tracking-[1.6px] text-muted">
          {label}
          {hint && <span className="ml-1.5 normal-case tracking-normal text-faint">{hint}</span>}
        </span>
      )}
      {children}
    </label>
  )
}

export function Input({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn(fieldBase, 'py-1.5', className)} {...props} />
}

export function Textarea({
  className,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldBase, 'resize-none py-1.5 leading-relaxed', className)}
      {...props}
    />
  )
}

export function Select({
  className,
  children,
  ref,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
  return (
    <select ref={ref} className={cn(fieldBase, 'cursor-pointer py-1.5', className)} {...props}>
      {children}
    </select>
  )
}

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="search"
      className={cn(
        'bg-transparent font-serif text-[14px] max-sm:text-[16px] italic text-ink outline-none transition-colors',
        'border-b border-line focus:border-seal placeholder:text-faint',
        'w-[230px] max-w-full py-1',
        className,
      )}
      {...props}
    />
  )
}

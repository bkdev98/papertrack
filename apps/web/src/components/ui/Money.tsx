/**
 * Renders a formatted money string (from `money()`) with the ₫ dong sign in
 * Spectral (`font-serif`) — the display serif has no clean ₫ glyph and falls
 * back to a mismatched one. Only the symbol is overridden; digits/units inherit.
 */
export function Money({ value, className }: { value: string; className?: string }) {
  const i = value.indexOf('₫')
  if (i < 0) return <span className={className}>{value}</span>
  return (
    <span className={className}>
      {value.slice(0, i)}
      <span className="font-serif">₫</span>
      {value.slice(i + 1)}
    </span>
  )
}

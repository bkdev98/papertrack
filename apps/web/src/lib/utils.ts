/** Tiny classnames joiner (clsx-lite). Falsy values are skipped. */
export type ClassValue = string | number | false | null | undefined | ClassValue[]

export function cn(...values: ClassValue[]): string {
  const out: string[] = []
  for (const v of values) {
    if (!v) continue
    if (Array.isArray(v)) out.push(cn(...v))
    else out.push(String(v))
  }
  return out.join(' ')
}

/** Deterministic index into a palette from a string seed. */
export function hashIndex(seed: string, len: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(h) % Math.max(len, 1)
}

/** Rotations reused for hand-placed elements (countdown discs etc.). */
export const HAND_ROTATIONS = ['-5deg', '3deg', '-2deg', '4deg', '-3deg', '2deg', '-4deg']

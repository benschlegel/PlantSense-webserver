export type Notification = {
  name: string;
  notifications: number[];
}

export type RgbPayload = {
  red: RgbRange;
  green: RgbRange;
  blue: RgbRange;
}

// Special typescript types
type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>

/**
 * IMPORTANT: max range needs to be one higher
 */
type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>

export type RgbRange = IntRange<0, 256>

import { NotificationState } from './enums';

export type RgbPayload = {
  red: RgbRange;
  green: RgbRange;
  blue: RgbRange;
}

export type DeviceInfo = {
  deviceName: string;
  notifications: NotificationState[];
}

export type AddMockDeviceRequest = {
  deviceAmount: number;
  notificationAmount?: number;
  randomizeAmount?: boolean;
}

export type TempIP = {
  private: string;
  public: string;
  mac: string;
  deviceName: string;
}

export type AddressRegisterMap = Map<string, DeviceInfo>

// Special typescript types
type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>

/**
 * IMPORTANT: max range needs to be one higher
 */
type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>

export type RgbRange = IntRange<0, 256>

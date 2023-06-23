import { NotificationState } from './enums';
import { RgbPayload } from './types';

export type SendNotificationBody = {
  host: string;
}

/**
 * private IP of registering device (microcontroller)
 * + device name
 */
export type RegisterDeviceBody = {
  deviceName: string;
  host: string;
}

export type NotificationParams = {
  name: string;
}

export type NotificationBody = {
  hosts: string[];
}

export type CurrentInfoResponse = RgbBody & {totalNotificationAmount: number}


export type CurrentInfoBody = {
  host: string;
}

export type RgbBody = {
  rgb: RgbPayload;
  isBreathing: boolean;
}

export type StateToRgbBody = {
  state: NotificationState;
}

export type ClearBody = {
  pw: string;
}
export type SetStateBody = {
  state: NotificationState
  host: string;
}

export type ClearNotificationQuery = {
  host: string;
  index: number;
}

export type StateResponse = {
  state: NotificationState;
}

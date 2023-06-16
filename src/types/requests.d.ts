import { NotificationState } from './enums';

export type SendNotificationBody = {
  name: string;
}

/**
 * private IP of registering device (microcontroller)
 * + device name
 */
export type RegisterDeviceBody = {
  deviceName: string;
  host: string;
  localIP?: string;
}

export type NotificationParams = {
  name: string;
}

export type SetStateBody = {
  state: NotificationState
}

export type ClearNotificationQuery = {
  name: string;
  index: number;
}

import { NotificationState } from './enums';

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
  localIP?: string;
}

export type NotificationParams = {
  name: string;
}

export type NotificationBody = {
  hosts: string[];
}

export type SetStateBody = {
  state: NotificationState
}

export type ClearNotificationQuery = {
  host: string;
  index: number;
}

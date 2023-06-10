import { NotificationState } from './enums';

export type SendNotificationBody = {
  name: string;
}

export type RegisterDeviceBody = {
  name: string;
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

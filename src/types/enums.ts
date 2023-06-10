/* eslint-disable no-shadow */
//  For some reason, eslint always thinks enum is already defined, so
//  No shadow is disabled for entire file

export enum NotificationState {
  LOW_WATER,
  HIGH_WATER,
  LOW_SUN,
  HIGH_SUN,
  LOW_SOIL,
  HIGH_SOIL,
  NONE = -1,
}

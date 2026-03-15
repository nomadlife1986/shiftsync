export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}
export const PASSWORD_HASHER = 'IPasswordHasher';

export interface IRealtimeService {
  emitToUser(userId: string, event: string, data: unknown): void;
  emitToRoom(room: string, event: string, data: unknown): void;
  emitScheduleUpdate(locationId: string, week: string): void;
  emitNotification(userId: string, notification: unknown): void;
}
export const REALTIME_SERVICE = 'IRealtimeService';

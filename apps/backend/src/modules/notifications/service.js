import * as repo from './repository.js';

export const notificationsService = {
  list(userId, query) {
    return repo.listNotificationsForUser(userId, query);
  },
  markRead(id, userId) {
    return repo.markNotificationRead(id, userId);
  },
  markAllRead(userId) {
    return repo.markAllNotificationsRead(userId);
  },
};

export default notificationsService;

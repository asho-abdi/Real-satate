import { notificationsService } from './service.js';

export const notificationsController = {
  list: async (req, res) => {
    const result = await notificationsService.list(req.user.id, req.query);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  },
  markRead: async (req, res) => {
    const row = await notificationsService.markRead(req.params.id, req.user.id);
    res.status(200).json({ success: true, data: row });
  },
  markAllRead: async (req, res) => {
    const result = await notificationsService.markAllRead(req.user.id);
    res.status(200).json({ success: true, data: result });
  },
};

export default notificationsController;

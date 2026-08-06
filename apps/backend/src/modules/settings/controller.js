import { settingsService } from './service.js';

export const settingsController = {
  list: async (req, res) => {
    const result = await settingsService.list(req.query);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  },
  getByKey: async (req, res) => {
    const row = await settingsService.getByKey(req.params.key);
    res.status(200).json({ success: true, data: row });
  },
  upsert: async (req, res) => {
    const row = await settingsService.upsert(req.params.key, req.body, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(200).json({ success: true, data: row });
  },
};

export default settingsController;

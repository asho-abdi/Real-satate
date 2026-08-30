import { usersService } from './service.js';

export const usersController = {
  list: async (req, res) => {
    const result = await usersService.list(req.query);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  },
  getById: async (req, res) => {
    const row = await usersService.getById(req.params.id);
    res.status(200).json({ success: true, data: row });
  },
  create: async (req, res) => {
    const row = await usersService.create(req.body, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(201).json({ success: true, data: row });
  },
  update: async (req, res) => {
    const row = await usersService.update(req.params.id, req.body, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(200).json({ success: true, data: row });
  },
  remove: async (req, res) => {
    const row = await usersService.deactivate(req.params.id, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(200).json({ success: true, data: row });
  },
};

export default usersController;

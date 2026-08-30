import { rolesService } from './service.js';

export const rolesController = {
  list: async (req, res) => {
    const result = await rolesService.list(req.query);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  },
  getById: async (req, res) => {
    const row = await rolesService.getById(req.params.id);
    res.status(200).json({ success: true, data: row });
  },
  updatePermissions: async (req, res) => {
    const permissionIds = req.body.permissionIds || req.body.permissions || [];
    const row = await rolesService.updatePermissions(req.params.id, permissionIds, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(200).json({ success: true, data: row });
  },
};

export default rolesController;

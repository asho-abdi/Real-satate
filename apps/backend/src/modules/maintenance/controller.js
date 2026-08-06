import { createCrudController } from '../../lib/crudFactory.js';
import { maintenanceService } from './service.js';

const base = createCrudController(maintenanceService);

export const maintenanceController = {
  ...base,
  assign: async (req, res) => {
    const row = await maintenanceService.assign(req.params.id, req.body, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(200).json({ success: true, data: row });
  },
  close: async (req, res) => {
    const row = await maintenanceService.close(req.params.id, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(200).json({ success: true, data: row });
  },
};

export default maintenanceController;

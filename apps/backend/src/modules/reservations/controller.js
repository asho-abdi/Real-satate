import { createCrudController } from '../../lib/crudFactory.js';
import { reservationsService } from './service.js';

const base = createCrudController(reservationsService);

export const reservationsController = {
  ...base,
  checkIn: async (req, res) => {
    const row = await reservationsService.checkIn(req.params.id, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(200).json({ success: true, data: row });
  },
  checkOut: async (req, res) => {
    const row = await reservationsService.checkOut(req.params.id, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(200).json({ success: true, data: row });
  },
};

export default reservationsController;

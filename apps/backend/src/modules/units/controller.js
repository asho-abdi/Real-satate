import { createCrudController } from '../../lib/crudFactory.js';
import { unitsService } from './service.js';

const base = createCrudController(unitsService);

export const unitsController = {
  ...base,
  uploadImages: async (req, res) => {
    const images = await unitsService.uploadImages(req.params.id, req.files || [], {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(201).json({ success: true, data: images });
  },
  removeImage: async (req, res) => {
    const image = await unitsService.removeImage(req.params.id, req.params.imageId, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(200).json({ success: true, data: image });
  },
  setPrimaryImage: async (req, res) => {
    const image = await unitsService.setPrimaryImage(req.params.id, req.params.imageId, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(200).json({ success: true, data: image });
  },
};

export default unitsController;

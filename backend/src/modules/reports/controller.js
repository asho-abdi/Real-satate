import { reportsService } from './service.js';

export const reportsController = {
  dashboard: async (_req, res) => {
    const data = await reportsService.dashboard();
    res.status(200).json({ success: true, data });
  },
  occupancy: async (_req, res) => {
    const data = await reportsService.occupancy();
    res.status(200).json({ success: true, data });
  },
  revenue: async (_req, res) => {
    const data = await reportsService.revenue();
    res.status(200).json({ success: true, data });
  },
  financial: async (_req, res) => {
    const data = await reportsService.financial();
    res.status(200).json({ success: true, data });
  },
  building: async (_req, res) => {
    const data = await reportsService.building();
    res.status(200).json({ success: true, data });
  },
  unit: async (_req, res) => {
    const data = await reportsService.unit();
    res.status(200).json({ success: true, data });
  },
  tenant: async (_req, res) => {
    const data = await reportsService.tenant();
    res.status(200).json({ success: true, data });
  },
  maintenance: async (_req, res) => {
    const data = await reportsService.maintenance();
    res.status(200).json({ success: true, data });
  },
  exportExcel: async (req, res) => {
    const type = String(req.query.type || 'dashboard').toLowerCase();
    await reportsService.exportExcel(res, type);
  },
  exportPdf: async (req, res) => {
    const type = String(req.query.type || 'dashboard').toLowerCase();
    await reportsService.exportPdf(res, type);
  },
};

export default reportsController;

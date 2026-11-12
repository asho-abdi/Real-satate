import { AppError } from '../../utils/AppError.js';
import { exportExcel, exportPdf } from '../../utils/export.js';
/** Orphan stack — not mounted; repository quarantined under HOLD_ARCHIVED. */
import * as repo from '../../HOLD_ARCHIVED/reports-repository.js';

const EXPORT_TYPES = new Set([
  'dashboard',
  'occupancy',
  'revenue',
  'financial',
  'building',
  'unit',
  'tenant',
  'maintenance',
]);

export const reportsService = {
  dashboard() {
    return repo.getDashboardStats();
  },
  occupancy() {
    return repo.getOccupancyReport();
  },
  revenue() {
    return repo.getRevenueByMonth();
  },
  financial() {
    return repo.getFinancialReport();
  },
  building() {
    return repo.getBuildingReport();
  },
  unit() {
    return repo.getUnitReport();
  },
  tenant() {
    return repo.getTenantReport();
  },
  maintenance() {
    return repo.getMaintenanceReport();
  },
  async exportExcel(res, type) {
    if (!EXPORT_TYPES.has(type)) {
      throw new AppError(`Invalid export type: ${type}`, 400, { code: 'INVALID_EXPORT_TYPE' });
    }
    const dataset = await repo.getExportDataset(type);
    await exportExcel(res, `${type}-report`, dataset.columns, dataset.rows);
  },
  async exportPdf(res, type) {
    if (!EXPORT_TYPES.has(type)) {
      throw new AppError(`Invalid export type: ${type}`, 400, { code: 'INVALID_EXPORT_TYPE' });
    }
    const dataset = await repo.getExportDataset(type);
    exportPdf(res, `${type}-report`, dataset.title, dataset.columns, dataset.rows);
  },
};

export default reportsService;

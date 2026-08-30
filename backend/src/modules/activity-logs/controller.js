import { activityLogsService } from './service.js';

export const activityLogsController = {
  list: async (req, res) => {
    const result = await activityLogsService.list(req.query);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  },
};

export default activityLogsController;

import { listActivityLogs } from './repository.js';

export const activityLogsService = {
  list(query) {
    return listActivityLogs(query);
  },
};

export default activityLogsService;

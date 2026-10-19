import api from './api.js';

export const adminApi = {
  listUsers: async () => {
    const { data } = await api.get('/users');
    return data.data;
  },
  createUser: async (payload) => {
    const { data } = await api.post('/users', payload);
    return data.data;
  },
  updateUser: async (id, payload) => {
    const { data } = await api.patch(`/users/${id}`, payload);
    return data.data;
  },
  setUserBuildings: async (id, buildingIds) => {
    const { data } = await api.put(`/users/${id}/buildings`, { buildingIds });
    return data.data;
  },
  deleteUser: async (id) => {
    const { data } = await api.delete(`/users/${id}`);
    return data.data;
  },
  listRoles: async () => {
    const { data } = await api.get('/roles');
    return data.data;
  },
  listPermissions: async () => {
    const { data } = await api.get('/roles/permissions');
    return data.data;
  },
  updateRolePermissions: async (roleId, permissionIds) => {
    const { data } = await api.put(`/roles/${roleId}/permissions`, { permissionIds });
    return data.data;
  },
};

export default adminApi;

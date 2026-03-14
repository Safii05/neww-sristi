import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

export const login = (credentials: any) => api.post('/login', credentials);
export const logout = () => api.post('/logout');

// User Panel
export const getAttendance = (userId: number) => api.get(`/attendance?userId=${userId}`);
export const getModules = () => api.get('/modules');
export const submitQuiz = (data: any) => api.post('/modules/submit', data);
export const detectCrop = (formData: FormData) => api.post('/analyze-crop', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getSettings = (userId: number) => api.get(`/settings?userId=${userId}`);
export const updateSettings = (data: any) => api.post('/settings', data);

// Admin Panel
export const getDashboardStats = () => api.get('/dashboard');
export const getTrainees = () => api.get('/trainees');
export const addTrainee = (data: any) => api.post('/trainees', data);
export const getTasks = () => api.get('/tasks');
export const addTask = (data: any) => api.post('/tasks', data);
export const updateTask = (id: number, data: any) => api.put(`/tasks/${id}`, data);
export const getCrops = () => api.get('/crops');
export const addCrop = (data: any) => api.post('/crops', data);
export const getAttendanceProduction = () => api.get('/attendance-production');
export const getInventory = () => api.get('/inventory');
export const addInventory = (data: any) => api.post('/inventory', data);
export const getReports = () => api.get('/reports');
export const deleteTrainee = (id: number) => api.delete(`/trainees/${id}`);
export const deleteTask = (id: number) => api.delete(`/tasks/${id}`);
export const deleteCrop = (id: number) => api.delete(`/crops/${id}`);

// Attendance QR & Analytics
export const generateAttendanceSession = () => api.post('/attendance/session');
export const scanAttendance = (data: { userId: number, token: string }) => api.post('/attendance/scan', data);
export const getAttendanceAnalytics = () => api.get('/attendance/analytics');

export default api;

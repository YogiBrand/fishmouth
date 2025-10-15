import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const instance = axios.create({ baseURL, timeout: 30000 });

instance.interceptors.response.use(
  (r)=>r.data,
  (e)=>Promise.reject(e)
);
export default instance;

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Plain client for the guest QR flow — no auth header, no 401 redirect.
export const publicApi = axios.create({ baseURL: API_URL });

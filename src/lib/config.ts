export const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api'
export const API_HOST = API_BASE.replace(/\/api$/, '')

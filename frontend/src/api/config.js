import axios from 'axios';

// import.meta.env.PROD es una variable mágica de Vite. 
// Es 'true' cuando se sube a Vercel/producción y 'false' cuando usas localhost.
export const URL_BACKEND = import.meta.env.PROD 
    ? 'https://api-restaurante-yawj.onrender.com' 
    : 'http://localhost:3000'; 

export const apiClient = axios.create({
    baseURL: URL_BACKEND
});
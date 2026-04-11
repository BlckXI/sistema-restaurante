import axios from 'axios';

// Usaremos localhost para probar nuestro nuevo servidor local
export const URL_BACKEND = 'http://localhost:3000'; 

export const apiClient = axios.create({
    baseURL: URL_BACKEND
});
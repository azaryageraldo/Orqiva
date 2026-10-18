import api from './api';
import axios from 'axios';

const csrfApi = axios.create({
    withCredentials: true,
    withXSRFToken: true,
});

export async function login(email: string, password: string) {
    await csrfApi.get('/sanctum/csrf-cookie', {
        baseURL: '',
    });

    const response = await api.post('/login', { email, password });
    return response.data;
}

export async function getCurrentUser() {
    const response = await api.get('/me');
    return response.data.user;
}

export async function logout() {
    const response = await api.post('/logout');
    return response.data;
}

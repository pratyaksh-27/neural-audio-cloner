import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const uploadVoice = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload-voice', formData);
  return response.data;
};

export const confirmVoice = async (voiceName: string, tempPath: string, refText: string) => {
  const formData = new FormData();
  formData.append('voice_name', voiceName);
  formData.append('temp_path', tempPath);
  formData.append('ref_text', refText);
  const response = await api.post('/confirm-voice', formData);
  return response.data;
};

export const listVoices = async () => {
  const response = await api.get('/voices');
  return response.data.voices;
};

export const deleteVoice = async (voiceName: string) => {
  const response = await api.delete(`/delete-voice/${voiceName}`);
  return response.data;
};

export const generateAudio = async (voiceName: string, text: string, speed: number, nfeStep: number, style: string) => {
  const formData = new FormData();
  formData.append('voice_name', voiceName);
  formData.append('text', text);
  formData.append('speed', speed.toString());
  formData.append('nfe_step', nfeStep.toString());
  formData.append('style', style);
  const response = await api.post('/generate', formData, {
    responseType: 'blob',
  });
  return response.data;
};

export const getPreviewUrl = (path: string) => `${API_BASE_URL}/preview-audio?path=${encodeURIComponent(path)}`;

export const getStatus = async () => {
  const response = await api.get('/status');
  return response.data;
};

export const getVersion = async () => {
  const response = await api.get('/version');
  return response.data;
};

export default api;

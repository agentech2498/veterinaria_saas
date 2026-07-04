import { api } from './api';

export interface ProfessionalIdentityData {
  first_name: string;
  last_name: string;
  title: string;
  license_number: string;
  professional_registry: string;
  specialty: string;
  university: string;
  state: string;
  country: string;
  professional_email: string;
  professional_phone: string;
  website: string;
  social_media: string;
  signature_url: string;
  stamp_url: string;
  badge_url: string;
}

export const getProfessionalIdentity = async (): Promise<ProfessionalIdentityData> => {
  const response = await api.get('/admin/identity');
  return response.data;
};

export const updateProfessionalIdentity = async (data: Partial<ProfessionalIdentityData>) => {
  const response = await api.put('/admin/identity', data);
  return response.data;
};

export const uploadSignature = async (base64Image: string) => {
  const response = await api.post('/admin/identity/signature', { image: base64Image });
  return response.data; // { status: "success", url: "..." }
};

export const uploadStamp = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/admin/identity/stamp', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const uploadBadge = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/admin/identity/badge', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

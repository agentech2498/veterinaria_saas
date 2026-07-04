import { api } from './api';

export interface UpdatePatientData {
  name: string;
  species: string;
  breed?: string;
  birth_date?: string | null;
  sex?: string;
  weight?: number | null;
  height?: number | null;
}

export interface ClinicalRecordData {
  patient_id: number;
  description: string;
}

export interface VaccinationData {
  patient_id: number;
  vaccine_name: string;
  next_dose_date?: string | null;
  batch_number?: string;
  is_signed?: boolean;
}

export const updatePatient = async (patientId: number, data: UpdatePatientData) => {
  const response = await api.post(`/admin/update_patient/${patientId}`, data);
  return response.data;
};

export const getPatientData = async (patientId: number) => {
  const response = await api.get(`/admin/patient_data/${patientId}`);
  return response.data;
};

export const addClinicalRecord = async (data: ClinicalRecordData) => {
  const response = await api.post('/admin/add_clinical_record', data);
  return response.data;
};

export const addVaccination = async (data: VaccinationData) => {
  const response = await api.post('/admin/add_vaccination', data);
  return response.data;
};

export interface User {
  id: number;
  username: string;
  full_name?: string;
  role: string;
}

export interface Organization {
  id: number;
  name: string;
  slug?: string;
  evolution_instance?: string;
  is_active: boolean;
  color_principal?: string;
  color_secundario?: string;
  sello_png_url?: string;
}

export interface Patient {
  id: number;
  name: string;
  species: string;
  breed?: string;
  birth_date?: string;
  sex?: string;
  weight?: number;
  height?: number;
  org_id: number;
}

export interface PatientOwner {
  id: number;
  name?: string;
  phone_number: string;
}

export interface Appointment {
  id: number;
  pet_name: string;
  owner_name?: string;
  owner_phone?: string;
  reason?: string;
  date: string;
  status: string;
}

export interface MedicalAttention {
  id: number;
  patient_id: number;
  status: string;
  notes?: string;
}

export interface Service {
  id: number;
  name: string;
  price: number;
  category: string;
  description?: string;
}

export interface Ticket {
  id: number;
  number: string;
  date: string;
  patient: string;
  total: number;
  status: string;
}

export interface TicketItem {
  description: string;
  price: number;
  quantity: number;
}

export interface Config {
  color_principal?: string;
  color_secundario?: string;
}

// API Responses
export interface AdminDashboardResponse {
  user: User;
  org: Organization;
  total_appointments: number;
  patients_count: number;
  recent_appointments: { appointment: Appointment; owner: PatientOwner }[];
}

export interface PatientsResponse {
  user: User;
  org: Organization;
  patients: { patient: Patient; owner: PatientOwner }[];
}

export interface ServicesResponse {
  user: User;
  org: Organization;
  services: Service[];
}

export interface AppointmentsResponse {
  user: User;
  org: Organization;
  appointments: { appointment: Appointment; owner: PatientOwner }[];
}

export interface SuperadminResponse {
  organizations: Organization[];
}

export interface CashierResponse {
  total_revenue?: number;
  ticket_count?: number;
  user: User;
  org: Organization;
}

export interface PatientDataResponse {
  patient: Patient;
  records: unknown[];
  vaccinations: unknown[];
}

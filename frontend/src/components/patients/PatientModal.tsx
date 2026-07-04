import type { Patient, PatientOwner } from '../../types/models';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal';
import { ClipboardList, History, Syringe, Globe } from 'lucide-react';
import { updatePatient, getPatientData } from '../../api/patientService';
import { downloadDocument, getDocumentPreviewUrl } from '../../api/documentService';
import { EvolutionModal } from './EvolutionModal';
import { VaccineModal } from './VaccineModal';
import { GeneralTab } from './GeneralTab';
import { HistoryTab } from './HistoryTab';
import { VaccinesTab } from './VaccinesTab';
import { PassportTab } from './PassportTab';

const patientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  species: z.string().min(1, 'La especie es requerida'),
  breed: z.string().optional(),
  birth_date: z.string().optional().nullable(),
  sex: z.string().optional(),
  weight: z.coerce.number().optional().nullable(),
  height: z.coerce.number().optional().nullable(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientData: { patient: Patient; owner: PatientOwner } | null;
  onSuccess?: () => void;
}

export const PatientModal = ({ isOpen, onClose, patientData, onSuccess }: PatientModalProps) => {
  const [activeTab, setActiveTab] = useState<'general' | 'historia' | 'vacunas' | 'pasaporte'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Detalle adicional
  const [records, setRecords] = useState<any[]>([]);
  const [vaccines, setVaccines] = useState<any[]>([]);

  // Submodales
  const [isEvolutionModalOpen, setEvolutionModalOpen] = useState(false);
  const [isVaccineModalOpen, setVaccineModalOpen] = useState(false);

  // Document states
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [passportPreviewUrl, setPassportPreviewUrl] = useState<string | null>(null);
  const [isLoadingPassport, setIsLoadingPassport] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<PatientFormValues, any, PatientFormValues>({
    resolver: zodResolver(patientSchema) as any,
    defaultValues: {
      name: '',
      species: '',
      breed: '',
      birth_date: '',
      sex: 'No especificado',
      weight: undefined,
      height: undefined,
    }
  });

  const loadExtraData = useCallback(async () => {
    if (!patientData?.patient?.id) return;
    try {
      setIsLoadingDetails(true);
      const res = await getPatientData(patientData.patient.id);
      setRecords(res.records || []);
      setVaccines(res.vaccinations || []);
    } catch (error) {
      console.error("Error al obtener detalle del paciente", error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [patientData?.patient?.id]);

  useEffect(() => {
    if (patientData?.patient && isOpen) {
      reset({
        name: patientData.patient.name || '',
        species: patientData.patient.species || '',
        breed: patientData.patient.breed || '',
        birth_date: patientData.patient.birth_date || '',
        sex: patientData.patient.sex || 'No especificado',
        weight: patientData.patient.weight || undefined,
        height: patientData.patient.height || undefined,
      });
      loadExtraData();
    }

    // Cleanup preview URL on close
    if (!isOpen && passportPreviewUrl) {
      window.URL.revokeObjectURL(passportPreviewUrl);
      setPassportPreviewUrl(null);
    }
  }, [patientData, reset, isOpen, passportPreviewUrl, loadExtraData]);

  useEffect(() => {
    // Load passport preview automatically when switching to the passport tab
    if (activeTab === 'pasaporte' && !passportPreviewUrl && patientData?.patient?.id) {
      const loadPreview = async () => {
        try {
          setIsLoadingPassport(true);
          const url = await getDocumentPreviewUrl('passport', patientData.patient.id);
          setPassportPreviewUrl(url);
        } catch (error) {
          console.error("Error loading passport preview", error);
        } finally {
          setIsLoadingPassport(false);
        }
      };
      loadPreview();
    }
  }, [activeTab, patientData, passportPreviewUrl]);

  if (!patientData) return null;
  const { patient } = patientData;

  const onSubmit = async (data: PatientFormValues) => {
    try {
      setIsSubmitting(true);
      await updatePatient(patient.id, data);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al actualizar paciente", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (type: 'history' | 'vaccines' | 'passport') => {
    try {
      setIsDownloading(type);
      await downloadDocument(type, patient.id);
    } catch (error) {
      console.error(`Error downloading ${type}`, error);
    } finally {
      setIsDownloading(null);
    }
  };

  const tabClass = (tab: string) =>
    `flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap ${
      activeTab === tab
        ? 'bg-[#f0fdfa] dark:bg-[rgba(20,184,166,0.1)] text-[#0d9488] dark:text-[#2dd4bf]'
        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
    }`;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Detalle: ${patient?.name || ''}`}
        maxWidth="max-w-[800px]"
      >
        {/* Tab navigation */}
        <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
          <button onClick={() => setActiveTab('general')} className={tabClass('general')}>
            <ClipboardList size={16} /> Datos
          </button>
          <button onClick={() => setActiveTab('historia')} className={tabClass('historia')}>
            <History size={16} /> Historia
          </button>
          <button onClick={() => setActiveTab('vacunas')} className={tabClass('vacunas')}>
            <Syringe size={16} /> Vacunas
          </button>
          <button onClick={() => setActiveTab('pasaporte')} className={tabClass('pasaporte')}>
            <Globe size={16} /> Pasaporte Digital
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'general' && (
          <form onSubmit={handleSubmit(onSubmit)} className="animate-in fade-in duration-300">
            <GeneralTab register={register} errors={errors} isSubmitting={isSubmitting} onClose={onClose} />
          </form>
        )}

        {activeTab === 'historia' && (
          <HistoryTab
            isLoadingDetails={isLoadingDetails}
            records={records}
            isDownloading={isDownloading}
            onNewEvolution={() => setEvolutionModalOpen(true)}
            onDownload={() => handleDownload('history')}
          />
        )}

        {activeTab === 'vacunas' && (
          <VaccinesTab
            isLoadingDetails={isLoadingDetails}
            vaccines={vaccines}
            isDownloading={isDownloading}
            onNewVaccine={() => setVaccineModalOpen(true)}
            onDownload={() => handleDownload('vaccines')}
          />
        )}

        {activeTab === 'pasaporte' && (
          <PassportTab
            isLoadingPassport={isLoadingPassport}
            passportPreviewUrl={passportPreviewUrl}
            isDownloading={isDownloading}
            onDownload={() => handleDownload('passport')}
          />
        )}
      </Modal>

      {/* Sub Modales */}
      {isEvolutionModalOpen && (
        <EvolutionModal
          isOpen={isEvolutionModalOpen}
          onClose={() => setEvolutionModalOpen(false)}
          patientId={patient.id}
          onSuccess={loadExtraData}
        />
      )}

      {isVaccineModalOpen && (
        <VaccineModal
          isOpen={isVaccineModalOpen}
          onClose={() => setVaccineModalOpen(false)}
          patientId={patient.id}
          onSuccess={loadExtraData}
        />
      )}
    </>
  );
};

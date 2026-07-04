import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { addVaccination } from '../../api/patientService';

const vaccineSchema = z.object({
  vaccine_name: z.string().min(1, 'El nombre de la vacuna es obligatorio'),
  next_dose_date: z.string().optional().nullable(),
  batch_number: z.string().optional(),
});

type VaccineFormValues = z.infer<typeof vaccineSchema>;

interface VaccineModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number;
  onSuccess: () => void;
}

export const VaccineModal = ({ isOpen, onClose, patientId, onSuccess }: VaccineModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<VaccineFormValues>({
    resolver: zodResolver(vaccineSchema),
    defaultValues: {
      vaccine_name: '',
      next_dose_date: '',
      batch_number: '',
    }
  });

  const onSubmit = async (data: VaccineFormValues) => {
    try {
      setIsSubmitting(true);
      await addVaccination({
        patient_id: patientId,
        vaccine_name: data.vaccine_name,
        next_dose_date: data.next_dose_date || null,
        batch_number: data.batch_number,
      });
      reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error agregando vacuna:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Dosis de Vacuna" maxWidth="max-w-[500px]">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        <Input 
          label="Vacuna" 
          placeholder="Ej: Antirrábica, Séxtuple..."
          error={errors.vaccine_name?.message} 
          {...register('vaccine_name')} 
        />

        <Input 
          label="Lote / Etiqueta" 
          placeholder="Ej: L-481923"
          error={errors.batch_number?.message} 
          {...register('batch_number')} 
        />

        <Input 
          label="Próxima Dosis (Revacunación)" 
          type="date" 
          error={errors.next_dose_date?.message} 
          {...register('next_dose_date')} 
        />
        
        <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            Guardar Dosis
          </Button>
        </div>
      </form>
    </Modal>
  );
};

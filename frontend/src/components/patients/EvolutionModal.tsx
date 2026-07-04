import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { addClinicalRecord } from '../../api/patientService';

const evolutionSchema = z.object({
  description: z.string().min(1, 'La descripción es obligatoria'),
});

type EvolutionFormValues = z.infer<typeof evolutionSchema>;

interface EvolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number;
  onSuccess: () => void;
}

export const EvolutionModal = ({ isOpen, onClose, patientId, onSuccess }: EvolutionModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<EvolutionFormValues>({
    resolver: zodResolver(evolutionSchema),
    defaultValues: {
      description: '',
    }
  });

  const onSubmit = async (data: EvolutionFormValues) => {
    try {
      setIsSubmitting(true);
      await addClinicalRecord({
        patient_id: patientId,
        description: data.description,
      });
      reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error agregando evolución:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Evolución Médica" maxWidth="max-w-[500px]">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Descripción
          </label>
          <textarea
            {...register('description')}
            className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14b8a6]/50 focus:border-[#14b8a6] min-h-[120px] resize-y ${errors.description ? 'border-red-500 focus:ring-red-500/50' : ''}`}
            placeholder="Detalle la evolución del paciente..."
          ></textarea>
          {errors.description && <span className="text-xs text-red-500 font-medium">{errors.description.message}</span>}
        </div>
        
        <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

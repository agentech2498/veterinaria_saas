import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface GeneralTabProps {
  register: UseFormRegister<{
    name: string;
    species: string;
    breed?: string;
    birth_date?: string | null;
    sex?: string;
    weight?: number | null;
    height?: number | null;
  }>;
  errors: FieldErrors<{
    name: string;
    species: string;
    breed?: string;
    birth_date?: string | null;
    sex?: string;
    weight?: number | null;
    height?: number | null;
  }>;
  isSubmitting: boolean;
  onClose: () => void;
}

export const GeneralTab = ({ register, errors, isSubmitting, onClose }: GeneralTabProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div className="col-span-1 md:col-span-2">
      <Input label="Nombre del Paciente" error={errors.name?.message} {...register('name')} />
    </div>
    <div><Input label="Especie" error={errors.species?.message} {...register('species')} /></div>
    <div><Input label="Raza" error={errors.breed?.message} {...register('breed')} /></div>
    <div><Input label="Fecha de Nacimiento" type="date" error={errors.birth_date?.message} {...register('birth_date')} /></div>
    <div>
      <Select
        label="Sexo"
        error={errors.sex?.message}
        {...register('sex')}
        options={[
          { value: 'Macho', label: 'Macho' },
          { value: 'Hembra', label: 'Hembra' },
          { value: 'No especificado', label: 'No especificado' },
        ]}
      />
    </div>
    <div><Input label="Peso (kg)" type="number" step="0.1" error={errors.weight?.message} {...register('weight')} /></div>
    <div><Input label="Altura (cm)" type="number" step="0.1" error={errors.height?.message} {...register('height')} /></div>
    <div className="col-span-1 md:col-span-2 flex gap-4 mt-3 pt-6 border-t border-slate-200 dark:border-slate-800">
      <Button type="submit" isLoading={isSubmitting} className="flex-1">Guardar Cambios</Button>
      <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
    </div>
  </div>
);

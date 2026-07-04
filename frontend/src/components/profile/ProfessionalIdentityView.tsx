import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
// import { Select } from '../ui/Select';
import { Upload, PenTool, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { UploadModal } from './UploadModal';
import type { ProfessionalIdentityData } from '../../api/identityService';
import { 
  getProfessionalIdentity, 
  updateProfessionalIdentity 
} from '../../api/identityService';

export const ProfessionalIdentityView = () => {
  const [identity, setIdentity] = useState<ProfessionalIdentityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Signature States
  const [showCanvas, setShowCanvas] = useState(false);
  const [uploadType, setUploadType] = useState<'firma' | 'sello' | 'badge' | null>(null);

  const { register, handleSubmit, reset } = useForm<ProfessionalIdentityData>({
    defaultValues: {}
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProfessionalIdentity();
      setIdentity(data);
      reset(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onSubmit = async (data: ProfessionalIdentityData) => {
    try {
      setSaving(true);
      await updateProfessionalIdentity(data);
      alert("Datos guardados exitosamente");
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Error al guardar los datos");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Cargando identidad profesional...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="text-blue-500" size={20} />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white m-0">Datos Profesionales</h3>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input label="Nombre" {...register('first_name')} placeholder="Ej: Juan" />
            <Input label="Apellido" {...register('last_name')} placeholder="Ej: Pérez" />
            <Input label="Título" {...register('title')} placeholder="Ej: Médico Veterinario" />
            <Input label="Matrícula" {...register('license_number')} placeholder="Ej: MP 1234" />
            <Input label="Registro Profesional (opcional)" {...register('professional_registry')} />
            <Input label="Especialidad (opcional)" {...register('specialty')} placeholder="Ej: Cirugía Menor" />
            <Input label="Universidad (opcional)" {...register('university')} />
            <Input label="País" {...register('country')} />
            <Input label="Provincia/Estado" {...register('state')} />
            <Input label="Email Profesional" type="email" {...register('professional_email')} />
            <Input label="Teléfono Profesional" {...register('professional_phone')} />
            <Input label="Sitio Web (opcional)" {...register('website')} />
          </div>
          <div className="pt-2">
            <Button type="submit" isLoading={saving}>Guardar Datos Personales</Button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="mb-6 flex items-center gap-2">
          <ImageIcon className="text-emerald-500" size={20} />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white m-0">Identidad Visual y Sellos</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* FIRMA */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
            <h4 className="text-md font-bold text-slate-900 dark:text-white mb-1">Firma Digital</h4>
            <p className="text-slate-500 text-xs mb-4">La firma que aparecerá en sus recetas y certificados.</p>
            
            {!showCanvas ? (
              <>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-4 text-center h-[140px] flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
                  {identity?.signature_url ? (
                    <img src={identity.signature_url} alt="Firma" className="max-h-[110px] max-w-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                  ) : (
                    <span className="text-slate-400 text-sm font-medium">Sin firma</span>
                  )}
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <Button variant="secondary" size="sm" icon={Upload} className="w-full" onClick={() => setUploadType('firma')}>
                    Subir Imagen
                  </Button>
                  <Button variant="outline" size="sm" icon={PenTool} className="w-full" onClick={() => setShowCanvas(true)}>
                    Dibujar Ahora
                  </Button>
                </div>
              </>
            ) : (
              <SignaturePad 
                onCancel={() => setShowCanvas(false)} 
                onSaved={() => {
                  setShowCanvas(false);
                  loadData();
                }} 
              />
            )}
          </div>

          {/* SELLO */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
            <h4 className="text-md font-bold text-slate-900 dark:text-white mb-1">Sello Profesional</h4>
            <p className="text-slate-500 text-xs mb-4">Sello con su matrícula y nombre para documentos.</p>
            
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-4 text-center h-[140px] flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
              {identity?.stamp_url ? (
                <img src={identity.stamp_url} alt="Sello" className="max-h-[110px] max-w-full object-contain" />
              ) : (
                <span className="text-slate-400 text-sm font-medium">Sin sello</span>
              )}
            </div>
            <div className="mt-auto pt-2">
              <Button variant="secondary" size="sm" icon={Upload} className="w-full" onClick={() => setUploadType('sello')}>
                Subir Sello
              </Button>
            </div>
          </div>

          {/* INSIGNIA */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
            <h4 className="text-md font-bold text-slate-900 dark:text-white mb-1">Insignia / Logo</h4>
            <p className="text-slate-500 text-xs mb-4">Aparecerá en el encabezado de sus certificados.</p>
            
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-4 text-center h-[140px] flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
              {identity?.badge_url ? (
                <img src={identity.badge_url} alt="Insignia" className="max-h-[110px] max-w-full object-contain" />
              ) : (
                <span className="text-slate-400 text-sm font-medium">Sin insignia</span>
              )}
            </div>
            <div className="mt-auto pt-2">
              <Button variant="secondary" size="sm" icon={Upload} className="w-full" onClick={() => setUploadType('badge')}>
                Subir Insignia
              </Button>
            </div>
          </div>

        </div>

        {/* VISTA PREVIA */}
        <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
          <h4 className="text-md font-bold text-slate-900 dark:text-white mb-4">Vista Previa de Certificado</h4>
          <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-8 max-w-2xl mx-auto border border-slate-300 dark:border-slate-700">
            <div className="flex justify-between items-start mb-12">
              {identity?.badge_url ? (
                <img src={identity.badge_url} alt="Logo" className="h-16 object-contain" />
              ) : (
                <div className="h-16 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              )}
              <div className="text-right">
                <h3 className="font-serif text-xl font-bold text-slate-800 dark:text-slate-100 uppercase">
                  CERTIFICADO OFICIAL
                </h3>
              </div>
            </div>
            
            <div className="h-32"></div> {/* Content placeholder */}
            
            <div className="flex justify-end mt-12 pt-8 pr-12">
              <div className="text-center w-72">
                <div className="relative h-20 flex justify-center items-end border-b border-slate-400 dark:border-slate-500 mb-2">
                  {identity?.stamp_url && (
                    <img src={identity.stamp_url} className="absolute left-1/2 -translate-x-1/2 bottom-0 h-20 opacity-80 object-contain z-0" alt="Sello" />
                  )}
                  {identity?.signature_url && (
                    <img src={identity.signature_url} className="absolute left-1/2 -translate-x-1/2 bottom-0 h-24 object-contain mix-blend-multiply dark:mix-blend-normal z-10" alt="Firma" />
                  )}
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {identity?.title} {identity?.first_name} {identity?.last_name}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Matrícula: {identity?.license_number || '______________'}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {uploadType && (
        <UploadModal 
          isOpen={true} 
          onClose={() => {
            setUploadType(null);
            loadData();
          }} 
          type={uploadType as any} 
        />
      )}
    </div>
  );
};

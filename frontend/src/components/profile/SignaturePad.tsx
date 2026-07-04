import React, { useRef, useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Eraser, Save } from 'lucide-react';
import { uploadSignature } from '../../api/identityService';

interface SignaturePadProps {
  onSaved: (url: string) => void;
  onCancel: () => void;
}

export const SignaturePad = ({ onSaved, onCancel }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Setup canvas context
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'black';
      }
      
      // Fix resolution for high DPI displays
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.closePath();
      }
      setIsDrawing(false);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const isCanvasBlank = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d');
    if (!context) return true;
    const pixelBuffer = new Uint32Array(
      context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    return !pixelBuffer.some(color => color !== 0);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isCanvasBlank(canvas)) {
      alert("Por favor, dibuje su firma antes de guardar.");
      return;
    }
    
    // Get transparent PNG base64
    const base64Img = canvas.toDataURL('image/png');
    
    try {
      setIsSaving(true);
      const res = await uploadSignature(base64Img);
      onSaved(res.url);
    } catch (error) {
      console.error("Error guardando la firma", error);
      alert("Ocurrió un error al guardar la firma.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-sm">
      <div className="mb-4">
        <h4 className="font-bold text-slate-800 dark:text-white">Dibujar Firma</h4>
        <p className="text-xs text-slate-500">Utilice su mouse o pantalla táctil para dibujar su firma profesional.</p>
      </div>

      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800 overflow-hidden relative touch-none h-[200px]">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <div className="flex flex-wrap gap-2 justify-between mt-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={Eraser} onClick={clear} disabled={isSaving}>
            Limpiar
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button size="sm" icon={Save} onClick={save} isLoading={isSaving}>
            Guardar Firma
          </Button>
        </div>
      </div>
    </div>
  );
};

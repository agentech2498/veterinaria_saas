import React, { useState } from 'react';
import { api } from '../../api/api';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Banknote, Plus, Trash2 } from 'lucide-react';

interface TicketItem {
  description: string;
  price: number;
}

interface TicketModalProps {
  isOpen: boolean;
  appointmentId: number | null;
  onClose: () => void;
  /** Called after the ticket is successfully created */
  onSuccess: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  appointmentId,
  onClose,
  onSuccess,
}) => {
  const [items, setItems] = useState<TicketItem[]>([{ description: '', price: 0 }]);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClose = () => {
    setItems([{ description: '', price: 0 }]);
    setPaymentMethod('Efectivo');
    setNotes('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentId) return;

    const validItems = items.filter(i => i.description.trim() !== '' && i.price > 0);
    if (validItems.length === 0) {
      alert('Debe agregar al menos un servicio con precio mayor a 0');
      return;
    }

    try {
      setIsProcessing(true);
      await api.post(`/attentions/finish_appointment/${appointmentId}`, {
        items: validItems.map(i => ({ description: i.description, price: i.price, quantity: 1 })),
        payment_method: paymentMethod,
        notes,
      });
      handleClose();
      onSuccess();
    } catch (err) {
      console.error('Error generating ticket', err);
      alert('Error al generar el ticket. Intente nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const addItem = () => setItems(prev => [...prev, { description: '', price: 0 }]);

  const removeItem = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof TicketItem, value: string | number) =>
    setItems(prev => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));

  const total = items.reduce((sum, i) => sum + (i.price || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generar Ticket de Atención"
      maxWidth="max-w-[560px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Servicios / Productos
            </span>
            <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={addItem}>
              Agregar
            </Button>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  placeholder="Descripción del servicio"
                  value={item.description}
                  onChange={e => updateItem(idx, 'description', e.target.value)}
                  required
                />
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  placeholder="Precio"
                  value={item.price || ''}
                  onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={() => removeItem(idx)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total</span>
          <span className="text-lg font-bold text-[#14b8a6]">
            ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <Select
          label="Método de Pago"
          value={paymentMethod}
          onChange={e => setPaymentMethod(e.target.value)}
          options={[
            { value: 'Efectivo', label: 'Efectivo' },
            { value: 'Transferencia', label: 'Transferencia Bancaria' },
            { value: 'Tarjeta de Débito', label: 'Tarjeta de Débito' },
            { value: 'Tarjeta de Crédito', label: 'Tarjeta de Crédito' },
            { value: 'Mercado Pago', label: 'Mercado Pago' },
          ]}
        />

        <Textarea
          label="Notas adicionales (opcional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Observaciones sobre la consulta..."
          rows={2}
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={Banknote}
            disabled={isProcessing}
          >
            {isProcessing ? 'Generando...' : 'Generar Ticket'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

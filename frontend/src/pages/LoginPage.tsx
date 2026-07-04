import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { useAuthStore } from '../store/authStore';
import { Stethoscope, Loader2, LogIn, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await api.post('/login', { username, password });
      const { access_token, role, org_id } = response.data;
      
      setAuth(access_token, role, org_id);
      
      if (role === 'superadmin') {
        navigate('/superadmin');
      } else {
        navigate('/admin');
      }
    } catch (err: Error | unknown) {
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#14b8a6]/10 rounded-2xl flex items-center justify-center mb-5 rotate-3 hover:rotate-6 transition-transform">
            <Stethoscope className="w-8 h-8 text-[#14b8a6]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Iniciar Sesión</h2>
          <p className="text-slate-500 text-sm mt-1.5 font-medium">DogBot SaaS - Panel de Control</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-center gap-2 animate-in shake">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <Input 
            label="Usuario"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ej: admin_vet"
          />
          
          <Input 
            label="Contraseña"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#14b8a6] hover:bg-[#0f9284] text-white rounded-xl shadow-lg shadow-[#14b8a6]/20 transition-all border-0"
              size="lg"
              icon={loading ? Loader2 : LogIn}
            >
              {loading ? 'Autenticando...' : 'Entrar al Panel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

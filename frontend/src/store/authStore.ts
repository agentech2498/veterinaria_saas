import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  role: 'admin' | 'superadmin' | null;
  orgId: number | null;
  setAuth: (token: string, role: string, orgId?: number | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      orgId: null,

      setAuth: (token, role, orgId = null) => {
        set({ token, role: role as 'admin' | 'superadmin', orgId });
      },

      logout: () => {
        set({ token: null, role: null, orgId: null });
      },
    }),
    {
      name: 'auth-storage',       // localStorage key (single entry as JSON)
      storage: createJSONStorage(() => localStorage),
      // Only persist the data fields, not the action functions
      partialize: (state) => ({
        token: state.token,
        role: state.role,
        orgId: state.orgId,
      }),
    }
  )
);


import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:  null,
      token: null,

      login: (user, token) => set({ user, token }),

      logout: () => {
        set({ user: null, token: null });
        window.location.href = '/login';
      },

      isAuthenticated: () => !!get().token,

      hasRol: (...roles) => roles.includes(get().user?.rol),
    }),
    {
      name:    'condo-auth',
      partialize: (state) => ({ user: state.user, token: state.token })
    }
  )
);

export default useAuthStore;

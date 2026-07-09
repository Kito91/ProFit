import React, { createContext, useContext, useEffect } from 'react';

interface AdminThemeContextType {
  themeMode: 'dark';
  setThemeMode: (mode: 'dark') => void;
}

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

export const AdminThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const body = window.document.body;
    const root = window.document.documentElement;

    body.classList.add('admin-mode', 'dark');
    root.classList.add('dark');

    return () => {
      body.classList.remove('admin-mode', 'dark');
      root.classList.remove('dark');
    };
  }, []);

  return (
    <AdminThemeContext.Provider value={{ themeMode: 'dark', setThemeMode: () => {} }}>
      <div className="admin-theme-root h-full">
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
};

export const useAdminTheme = () => {
  const context = useContext(AdminThemeContext);
  if (context === undefined) {
    throw new Error('useAdminTheme must be used within an AdminThemeProvider');
  }
  return context;
};

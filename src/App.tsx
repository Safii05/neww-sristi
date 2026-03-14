import { useState } from 'react';
import { TranslationProvider, useTranslation } from './hooks/useTranslation';
import LanguageSelection from './pages/LanguageSelection';
import RoleSelection from './pages/RoleSelection';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';

import { login } from './services/api';

type AppStep = 'LANGUAGE' | 'ROLE' | 'USER_PANEL' | 'ADMIN_PANEL';

const AppContent = () => {
  const [step, setStep] = useState<AppStep>('LANGUAGE');
  const { setLanguage } = useTranslation();

  const handleLanguageSelect = (lang: 'en' | 'ta' | 'hi') => {
    setLanguage(lang);
    setStep('ROLE');
  };

  const handleRoleSelect = async (role: 'admin' | 'user') => {
    try {
      // Demo credentials for the selected role
      const credentials = {
        username: role,
        password: role === 'admin' ? 'admin123' : 'user123'
      };
      const res = await login(credentials);
      if (res.data.success) {
        setStep(role === 'admin' ? 'ADMIN_PANEL' : 'USER_PANEL');
      }
    } catch (err) {
      console.error("Backend login failed, using demo fallback", err);
      // Fallback for visual demo if backend is not running
      setStep(role === 'admin' ? 'ADMIN_PANEL' : 'USER_PANEL');
    }
  };

  const handleLogout = () => {
    setStep('ROLE');
  };

  switch (step) {
    case 'LANGUAGE':
      return <LanguageSelection onSelect={handleLanguageSelect} />;
    case 'ROLE':
      return <RoleSelection onSelect={handleRoleSelect} />;
    case 'USER_PANEL':
      return <UserDashboard onLogout={handleLogout} />;
    case 'ADMIN_PANEL':
      return <AdminDashboard onLogout={handleLogout} />;
    default:
      return <LanguageSelection onSelect={handleLanguageSelect} />;
  }
};

import VoiceAssistant from './components/VoiceAssistant';

function App() {
  return (
    <TranslationProvider>
      <AppContent />
      <VoiceAssistant />
    </TranslationProvider>
  );
}

export default App;

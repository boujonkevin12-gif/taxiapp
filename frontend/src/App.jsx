import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import PassengerApp from './pages/PassengerApp';
import DriverApp from './pages/DriverApp';
import AdminPanel from './pages/AdminPanel';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('login');

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (view === 'register') {
      return <Register onSwitch={() => setView('login')} />;
    }
    return <Login onSwitch={() => setView('register')} />;
  }

  if (user.role === 'admin') {
    return <AdminPanel />;
  }

  if (user.role === 'driver') {
    return <DriverApp />;
  }

  return <PassengerApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}

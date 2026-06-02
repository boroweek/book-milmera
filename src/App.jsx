import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import BookingPage from './pages/BookingPage';
import MyBookingsPage from './pages/MyBookingsPage';
import DisplayQueuePage from './pages/DisplayQueuePage';
import Navbar from './components/Navbar';
import { useState, useEffect } from 'react';

const PAGES = ['booking', 'my-bookings'];

const getPageFromUrl = () => {
  const path = window.location.pathname.replace('/', '');
  return PAGES.includes(path) ? path : 'booking';
};

const AppContent = () => {
  const { medic, displayUser, authLoading } = useAuth();
  const [page, setPage] = useState(getPageFromUrl);

  useEffect(() => {
    const onPop = () => setPage(getPageFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (p) => {
    const url = p === 'booking' ? '/' : `/${p}`;
    window.history.pushState({}, '', url);
    setPage(p);
  };

  if (authLoading) return (
    <div className="min-h-dvh flex items-center justify-center bg-snow">
      <div className="w-10 h-10 border-4 border-blue border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (displayUser) return <DisplayQueuePage />;

  if (!medic) return <LoginPage/>;

  return (
    <div className="min-h-dvh bg-snow text-midnight">
      <Navbar page={page} setPage={navigate}/>
      {page === 'booking'     && <BookingPage/>}
      {page === 'my-bookings' && <MyBookingsPage/>}
      <footer className="w-full pb-6 px-4">
        <p className="text-center text-[10px] font-semibold text-silver uppercase tracking-widest">
          Military Medical Records Application © 2026
        </p>
      </footer>
    </div>
  );
};

export default function App() {
  return <AuthProvider><AppContent/></AuthProvider>;
}

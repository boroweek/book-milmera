import { useEffect, useState } from 'react';
import { CalendarPlus, ClipboardList, LogOut, UserRound } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAuth } from '../context/AuthContext';
import { LogoGroup } from './LogoGroup';

export default function Navbar({ page, setPage }) {
  const { medic, logout } = useAuth();
  const [unitName, setUnitName] = useState('');

  useEffect(() => {
    if (!medic?.unitId) return;
    getDoc(doc(db, 'units', medic.unitId))
      .then(snap => { if (snap.exists()) setUnitName(snap.data().name); })
      .catch(() => {});
  }, [medic?.unitId]);

  const nav = [
    { id: 'booking',     label: 'Запис до лікаря', icon: CalendarPlus },
    { id: 'my-bookings', label: 'Мої заявки',      icon: ClipboardList },
  ];

  return (
    <nav>
      <div className="max-w-[900px] mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-20">

          {/* Logo */}
          <LogoGroup size={20} />

          {/* Nav links */}
          <div className="flex items-center gap-2">
            {nav.map(item => {
              const isActive = page === item.id;
              return (
                <button key={item.id} onClick={() => setPage(item.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm tracking-wide transition-all ${
                    isActive
                      ? 'bg-midnight text-snow'
                      : 'text-midnight bg-white hover:bg-midnight hover:text-snow'
                  }`}>
                  <item.icon size={16}/>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* User + logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex gap-2 items-center text-silver">
              <UserRound size={22}/>
              <div>
                <p className="text-xs font-semibold text-midnight leading-none">{medic?.callSign}</p>
                <p className="text-[10px] font-bold uppercase mt-0.5 tracking-wide text-silver">{unitName || '—'}</p>
              </div>
            </div>
            <button onClick={logout}
              className="p-3 bg-white text-midnight hover:bg-red hover:text-white rounded-full transition-all"
              title="Вийти">
              <LogOut size={16}/>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
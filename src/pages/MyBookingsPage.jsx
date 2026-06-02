import { useState, useEffect } from 'react';
import { db } from '../api/firebase';
import {
  collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { Stethoscope, CalendarDays, Loader2, X, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { APPOINTMENT_STATUS, SPECIALTY_INFO } from '../utils/constants';

const fmtDate = d => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y.slice(2)}`;
};

const toInitials = (fullName) => {
  if (!fullName) return '—';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0]} ${parts.slice(1).map(p => p[0] + '.').join('')}`;
};

const STATUS_MAP = {
  [APPOINTMENT_STATUS.IN_PROGRESS]: { label: 'Очікує',   color: 'text-blue' },
  [APPOINTMENT_STATUS.IN_APPOINTMENT]: { label: 'На прийомі', color: 'text-lime-700' },
  [APPOINTMENT_STATUS.COMPLETED]:   { label: 'Прийнято', color: 'text-green' },
  [APPOINTMENT_STATUS.CANCELLED]:   { label: 'Скасовано', color: 'text-red' },
};

const getSpecialtyLabel = (code) => {
  const found = Object.values(SPECIALTY_INFO).find(s => s.code === code);
  return found ? found.label : code;
};

// Returns ISO date string for N days ago
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

export default function MyBookingsPage() {
  const { medic, user } = useAuth();
  const isHead = medic?.head === true;
  const authUid = user?.uid;

  const [bookings,   setBookings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    if (!medic) return;
    setLoading(true);

    const weekAgo = daysAgo(7);
    const constraints = [where('date', '>=', weekAgo)];

    if (isHead && medic.unitId) {
      // Head sees all bookings made by medics of their unit
      constraints.push(where('bookingUnitId', '==', medic.unitId));
    } else {
      // Same uid as Firebase Auth (bookedBy.uid is set from user.uid on submit)
      if (!authUid) {
        setBookings([]);
        setLoading(false);
        return;
      }
      constraints.push(where('bookedBy.uid', '==', authUid));
    }

    const q = query(collection(db, 'appointments_queue'), ...constraints);
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
      setBookings(data);
      setLoading(false);
    }, (err) => { console.error('MyBookingsPage onSnapshot error:', err); setLoading(false); });
    return unsub;
  }, [medic, medic?.unitId, isHead, authUid]);

  const handleCancel = async (item) => {
    if (!window.confirm(`Скасувати запис: ${item.fullName}?`)) return;
    setCancelling(item.id);
    try {
      await updateDoc(doc(db, 'appointments_queue', item.id), {
        status:      APPOINTMENT_STATUS.CANCELLED,
        completedAt: serverTimestamp(),
      });
    } catch (err) { console.error(err); }
    finally { setCancelling(null); }
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-normal text-midnight tracking-wide leading-none">
            {isHead ? 'Заявки підрозділу' : 'Мої заявки'}
          </h1>
          <p className="text-xs font-medium text-silver tracking-widest mt-1">
            {loading ? 'Завантаження...' : `${bookings.length} записів за останні 7 днів`}
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-24 flex items-center justify-center bg-white rounded-2xl">
          <Loader2 size={22} className="text-silver animate-spin"/>
        </div>
      )}

      {/* Empty */}
      {!loading && bookings.length === 0 && (
        <div className="py-24 text-center bg-white rounded-2xl">
          <CalendarDays size={28} className="text-silver mx-auto mb-3"/>
          <p className="text-silver font-medium text-sm tracking-widests">Заявок немає</p>
          <p className="text-xs text-silver mt-1 font-medium">Тут відображаються записи за останні 7 днів</p>
        </div>
      )}

      {/* List */}
      {!loading && bookings.length > 0 && (
        <>
          <div className="hidden md:grid px-6 gap-2 grid-cols-12 mb-4">
            <div className="col-span-2 text-sm font-medium text-silver tracking-wide">Час · Дата</div>
            <div className={`${isHead ? 'col-span-3' : 'col-span-4'} text-sm font-medium text-silver tracking-wide`}>Пацієнт</div>
            <div className={`${isHead ? 'col-span-2' : 'col-span-4'} text-sm font-medium text-silver tracking-wide`}>Спеціаліст</div>
            {isHead && <div className="col-span-3 text-sm font-medium text-silver tracking-wide">Забронював</div>}
            <div className="col-span-2 text-sm font-medium text-silver tracking-wide text-right">Статус</div>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden">
            {bookings.map(b => {
              const st = STATUS_MAP[b.status] || STATUS_MAP[APPOINTMENT_STATUS.IN_PROGRESS];
              const canCancel = b.status === APPOINTMENT_STATUS.IN_PROGRESS;
              return (
                <div key={b.id} className="px-4 py-3 md:px-6 md:py-4 border-b border-smoke last:border-0 hover:bg-slate-50/60 transition-colors">
                  <div className="hidden md:grid grid-cols-12 gap-0.5">
                    <div className="col-span-2">
                      <p className="text-base font-semibold text-midnight">{b.time}</p>
                      <p className="text-silver text-sm">{fmtDate(b.date)}</p>
                    </div>
                    <div className={`${isHead ? 'col-span-3' : 'col-span-4'} min-w-0`}>
                      <p className="text-sm font-semibold text-midnight truncate">{toInitials(b.fullName)}</p>
                      {b.callSign && (
                        <p className="text-sm font-medium text-silver">{b.callSign}</p>
                      )}
                    </div>
                    <div className={`${isHead ? 'col-span-2' : 'col-span-4'} min-w-0 flex items-center gap-1`}>
                      <Stethoscope size={14} className="text-silver shrink-0"/>
                      <span className="text-sm font-medium text-charcoal truncate">{getSpecialtyLabel(b.specialty)}</span>
                    </div>
                    {isHead && (
                      <div className="col-span-3 min-w-0">
                        <p className="text-sm font-medium text-midnight truncate">{b.bookedBy?.callSign || toInitials(b.bookedBy?.name) || '—'}</p>
                      </div>
                    )}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <span className={`inline text-xs font-bold uppercase tracking-wide whitespace-nowrap ${st.color}`}>{st.label}</span>
                      {canCancel && (
                        <button onClick={() => handleCancel(b)} disabled={cancelling === b.id}
                          className="flex items-center gap-1 p-2 text-xs bg-snow rounded-full text-charcoal font-semibold hover:bg-red/10 hover:text-red shrink-0" title="Відмінити">
                          {cancelling === b.id ? <Loader2 size={16} className="animate-spin"/> : <X size={16}/>}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-12 md:hidden">
                    <div className="col-span-2">
                      <p className="text-sm font-semibold text-midnight">{b.time}</p>
                      <p className="text-silver text-xs">{fmtDate(b.date)}</p>
                    </div>
                    <div className="col-span-7 pl-4">
                      <p className="text-sm font-semibold text-midnight truncate">{toInitials(b.fullName)}</p>
                      {b.callSign && (
                        <p className="text-xs font-medium text-silver">{b.callSign}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-1">
                        <Stethoscope size={14} className="text-silver shrink-0"/>
                        <span className="text-xs font-medium text-charcoal truncate">{getSpecialtyLabel(b.specialty)}</span>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <p className="text-[9px] text-silver/60 uppercase tracking-widest font-bold">Статус:</p>
                      <div className="flex items-center flex-wrap">
                        <span className={`inline text-[10px] font-bold uppercase tracking-wide whitespace-nowrap mr-2 ${st.color}`}>{st.label}</span>
                        {canCancel && (
                          <button onClick={() => handleCancel(b)} disabled={cancelling === b.id}
                            className="flex items-center p-1 text-[9px] uppercase gap-0.25 bg-snow rounded-sm text-charcoal font-semibold hover:bg-red/10 hover:text-red shrink-0" title="Відмінити">
                            {cancelling === b.id ? 
                              <Loader2 size={12} className="animate-spin"/> : 
                              (<><X size={12}/><span>Скасувати</span></>)
                            }
                          </button>
                        )}
                      </div>
                      {isHead && (
                        <div className="mt-1.5">
                          <p className="text-[9px] text-silver/60 uppercase tracking-widest font-bold">Забронював:</p>
                          <p className="text-xs font-medium text-midnight truncate">{b.bookedBy?.callSign || toInitials(b.bookedBy?.name) || '—'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
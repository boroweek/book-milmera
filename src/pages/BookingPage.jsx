import { useState, useEffect, useMemo } from 'react';
import { db } from '../api/firebase';
import {
  collection, doc, getDoc, getDocs, query, where,
  runTransaction, serverTimestamp, getCountFromServer, Timestamp
} from 'firebase/firestore';
import {
  Check, ChevronLeft, ChevronRight, ChevronDown, Copy,
  User, Calendar as CalendarIcon, Hash, ShieldCheck, X,
  AlertCircle, Loader2, Info, Building2
} from 'lucide-react';
import { SPECIALTY_INFO, APPOINTMENT_STATUS, QUEUE_SLOT_ACTIVE, SUBDIVISIONS, RANKS, DAYS_FULL_UK } from '../utils/constants';
import { normalizeFullName } from '../utils/patientUtils';
import { useAuth } from '../context/AuthContext';
import { Field } from '../components/Field';
import { SelectWithCustom } from '../components/SelectWithCustom';
import { AutoTextarea } from '../components/AutoTextarea';
import { BirthDateInput } from '../components/BirthDateInput';

// ── Helpers ───────────────────────────────────────────────────────────────────
const getRelevantDate = () => {
  const now = new Date();
  if (now.getHours() > 17 || (now.getHours() === 17 && now.getMinutes() >= 30)) {
    const t = new Date(now); t.setDate(now.getDate() + 1);
    return t.toISOString().split('T')[0];
  }
  return now.toISOString().split('T')[0];
};

const generateSlots = (duration) => {
  const slots = []; let cur = 9 * 60;
  while (cur + duration <= 18 * 60) {
    slots.push(`${String(Math.floor(cur/60)).padStart(2,'0')}:${String(cur%60).padStart(2,'0')}`);
    cur += duration;
  }
  return slots;
};

const LS_KEY = 'milmera_bookings';
const loadBookings = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const now = Date.now();
    return JSON.parse(raw).filter(b => b.savedAt && (now - b.savedAt) < 24*60*60*1000);
  } catch { return []; }
};
const saveBooking = (entry) => {
  try {
    const existing = loadBookings();
    existing.unshift({ ...entry, savedAt: Date.now() });
    localStorage.setItem(LS_KEY, JSON.stringify(existing));
  } catch {}
};
const toInitials = (fullName) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0]} ${parts.slice(1).map(p => p[0]+'.').join('')}`;
};

const MONTHS_UK    = ['Січня','Лютого','Березня','Квітня','Травня','Червня','Липня','Серпня','Вересня','Жовтня','Листопада','Грудня'];
const MONTHS_SHORT = ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'];
const DAYS_UK      = ['Нд','Пн','Вт','Ср','Чт','Пт','Сб'];

const SERVICE_TYPES = ['Не визначено', 'Мобілізація', 'Контракт'];

const parseDateStr = (str) => { const [y,m,d] = str.split('-').map(Number); return new Date(y,m-1,d); };
const toDateStr    = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const buildWeek = (baseDate, offset) =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate); d.setDate(baseDate.getDate() + offset * 7 + i); return d;
  });

// ── Shared UI ─────────────────────────────────────────────────────────────────
const inpClass = 'w-full px-5 bg-transparent text-base md:text-sm font-medium text-midnight outline-none placeholder:text-silver';

function Heading({ title, desc }) {
  return (
    <div>
      <h1 className="text-3xl font-normal text-midnight text-center tracking-wide">{title}</h1>
      <p className="text-xs font-medium text-center text-silver tracking-widest mt-1">{desc}</p>
    </div>
  );
}

// ── Step bar ──────────────────────────────────────────────────────────────────
const StepBar = ({ current, singleUnit }) => {
  const steps = singleUnit
    ? ['Лікар', 'Дата і час', 'Пацієнт']
    : ['Підрозділ', 'Лікар', 'Дата і час', 'Пацієнт'];
  return (
    <div className="flex items-start justify-center gap-2 mb-6">
      {steps.map((label, i) => {
        const n = i + 1;
        const done   = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done   ? 'bg-light-lime text-midnight' :
                active ? 'bg-white text-midnight' :
                         'bg-white text-silver/70'
              }`}>
                {done ? <Check size={16}/> : n}
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-widest mt-1 ${active ? 'text-charcoal' : 'text-silver'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <div className={`w-8 h-0.5 rounded mb-4 ${done ? 'bg-charcoal/50' : 'bg-smoke'}`}/>}
          </div>
        );
      })}
    </div>
  );
};

// ── Sticky booking summary banner ─────────────────────────────────────────────
function StickyBanner({ unit, spec, date, slots, singleUnit = false }) {
  const d = date ? parseDateStr(date) : null;
  const dateLabel = d
    ? `${d.getDate()} ${MONTHS_UK[d.getMonth()].toLowerCase()}, ${DAYS_FULL_UK[d.getDay()]}`
    : null;

  const parts = [];
  if (unit && !singleUnit) parts.push(unit.name);
  if (spec) parts.push(`до ${spec.genitive || spec.label.toLowerCase()}`);
  if (dateLabel) parts.push(`на ${dateLabel}`);
  if (slots.length > 0) parts.push(`о ${[...slots].sort().join(', ')}`);

  return (
    <div className="p-4 bg-light-lime/70 rounded-2xl">
      <p className="flex gap-2 items-center text-charcoal text-sm font-medium leading-none">
        <Info size={15} className="shrink-0"/>
        {parts.length > 0 ? `Ви записуєтесь ${parts.join(', ')}` : 'Оформлення запису'}
      </p>
    </div>
  );
}

// ── Date carousel ─────────────────────────────────────────────────────────────
function DateCarousel({ value, onChange, minDate }) {
  const minD = parseDateStr(minDate);
  const [weekOffset, setWeekOffset] = useState(0);
  const days     = buildWeek(minD, weekOffset);
  const startDay = days[0];
  const endDay   = days[days.length - 1];

  const monthLabel = startDay.getMonth() === endDay.getMonth()
    ? `${startDay.getDate()}-${endDay.getDate()} ${MONTHS_UK[startDay.getMonth()]}`
    : `${startDay.getDate()} ${MONTHS_UK[startDay.getMonth()]} - ${endDay.getDate()} ${MONTHS_UK[endDay.getMonth()]}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(p => Math.max(0, p - 1))} disabled={weekOffset === 0}
          className="w-9 h-9 flex items-center justify-center bg-snow rounded-full text-charcoal disabled:opacity-30 hover:bg-midnight hover:text-white transition-all active:scale-95">
          <ChevronLeft size={18}/>
        </button>
        <p className="text-sm font-semibold text-midnight">{monthLabel}</p>
        <button onClick={() => setWeekOffset(p => p + 1)}
          className="w-9 h-9 flex items-center justify-center bg-snow rounded-full text-charcoal hover:bg-midnight hover:text-white transition-all active:scale-95">
          <ChevronRight size={18}/>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const str    = toDateStr(d);
          const isSel  = value === str;
          const isPast = d < minD;
          return (
            <button key={str} disabled={isPast} onClick={() => onChange(str)}
              className={`flex flex-col items-center py-2 gap-0.5 rounded-xl text-center transition-all select-none ${
                isPast ? 'opacity-30 cursor-not-allowed' :
                isSel  ? 'bg-blue text-white shadow-sm' :
                         'text-charcoal hover:bg-light-blue active:scale-95'
              }`}>
              <span className={`text-xs font-semibold uppercase leading-none ${isSel ? 'text-white/80' : 'text-silver'}`}>
                {DAYS_UK[d.getDay()]}
              </span>
              <span className={`text-base font-bold leading-5 ${isSel ? 'text-white' : 'text-midnight'}`}>{d.getDate()}</span>
              <span className={`text-xs font-medium leading-none ${isSel ? 'text-white/70' : 'text-silver'}`}>
                {MONTHS_SHORT[d.getMonth()]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Sticky footer nav ─────────────────────────────────────────────────────────
function StickyFooter({ onBack, onNext, nextDisabled, nextLabel, submitting, submitFormId }) {
  return (
    <div className="max-w-[900px] mx-auto flex gap-3">
      {onBack && (
        <button type="button" onClick={onBack}
          className="w-[130px] md:w-[160px] h-11 flex items-center justify-center bg-white shadow-sm rounded-full text-charcoal font-semibold text-sm hover:shadow-md active:scale-95 transition-all">
          ← Назад
        </button>
      )}
      <div className="flex-1"/>
      <button
        type={submitFormId ? 'submit' : 'button'}
        form={submitFormId || undefined}
        disabled={nextDisabled}
        onClick={submitFormId ? undefined : onNext}
        className="w-[130px] md:w-[160px] h-11 flex items-center justify-center bg-lime shadow-sm rounded-full text-midnight font-semibold text-sm hover:shadow-md disabled:opacity-60 disabled:shadow-none active:scale-95 transition-all">
        {submitting
          ? <><Loader2 size={14} className="animate-spin mr-1"/> Зачекайте...</>
          : nextLabel}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BookingPage() {
  const { medic, user } = useAuth();
  const canMultiSlot = medic?.multiSlot === true;

  // Units
  const [units,        setUnits]        = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const [step, setStep]               = useState(1);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [success, setSuccess]         = useState(false);
  const [lastAppts, setLastAppts]     = useState([]);
  const [copied, setCopied]           = useState(false);

  // Step: specialty
  const [spec, setSpec]                       = useState(null);
  const [dentistId, setDentistId]             = useState('');

  // All employees + available specialties for this unit
  const [unitEmployees,    setUnitEmployees]    = useState([]);

  // Step: date/time
  const minVisitDate = getRelevantDate();
  const [date, setDate]                   = useState(minVisitDate);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [slotsData, setSlotsData]         = useState({ slots: [], booked: {}, capacity: 1 });
  const [slotsLoading, setSlotsLoading]   = useState(false);
  const [slotsError, setSlotsError]       = useState(null);

  // Step: patient
  const [form, setForm] = useState(() => {
    const unitName = medic?.unitName || '';
    const inList = SUBDIVISIONS.includes(unitName);
    return {
      fullName: '', callSign: '', birthDate: '', militaryUnit: '',
      subdivision: unitName ? (inList ? unitName : '__other__') : '',
      subdivisionCustom: unitName && !inList ? unitName : '',
      rank: '', rankCustom: '',
      serviceType: 0, complaint: ''
    };
  });
  const [agreed, setAgreed]         = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today    = new Date();
  const maxBirth = today.toISOString().split('T')[0];
  const minBirth = new Date(today.getFullYear()-100, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Load units on mount — getDocs with sessionStorage cache
  useEffect(() => {
    setUnitsLoading(true);
    const CACHE_KEY = 'milmera_units_cache';
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const list = JSON.parse(cached).filter(u => u.bookingEnabled === true);
        setUnits(list);
        setUnitsLoading(false);
        if (list.length === 1 && !selectedUnit) setSelectedUnit(list[0]);
        return;
      } catch {}
    }
    getDocs(collection(db, 'units')).then(snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.bookingEnabled === true);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(list));
      setUnits(list);
      setUnitsLoading(false);
      if (list.length === 1 && !selectedUnit) setSelectedUnit(list[0]);
    });
  }, []);

  const singleUnit = units.length === 1;

  // Load unit employees + availableSpecialties when unit selected
  useEffect(() => {
    if (!selectedUnit) return;

    const CACHE_KEY = `milmera_emp_${selectedUnit.id}`;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { ts, data } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) { setUnitEmployees(data); return; }
      }
    } catch {}

    getDocs(query(collection(db, 'employees'), where('unitId', '==', selectedUnit.id)))
      .then(snap => {
        const data = snap.docs
          .filter(d => d.data().isMedic)
          .map(d => {
            const e = d.data();
            return { id: d.id, specialty: e.specialty, callSign: e.callSign };
          });
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
        setUnitEmployees(data);
      });
  }, [selectedUnit]);


  // Load slots
  useEffect(() => {
    const specStep = singleUnit ? 2 : 3;
    if (step !== specStep || !spec || !date || !selectedUnit) return;
    let active = true;
    const load = async () => {
      setSlotsLoading(true); setSlotsError(null); setSelectedSlots([]);
      try {
        const schedKey = `${selectedUnit.id}_${date}`;
        // Паралельно завантажуємо розклад і зайняті слоти
        const [snap, qSnap] = await Promise.all([
          getDoc(doc(db, 'daily_schedule', schedKey)),
          getDocs(query(
            collection(db,'appointments_queue'),
            where('date','==',date), where('specialty','==',spec.code),
            where('unitId','==',selectedUnit.id),
            where('status','in',QUEUE_SLOT_ACTIVE)
          )),
        ]);
        if (!active) return;
        const specData = snap.exists() ? snap.data().slots?.[spec.code] : null;
        if (!specData) { setSlotsError(`${spec.label} недоступний на цю дату`); setSlotsData({ slots:[], booked:{}, capacity:1 }); return; }
        const capacity = (specData.doctorIds || []).length || 1;
        let allSlots = generateSlots(specData.slotDuration || 20);
        if (date === new Date().toISOString().split('T')[0]) {
          const now = new Date();
          const cur = now.getHours()*60 + now.getMinutes();
          allSlots = allSlots.filter(t => { const [h,m] = t.split(':').map(Number); return h*60+m > cur+5; });
        }
        if (!allSlots.length) { setSlotsError(`${spec.label} недоступний на цю дату`); setSlotsData({ slots:[], booked:{}, capacity:1 }); return; }
        const booked = {};
        qSnap.docs.forEach(d => { const t = d.data().time; booked[t]=(booked[t]||0)+1; });
        setSlotsData({ slots: allSlots, booked, capacity });
      } catch { setSlotsError('Помилка завантаження даних'); }
      finally { if (active) setSlotsLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [step, spec, date, selectedUnit, singleUnit]);

  const toggleSlot = (t) => {
    if (!canMultiSlot) { setSelectedSlots(p => p[0] === t ? [] : [t]); return; }
    setSelectedSlots(p => p.includes(t) ? p.filter(s=>s!==t) : [...p, t]);
  };

  const step3Valid = useMemo(() => {
    const base = form.fullName.trim() && form.callSign.trim() && form.birthDate && form.militaryUnit.trim() 
    && Number(form.serviceType) > 0 && (form.complaint || '').trim();
    const sub  = form.subdivision === '__other__' ? form.subdivisionCustom.trim() : form.subdivision.trim();
    const rank  = form.rank === '__other__' ? form.rankCustom.trim() : form.rank.trim();
    return !!(base && sub && rank && agreed);
  }, [form, agreed]);

  const handleSubmit = async () => {
    if (!step3Valid || submitting || !selectedUnit || !medic) return;
    const authUid = user?.uid;
    if (!authUid) {
      alert('Не вдалося визначити акаунт. Спробуйте вийти й увійти знову.');
      return;
    }
    setSubmitting(true);
    const subFinal   = form.subdivision === '__other__' ? form.subdivisionCustom : form.subdivision;
    const rankFinal   = form.rank === '__other__' ? form.rankCustom : form.rank;
    const selDentist = unitEmployees.find(d => d.id === dentistId);
    try {
      const results = [];
      for (const time of [...selectedSlots].sort()) {
        await runTransaction(db, async (tx) => {
          const schedKey  = `${selectedUnit.id}_${date}`;
          const schedSnap = await tx.get(doc(db,'daily_schedule',schedKey));
          if (!schedSnap.exists()) throw new Error('Графік не знайдено.');
          const specData = schedSnap.data().slots?.[spec.code];
          if (!specData) throw new Error(`${spec.label} недоступний.`);
          const cap = (specData.doctorIds||[]).length || 1;
          // IN_PROGRESS і COMPLETED займають слот
          const cnt = await getCountFromServer(query(
            collection(db,'appointments_queue'),
            where('date','==',date), where('specialty','==',spec.code),
            where('time','==',time), where('unitId','==',selectedUnit.id),
            where('status','in',QUEUE_SLOT_ACTIVE)
          ));
          if (cnt.data().count >= cap) throw new Error(`Час ${time} вже зайнято.`);
          tx.set(doc(collection(db,'appointments_queue')), {
            date, specialty: spec.code, time,
            unitId:       selectedUnit.id,
            unitName:     selectedUnit.name,
            fullName:     normalizeFullName(form.fullName.trim()),
            callSign:     normalizeFullName(form.callSign.trim()),
            birthDate:    Timestamp.fromDate(new Date(form.birthDate)),
            militaryUnit: form.militaryUnit,
            subdivision:  subFinal,
            rank:         rankFinal,
            serviceType:  Number(form.serviceType),
            status:       APPOINTMENT_STATUS.IN_PROGRESS,
            bookedBy:       { uid: authUid, id: medic.id, name: medic.name, callSign: medic.callSign || '', unit: medic.unitName || '', phone: medic.phone || '', email: medic.email },
            bookingUnitId:  medic.unitId || null,
            ...(dentistId ? {
              preferredDoctorId:   dentistId,
              preferredDoctorCallSign: selDentist?.callSign||'',
            } : {}),
            complaint:        form.complaint.trim(),
            assignedDoctorId: null, patientId: null,
            createdAt: serverTimestamp(),
          });
        });
        results.push({ date, time, specialty: spec.label, fullName: form.fullName, unitName: selectedUnit.name });
        saveBooking({ date, time, specialty: spec.label, nameShort: toInitials(form.fullName), unitName: selectedUnit.name });
      }
      setLastAppts(results);
      setSuccess(true);
    } catch (err) { alert(err.message || 'Помилка при записі.'); }
    finally { setSubmitting(false); }
  };

  const handleReset = () => {
    setStep(1); setSuccess(false); setLastAppts([]);
    setSpec(null); setDentistId(''); setSelectedSlots([]);
    setDate(minVisitDate); setSlotsData({ slots:[], booked:{}, capacity:1 }); setSlotsError(null);
    const unitName = medic?.unitName || '';
    const inList = SUBDIVISIONS.includes(unitName);
    setForm({ 
      fullName:'', callSign:'', birthDate:'', militaryUnit:'',
      subdivision: unitName ? (inList ? unitName : '__other__') : '',
      subdivisionCustom: unitName && !inList ? unitName : '',
      rank: '', rankCustom: '',
      serviceType: 0, complaint: ''
    });
    setAgreed(false);
    if (!singleUnit) setSelectedUnit(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(
      lastAppts.map(a => `${a.date.split('-').reverse().join('.')} о ${a.time} (${a.specialty}) — ${a.fullName}`).join('\n')
    );
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (unitsLoading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 size={28} className="text-silver animate-spin"/>
    </div>
  );

  // ── SUCCESS ────────────────────────────────────────────────────────────────
  if (success) return (
    <div className="max-w-[900px] mx-auto px-4 py-10">
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 bg-lime text-center">
          <div className="w-16 h-16 bg-light-lime rounded-full flex items-center justify-center mx-auto mb-3">
            <Check size={32} className="text-midnight"/>
          </div>
          <h2 className="text-3xl font-normal text-midnight">Записано!</h2>
          <p className="text-xs font-semibold text-charcoal uppercase tracking-widest mt-1">
            {lastAppts.length > 1 ? `${lastAppts.length} слоти заброньовано` : 'Запис підтверджено'}
          </p>
        </div>
        <div className="p-8 space-y-6">
          {lastAppts[0]?.unitName && !singleUnit && (
            <div className="flex items-center gap-2 text-sm text-silver font-medium">
              <Building2 size={14} className="shrink-0"/>
              <span>{lastAppts[0].unitName}</span>
            </div>
          )}
          <div className="relative">
            <button onClick={handleCopy}
              className="absolute right-0 top-0 p-3 bg-snow/70 rounded-full text-midnight hover:bg-snow">
              {copied ? <Check size={16} className="text-green"/> : <Copy size={16}/>}
            </button>
            {lastAppts.map((a, i) => (
              <div key={i} className={i > 0 ? 'border-t border-smoke mt-3 pt-3' : ''}>
                <p className="text-base font-semibold text-midnight">
                  {(() => { const d = parseDateStr(a.date); return `${d.getDate()} ${MONTHS_UK[d.getMonth()].toLowerCase()} ${d.getFullYear()} р. на ${a.time}`; })()}
                </p>
                <p className="text-sm font-semibold text-midnight mt-0.5">{a.fullName}</p>
                <p className="text-sm text-silver font-medium">до {a.specialty.toLowerCase()}</p>
              </div>
            ))}
          </div>
          <button onClick={handleReset}
            className="w-full h-11 bg-blue text-white rounded-full font-semibold text-sm hover:opacity-90 active:scale-95 transition-all">
            Нове бронювання
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP 1: UNIT SELECTION (skipped if singleUnit) ────────────────────────
  if (step === 1 && !singleUnit) return (
    <div className="max-w-[900px] mx-auto px-4 py-6 space-y-4">
      <Heading title="Запис до лікаря" desc="Крок 1 — оберіть підрозділ"/>
      <StepBar current={1} singleUnit={false}/>
      <p className="text-sm font-medium text-charcoal text-center max-w-lg mx-auto">
        Оберіть підрозділ, до якого хочете записати пацієнта.
      </p>
      {units.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl">
          <Building2 size={28} className="text-silver mx-auto mb-3"/>
          <p className="text-silver font-medium text-sm tracking-widest">Підрозділів не знайдено</p>
          <p className="text-xs text-silver mt-1 font-medium">Зверніться до адміністратора системи</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {units.map(u => {
            const isSelected = selectedUnit?.id === u.id;
            return (
              <button key={u.id} type="button" onClick={() => setSelectedUnit(u)}
                className={`flex items-center gap-4 text-left p-5 rounded-2xl border transition-all ${
                  isSelected ? 'bg-light-blue border-blue' : 'bg-white border-transparent hover:border-light-blue hover:shadow-md'
                }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue' : 'bg-light-blue'}`}>
                  <Building2 size={22} className={isSelected ? 'text-white' : 'text-blue'}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-midnight truncate">{u.name}</p>
                </div>
                {isSelected && (
                  <div className="w-7 h-7 rounded-full bg-blue flex items-center justify-center shrink-0">
                    <Check size={14} className="text-white"/>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex justify-end">
        <button disabled={!selectedUnit} onClick={() => setStep(2)}
          className="w-[130px] md:w-[160px] h-11 flex items-center justify-center bg-lime shadow-sm rounded-full text-midnight font-semibold text-sm hover:shadow-md disabled:opacity-60 disabled:shadow-none active:scale-95 transition-all">
          Далі →
        </button>
      </div>
    </div>
  );

  // ── STEP 2: SPECIALTY ─────────────────────────────────────────────────────
  const specStep = singleUnit ? 1 : 2;

  // Doctors for current spec — computed synchronously, no useState/useEffect
  const specDoctors = spec ? unitEmployees.filter(e => e.specialty === spec.code) : [];

  // Filter specialties: only those with at least 1 employee in this unit
  const availableSpecCodes = [...new Set(unitEmployees.map(e => e.specialty))];
  const filteredSpecInfo = SPECIALTY_INFO.filter(s => availableSpecCodes.includes(s.code));

  if (step === specStep) return (
    <div className="max-w-[900px] mx-auto px-4 py-6 space-y-4">
      <Heading title="Запис до лікаря" desc={`Крок ${specStep} — оберіть лікаря`}/>
      <StepBar current={specStep} singleUnit={singleUnit}/>
      {/* {singleUnit && selectedUnit && (
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-blue">
          <Building2 size={15}/>{selectedUnit.name}
        </div>
      )} */}
      <p className="text-sm font-medium text-charcoal text-center max-w-lg mx-auto">
        Уважно ознайомтесь з описом та оберіть лікаря, що відповідає симптомам пацієнта.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredSpecInfo.map(s => {
          const isSelected = spec?.code === s.code;
          return (
            <button key={s.code} type="button"
              onClick={() => { setSpec(s); setDentistId(''); }}
              className={`flex flex-col text-left py-4 px-3 rounded-2xl transition-all ${
                isSelected ? 'bg-light-blue shadow-md' : 'bg-white hover:shadow-md'
              }`}>
              <div className="flex items-start gap-3">
                <div className={`text-2xl shrink-0`}>
                  {s.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-base font-semibold text-midnight">{s.label}</p>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-blue flex items-center justify-center shrink-0">
                        <Check size={12} className="text-white"/>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-charcoal/70 font-medium leading-snug">{s.symptoms}</p>
                  {s.hint && <p className="text-xs font-semibold text-blue mt-2">{s.hint}</p>}
                </div>
              </div>

            </button>
          );
        })}
      </div>
      <div className="flex justify-between">
        {!singleUnit ? (
          <button onClick={() => setStep(1)}
            className="w-[130px] md:w-[160px] h-11 flex items-center justify-center bg-white shadow-sm rounded-full text-charcoal font-semibold text-sm hover:shadow-md active:scale-95 transition-all">
            ← Назад
          </button>
        ) : <div/>}
        <button disabled={!spec} onClick={() => setStep(specStep + 1)}
          className="w-[130px] md:w-[160px] h-11 flex items-center justify-center bg-lime shadow-sm rounded-full text-midnight font-semibold text-sm hover:shadow-md disabled:opacity-60 disabled:shadow-none active:scale-95 transition-all">
          Далі →
        </button>
      </div>
    </div>
  );

  // ── STEP 3: DATE/TIME ─────────────────────────────────────────────────────
  const dateStep = singleUnit ? 2 : 3;

  if (step === dateStep) return (
    <div className="max-w-[900px] mx-auto px-4 pb-6 space-y-4">
      <div className="pt-4 space-y-1">
        <Heading title="Дата і час" desc={`Крок ${dateStep} — оберіть зручний час`}/>
      </div>
      <StepBar current={dateStep} singleUnit={singleUnit}/>
      <StickyBanner unit={selectedUnit} spec={spec} date={date} slots={selectedSlots} singleUnit={singleUnit}/>

      <div className="bg-white rounded-2xl p-5 space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-medium text-silver uppercase tracking-widest">Дата прийому</p>
          <DateCarousel value={date} onChange={(d) => { setDate(d); setSelectedSlots([]); }} minDate={minVisitDate}/>
        </div>
        <div className="h-px bg-smoke"/>
        <div className="space-y-2">
          <p className="text-xs font-medium text-silver uppercase tracking-widest">
            Час прийому
            {canMultiSlot && <span className="text-blue ml-1 normal-case font-medium">(можна декілька)</span>}
          </p>
          {slotsLoading && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 size={14} className="text-silver animate-spin"/>
              <span className="text-sm font-medium text-silver">Завантаження...</span>
            </div>
          )}
          {!slotsLoading && slotsError && (
            <div className="flex items-center gap-2 p-3 bg-light-red rounded-2xl">
              <AlertCircle size={13} className="text-red shrink-0"/>
              <p className="text-xs font-medium text-red">{slotsError}</p>
            </div>
          )}
          {!slotsLoading && !slotsError && slotsData.slots.length > 0 && (
            <div className="py-1">
              <div className="grid grid-cols-3 gap-2 items-start">
                {slotsData.slots.map(t => {
                  const isFull = (slotsData.booked[t]||0) >= slotsData.capacity;
                  const isSel  = selectedSlots.includes(t);
                  return (
                    <button key={t} type="button" disabled={isFull} onClick={() => toggleSlot(t)}
                      className={`h-9 px-4 rounded-full text-base font-semibold transition-all select-none ${
                        isFull ? 'bg-snow/60 text-silver cursor-not-allowed line-through' :
                        isSel  ? 'bg-blue text-white' :
                                'bg-snow/90 text-charcoal hover:bg-light-blue active:scale-95'
                      }`}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <StickyFooter
        onBack={() => setStep(dateStep - 1)}
        onNext={() => setStep(dateStep + 1)}
        nextDisabled={selectedSlots.length === 0}
        nextLabel="Далі →"
      />
    </div>
  );

  // ── STEP 4: PATIENT ───────────────────────────────────────────────────────
  const patientStep = singleUnit ? 3 : 4;
  const patientFormId = 'milmera-booking-patient';
  return (
    <div className="max-w-[900px] mx-auto px-4 pb-6 space-y-4">
      <div className="pt-4 space-y-1">
        <Heading title="Дані пацієнта" desc={`Крок ${patientStep} — заповніть форму`}/>
      </div>
      <StepBar current={patientStep} singleUnit={singleUnit}/>
      <StickyBanner unit={selectedUnit} spec={spec} date={date} slots={selectedSlots} singleUnit={singleUnit}/>
      
      <form
        id={patientFormId}
        className="bg-white rounded-2xl px-4 py-6 md:px-6 space-y-4"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          if (step3Valid && !submitting) handleSubmit();
        }}
      >
        <p className="text-xs font-medium text-silver uppercase tracking-widest">Загальна інформація</p>
        <div className="space-y-3">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="ПІБ пацієнта" required>
              <div className="relative">
                <input required name="milmera-patient-pib" autoComplete="off" placeholder="Прізвище Ім'я По батькові" value={form.fullName}
                  className={inpClass} onChange={e => setField('fullName', normalizeFullName(e.target.value))}/>
                <User size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-silver pointer-events-none"/>
              </div>
            </Field>

            <Field label="Позивний" required>
              <input required name="milmera-patient-callsign" autoComplete="off" placeholder="Позивний пацієнта" value={form.callSign}
                className={inpClass} onChange={e => setField('callSign', normalizeFullName(e.target.value))}/>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Дата народження" required>
              <BirthDateInput
                required
                name="milmera-patient-birth"
                autoComplete="off"
                value={form.birthDate}
                min={minBirth}
                max={maxBirth}
                className={inpClass}
                onChange={(v) => setField('birthDate', v)}
              >
                <CalendarIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-silver pointer-events-none"/>
              </BirthDateInput>
            </Field>
            
            <Field label="Тип служби" required>
              <div className="relative">
                <select required name="milmera-patient-service" autoComplete="off" value={form.serviceType} onChange={e => setField('serviceType', e.target.value)}
                  className={`${inpClass} appearance-none cursor-pointer${+form.serviceType === 0 ? ' [:not(:focus)]:text-silver' : '' }`}>
                  {SERVICE_TYPES.map((t, i) => (
                    <option key={i} value={i}>{t}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal pointer-events-none"/>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Номер в/ч" required>
              <div className="relative">
                <input required name="milmera-patient-military-unit" autoComplete="off" placeholder="А0000" maxLength={5} value={form.militaryUnit}
                  className={`${inpClass} uppercase`}
                  onChange={e => setField('militaryUnit', e.target.value.toUpperCase().replace(/[^А-ЯІЇЄҐ0-9\s]/gi, ''))}/>
                <Hash size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-silver pointer-events-none"/>
              </div>
            </Field>

            <Field label="Підрозділ (скорочено)" required>
              <SelectWithCustom
                name="milmera-patient-subdivision"
                options={SUBDIVISIONS}
                value={form.subdivision}
                customValue={form.subdivisionCustom}
                onChange={v => setField('subdivision', v)}
                onCustomChange={v => setField('subdivisionCustom', v)}
                onReset={() => { setField('subdivision', ''); setField('subdivisionCustom', ''); }}
                placeholder="Назва підрозділу"
                otherLabel="Інший..."
              />
            </Field>

            <Field label="Звання" required>
              <SelectWithCustom
                name="milmera-patient-rank"
                options={RANKS}
                value={form.rank}
                customValue={form.rankCustom}
                onChange={v => setField('rank', v)}
                onCustomChange={v => setField('rankCustom', v)}
                onReset={() => { setField('rank', ''); setField('rankCustom', ''); }}
                placeholder="Введіть звання"
                otherLabel="Інше..."
              />
            </Field>
          </div>

          <Field label="Скарги та розвиток симптомів" required hint={[
            'Кашель і температура до 38°C, почалися 3 дні тому, кашель став сильнішим',
            'Біль у попереку після фізичного навантаження, триває 5 днів, посилюється при русі',
            'Слабкість і запаморочення, почалися сьогодні зранку, поступово посилюються',
            'Висип на руках, зʼявився тиждень тому, поступово поширюється, є свербіж',
          ]}>
            <AutoTextarea name="milmera-patient-complaint" autoComplete="off" value={form.complaint} onChange={e => setField('complaint', e.target.value)}
              placeholder="Опишіть симптоми, коли вони зʼявилися та як змінювались" maxRows={6} className={inpClass}/>
          </Field>
        </div>

        <div className="flex items-start gap-3">
          <input id="consent" type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-midnight cursor-pointer shrink-0"/>
          <label htmlFor="consent" className="text-[12px] font-medium text-silver leading-snug cursor-pointer select-none">
            Підтверджую згоду на обробку персональних даних пацієнта.{' '}
            <button type="button" onClick={() => setShowPrivacy(true)}
              className="font-semibold underline bg-transparent border-none p-0 inline">
              Детальніше
            </button>
          </label>
        </div>
      </form>
     
      <StickyFooter
        onBack={() => setStep(patientStep - 1)}
        onNext={handleSubmit}
        nextDisabled={!step3Valid || submitting}
        nextLabel={`Записати${selectedSlots.length > 1 ? ` (${selectedSlots.length})` : ''}`}
        submitting={submitting}
        submitFormId={patientFormId}
      />

      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-snow">
              <div className="flex items-center gap-3">
                <span className="flex w-10 h-10 items-center justify-center rounded-full bg-charcoal text-white shrink-0">
                  <ShieldCheck size={20}/>
                </span>
                <div>
                  <p className="text-xs font-semibold text-charcoal uppercase tracking-widest">Конфіденційність</p>
                  <p className="text-sm font-medium text-midnight mt-0.5">Захист персональних даних</p>
                </div>
              </div>
              <button onClick={() => setShowPrivacy(false)}
                className="w-8 h-8 flex items-center justify-center text-silver hover:text-midnight hover:bg-white/60 rounded-full">
                <X size={18}/>
              </button>
            </div>
            <div className="px-6 py-5 max-h-[50vh] overflow-y-auto text-charcoal space-y-3 text-sm font-medium leading-relaxed">
              <p>Ви надаєте згоду на збір та обробку персональних даних пацієнта (ПІБ, дата народження, військова частина, військовий підрозділ) виключно з медичною метою.</p>
              <p><strong>Захист:</strong> Всі дані є конфіденційними, зберігаються в захищеній системі та не передаються третім особам.</p>
              <p><strong>Мета:</strong> Ідентифікація пацієнта та формування електронної черги на медичний прийом.</p>
              <p><strong>Доступ:</strong> Виключно авторизовані медичні працівники установи.</p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => { setAgreed(true); setShowPrivacy(false); }}
                className="w-full h-11 bg-midnight text-white rounded-full font-semibold text-sm hover:opacity-90 transition-all">
                Я погоджуюсь
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useMemo, useState } from 'react';
import {
  collection, query, where, orderBy, onSnapshot, doc, getDoc,
} from 'firebase/firestore';
import { Loader2, LogOut, Stethoscope, Ear, Scissors, Droplets, Brain, Smile } from 'lucide-react';
import { db } from '../api/firebase';
import { useAuth } from '../context/AuthContext';
import { APPOINTMENT_STATUS, DAYS_FULL_UK, getSpecialtyLabel } from '../utils/constants';
import { LogoMS } from '../components/LogoMS';

const BASE_REM = 16;
const REF_VIEWPORT_H = 720;
const REF_VIEWPORT_W = 1280;

const C = {
  accent:        '#EB5E28',
  dotGreen:      '#2fab86',
  page:          '#c9d4d2',
  sidebar:       '#313f43',
  sidebarBlock:  '#233034',
  text:          '#313f43',
  textMuted:     '#445c5e',
  onSidebar:     'rgba(255,255,255,0.8)',
  onSidebarMuted:'rgba(255,255,255,0.7)',
  surface:       '#a8c4bf',
  surfaceLight:  '#c9d4d2',
  border:        'rgba(0,0,0,0.3)',
  sepSidebar:    'rgba(255,255,255,0.2)',
  sepMain:       'rgba(0,0,0,0.3)',
};

const SPECIALTY_ICONS = {
  therapist:        Stethoscope,
  ent:              Ear,
  surgeon:          Scissors,
  vascular_surgeon: Droplets,
  neurologist:      Brain,
  dentist:          Smile,
};

function SpecialtyIcon({ code, size = 22 }) {
  const Icon = SPECIALTY_ICONS[code] || Stethoscope;
  return <Icon size={size} strokeWidth={2.25} className="shrink-0" style={{ color: C.accent }} />;
}

function SidebarSep() {
  return <div className="h-px mx-3 shrink-0" style={{ backgroundColor: C.sepSidebar }} />;
}

function toIsoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatClock(d) {
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDateTitle(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return `${DAYS_FULL_UK[d.getDay()]}, ${d.getDate()} ${d.toLocaleDateString('uk-UA', { month: 'long' })}`;
}

function toDisplayItem(raw) {
  return {
    id: raw.id,
    time: raw.time || '',
    specialty: raw.specialty || '',
    status: raw.status || '',
    callSign: raw.callSign || '',
    fullName: raw.fullName || '',
  };
}

function patientDisplayName(item) {
  const cs = String(item?.callSign || '').trim();
  if (cs) return cs;
  const parts = String(item?.fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  if (parts.length >= 2) {
    const initial = parts[1][0]?.toLocaleUpperCase('uk-UA') || '';
    return initial ? `${parts[0]} ${initial}.` : parts[0];
  }
  return parts[0];
}

function buildSpecialtyColumns(items, scheduledColumns) {
  const keys = new Set();
  for (const col of scheduledColumns) {
    if (col.specialty) keys.add(col.specialty);
  }
  for (const item of items) {
    if (item.specialty) keys.add(item.specialty);
  }

  return [...keys]
    .sort((a, b) => getSpecialtyLabel(a).localeCompare(getSpecialtyLabel(b), 'uk'))
    .map((key) => ({
      key,
      label: getSpecialtyLabel(key),
      inAppointment: items.find(
        (i) => i.specialty === key && i.status === APPOINTMENT_STATUS.IN_APPOINTMENT,
      ) || null,
      waiting: items
        .filter((i) => i.specialty === key && i.status === APPOINTMENT_STATUS.IN_PROGRESS)
        .sort((a, b) => a.time.localeCompare(b.time)),
    }));
}

function StatLine({ label, value }) {
  return (
    <div
      className="flex items-center justify-between gap-3 py-1"
      style={{color: C.onSidebarMuted}}
    >
      <span className="text-base">{label}</span>
      <span 
        className="block w-[2.5em] text-right text-base font-bold tabular-nums" 
        style={{ 
          color: C.accent, 
          }}
      >
        {value}
      </span>
    </div>
  );
}

function ColumnSectionLabel({ children }) {
  return (
    <p
      className="text-xs font-bold uppercase tracking-[0.2em] mb-2"
      style={{ color: C.textMuted }}
    >
      {children}
    </p>
  );
}

function StatusDot({ variant = 'waiting', ui = 1 }) {
  const isInAppointment = variant === 'inAppointment';
  const size = Math.round((isInAppointment ? 14 : 7) * ui);
  const color = {
    inAppointment: C.dotGreen,
    next: C.accent,
    waiting: 'rgba(49, 63, 67, 0.35)',
  }[variant] || 'rgba(49, 63, 67, 0.35)';

  return (
    <span
      className="shrink-0 rounded-full"
      aria-hidden
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

function InAppointmentPatient({ item, ui }) {
  return (
    <div key={item.id} className="tablo-appointment-enter flex items-center gap-2 min-w-0">
      <span className="tablo-appointment-dot">
        <StatusDot variant="inAppointment" ui={ui} />
      </span>
      <p className="text-lg font-black leading-tight truncate" style={{ color: C.text }}>
        {patientDisplayName(item)}
      </p>
    </div>
  );
}

function SpecialtyColumn({ col, ui = 1 }) {
  return (
    <div
      className="flex flex-col min-w-0 flex-1 h-full min-h-0 border-r last:border-r-0"
      style={{ borderColor: C.border, backgroundColor: C.surfaceLight }}
    >
      <div
        className="px-4 py-4 border-b shrink-0"
        style={{ borderColor: C.border, backgroundColor: C.surface }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <SpecialtyIcon code={col.key} size={Math.round(26 * ui)} />
          <p className="text-lg font-extrabold leading-tight truncate" style={{ color: C.text }}>
            {col.label}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 py-4 min-h-0">
        <ColumnSectionLabel>На прийомі</ColumnSectionLabel>
        <div className="min-h-[1.5rem] mb-3">
          {col.inAppointment ? (
            <InAppointmentPatient item={col.inAppointment} ui={ui} />
          ) : (
            <span className="text-lg font-medium" style={{ color: C.textMuted }}>—</span>
          )}
        </div>

        <div className="h-px w-full shrink-0 mb-4" style={{ backgroundColor: C.sepMain }} />

        <ColumnSectionLabel>Очікують</ColumnSectionLabel>
        <div className="flex-1 overflow-hidden min-h-0">
          {col.waiting.length === 0 ? (
            <span className="text-base" style={{ color: C.textMuted }}>—</span>
          ) : (
            <ul className="space-y-2.5">
              {col.waiting.map((item, index) => (
                <li key={item.id} className="flex items-center gap-2 min-w-0 py-0.5 text-xl">
                  <StatusDot variant={index === 0 ? 'next' : 'waiting'} ui={ui} />
                  <span
                    className="font-black tabular-nums shrink-0"
                    style={{ color: C.textMuted }}
                  >
                    {item.time}
                  </span>
                  <span className="font-bold truncate" style={{ color: C.sidebarBlock }}>
                    {patientDisplayName(item)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div
        className="px-4 py-3 border-t shrink-0 flex items-center justify-between gap-2"
        style={{ borderColor: C.border, backgroundColor: C.surface }}
      >
        <span
          className="text-xs font-bold uppercase tracking-[0.15em]"
          style={{ color: C.textMuted }}
        >
          Всього
        </span>
        <span
          className="text-xl font-black tabular-nums"
          style={{ color: C.accent }}
        >
          {col.waiting.length}
        </span>
      </div>
    </div>
  );
}

function useDisplayRem() {
  const [remPx, setRemPx] = useState(BASE_REM);

  useEffect(() => {
    const html = document.documentElement;
    const prevFontSize = html.style.fontSize;

    const update = () => {
      const byH = (window.innerHeight / REF_VIEWPORT_H) * BASE_REM;
      const byW = (window.innerWidth / REF_VIEWPORT_W) * BASE_REM;
      const px = Math.min(BASE_REM * 3, Math.max(BASE_REM, Math.min(byH, byW)));
      setRemPx(px);
      html.style.fontSize = `${px}px`;
    };

    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      html.style.fontSize = prevFontSize;
    };
  }, []);

  return remPx;
}

export default function DisplayQueuePage() {
  const { displayUser, logout } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [items, setItems] = useState([]);
  const [scheduledColumns, setScheduledColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const remPx = useDisplayRem();
  const ui = remPx / BASE_REM;
  const dateIso = toIsoDate(now);
  const unitId = displayUser?.unitId;

  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!unitId) {
      setItems([]);
      setScheduledColumns([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const schedKey = `${unitId}_${dateIso}`;
    getDoc(doc(db, 'daily_schedule', schedKey)).then((snap) => {
      const slots = snap.exists() ? snap.data().slots || {} : {};
      setScheduledColumns(Object.keys(slots).map((specialty) => ({ specialty })));
    }).catch(() => setScheduledColumns([]));

    const q = query(
      collection(db, 'appointments_queue'),
      where('date', '==', dateIso),
      where('unitId', '==', unitId),
      orderBy('time', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => toDisplayItem({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [unitId, dateIso]);

  const columns = useMemo(
    () => buildSpecialtyColumns(items, scheduledColumns),
    [items, scheduledColumns],
  );

  const totals = useMemo(() => ({
    waiting: items.filter((i) => i.status === APPOINTMENT_STATUS.IN_PROGRESS).length,
    inAppointment: items.filter((i) => i.status === APPOINTMENT_STATUS.IN_APPOINTMENT).length,
    completed: items.filter((i) => i.status === APPOINTMENT_STATUS.COMPLETED).length,
  }), [items]);

  const hasContent = columns.length > 0 || totals.inAppointment > 0;
  const roomTitle = displayUser?.name?.trim() || 'Зала очікування';

  return (
    <div
      className="h-dvh max-h-dvh w-full overflow-hidden flex"
      style={{ backgroundColor: C.page, color: C.text }}
    >
      <aside
        className="w-48 shrink-0 h-full flex flex-col overflow-hidden"
        style={{ backgroundColor: C.sidebar }}
      >
        <div
          className="py-6 shrink-0"
          style={{ backgroundColor: C.sidebarBlock }}
        >
          <div className="flex justify-center">
            <LogoMS size={Math.round(132 * ui)} />
          </div>

          <div className="px-3 pt-4 shrink-0 space-y-1">
            {displayUser?.unitName ? (
              <p className="text-xs font-semibold tracking-[0.15em]" style={{ color: C.accent }}>
                {/* {displayUser.unitName} */}
                МП МЕДРОТА 3 ОШБр
              </p>
            ) : null}
          </div>
        </div>

        <div className="px-3 pt-5 shrink-0 space-y-2">
          <h1 className="mb-4 text-lg font-bold leading-tight" style={{ color: C.onSidebar }}>
            {roomTitle}
          </h1>

          <StatLine label="На прийомі" value={totals.inAppointment} />
          <StatLine label="Очікують" value={totals.waiting} />
          <StatLine label="Прийнято" value={totals.completed} />
        </div>

        <div className="flex-1 min-h-0" />

        <div className="px-3 py-3 shrink-0">
          <p className="text-sm capitalize tracking-[0.1em]" style={{ color: C.accent }}>
            {formatDateTitle(dateIso)}
          </p>
          <p
            className="text-4xl font-black tabular-nums tracking-tight mt-1"
            style={{ color: C.onSidebar }}
          >
            {formatClock(now)}
          </p>
          {loading ? (
            <p className="mt-3 flex items-center gap-2 text-[10px] font-medium" style={{ color: C.onSidebarMuted }}>
              <Loader2 size={Math.round(12 * ui)} className="animate-spin" />
              оновлення…
            </p>
          ) : null}
        </div>

        <div
          className="px-3 py-3 border-t shrink-0 flex items-center justify-between gap-2"
          style={{ borderColor: C.sepSidebar }}
        >
          <p className="text-[9px] font-semibold uppercase tracking-widest leading-snug" style={{ color: C.onSidebarMuted }}>
            Realtime · Tablo
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest transition-opacity hover:opacity-80 shrink-0"
            style={{ color: C.onSidebarMuted }}
          >
            <LogOut size={Math.round(11 * ui)} />
            Вихід
          </button>
        </div>
      </aside>

      <main className="flex-1 h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
          {!unitId ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div
                className="rounded-2xl p-10 text-center max-w-lg border"
                style={{ backgroundColor: C.surfaceLight, borderColor: C.border, color: C.text }}
              >
                <p className="font-semibold">Для цього облікового запису не призначено медпункт.</p>
                <p className="text-sm mt-2" style={{ color: C.textMuted }}>Зверніться до адміністратора.</p>
              </div>
            </div>
          ) : null}

          {unitId && loading && !hasContent ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={Math.round(28 * ui)} className="animate-spin" style={{ color: C.textMuted }} />
            </div>
          ) : null}

          {unitId && !loading && !hasContent ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div
                className="rounded-2xl border border-dashed p-14 text-center font-medium max-w-2xl"
                style={{ borderColor: C.border, backgroundColor: C.surfaceLight, color: C.textMuted }}
              >
                Сьогодні немає активних записів у черзі
              </div>
            </div>
          ) : null}

          {unitId && hasContent ? (
            <div className="flex-1 min-h-0 h-full flex overflow-hidden min-w-0">
              {columns.map((col) => (
                <SpecialtyColumn key={col.key} col={col} ui={ui} />
              ))}
            </div>
          ) : null}
      </main>
    </div>
  );
}

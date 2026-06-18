import { useState, useEffect, useRef } from 'react';
import { Calendar, X } from 'lucide-react';

const isoToDigits = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return d + m + y;
};

const formatFromDigits = (digits) => {
  let s = digits.slice(0, 2);
  if (digits.length > 2) s += '.' + digits.slice(2, 4);
  if (digits.length > 4) s += '.' + digits.slice(4, 8);
  return s;
};

const isoToDisplay = (iso) => formatFromDigits(isoToDigits(iso));

const digitsToIso = (digits) => {
  if (digits.length !== 8) return null;
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return null;
  return `${y}-${m}-${d}`;
};

const isValidPartial = (d) => {
  if (d.length === 1) return Number(d) <= 3;
  if (d.length === 2) {
    const day = Number(d);
    return day >= 1 && day <= 31;
  }
  if (d.length === 3) return Number(d[2]) <= 1;
  if (d.length === 4) {
    const month = Number(d.slice(2, 4));
    return month >= 1 && month <= 12;
  }
  return true;
};

const validatePartialDigits = (digits) => {
  let result = '';
  for (let i = 0; i < digits.length && i < 8; i++) {
    const next = result + digits[i];
    if (!isValidPartial(next)) break;
    result = next;
  }
  return result;
};

const inRange = (iso, min, max) => {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
};

const parsePastedDate = (text) => {
  const trimmed = text.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length === 8 ? digitsToIso(digits) : null;
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}

function MobileBirthDateInput({
  value,
  onChange,
  min,
  max,
  className,
  required,
  onBlur,
  setTouched,
  isInvalid,
  clearIconSize = 14,
  ...rest
}) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) setDisplay(isoToDisplay(value));
  }, [value]);

  const commitDigits = (digits) => {
    setDisplay(formatFromDigits(digits));
    if (digits.length === 8) {
      const iso = digitsToIso(digits);
      if (iso && inRange(iso, min, max)) onChange(iso);
    } else if (digits.length === 0) {
      onChange('');
    }
  };

  const handleChange = (e) => {
    editingRef.current = true;
    const newDigits = e.target.value.replace(/\D/g, '');
    const oldDigits = display.replace(/\D/g, '');
    const digits = newDigits.length < oldDigits.length
      ? newDigits.slice(0, 8)
      : validatePartialDigits(newDigits.slice(0, 8));
    commitDigits(digits);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const iso = parsePastedDate(e.clipboardData.getData('text'));
    if (iso && inRange(iso, min, max)) {
      editingRef.current = false;
      onChange(iso);
      setDisplay(isoToDisplay(iso));
    }
  };

  const handleBlur = (e) => {
    editingRef.current = false;
    setTouched(true);
    const digits = display.replace(/\D/g, '');
    if (digits.length === 0) {
      onChange('');
      setDisplay('');
    } else if (digits.length === 8) {
      const iso = digitsToIso(digits);
      if (iso && inRange(iso, min, max)) {
        if (iso !== value) onChange(iso);
        setDisplay(isoToDisplay(iso));
      } else {
        setDisplay(isoToDisplay(value));
      }
    }
    onBlur?.(e);
  };

  const handleClear = () => {
    editingRef.current = false;
    setDisplay('');
    onChange('');
    setTouched(true);
  };

  return (
    <div className={`relative${isInvalid ? ' field-invalid' : ''}`}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="ДД.ММ.РРРР"
        value={display}
        required={required}
        maxLength={10}
        className={`birth-date-input w-full pr-10 ${className}`.trim()}
        onChange={handleChange}
        onPaste={handlePaste}
        onBlur={handleBlur}
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-silver hover:text-midnight"
          aria-label="Очистити дату"
        >
          <X size={clearIconSize} />
        </button>
      )}
    </div>
  );
}

export function BirthDateInput({
  value,
  onChange,
  min,
  max,
  className = '',
  required,
  children,
  onBlur,
  ...rest
}) {
  const [touched, setTouched] = useState(false);
  const isDesktop = useIsDesktop();
  const isEmpty = !value;
  const hasValidValue = !!(value && inRange(value, min, max));
  const isInvalid = touched && !hasValidValue;

  const handleDesktopBlur = (e) => {
    setTouched(true);
    onBlur?.(e);
  };

  if (isDesktop) {
    return (
      <div className={`relative${isInvalid ? ' field-invalid' : ''}`}>
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          required={required}
          className={`birth-date-input w-full pr-10${isEmpty ? ' birth-date-empty' : ''} ${className}`.trim()}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleDesktopBlur}
          {...rest}
        />
        <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-silver pointer-events-none" />
        {children}
      </div>
    );
  }

  return (
    <MobileBirthDateInput
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      className={className}
      required={required}
      onBlur={onBlur}
      setTouched={setTouched}
      isInvalid={isInvalid}
      clearIconSize={14}
      {...rest}
    />
  );
}

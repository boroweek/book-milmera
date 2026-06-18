import { useState, useEffect } from 'react';

const isoToDisplay = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

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

const formatDigits = (digits) => {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
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
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setDisplay(isoToDisplay(value));
  }, [value]);

  const commitDigits = (digits) => {
    const formatted = formatDigits(digits);
    setDisplay(formatted);
    if (digits.length === 8) {
      const iso = digitsToIso(digits);
      onChange(iso && inRange(iso, min, max) ? iso : '');
    } else {
      onChange('');
    }
  };

  const handleChange = (e) => {
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
      onChange(iso);
      setDisplay(isoToDisplay(iso));
    }
  };

  const handleBlur = (e) => {
    setTouched(true);
    onBlur?.(e);
  };

  const digits = display.replace(/\D/g, '');
  const iso = digits.length === 8 ? digitsToIso(digits) : null;
  const hasValidValue = !!(iso && inRange(iso, min, max));
  const isInvalid = touched && !hasValidValue;

  return (
    <div className={`relative${isInvalid ? ' field-invalid' : ''}`}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="ДД.ММ.РРРР"
        value={display}
        required={required}
        maxLength={10}
        className={`birth-date-input ${className}`.trim()}
        onChange={handleChange}
        onPaste={handlePaste}
        onBlur={handleBlur}
        {...rest}
      />
      {children}
    </div>
  );
}

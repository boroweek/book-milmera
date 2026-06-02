import { ChevronDown } from 'lucide-react';

export function SelectWithCustom({
  options,
  value,
  customValue = '',
  onChange,
  onCustomChange,
  onReset,
  placeholder = 'Введіть значення',
  otherLabel = 'Інше...',
  name,
  autoComplete = 'off',
}) {
  const isCustom = value === '__other__' || (value !== '' && !options.includes(value));

  if (isCustom) {
    const displayValue = value === '__other__' ? customValue : value;
    return (
      <div className="flex items-center gap-2 px-4">
        <input
          name={name}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={displayValue}
          onChange={e => onCustomChange(e.target.value)}
          className="w-full bg-transparent text-sm font-medium text-midnight outline-none placeholder:text-silver"
        />
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 text-silver hover:text-midnight text-base leading-none"
        >
          ↩
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-4 bg-transparent text-sm font-medium text-midnight outline-none placeholder:text-silver appearance-none cursor-pointer ${value == '' ? '[:not(:focus)]:text-silver' : '' }`}
      >
        <option value="">Оберіть...</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
        <option value="__other__">{otherLabel}</option>
      </select>
      <ChevronDown
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal pointer-events-none"
      />
    </div>
  );
}
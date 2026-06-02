export function BirthDateInput({
  value,
  onChange,
  min,
  max,
  className = '',
  required,
  children,
  ...rest
}) {
  const isEmpty = !value;

  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        className={`birth-date-input${isEmpty ? ' birth-date-empty' : ''} ${className}`.trim()}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {children}
    </div>
  );
}

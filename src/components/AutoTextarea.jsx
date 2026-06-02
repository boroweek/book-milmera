import { useEffect, useRef, useState } from 'react';

export function AutoTextarea({ maxRows = 8, className = '', ...props }) {
  const ref = useRef(null);
  const [minRows, setMinRows] = useState(2);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const updateRows = (e) => setMinRows(e.matches ? 1 : 2);
    
    setMinRows(mql.matches ? 1 : 2);
    mql.addEventListener('change', updateRows);
    return () => mql.removeEventListener('change', updateRows);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.rows = minRows;
    
    const style = window.getComputedStyle(el);
    const lineHeight = parseInt(style.lineHeight);
    const paddingTop = parseInt(style.paddingTop);
    const paddingBottom = parseInt(style.paddingBottom);
    
    const innerHeight = el.scrollHeight - paddingTop - paddingBottom;
    const currentRows = Math.ceil(innerHeight / lineHeight);

    el.rows = Math.min(Math.max(currentRows, minRows), maxRows);
  }, [props.value, minRows, maxRows]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      style={{ resize: 'none', overflow: 'hidden' }}
      className={className}
      {...props}
    />
  );
}
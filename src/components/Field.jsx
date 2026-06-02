import { useState } from 'react';

export function Field({ label, children, required = false, hint }) {
  const [showHint, setShowHint] = useState(false);
  return (
    <div className="relative bg-white border border-silver/40 rounded-2xl pt-3 pb-2.5 focus-within:border-blue focus-within:ring-3 focus-within:ring-blue/10 group">
      <div className="flex items-center justify-between px-5 mb-1">
        <span className="text-[11px] font-medium text-silver uppercase tracking-widest group-focus-within:text-midnight">
          {label}
          {required && (
            <span className="pl-0.5 font-bolder text-red text-[12px] leading-[0.5]">*</span>
          )}
        </span>
        {hint && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowHint(v => !v)}
              className="w-5 h-5 flex items-center justify-center rounded-full bg-[#eef1f4] text-midnight hover:bg-blue/20 hover:text-blue transition-colors text-[12px] font-bold focus:outline-none">
              ?
            </button>
            {showHint && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowHint(false)}/>
                <div className="absolute right-0 bottom-6 z-20 w-72 bg-[#eef1f4] rounded-2xl shadow-2xl p-3 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-silver mb-2">Приклади</p>
                  {hint.map((ex, i) => (
                    <p key={i} className="text-sm font-medium leading-snug text-midnight border-b border-charcoal/10 pb-1.5 last:border-0 last:pb-0">
                      {ex}
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
import { ShieldCheck, AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LogoGroup } from '../components/LogoGroup';

const ERROR_MESSAGES = {
  'not_found':                   'Цей акаунт не знайдено в системі. Зверніться до адміністратора.',
  'auth/operation-not-allowed':  'Google Sign-In не увімкнено. Зверніться до адміністратора.',
  'auth/unauthorized-domain':    'Домен не авторизований у Firebase.',
  'auth/popup-blocked':          'Браузер заблокував вікно входу. Дозвольте popup і спробуйте ще раз.',
  'auth/network-request-failed': "Немає з'єднання з інтернетом.",
  'auth/missing-initial-state':  'Не вдалося завершити вхід (обмеження браузера або домену). Відкрийте посилання в Safari/Chrome, не у вбудованому браузері, або оновіть сторінку.',
  'firestore_error':             'Помилка доступу до бази даних. Перевірте Firebase Rules.',
};

function CirclesBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <style>{`
        @keyframes float-1 { 0%,100%{transform:translate(0,0)}    50%{transform:translate(40px,-50px)}  }
        @keyframes float-2 { 0%,100%{transform:translate(0,0)}    50%{transform:translate(-50px,35px)}  }
        @keyframes float-3 { 0%,100%{transform:translate(0,0)}    50%{transform:translate(30px,55px)}   }
        @keyframes float-4 { 0%,100%{transform:translate(0,0)}    50%{transform:translate(-40px,-45px)} }
        @keyframes float-5 { 0%,100%{transform:translate(0,0)}    50%{transform:translate(55px,30px)}   }
        @keyframes float-6 { 0%,100%{transform:translate(0,0)}    50%{transform:translate(-35px,60px)}  }
        @keyframes float-7 { 0%,100%{transform:translate(0,0)}    50%{transform:translate(45px,-40px)}  }
      `}</style>
      <div style={{ position:'absolute', top:'-30%', left:'-20%', width:'68vw', height:'68vw', borderRadius:'50%', border:'2px solid rgba(97,121,250,0.18)', animation:'float-1 18s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', top:'-18%', left:'-8%',  width:'48vw', height:'48vw', borderRadius:'50%', border:'1px solid rgba(97,121,250,0.10)', animation:'float-2 24s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', bottom:'-32%', right:'-22%', width:'75vw', height:'75vw', borderRadius:'50%', border:'2px solid rgba(218,251,89,0.20)', animation:'float-4 22s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:'54vw', height:'54vw', borderRadius:'50%', border:'1px solid rgba(218,251,89,0.12)', animation:'float-5 16s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', top:'15%',  right:'-24%', width:'58vw', height:'58vw', borderRadius:'50%', border:'1.5px solid rgba(155,163,175,0.12)', animation:'float-7 26s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', top:'30%', left:'-18%', width:'44vw', height:'44vw', borderRadius:'50%', border:'1px solid rgba(97,121,250,0.09)', animation:'float-3 28s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', bottom:'-10%', left:'-10%', width:'32vw', height:'32vw', borderRadius:'50%', border:'1px solid rgba(218,251,89,0.13)', animation:'float-2 17s ease-in-out infinite' }}/>
    </div>
  );
}

export default function LoginPage() {
  const { user, medicError, authError, loginWithGoogle, logout, authLoading } = useAuth();

  if (authLoading) return (
    <div className="min-h-dvh flex items-center justify-center bg-snow">
      <div className="w-10 h-10 border-4 border-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const errorKey = medicError === 'auth_error' ? authError : medicError;
  const errorMessage = errorKey ? (ERROR_MESSAGES[errorKey] || `Помилка: ${errorKey}`) : null;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-snow relative overflow-hidden">
      <CirclesBackground />

      <div className="w-full max-w-sm space-y-6 relative" style={{ zIndex: 1 }}>
        <div className="flex justify-center">
          <LogoGroup size={18} className="text-lime" />
        </div>

        <div className="bg-white rounded-3xl overflow-hidden shadow-md">
          <div className="px-8 py-6 bg-light-blue">
            <div className="flex items-center justify-center gap-2 mb-1">
              <ShieldCheck size={14} className="text-charcoal" />
              <p className="text-xs font-semibold text-charcoal uppercase tracking-widest">Доступ обмежено</p>
            </div>
            <p className="text-2xl font-normal text-midnight leading-wide text-center">Авторизація</p>
          </div>

          <div className="px-8 py-6 space-y-4">
            <p className="text-sm font-medium text-silver text-center">
              Увійдіть за допомогою Google-акаунту, зареєстрованого в системі.
            </p>

            {errorMessage && (
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-light-red border border-red/20 rounded-2xl">
                  <AlertCircle size={14} className="text-red shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-red leading-snug">{errorMessage}</p>
                </div>
                {user && (
                  <button onClick={logout}
                    className="w-full flex items-center justify-center gap-2 h-10 bg-snow text-charcoal rounded-full font-semibold text-sm hover:opacity-80 transition-all">
                    <LogOut size={14} /> Вийти з акаунту
                  </button>
                )}
              </div>
            )}

            {!user && (
              <button onClick={loginWithGoogle}
                className="w-full flex items-center justify-center gap-3 h-12 bg-snow hover:bg-blue hover:text-white text-midnight rounded-full font-semibold text-sm transition-all active:scale-95 group">
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  className="w-5 h-5 group-hover:brightness-0 group-hover:invert transition-all"
                  alt="Google"
                />
                Увійти через Google
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] font-semibold text-silver uppercase tracking-widest">
          MILMERA © 2026
        </p>
      </div>
    </div>
  );
}

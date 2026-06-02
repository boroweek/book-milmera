import { createContext, useContext, useEffect, useState } from 'react';
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../api/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [medic, setMedic]             = useState(null);
  const [displayUser, setDisplayUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [medicError, setMedicError]   = useState(null);
  const [authError, setAuthError]     = useState(null);

  useEffect(() => {
    let unsub = () => {};

    (async () => {
      try {
        await getRedirectResult(auth);
      } catch (err) {
        const msg = err?.message || '';
        if (msg.includes('missing initial state')) {
          setAuthError('auth/missing-initial-state');
          setMedicError('auth_error');
        }
      }

      unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          setUser(null); setMedic(null); setDisplayUser(null);
          setAuthLoading(false);
          return;
        }
        setUser(firebaseUser);
        try {
          const q = query(collection(db, 'medics'), where('email', '==', firebaseUser.email));
          const snap = await getDocs(q);

          if (!snap.empty) {
            const medicDoc  = snap.docs[0];
            const medicData = medicDoc.data();

            if (medicData.uid !== firebaseUser.uid) {
              await updateDoc(medicDoc.ref, { uid: firebaseUser.uid });
            }

            await setDoc(doc(db, 'medic_uids', firebaseUser.uid), { active: true }, { merge: true });

            const profile = {
              ...medicData,
              id: medicDoc.id,
              uid: firebaseUser.uid,
              head: medicData.head === true,
            };

            if (medicData.isTablo === true) {
              setDisplayUser(profile);
              setMedic(null);
            } else {
              setMedic(profile);
              setDisplayUser(null);
            }
            setMedicError(null);
          } else {
            setMedic(null);
            setDisplayUser(null);
            setMedicError('not_found');
          }
        } catch (err) {
          setMedic(null);
          setDisplayUser(null);
          setMedicError('firestore_error');
          setAuthError(err.code || err.message);
        }
        setAuthLoading(false);
      });
    })();

    return () => unsub();
  }, []);

  const loginWithGoogle = async () => {
    setMedicError(null); setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = err.code || '';
      const msg = err.message || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      if (msg.includes('missing initial state')) {
        setAuthError('auth/missing-initial-state');
        setMedicError('auth_error');
        return;
      }
      setAuthError(code || err.message);
      setMedicError('auth_error');
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null); setMedic(null); setDisplayUser(null);
    setMedicError(null); setAuthError(null);
  };

  return (
    <AuthContext.Provider value={{
      user, medic, displayUser, authLoading, medicError, authError,
      loginWithGoogle, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

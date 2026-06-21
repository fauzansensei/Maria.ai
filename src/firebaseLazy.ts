let corePromise: Promise<{
  auth: typeof import('./firebase')['auth'];
  db: typeof import('./firebase')['db'];
  googleProvider: typeof import('./firebase')['googleProvider'];
  authFns: typeof import('firebase/auth');
  fsFns: typeof import('firebase/firestore');
  handleFirestoreError: typeof import('./firebase')['handleFirestoreError'];
  setSimulatedAuthActive: typeof import('./firebase')['setSimulatedAuthActive'];
  isSimulatedAuthActive: typeof import('./firebase')['isSimulatedAuthActive'];
  isThirdPartyCookieBlocked: typeof import('./firebase')['isThirdPartyCookieBlocked'];
}> | null = null;

export function loadFirebase() {
  if (!corePromise) {
    corePromise = (async () => {
      const [core, authFns, fsFns] = await Promise.all([
        import('./firebase'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      return { 
        auth: core.auth, 
        db: core.db, 
        googleProvider: core.googleProvider, 
        handleFirestoreError: core.handleFirestoreError,
        setSimulatedAuthActive: core.setSimulatedAuthActive,
        isSimulatedAuthActive: core.isSimulatedAuthActive,
        isThirdPartyCookieBlocked: core.isThirdPartyCookieBlocked,
        authFns, 
        fsFns 
      };
    })();
  }
  return corePromise;
}

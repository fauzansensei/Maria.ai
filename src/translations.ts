import i18n from './i18n';

export const getTranslation = (lang: string) => {
  // Ensure i18n is using the correct language
  if (i18n.language !== lang) {
    i18n.changeLanguage(lang);
  }

  const createProxy = (path: string = ''): any => {
    return new Proxy({}, {
      get(target, prop) {
        // Allow access to common methods for React and JS conversion
        if (prop === 'toString' || prop === 'valueOf' || prop === Symbol.toPrimitive) {
          return () => i18n.t(path);
        }

        if (typeof prop !== 'string') return undefined;

        const newPath = path ? `${path}.${prop}` : prop;
        const val = i18n.t(newPath, { returnObjects: true });
        
        if (typeof val === 'string') {
          return val;
        }
        
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          // If it's an object, it's a nested structure, return a proxy
          return createProxy(newPath);
        }

        // Fallback: return the value from i18n.t (likely the key string if missing)
        return val;
      }
    });
  };

  return createProxy();
};

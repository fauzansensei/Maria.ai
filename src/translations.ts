import i18n from './i18n';

export const getTranslation = (lang: string) => {
  // Ensure i18n is using the correct language
  if (i18n.language !== lang) {
    i18n.changeLanguage(lang);
  }

  // Create a proxy to allow t.key syntax while using i18n.t(key)
  const proxy = new Proxy({}, {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined;

      // Handle nested chatGroups
      if (prop === 'chatGroups') {
        return new Proxy({}, {
          get(targetGroup, propGroup) {
            if (typeof propGroup !== 'string') return undefined;
            return i18n.t(`chatGroups.${propGroup}`);
          }
        });
      }

      return i18n.t(prop);
    }
  });

  return proxy as any;
};

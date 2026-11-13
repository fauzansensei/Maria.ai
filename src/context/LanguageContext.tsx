import React, { createContext, useContext, useEffect, useMemo } from 'react';

export type AppLanguage = 'Indonesia' | 'English';

interface LanguageContextType {
  language: AppLanguage;
  isEn: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'Indonesia',
  isEn: false,
});

export const LanguageProvider: React.FC<{
  language: AppLanguage;
  children: React.ReactNode;
}> = ({ language, children }) => {
  const isEn = language === 'English';

  useEffect(() => {
    try {
      document.documentElement.lang = isEn ? 'en' : 'id';
    } catch {}
  }, [isEn]);

  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      isEn,
    }),
    [language, isEn]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

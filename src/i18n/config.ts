import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './locales/fr.json';
import en from './locales/en.json';

/**
 * Configuration i18next.
 *
 * Francais par defaut, coherent avec le contexte camerounais et
 * l'ensemble de l'application construite jusqu'ici — l'anglais est une
 * option, jamais le point de depart. LanguageDetector cherche d'abord
 * un choix deja enregistre (localStorage), puis la langue du
 * navigateur, et ne retombe sur le francais que faute des deux.
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },   // React echappe deja le JSX
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'sogeco-language',
    },
  });

export default i18n;

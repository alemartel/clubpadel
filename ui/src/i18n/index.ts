import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enProfile from '../locales/en/profile.json';
import enAdmin from '../locales/en/admin.json';
import enNavigation from '../locales/en/navigation.json';
import enTeams from '../locales/en/teams.json';
import enLeagues from '../locales/en/leagues.json';
import enPlayers from '../locales/en/players.json';
import enEvents from '../locales/en/events.json';

import esCommon from '../locales/es/common.json';
import esAuth from '../locales/es/auth.json';
import esProfile from '../locales/es/profile.json';
import esAdmin from '../locales/es/admin.json';
import esNavigation from '../locales/es/navigation.json';
import esTeams from '../locales/es/teams.json';
import esLeagues from '../locales/es/leagues.json';
import esPlayers from '../locales/es/players.json';
import esEvents from '../locales/es/events.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    profile: enProfile,
    admin: enAdmin,
    navigation: enNavigation,
    teams: enTeams,
    leagues: enLeagues,
    players: enPlayers,
    events: enEvents,
  },
  es: {
    common: esCommon,
    auth: esAuth,
    profile: esProfile,
    admin: esAdmin,
    navigation: esNavigation,
    teams: esTeams,
    leagues: esLeagues,
    players: esPlayers,
    events: esEvents,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    // Namespace configuration
    defaultNS: 'common',
    ns: ['common', 'auth', 'profile', 'admin', 'navigation', 'teams', 'leagues', 'players', 'events'],

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // React i18next options
    react: {
      useSuspense: false, // Disable suspense for better UX
    },
  });

export default i18n;

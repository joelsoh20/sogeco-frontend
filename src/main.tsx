import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App';
import './i18n/config';
// Import explicite et en tete : ce module pose la classe "dark" sur
// <html> des son evaluation, avant meme le premier rendu React. Sans
// cet import precoce, la classe ne serait posee qu'au moment ou
// Topbar (le premier composant a utiliser ce store) se monte —
// suffisamment tard pour qu'un flash de theme clair soit visible chez
// quelqu'un ayant choisi le sombre.
import './store/themeStore';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/*
      reducedMotion="user" : chaque animation Motion de l'application
      consulte automatiquement la preference systeme prefers-reduced-motion.
      Aucun composant n'a besoin de la verifier lui-meme.
    */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </React.StrictMode>,
);

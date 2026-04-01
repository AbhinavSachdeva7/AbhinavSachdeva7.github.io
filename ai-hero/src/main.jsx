import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Hero from './Hero.jsx';
import '../css/hero.css';

createRoot(document.getElementById('ai-hero')).render(
  <StrictMode>
    <Hero />
  </StrictMode>
);

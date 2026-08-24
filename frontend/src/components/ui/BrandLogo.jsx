import React from 'react';

// Componente de Logo Reutilizable (SVG)
// Si más adelante usas una imagen real (.png o .jpg), reemplaza el <svg>
// por: <img src="/ruta-a-tu-logo.png" alt="Logo Ferré Control" className={sizeClass} />
export const BrandLogo = ({ isLarge = false, className = "", isDarkMode = false }) => {
  const sizeClass = isLarge ? 'w-16 h-16 mb-3' : 'w-10 h-10 mb-2';
  const textSizeClass = isLarge ? 'text-4xl' : 'text-2xl';
  const badgeClass = isLarge ? 'px-6 py-5 rounded-3xl ring-4 ring-white/10' : 'px-4 py-4 rounded-2xl';
  const cardClass = isDarkMode
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-gray-100';
  const textClass = isDarkMode ? 'text-white' : 'text-slate-800';

  return (
    <div className={`${cardClass} shadow-xl flex flex-col items-center justify-center border relative transition-colors duration-300 ${badgeClass} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" className={sizeClass}>
        <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" fill="#1e293b" />
        <polygon points="50,11 85,31 85,69 50,89 15,69 15,31" fill="none" stroke="#22c55e" strokeWidth="2" />

        <g transform="rotate(45 50 50)">
          <rect x="43" y="35" width="14" height="40" fill="#94a3b8" rx="2" />
          <path d="M 35 25 C 35 10 65 10 65 25 L 55 25 C 55 18 45 18 45 25 Z" fill="#cbd5e1" />
          <path d="M 35 25 L 43 35 L 57 35 L 65 25 Z" fill="#cbd5e1" />
          <circle cx="50" cy="70" r="4" fill="#1e293b" />
        </g>

        <g transform="rotate(-45 50 50)">
          <rect x="44" y="35" width="12" height="40" fill="#64748b" rx="2" />
          <path d="M 30 20 H 70 V 35 H 30 Z" fill="#f1f5f9" rx="2" />
          <path d="M 25 22 H 30 V 33 H 25 Z" fill="#cbd5e1" rx="1" />
        </g>

        <circle cx="50" cy="50" r="5" fill="#22c55e" />
      </svg>
      <div className="text-center flex flex-col items-center">
        <span className={`${textSizeClass} font-black ${textClass} tracking-widest leading-none drop-shadow-sm transition-colors duration-300`}>FERRÉ</span>
        <span className={`text-[10px] sm:text-xs font-bold tracking-[0.25em] mt-1 border rounded px-2 py-0.5 transition-colors duration-300 ${isDarkMode ? 'text-green-400 border-green-800 bg-green-900/20' : 'text-green-700 border-green-200 bg-green-50'}`}>CONTROL</span>
      </div>
    </div>
  );
};

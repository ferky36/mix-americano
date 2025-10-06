"use strict";
// ================== Theme ================== //
// Ikon sun & moon (SVG) + updater tombol
function __themeSunSVG(){
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.657-6.343 1.414-1.414M4.929 19.071l1.414-1.414m0-11.314L4.93 4.93m14.142 14.142-1.414-1.414M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>';
}
function __themeMoonSVG(){
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
}
function updateThemeToggleIcon(){
  const btn = byId('btnTheme'); if (!btn) return;
  const isDark = document.documentElement.classList.contains('dark');
  btn.innerHTML = isDark ? __themeMoonSVG() : __themeSunSVG();
  const label = isDark ? 'Dark mode' : 'Light mode';
  btn.setAttribute('aria-label', label);
  btn.setAttribute('title', label);
}

function applyThemeFromStorage() {
  const t = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.classList.toggle("dark", t === "dark"); try{ updateThemeToggleIcon(); }catch{}
}
function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); try{ updateThemeToggleIcon(); }catch{}
}

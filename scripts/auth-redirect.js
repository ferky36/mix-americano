"use strict";
// ======== Auth Redirect Helper (GitHub Pages base) ========
// Paksa magic link selalu redirect ke GitHub Pages (bukan localhost)
const APP_BASE_URL = 'https://ferky36.github.io/mix-americano';
function getAuthRedirectURL(){
  return APP_BASE_URL + (location.search || '');
}

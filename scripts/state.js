"use strict";
// ================== State ================== //
let activeCourt = 0;                      // index lapangan aktif
let roundsByCourt = [ [] ];               // array of courts, masing2 array rounds
let players = [];
let currentMaxPlayers = null; // null = unlimited; otherwise positive integer
let dirty=false, autosaveTimer=null;
let store = { sessions:{}, lastTs:null };
const THEME_KEY='mix-americano-theme';
let playerMeta = {}; // { "Nama": { gender:"M"|"F"|"", level:"beg"|"pro"|"" }, ... }
const SCORE_MAXLEN = 2; // ubah ke 3 kalau perlu
let scoreCtx = {
  court: 0,
  round: 0,
  a: 0,
  b: 0,
  timerId: null,      // ⬅️ baru
  remainMs: 0,        // ⬅️ baru (millisecond)
  running: false      // ⬅️ baru
};

"use strict";

(function(){
  const builtinTranslations = {
    "header.menu": { "id": "Menu", "en": "Menu" },
    "header.save": { "id": "Simpan", "en": "Save" },
    "header.makeLink": { "id": "Buat Link Event", "en": "Create Event Link" },
    "header.share": { "id": "Share / Undang", "en": "Share / Invite" },
    "header.report": { "id": "Report", "en": "Report" },
    "header.cashflow": { "id": "Arus Kas", "en": "Cashflow" },
    "header.leave": { "id": "Keluar Event", "en": "Leave Event" },
    "header.filterToggle": { "id": "Filter / Jadwal", "en": "Filter / Schedule" },
    "settings.title": { "id": "Pengaturan", "en": "Settings" },
    "settings.save": { "id": "Simpan", "en": "Save" },
    "settings.close": { "id": "Tutup", "en": "Close" },
    "settings.date": { "id": "Tanggal", "en": "Date" },
    "settings.start": { "id": "Mulai", "en": "Start" },
    "settings.minutes": { "id": "Menit / Match", "en": "Minutes / Match" },
    "settings.break": { "id": "Jeda per Match (menit)", "en": "Break per Match (minutes)" },
    "settings.rounds": { "id": "Match / Lapangan", "en": "Match / Court" },
    "settings.maxPlayers": { "id": "Max Pemain", "en": "Max Players" },
    "settings.maxPlayers.placeholder": { "id": "0 = tak terbatas", "en": "0 = unlimited" },
    "settings.locText": { "id": "Lokasi (opsional)", "en": "Location (optional)" },
    "settings.locText.placeholder": { "id": "Mis. Lapangan A, GBK", "en": "e.g. Court A, Venue" },
    "settings.locUrl": { "id": "Link Maps (opsional)", "en": "Maps Link (optional)" },
    "settings.locUrl.placeholder": { "id": "https://maps.app.goo.gl/...", "en": "https://maps.app.goo.gl/..." },
    "settings.joinDate": { "id": "Buka Join (tanggal)", "en": "Open Join (date)" },
    "settings.joinTime": { "id": "Buka Join (waktu)", "en": "Open Join (time)" },
    "settings.htm": { "id": "HTM", "en": "Fee" },
    "settings.toastSaved": { "id": "Pengaturan disimpan", "en": "Settings saved" },
    "settings.toastFailed": { "id": "Gagal menyimpan pengaturan", "en": "Failed to save settings" },
    "settings.button": { "id": "Pengaturan", "en": "Settings" },
    "filter.date": { "id": "Tanggal", "en": "Date" },
    "filter.start": { "id": "Mulai", "en": "Start" },
    "filter.minutes": { "id": "Menit/Match", "en": "Minutes/Match" },
    "filter.break": { "id": "Jeda/Match (menit)", "en": "Break/Match (minutes)" },
    "filter.showBreakRows": { "id": "Tampilkan baris jeda", "en": "Show break rows" },
    "filter.rounds": { "id": "Match/Lapangan", "en": "Matches/Court" },
    "players.collapse": { "id": "▼ Pemain", "en": "▼ Players" },
    "players.collapseHint": { "id": "klik untuk expand/collapse", "en": "click to expand/collapse" },
    "players.editText": { "id": "Edit sebagai teks", "en": "Edit as text" },
    "players.applyTemplate": { "id": "Apply Template Pemain", "en": "Apply Player Template" },
    "players.clear": { "id": "Kosongkan", "en": "Clear" },
    "players.new.placeholder": { "id": "Nama pemain…", "en": "Player name…" },
    "players.add": { "id": "Tambah", "en": "Add" },
    "players.text.placeholder": { "id": "Satu nama per baris", "en": "One name per line" },
    "players.applyText": { "id": "Terapkan", "en": "Apply" },
    "players.cancel": { "id": "Batal", "en": "Cancel" },
    "players.label": { "id": "Pemain", "en": "Players" },
    "players.paid": { "id": "Sudah bayar", "en": "Paid" },
    "players.waitingList": { "id": "Waiting List", "en": "Waiting List" },
    "players.promoteAll": { "id": "Promote semua", "en": "Promote all" },
    "players.heading": { "id": "Daftar Pemain", "en": "Players List" },
    "players.deleteBtn": { "id": "hapus", "en": "delete" },
    "players.deleteConfirm": { "id": "Hapus", "en": "Delete" },
    "players.gender.placeholder": { "id": "-Pilih Gender-", "en": "-Select Gender-" },
    "players.level.beginner": { "id": "Beginner", "en": "Beginner" },
    "players.level.pro": { "id": "Pro", "en": "Pro" },
    "players.edit": { "id": "edit", "en": "edit" },
    "players.editTitle": { "id": "Rename pemain", "en": "Rename player" },
    "players.markPaid": { "id": "Tandai sudah bayar", "en": "Mark as paid" },
    "players.markUnpaid": { "id": "Tandai belum bayar", "en": "Mark as unpaid" },
    "players.waiting.promoteTitle": { "id": "Promote dari waiting list", "en": "Promote from waiting list" },
    "players.composition.title": { "id": "Komposisi Pemain", "en": "Player Composition" },
    "players.composition.total": { "id": "Total {count}", "en": "Total {count}" },
    "pairing.mode.free": { "id": "Mode Pairing: Bebas", "en": "Pairing Mode: Free" },
    "pairing.mode.mixed": { "id": "Mixed Gender (M+F vs M+F)", "en": "Mixed Gender (M+F vs M+F)" },
    "pairing.mode.balance": { "id": "Level Balance (beg+pro vs beg+pro)", "en": "Level Balance (beg+pro vs beg+pro)" },
    "pairing.mode.same": { "id": "Level Sama (beg vs beg, pro vs pro)", "en": "Same Level (beg vs beg, pro vs pro)" },
    "controls.applyActive": { "id": "Terapkan (Lapangan Aktif) & Auto Pasangan", "en": "Apply (Active Court) & Auto Pair" },
    "controls.resetActive": { "id": "♻️ Reset Lapangan Aktif", "en": "♻️ Reset Active Court" },
    "controls.clearActive": { "id": "Clear Skor (Lapangan Aktif)", "en": "Clear Scores (Active Court)" },
    "controls.clearAll": { "id": "Clear Skor (Semua Lapangan)", "en": "Clear Scores (All Courts)" },
    "controls.addCourt": { "id": "＋ Tambah Lapangan", "en": "＋ Add Court" },
    "standings.title": { "id": "Klasemen", "en": "Standings" },
    "standings.rank": { "id": "Rank", "en": "Rank" },
    "standings.player": { "id": "Pemain", "en": "Player" },
    "standings.total": { "id": "Total", "en": "Total" },
    "standings.diff": { "id": "Selisih", "en": "Difference" },
    "standings.w": { "id": "W", "en": "W" },
    "standings.l": { "id": "L", "en": "L" },
    "standings.d": { "id": "D", "en": "D" },
    "standings.winrate": { "id": "WinRate", "en": "WinRate" },
    "standings.rules.title": { "id": "📊 Aturan Ranking", "en": "📊 Ranking Rules" },
    "standings.rules.total": { "id": "— pemain dengan poin total lebih tinggi berada di peringkat lebih atas.", "en": "— players with higher total points rank above others." },
    "standings.rules.diff": { "id": "— jika Total sama, peringkat ditentukan oleh selisih skor (point for – point against). Lebih besar → lebih tinggi.", "en": "— if Total ties, rank by score difference (points for – points against). Larger → higher." },
    "standings.rules.wins": { "id": "— jika Total & Selisih sama, dilihat jumlah kemenangan (W). Lebih banyak → lebih tinggi.", "en": "— if Total & Difference tie, rank by wins (W). More wins → higher." },
    "standings.rules.alphabet": { "id": "Jika semua sama → diurutkan alfabetis nama pemain.", "en": "If still tied → sort by player name alphabetically." },
    "report.title": { "id": "Report Klasemen (Multi Tanggal)", "en": "Standings Report (Multiple Dates)" },
    "report.close": { "id": "Tutup", "en": "Close" },
    "report.from": { "id": "Dari", "en": "From" },
    "report.to": { "id": "Sampai", "en": "To" },
    "report.court": { "id": "Lapangan", "en": "Court" },
    "report.court.both": { "id": "Keduanya", "en": "Both" },
    "report.court.one": { "id": "Hanya Lap 1", "en": "Only Court 1" },
    "report.court.two": { "id": "Hanya Lap 2", "en": "Only Court 2" },
    "report.run": { "id": "Tampilkan", "en": "Show" },
    "report.main": { "id": "Main", "en": "Played" },
    "report.exportExcel": { "id": "Export Excel", "en": "Export Excel" },
    "cash.title": { "id": "Arus Kas Event", "en": "Event Cashflow" },
    "cash.exportExcel": { "id": "Export Excel", "en": "Export Excel" },
    "cash.exportPDF": { "id": "Export PDF", "en": "Export PDF" },
    "cash.close": { "id": "Tutup", "en": "Close" },
    "cash.start": { "id": "Start", "en": "Start" },
    "cash.end": { "id": "End", "en": "End" },
    "cash.applyRange": { "id": "Terapkan", "en": "Apply" },
    "cash.clearRange": { "id": "Reset", "en": "Reset" },
    "cash.rangeHint": { "id": "Isi tanggal Start–End untuk melihat kas dari semua event dalam rentang tersebut (Cloud saja).", "en": "Fill Start–End to view cash across events in that range (Cloud only)." },
    "cash.sumIn": { "id": "Uang Masuk", "en": "Cash In" },
    "cash.sumOut": { "id": "Uang Keluar", "en": "Cash Out" },
    "cash.sumRemain": { "id": "Sisa", "en": "Balance" },
    "cash.inTitle": { "id": "Uang Masuk", "en": "Cash In" },
    "cash.inRows": { "id": "0 baris", "en": "0 rows" },
    "cash.inAdd": { "id": "Tambah", "en": "Add" },
    "cash.outTitle": { "id": "Uang Keluar", "en": "Cash Out" },
    "cash.outRows": { "id": "0 baris", "en": "0 rows" },
    "cash.outAdd": { "id": "Tambah", "en": "Add" },
    "cash.table.source": { "id": "Source", "en": "Source" },
    "cash.table.items": { "id": "Items", "en": "Items" },
    "cash.table.amount": { "id": "Amount", "en": "Amount" },
    "cash.table.pax": { "id": "Pax", "en": "Pax" },
    "cash.table.total": { "id": "Total", "en": "Total" },
    "cash.form.title": { "id": "Tambah", "en": "Add" },
    "cash.form.label": { "id": "Keterangan", "en": "Description" },
    "cash.form.label.placeholder": { "id": "Misal: Peserta / Lapangan", "en": "e.g. Participant / Court" },
    "cash.form.amount": { "id": "Amount", "en": "Amount" },
    "cash.form.pax": { "id": "Pax", "en": "Pax" },
    "cash.form.total": { "id": "Total:", "en": "Total:" },
    "cash.form.cancel": { "id": "Batal", "en": "Cancel" },
    "cash.form.save": { "id": "Simpan", "en": "Save" },
    "cash.form.title.editIn": { "id": "Edit Uang Masuk", "en": "Edit Cash In" },
    "cash.form.title.editOut": { "id": "Edit Uang Keluar", "en": "Edit Cash Out" },
    "cash.form.title.addIn": { "id": "Tambah Uang Masuk", "en": "Add Cash In" },
    "cash.form.title.addOut": { "id": "Tambah Uang Keluar", "en": "Add Cash Out" },
    "cash.form.label.in": { "id": "Source", "en": "Source" },
    "cash.form.label.out": { "id": "Items", "en": "Items" },
    "score.title": { "id": "Hitung Skor –", "en": "Calculate Score –" },
    "score.close": { "id": "Tutup", "en": "Close" },
    "score.teamA": { "id": "Skor Tim A", "en": "Team A Score" },
    "score.teamB": { "id": "Skor Tim B", "en": "Team B Score" },
    "score.timeLeft": { "id": "Waktu tersisa:", "en": "Time left:" },
    "score.start": { "id": "Mulai", "en": "Start" },
    "score.reset": { "id": "Reset", "en": "Reset" },
    "score.finish": { "id": "Finish & Isi Ke Match", "en": "Finish & Fill Match" },
    "score.recalc": { "id": "Hitung Ulang", "en": "Recalculate" },
    "event.title": { "id": "Buat/Cari Event", "en": "Create/Search Event" },
    "event.close": { "id": "Tutup", "en": "Close" },
    "event.tabCreate": { "id": "Buat", "en": "Create" },
    "event.tabSearch": { "id": "Cari", "en": "Search" },
    "event.name": { "id": "Nama Event", "en": "Event Name" },
    "event.name.placeholder": { "id": "Mis. Mix Americano Malam", "en": "e.g. Mix Americano Night" },
    "event.date": { "id": "Tanggal", "en": "Date" },
    "event.create": { "id": "Create & Buat Link", "en": "Create & Generate Link" },
    "event.searchDate.placeholder": { "id": "Pilih tanggal…", "en": "Select a date…" },
    "event.searchEvent.label": { "id": "Event di tanggal tersebut", "en": "Events on that date" },
    "event.searchEvent.placeholder": { "id": "Pilih tanggal dulu", "en": "Select a date first" },
    "event.open": { "id": "Buka Event", "en": "Open Event" },
    "event.success": { "id": "✅ Event berhasil dibuat! Bagikan link berikut:", "en": "✅ Event created! Share the link below:" },
    "event.copy": { "id": "Copy", "en": "Copy" },
    "login.title": { "id": "Login", "en": "Login" },
    "login.close": { "id": "Tutup", "en": "Close" },
    "login.desc": { "id": "Masukkan email Anda.", "en": "Enter your email." },
    "login.send": { "id": "Kirim Link Login", "en": "Send Login Link" },
    "admin.title": { "id": "Administrator Login", "en": "Administrator Login" },
    "admin.close": { "id": "Tutup", "en": "Close" },
    "admin.desc": { "id": "Masukkan email dan password Anda.", "en": "Enter your email and password." },
    "admin.password.placeholder": { "id": "Password", "en": "Password" },
    "admin.submit": { "id": "Login", "en": "Login" },
    "admin.button": { "id": "Login as Administrator", "en": "Login as Administrator" },
    "auth.logout": { "id": "Logout", "en": "Logout" },
    "auth.signedIn": { "id": "Signed in: ", "en": "Signed in: " },
    "auth.processingLogin": { "id": "Memproses login…", "en": "Processing login…" },
    "auth.emailInvalid": { "id": "Email tidak valid.", "en": "Invalid email." },
    "auth.send": { "id": "Kirim Link Login", "en": "Send Login Link" },
    "auth.sending": { "id": "Mengirim…", "en": "Sending…" },
    "auth.sendSuccess": { "id": "Cek email Anda untuk magic link.", "en": "Check your email for the magic link." },
    "auth.sendError": { "id": "Gagal mengirim link.", "en": "Failed to send link." },
    "auth.passwordMin": { "id": "Password minimal 6 karakter.", "en": "Password must be at least 6 characters." },
    "auth.processing": { "id": "Memproses…", "en": "Processing…" },
    "auth.loginFailed": { "id": "Login gagal.", "en": "Login failed." },
    "auth.error": { "id": "Terjadi kesalahan.", "en": "An error occurred." },
    "pwa.installHeader": { "id": "Install aplikasi ke perangkat", "en": "Install app to device" },
    "pwa.installCta": { "id": "Install App", "en": "Install App" },
    "pwa.installTitle": { "id": "Install ke Perangkat", "en": "Install to Device" },
    "pwa.installHelp.ios": { "id": "Di iOS Safari: buka ikon Share, lalu pilih Add to Home Screen.", "en": "On iOS Safari: tap the Share icon, then choose Add to Home Screen." },
    "pwa.installHelp.android": { "id": "Di Chrome Android: buka menu ⋮, pilih Install app atau Add to Home screen.", "en": "On Chrome Android: open menu ⋮, choose Install app or Add to Home screen." },
    "pwa.installHelp.desktop": { "id": "Buka menu browser dan pilih Install app / Add to Home screen.", "en": "Open the browser menu and choose Install app / Add to Home screen." },
    "pwa.close": { "id": "Tutup", "en": "Close" },
    "pwa.tip.title": { "id": "Pasang ScoreMate ke perangkat?", "en": "Install ScoreMate to your device?" },
    "pwa.tip.body": { "id": "Akses lebih cepat, hemat data, bisa offline.", "en": "Faster access, saves data, works offline." },
    "pwa.tip.later": { "id": "Nanti", "en": "Later" },
    "pwa.tip.install": { "id": "Pasang", "en": "Install" },
    "players.template.confirm": { "id": "Terapkan template pemain 10 orang? Daftar sekarang akan diganti.", "en": "Apply the 10-player template? The current list will be replaced." },
    "recap.button": { "id": "Match Recap", "en": "Match Recap" },
    "recap.summary": { "id": "Rangkuman", "en": "Summary" },
    "recap.saveImage": { "id": "Simpan gambar", "en": "Save image" },
    "recap.copyText": { "id": "Salin teks", "en": "Copy text" },
    "recap.close": { "id": "Tutup", "en": "Close" },
    "recap.header": { "id": "Match Recap — Court {court}", "en": "Match Recap — Court {court}" },
    "recap.title": { "id": "Padel Match Recap", "en": "Padel Match Recap" },
    "recap.subtitle": { "id": "Analisis Performa & Strategi Pemain", "en": "Player Performance & Strategy Analysis" },
    "recap.tightLabel": { "id": "Match {round} ({teamA} vs {teamB})", "en": "Match {round} ({teamA} vs {teamB})" },
    "recap.metric.totalMatch": { "id": "Total Match", "en": "Total Matches" },
    "recap.metric.totalMatchHint": { "id": "Berapa banyak laga sudah dimainkan.", "en": "How many matches have been played." },
    "recap.metric.totalPoint": { "id": "Total Poin", "en": "Total Points" },
    "recap.metric.totalPointHint": { "id": "Akumulasi poin semua match (A+B).", "en": "Accumulated points of all matches (A+B)." },
    "recap.metric.avgMargin": { "id": "Rata Selisih", "en": "Average Margin" },
    "recap.metric.avgMarginHint": { "id": "Rata-rata margin skor per match.", "en": "Average score margin per match." },
    "recap.metric.tight": { "id": "Paling Ketat", "en": "Tightest" },
    "recap.metric.tightHint": { "id": "Terketat: {label}", "en": "Tightest: {label}" },
    "recap.metric.wait": { "id": "Menunggu skor terisi.", "en": "Waiting for scores." },
    "recap.section.matches": { "id": "Jalannya Pertandingan", "en": "Match Progress" },
    "recap.section.standings": { "id": "Klasemen Pemain", "en": "Player Standings" },
    "recap.section.rules": { "id": "Aturan Ranking", "en": "Ranking Rules" },
    "recap.noScoreTitle": { "id": "Belum ada skor yang tercatat", "en": "No scores recorded yet" },
    "recap.noScoreDesc": { "id": "Masukkan skor dulu agar recap terisi otomatis.", "en": "Enter scores first to populate the recap automatically." },
    "recap.winA": { "id": "Menang: Team A", "en": "Winner: Team A" },
    "recap.winB": { "id": "Menang: Team B", "en": "Winner: Team B" },
    "recap.draw": { "id": "Seri", "en": "Draw" },
    "recap.rule.total": { "id": "Total — poin total lebih tinggi berada di peringkat lebih atas.", "en": "Total — higher total points rank higher." },
    "recap.rule.diff": { "id": "Selisih — jika Total sama, peringkat ditentukan oleh selisih skor (point for – point against).", "en": "Difference — if Total is tied, ranking is decided by score differential (points for – points against)." },
    "recap.rule.win": { "id": "Menang — jika Total & Selisih sama, dilihat jumlah kemenangan (W).", "en": "Wins — if Total & Differential are tied, compare number of wins (W)." },
    "recap.rule.alphabet": { "id": "Jika semua sama — diurutkan alfabetis nama pemain.", "en": "If still tied — sort by player name alphabetically." },
    "recap.topPerformers": { "id": "Top Performers", "en": "Top Performers" },
    "recap.consistency.empty": { "id": "Belum ada data konsistensi.", "en": "No consistency data yet." },
    "recap.card.tight": { "id": "Match Ketat", "en": "Tight Match" },
    "recap.card.avgMargin": { "id": "Rata Margin", "en": "Avg. Margin" },
    "recap.card.avgMarginSub": { "id": "Skor per match", "en": "Score per match" },
    "recap.rotation.ok": { "id": "Rotasi sudah seimbang.", "en": "Rotation is balanced." },
    "recap.rotation.warn": { "id": "Sebaran rotasi belum merata (selisih main {spread}).", "en": "Rotation spread is uneven (play gap {spread})." },
    "recap.margin.low": { "id": "Selisih rata-rata rendah → pertandingan kompetitif.", "en": "Low average margin → competitive matches." },
    "recap.margin.high": { "id": "Selisih rata-rata cukup tinggi → disparitas performa terlihat.", "en": "Average margin is high → performance disparity visible." },
    "recap.tightest": { "id": "Match paling ketat: Match {round} (Skor {score}).", "en": "Tightest match: Match {round} (Score {score})." },
    "recap.copySuccess": { "id": "Recap disalin ke clipboard", "en": "Recap copied to clipboard" },
    "recap.html2canvasFail": { "id": "Gagal memuat html2canvas", "en": "Failed to load html2canvas" },
    "recap.winrate": { "id": "WinRate {value}", "en": "WinRate {value}" },
    "recap.pair": { "id": "Pasangan", "en": "Pair" },
    "recap.pair.recommend": { "id": "Rekomendasi Pasangan", "en": "Recommended Pairing" },
    "recap.pair.performance": { "id": "Performa Pasangan", "en": "Pairing Performance" },
    "recap.empty": { "id": "Belum ada data.", "en": "No data yet." },
    "recap.section.notes": { "id": "Catatan & Insight", "en": "Notes & Insights" },
    "recap.support.title": { "id": "Butuh Penyangga", "en": "Needs Support" },
    "recap.support.safe": { "id": "Semua pemain aman, tidak ada selisih negatif.", "en": "All players are safe, no negative differential." },
    "recap.pair.roundLabel.count": { "id": "{count} match", "en": "{count} matches" },
    "recap.pair.roundLabel.single": { "id": "Match", "en": "Match" },
    "recap.pair.roundLabel.one": { "id": "Match ke {round}", "en": "Match #{round}" },
    "recap.pair.roundLabel.some": { "id": "Match ke {rounds}", "en": "Matches {rounds}" },
    "recap.pair.roundLabel.more": { "id": "Match ke {rounds} +{extra} lagi", "en": "Matches {rounds} +{extra} more" },
    "recap.needsImprove": { "id": "<strong>Butuh perbaikan:</strong> {list} - coba pairing dengan pemain +/- positif.", "en": "<strong>Needs improvement:</strong> {list} - try pairing with players who have positive diff." },
    "recap.consistency.watch": { "id": "<strong>Consistency watch:</strong> {name} {wr}% namun Total tinggi ({total}) -> kontribusi poin bagus meski hasil belum stabil.", "en": "<strong>Consistency watch:</strong> {name} {wr}% but Total is high ({total}) -> strong contribution though results unstable." },
    "recap.rotation.title": { "id": "Rotasi & keseimbangan", "en": "Rotation & balance" },
    "recap.rotation.msgEven": { "id": "sebaran main merata", "en": "play distribution is even" },
    "recap.rotation.msgGap": { "id": "sebaran main selisih {spread}", "en": "play distribution gap {spread}" },
    "recap.biggest": { "id": "Margin terbesar: Match {round} - {team} menang {scoreA}-{scoreB} (margin {margin}).", "en": "Largest margin: Match {round} - {team} won {scoreA}-{scoreB} (margin {margin})." },
    "recap.highestTotal": { "id": "Skor total tertinggi: Match {round} - {scoreA}-{scoreB} (total {total}).", "en": "Highest total score: Match {round} - {scoreA}-{scoreB} (total {total})." },
    "recap.closeCount": { "id": "{count} pertandingan tergolong ketat (margin <= {threshold}).", "en": "{count} matches are considered close (margin <= {threshold})." },
    "recap.pair.productive": { "id": "<strong>Pair produktif:</strong> {list}.", "en": "<strong>Productive pairs:</strong> {list}." },
    "recap.fallback.topTotal": { "id": "<strong>Peringkat berdasarkan Total:</strong> {list} mengejar.", "en": "<strong>Ranking by Total:</strong> {list} in pursuit." },
    "recap.fallback.topDiff": { "id": "<strong>Selisih terbaik:</strong> {list} menunjukkan kontrol game tinggi.", "en": "<strong>Best differential:</strong> {list} shows strong game control." },
    "recap.fallback.wrHigh": { "id": "<strong>WinRate unggul (>= 70%):</strong> {list} - kandidat kunci untuk pairing berat.", "en": "<strong>Strong WinRate (>= 70%):</strong> {list} - key candidates for tough pairings." },
    "recap.fallback.rotation": { "id": "<strong>Rotasi & keseimbangan:</strong> sebaran main {spread}.", "en": "<strong>Rotation & balance:</strong> play distribution {spread}." },
    "recap.fallback.rotationEven": { "id": "merata", "en": "even" },
    "recap.fallback.rotationGap": { "id": "selisih {spread}", "en": "gap {spread}" },
    "recap.copyHeader": { "id": "Match Recap - {title}", "en": "Match Recap - {title}" },
    "recap.copyMatches": { "id": "Matches ({count})", "en": "Matches ({count})" },
    "recap.copyStandings": { "id": "Standings", "en": "Standings" },
    "recap.courtLabel": { "id": "Lap {court}", "en": "Court {court}" },
    "recap.matchLabel": { "id": "Match {round}", "en": "Match {round}" },
    "share.info": { "id": "Bagikan Link Event", "en": "Share the Event Link" },
    "share.createInfo": { "id": "Event berhasil dibuat! Bagikan link berikut:", "en": "Event created! Share the link below:" },
    "invite.title": { "id": "Invite Anggota", "en": "Invite Members" },
    "invite.desc": { "id": "Masukkan email Supabase user (yang digunakan login), pilih role, lalu buat link undangan.", "en": "Enter the user’s Supabase email, choose a role, then create an invite link." },
    "invite.button": { "id": "Buat Link Undangan", "en": "Create Invite Link" },
    "invite.linkCopy": { "id": "Copy Link", "en": "Copy Link" },
    "invite.sendEmail": { "id": "Send To Email", "en": "Send To Email" },
    "invite.cloudOff": { "id": "Mode Cloud belum aktif. Buat event dulu.", "en": "Cloud mode is not active. Create an event first." },
    "invite.loginRequired": { "id": "Silakan login terlebih dahulu.", "en": "Please log in first." },
    "invite.creating": { "id": "Membuat…", "en": "Creating…" },
    "invite.created": { "id": "Link undangan dibuat. Kirimkan ke email terkait.", "en": "Invite link created. Send it to the related email." },
    "invite.copySuccess": { "id": "Copied!", "en": "Copied!" },
    "invite.copyLabel": { "id": "Copy", "en": "Copy" },
    "invite.copyFail": { "id": "Gagal menyalin link, salin manual:", "en": "Failed to copy link, copy manually:" },
    "invite.createFail": { "id": "Gagal membuat link undangan", "en": "Failed to create invite link" },
    "event.searchTitle": { "id": "Cari Event", "en": "Search Event" },
    "event.createTitle": { "id": "Buat/Cari Event", "en": "Create/Search Event" },
    "event.locLabel": { "id": "Lokasi (opsional)", "en": "Location (optional)" },
    "event.locPlaceholder": { "id": "Mis. Lapangan A, GBK", "en": "e.g. Court A, Venue" },
    "event.locUrlLabel": { "id": "Link Maps (opsional)", "en": "Maps Link (optional)" },
    "event.locUrlPlaceholder": { "id": "https://maps.app.goo.gl/...", "en": "https://maps.app.goo.gl/..." },
    "event.required": { "id": "Nama event dan tanggal wajib diisi.", "en": "Event name and date are required." },
    "event.exists": { "id": "Event dengan nama itu di tanggal tersebut sudah ada.\nSilakan pilih nama lain atau tanggal lain.", "en": "An event with that name on that date already exists.\nPlease choose another name or date." },
    "event.failed": { "id": "Gagal membuat event. Coba lagi.", "en": "Failed to create event. Please try again." },
    "event.creating": { "id": "Creating...", "en": "Creating..." },
    "status.live": { "id": "Live", "en": "Live" },
    "status.done": { "id": "Selesai", "en": "Finished" },
    "status.startMatch": { "id": "Mulai Main", "en": "Start Match" },
    "status.incoming": { "id": "Pertandingan Selanjutnya", "en": "Incoming Match" },
    "score.finished": { "id": "Permainan Selesai", "en": "Match Finished" },
    "score.saving": { "id": "Saving...", "en": "Saving..." },
    "score.saved": { "id": "Saved ✓", "en": "Saved ✓" },
    "tennis.start": { "id": "Mulai Main", "en": "Start Match" },
    "tennis.recalc": { "id": "Hitung Ulang", "en": "Recalculate" },
    "tennis.resetMatch": { "id": "Reset Pertandingan", "en": "Reset Match" },
    "tennis.finishMatch": { "id": "Selesai & Lihat Hasil Pertandingan", "en": "Finish & View Match Result" },
    "tennis.finishChanges": { "id": "Simpan Perubahan", "en": "Save Changes" },
    "tennis.status.finished": { "id": "PERTANDINGAN SELESAI!", "en": "MATCH FINISHED!" },
    "tennis.status.reset": { "id": "Pertandingan direset, siap dimulai.", "en": "Match reset, ready to start." },
    "tennis.status.startFirst": { "id": "Mulai pertandingan terlebih dahulu!", "en": "Start the match first!" },
    "tennis.status.chooseMode": { "id": "Pilih mode skor dan tekan Mulai Pertandingan.", "en": "Choose a scoring mode and press Start Match." },
    "tennis.status.inProgress": { "id": "Permainan sedang berlangsung...", "en": "Match in progress..." },
    "tennis.status.rally": { "id": "Mode RALLY: Poin diakumulasikan hingga waktu habis.", "en": "RALLY mode: Points accumulate until time expires." },
    "tennis.set.scoreLabel": { "id": "Total Poin Dimenangkan:", "en": "Total Points Won:" },
    "tennis.set.gamesLabel": { "id": "Games Dimenangkan (Set):", "en": "Games Won (Set):" },
    "tennis.status.deuce": { "id": "Status: DEUCE (40-40)", "en": "Status: DEUCE (40-40)" },
    "tennis.status.advA": { "id": "Status: ADVANTAGE Tim A", "en": "Status: ADVANTAGE Team A" },
    "tennis.status.advB": { "id": "Status: ADVANTAGE Tim B", "en": "Status: ADVANTAGE Team B" },
    "tennis.confirm.close": { "id": "Menutup popup akan membatalkan pertandingan yang sedang berlangsung dan mengosongkan skor.", "en": "Closing the popup will cancel the ongoing match and clear the score." },
    "tennis.confirm.reset": { "id": "Tindakan ini akan mereset skor pertandingan saat ini.", "en": "This will reset the current match score." },
    "tennis.confirm.resetZero": { "id": "Tindakan ini akan mereset skor pertandingan saat ini menjadi kosong (0–0).", "en": "This will reset the current match score to 0–0." },
    "tennis.confirm.save": { "id": "Skor saat ini akan disimpan sebagai hasil akhir pertandingan.", "en": "The current score will be saved as the final match result." },
    "tennis.nextMatch": { "id": "Lanjut ke Match Berikutnya", "en": "Next Match" },
    "tennis.close": { "id": "Tutup", "en": "Close" },
    "tennis.notNow": { "id": "Tidak, nanti dulu", "en": "Not now" },
    "join.button": { "id": "Gabung Event", "en": "Join Event" },
    "join.joinedAs": { "id": "Join sebagai", "en": "Joined as" },
    "join.edit": { "id": "Edit", "en": "Edit" },
    "join.leave": { "id": "Leave", "en": "Leave" },
    "join.leaveFail": { "id": "Gagal leave:", "en": "Failed to leave:" },
    "join.openFirst": { "id": "Buka event terlebih dahulu.", "en": "Open an event first." },
    "join.noEvent": { "id": "Tidak ada event aktif.", "en": "No active event." },
    "join.nameRequired": { "id": "Nama wajib diisi.", "en": "Name is required." },
    "join.already": { "id": "Anda sudah join sebagai", "en": "You have already joined as" },
    "join.nameEmpty": { "id": "Nama tidak boleh kosong.", "en": "Name cannot be empty." },
    "join.nameUsed": { "id": "Nama sudah digunakan. Pilih nama lain.", "en": "Name already used. Choose another." },
    "join.nameNotFound": { "id": "Nama tidak ditemukan di daftar pemain.", "en": "Name not found in players list." },
    "loading.text": { "id": "Memproses…", "en": "Processing…" },
    "toast.loadingAccess": { "id": "Memuat akses…", "en": "Loading access…" },
    "toast.loadingTitle": { "id": "Memuat judul event…", "en": "Loading event title…" },
    "toast.loadingState": { "id": "Memuat data dari Cloud…", "en": "Loading data from Cloud…" },
    "toast.dateLocked": { "id": "Tanggal event tidak boleh diubah. Buat event baru untuk tanggal berbeda.", "en": "Event date cannot be changed. Create a new event for a different date." },
    "toast.eventMissing": { "id": "Event tidak ditemukan / sudah dihapus. Keluar dari mode event.", "en": "Event not found / deleted. Leaving event mode." },
    "toast.saveFailed": { "id": "Gagal menyimpan ke Cloud. Coba lagi.", "en": "Failed to save to Cloud. Please try again." },
    "toast.autoPromoteNamed": { "id": "Auto-promote: {name} masuk dari waiting list", "en": "Auto-promote: {name} moved from waiting list" },
    "toast.autoPromote": { "id": "Auto-promote: 1 pemain masuk dari waiting list", "en": "Auto-promote: 1 player moved from waiting list" },
    "stats.noMatch": { "id": "Tidak ada match untuk filter ini.", "en": "No matches for this filter." },
    "stats.tight": { "id": "Skor Paling Ketat", "en": "Tightest Score" },
    "cash.exportExcelFail": { "id": "Gagal export Excel.", "en": "Failed to export Excel." },
    "cash.exportPDFFail": { "id": "Gagal export PDF.", "en": "Failed to export PDF." },
    "cash.popupBlocked": { "id": "Popup diblokir. Izinkan popup untuk export PDF.", "en": "Popup blocked. Allow popups to export PDF." },
    "cash.rangeDeleteNA": { "id": "Hapus tidak tersedia pada mode rentang.", "en": "Delete is unavailable in range mode." },
    "cash.accessDenied": { "id": "Anda tidak memiliki akses Cashflow untuk event ini.", "en": "You do not have Cashflow access for this event." },
    "cash.deleteFail": { "id": "Gagal hapus.", "en": "Failed to delete." },
    "cash.saveFail": { "id": "Gagal menyimpan.", "en": "Failed to save." },
    "cash.rangeRequired": { "id": "Isi tanggal Start dan End.", "en": "Fill Start and End dates." },
    "cash.rangeInvalid": { "id": "Tanggal Start harus <= End.", "en": "Start date must be <= End." },
    "sessions.dateRequired": { "id": "Isi tanggal dulu ya.", "en": "Please fill the date first." },
    "sessions.jsonLoaded": { "id": "JSON dimuat.", "en": "JSON loaded." },
    "sessions.jsonInvalid": { "id": "File JSON tidak valid.", "en": "Invalid JSON file." },
    "sessions.featureOff": { "id": "Fitur muat berdasarkan tanggal lokal dinonaktifkan.", "en": "Load-by-date feature is disabled." },
    "sessions.noData": { "id": "Tidak ada data untuk tanggal tsb.", "en": "No data for that date." },
    "sessions.savingCloud": { "id": "Menyimpan ke Cloud…", "en": "Saving to Cloud…" },
    "score.playersIncomplete": { "id": "Pemain di ronde ini belum lengkap. Lengkapi dulu ya.", "en": "Players in this round are incomplete. Please complete them first." },
    "score.alreadyStarted": { "id": "Permainan sudah dimulai untuk match ini", "en": "Match has already started for this round" },
    "score.canceled": { "id": "Permainan dibatalkan. Skor direset.", "en": "Match canceled. Score reset." },
    "score.zeroNoSave": { "id": "Skor masih 0-0. Skor tidak akan disimpan.", "en": "Score is still 0-0. It will not be saved." },
    "score.matchNotFound": { "id": "Match tidak ditemukan.", "en": "Match not found." },
    "score.saveFail": { "id": "Gagal menyimpan.", "en": "Failed to save." },
    "score.cloudFail": { "id": "Gagal menyimpan ke Cloud. Coba lagi.", "en": "Failed to save to Cloud. Try again." },
    "score.localFail": { "id": "Gagal menyimpan ke Local Storage.", "en": "Failed to save to Local Storage." },
    "score.waitingFull": { "id": "Beberapa nama masuk waiting list karena list penuh", "en": "Some names moved to waiting list because the list is full" },
    "score.zeroNotSaved": { "id": "Skor masih 0-0. Skor belum disimpan.", "en": "Score is still 0-0. Score not saved." },
    "score.resetConfirm": { "id": "Data pada lapangan aktif akan dihapus. Lanjutkan?", "en": "Active court data will be cleared. Continue?" },
    "standings.noTable": { "id": "Tabel klasemen belum tersedia.", "en": "Standings table is not available yet." },
    "standings.exportExcelFail": { "id": "Gagal export Excel.", "en": "Failed to export Excel." },
    "standings.exportPDFFail": { "id": "Gagal export PDF.", "en": "Failed to export PDF." },
    "standings.popupBlocked": { "id": "Popup diblokir. Izinkan popup untuk export PDF.", "en": "Popup blocked. Allow popups to export PDF." },
    "join.slotReplaced": { "id": "Slot Anda digantikan oleh", "en": "Your slot was replaced by" },
    "join.success": { "id": "Berhasil join sebagai", "en": "Joined successfully as" },
    "join.partialLoadFail": { "id": "Berhasil join, tapi gagal memuat data terbaru.", "en": "Joined, but failed to load latest data." },
    "join.waitlistPartial": { "id": "Berhasil masuk waiting list, tapi gagal memuat data.", "en": "Added to waiting list, but failed to load data." },
    "rename.waitingMove": { "id": "Memindahkan {name} dari waiting list", "en": "Moving {name} from waiting list" },
    "rename.promote": { "id": "Promote {count} pemain dari waiting list", "en": "Promoted {count} players from waiting list" },
    "rename.listFull": { "id": "List aktif penuh. Hapus/geser pemain dulu.", "en": "Active list is full. Remove/move players first." },
    "rename.waitingEmpty": { "id": "Tidak ada pemain di waiting list.", "en": "No players in waiting list." },
    "join.alreadyRegistered": { "id": "Anda sudah terdaftar sebagai", "en": "You are already registered as" },
    "join.waitlistFull": { "id": "List sudah penuh, Anda masuk ke waiting list", "en": "List is full, you were added to the waiting list" },
    "join.closed": { "id": "Pendaftaran ditutup. Hanya member yang bisa join.", "en": "Registration is closed. Only members can join." },
    "join.loginFirst": { "id": "Silakan login terlebih dahulu.", "en": "Please log in first." },
    "join.eventNotFound": { "id": "Event tidak ditemukan.", "en": "Event not found." },
    "join.failed": { "id": "Gagal join. Silakan coba lagi.", "en": "Join failed. Please try again." },
    "join.failedPrefix": { "id": "Gagal join:", "en": "Join failed:" },
    "join.joining": { "id": "Joining…", "en": "Joining…" },
    "render.court": { "id": "Lapangan", "en": "Court" },
    "render.reportSummary": { "id": "Rentang: {from} - {to} | Tanggal: {dates} | Game: {games} | Pemain: {players}", "en": "Range: {from} - {to} | Dates: {dates} | Games: {games} | Players: {players}" },
    "recap.button": { "id": "Match Recap", "en": "Match Recap" },
    "recap.title": { "id": "Padel Match Recap", "en": "Padel Match Recap" },
    "recap.subtitle": { "id": "Analisis Performa & Strategi Pemain", "en": "Player Performance & Strategy Analysis" },
    "recap.updated": { "id": "Dihasilkan dari Data Pertandingan", "en": " Generated from Match Data" },
    "recap.winrate": { "id": "WinRate {value}", "en": "WinRate {value}" },
    "recap.diff": { "id": "Selisih {value}", "en": "Diff {value}" },
    "recap.arrow": { "id": "→", "en": "→" },
    "recap.balance": { "id": "Menyeimbangkan selisih {low} ke {high}", "en": "Balancing diff {low} to {high}" },
    "recap.consistency": { "id": "Consistency Watch", "en": "Consistency Watch" },
    "recap.consistencyNote": { "id": "Kontribusi bagus, hasil belum stabil.", "en": "Good contribution, results not yet stable." },
    "recap.total": { "id": "Total {value}", "en": "Total {value}" },
    "recap.pair": { "id": "Pasangan", "en": "Pair" },
    "recap.empty": { "id": "Belum ada data.", "en": "No data yet." },
    "recap.section.notes": { "id": "Catatan & Insight", "en": "Notes & Insights" },
    "recap.support.title": { "id": "Butuh Penyangga", "en": "Needs Support" },
    "recap.support.safe": { "id": "Semua pemain aman, tidak ada selisih negatif.", "en": "All players are safe, no negative differential." },
    "recap.pair.roundLabel.count": { "id": "{count} match", "en": "{count} matches" },
    "recap.pair.roundLabel.single": { "id": "Match", "en": "Match" },
    "recap.pair.roundLabel.one": { "id": "Match ke {round}", "en": "Match #{round}" },
    "recap.pair.roundLabel.some": { "id": "Match ke {rounds}", "en": "Matches {rounds}" },
    "recap.pair.roundLabel.more": { "id": "Match ke {rounds} +{extra} lagi", "en": "Matches {rounds} +{extra} more" },
    "recap.needsImprove": { "id": "<strong>Butuh perbaikan:</strong> {list} - coba pairing dengan pemain +/- positif.", "en": "<strong>Needs improvement:</strong> {list} - try pairing with players who have positive diff." },
    "recap.consistency.watch": { "id": "<strong>Consistency watch:</strong> {name} {wr}% namun Total tinggi ({total}) -> kontribusi poin bagus meski hasil belum stabil.", "en": "<strong>Consistency watch:</strong> {name} {wr}% but Total is high ({total}) -> strong contribution though results unstable." },
    "recap.rotation.title": { "id": "Rotasi & keseimbangan", "en": "Rotation & balance" },
    "recap.rotation.msgEven": { "id": "sebaran main merata", "en": "play distribution is even" },
    "recap.rotation.msgGap": { "id": "sebaran main selisih {spread}", "en": "play distribution gap {spread}" },
    "recap.biggest": { "id": "Margin terbesar: Match {round} - {team} menang {scoreA}-{scoreB} (margin {margin}).", "en": "Largest margin: Match {round} - {team} won {scoreA}-{scoreB} (margin {margin})." },
    "recap.highestTotal": { "id": "Skor total tertinggi: Match {round} - {scoreA}-{scoreB} (total {total}).", "en": "Highest total score: Match {round} - {scoreA}-{scoreB} (total {total})." },
    "recap.closeCount": { "id": "{count} pertandingan tergolong ketat (margin <= {threshold}).", "en": "{count} matches are considered close (margin <= {threshold})." },
    "recap.pair.productive": { "id": "<strong>Pair produktif:</strong> {list}.", "en": "<strong>Productive pairs:</strong> {list}." },
    "recap.fallback.topTotal": { "id": "<strong>Peringkat berdasarkan Total:</strong> {list} mengejar.", "en": "<strong>Ranking by Total:</strong> {list} in pursuit." },
    "recap.fallback.topDiff": { "id": "<strong>Selisih terbaik:</strong> {list} menunjukkan kontrol game tinggi.", "en": "<strong>Best differential:</strong> {list} shows strong game control." },
    "recap.fallback.wrHigh": { "id": "<strong>WinRate unggul (>= 70%):</strong> {list} - kandidat kunci untuk pairing berat.", "en": "<strong>Strong WinRate (>= 70%):</strong> {list} - key candidates for tough pairings." },
    "recap.fallback.rotation": { "id": "<strong>Rotasi & keseimbangan:</strong> sebaran main {spread}.", "en": "<strong>Rotation & balance:</strong> play distribution {spread}." },
    "recap.fallback.rotationEven": { "id": "merata", "en": "even" },
    "recap.fallback.rotationGap": { "id": "selisih {spread}", "en": "gap {spread}" },
    "recap.copyHeader": { "id": "Match Recap - {title}", "en": "Match Recap - {title}" },
    "recap.copyMatches": { "id": "Matches ({count})", "en": "Matches ({count})" },
    "recap.copyStandings": { "id": "Standings", "en": "Standings" },
    "recap.courtLabel": { "id": "Lap {court}", "en": "Court {court}" },
    "recap.matchLabel": { "id": "Match {round}", "en": "Match {round}" },
    "recap.summary": { "id": "Rangkuman", "en": "Summary" },
    "recap.saveImage": { "id": "Simpan gambar", "en": "Save image" },
    "recap.copyText": { "id": "Salin teks", "en": "Copy text" },
    "recap.close": { "id": "Tutup", "en": "Close" },
    "recap.insight": { "id": "Insight", "en": "Insight" },
    "render.fairness.header": { "id": "Fairness Info (semua lapangan): min={min}, max={max}, selisih={spread}", "en": "Fairness Info (all courts): min={min}, max={max}, spread={spread}" },
    "render.fairness.tips": { "id": "Tips: jika ada panah naik/turun berjauhan, klik \"Terapkan\" lagi untuk mengacak ulang; sistem mengutamakan pemain yang masih kurang main.", "en": "Tips: if up/down arrows are far apart, click \"Apply\" again to reshuffle; the system prioritizes players with fewer games." },
    "render.fairness.activeFilter": { "id": "Filter aktif:", "en": "Active filter:" },
    "render.fairness.reset": { "id": "Reset", "en": "Reset" },
    "render.confirm.clearActive": { "id": "Hapus skor di lapangan aktif?", "en": "Clear scores on the active court?" },
    "render.confirm.clearAll": { "id": "Hapus skor di SEMUA lapangan?", "en": "Clear scores on ALL courts?" },
    "render.court.deleteTitle": { "id": "Hapus Lapangan", "en": "Delete Court" },
    "render.court.deleteConfirm": { "id": "Hapus Lapangan {num}? Data ronde di lapangan ini akan hilang.", "en": "Delete Court {num}? Rounds on this court will be removed." },
    "render.error.doubleBooking": { "id": "Bentrok jadwal: Match {match} ada pemain di dua lapangan.", "en": "Schedule conflict: Match {match} has a player on two courts." },
    "render.error.duplicateOpponents": { "id": "Duplikat lawan (Lap {court}): {pair} muncul lagi di Match {match} (sebelumnya {prev}).", "en": "Duplicate opponents (Court {court}): {pair} appears again in Match {match} (previously {prev})." },
    "render.chip.noDate": { "id": "-", "en": "-" },
    "render.chip.playersWithMax": { "id": "{count}/{max} pemain", "en": "{count}/{max} players" },
    "render.chip.players": { "id": "{count} pemain", "en": "{count} players" },
    "render.fairness.problem": { "id": "Fairness belum merata, selisih {spread}.", "en": "Fairness imbalance detected, spread {spread}." },
    "event.viewLocation": { "id": "Lihat lokasi", "en": "View location" },
    "event.joinOpen": { "id": "Buka Join", "en": "Open Join" },
    "event.loadingList": { "id": "Memuat daftar event…", "en": "Loading events…" },
    "event.loadingDates": { "id": "Memuat tanggal…", "en": "Loading dates…" },
    "event.loading": { "id": "Memuat event…", "en": "Loading event…" },
    "event.opening": { "id": "Membuka event…", "en": "Opening event…" },
    "joinOpen.saved": { "id": "Waktu buka join disimpan", "en": "Join-open time saved" },
    "joinOpen.failed": { "id": "Gagal menyimpan waktu buka join", "en": "Failed to save join-open time" },
    "join.waitingDuplicate": { "id": "Nama sudah ada di waiting list", "en": "Name already on waiting list" },
    "event.delete": { "id": "Hapus Event", "en": "Delete Event" },
    "invite.createFirst": { "id": "Buat link undangan dulu.", "en": "Create an invite link first." },
    "invite.emailSending": { "id": "Sending...", "en": "Sending..." },
    "invite.emailClientOpening": { "id": "Membuka email client...", "en": "Opening email client..." },
    "invite.emailClientSend": { "id": "Silakan kirim email undangan dari client Anda.", "en": "Please send the invite email from your client." },
    "invite.emailClientFailed": { "id": "Gagal membuka email client", "en": "Failed to open email client" },
    "app.name": { "id": "Mix Americano", "en": "Mix Americano" },
    "role.owner": { "id": "Owner", "en": "Owner" },
    "role.admin": { "id": "Admin", "en": "Admin" },
    "role.editor": { "id": "Editor", "en": "Editor" },
    "role.referee": { "id": "Wasit", "en": "Referee" },
    "role.viewer": { "id": "Viewer", "en": "Viewer" },
    "loading.eventInfo": { "id": "Memuat info event...", "en": "Loading event info..." },
    "score.roundTitle": { "id": "Lap {court} - Match {round}", "en": "Court {court} - Match {round}" },
    "score.confirm.cancelRunning": { "id": "Permainan untuk match ini sedang berjalan. Menutup akan membatalkan permainan. Lanjutkan?", "en": "This match is running. Closing will cancel it. Continue?" },
    "tennis.overlay.title": { "id": "Penghitung Skor", "en": "Scoreboard" },
    "tennis.schedule": { "id": "Waktu Main Terjadwal: -", "en": "Scheduled Play Time: -" },
    "tennis.modeLabel": { "id": "Pilih Metode Skor:", "en": "Choose Scoring Mode:" },
    "tennis.mode.tennis": { "id": "Tennis/Padel Score (0, 15, 30, 40)", "en": "Tennis/Padel Score (0, 15, 30, 40)" },
    "tennis.mode.rally": { "id": "Rally Score (Poin Berlanjut)", "en": "Rally Score (Continuous Points)" },
    "tennis.startWithMinutes": { "id": "Mulai Pertandingan ({minutes} Menit)", "en": "Start Match ({minutes} Minutes)" },
    "tennis.resetZero": { "id": "Reset Skor (0-0)", "en": "Reset Score (0-0)" },
    "tennis.startNextGame": { "id": "Mulai Game Berikutnya", "en": "Start Next Game" },
    "tennis.newMatch": { "id": "Mulai Pertandingan Baru", "en": "Start New Match" },
    "tennis.confirm.ok": { "id": "Ya, Lanjutkan", "en": "Yes, continue" },
    "tennis.confirm.desc": { "id": "Tindakan ini akan mengakhiri atau mereset skor pertandingan saat ini.", "en": "This action will end or reset the current match score." },
    "tennis.confirm.title": { "id": "Konfirmasi Tindakan", "en": "Confirm Action" },
    "tennis.finalScoreLabel": { "id": "Total Games", "en": "Total Games" },
    "fairness.lapMatch": { "id": "Lap {court}/Match {round}", "en": "Court {court}/Match {round}" },
    "fairness.playCount": { "id": "main {count}x:", "en": "played {count}x:" },
    "fairness.alert.title": { "id": "Fairness Alert", "en": "Fairness Alert" },
    "fairness.alert.spread": { "id": "Ada selisih kesempatan bermain ({spread}).", "en": "Play count spread detected ({spread})." },
    "fairness.alert.over": { "id": "Pemain lebih banyak main ({count}x):", "en": "Players with more games ({count}x):" },
    "fairness.alert.under": { "id": "Pemain kurang main ({count}x):", "en": "Players with fewer games ({count}x):" },
    "fairness.alert.button": { "id": "Improve Fairness", "en": "Improve Fairness" },
    "fairness.toast.ok": { "id": "Fairness sudah cukup merata", "en": "Fairness is already balanced" },
    "fairness.toast.fixed": { "id": "Fairness diperbaiki pada beberapa ronde", "en": "Fairness improved in several rounds" },
    "fairness.toast.none": { "id": "Tidak ada perombakan minimal yang aman untuk fairness.", "en": "No safe minimal reshuffle found for fairness." },

    "render.table.schedule": { "id": "Jadwal", "en": "Schedule" },
    "render.table.time": { "id": "Waktu", "en": "Time" },
    "render.table.player1A": { "id": "Player1A", "en": "Player1A" },
    "render.table.player2A": { "id": "Player2A", "en": "Player2A" },
    "render.table.player1B": { "id": "Player1B", "en": "Player1B" },
    "render.table.player2B": { "id": "Player2B", "en": "Player2B" },
    "render.table.scoreA": { "id": "Skor Tim A", "en": "Score Team A" },
    "render.table.scoreB": { "id": "Skor Tim B", "en": "Score Team B" },
    "render.table.action": { "id": "Aksi", "en": "Action" },
    "render.table.teamA": { "id": "TIM A", "en": "TEAM A" },
    "render.table.teamB": { "id": "TIM B", "en": "TEAM B" },
    "render.table.score": { "id": "Skor", "en": "Score" },
    "render.match.label": { "id": "Pertandingan {num}", "en": "Match {num}" },
    "render.match.labelShort": { "id": "Pertandingan", "en": "Match" },
    "render.break.info": { "id": "Jeda {min}:00 - Next {next}", "en": "Break {min}:00 - Next {next}" },
    "mobile.tab.schedule": { "id": "Jadwal & Pemain", "en": "Schedule & Players" },
    "mobile.tab.standings": { "id": "Klasemen", "en": "Standings" },
    "mobile.chips.show": { "id": "Tampilkan info", "en": "Show info" },
    "mobile.chips.hide": { "id": "Sembunyikan info", "en": "Hide info" },
    "render.validation.title": { "id": "Validasi:", "en": "Validation:" },
    "render.validation.ok": { "id": "Tidak ada masalah penjadwalan.", "en": "No scheduling issues." },
    "report.exportTitle": { "id": "Report {from} to {to} (Lap: {court})", "en": "Report {from} to {to} (Court: {court})" },
    "tennis.teamA": { "id": "Tim A", "en": "Team A" },
    "tennis.teamB": { "id": "Tim B", "en": "Team B" },
    "tennis.team": { "id": "Tim", "en": "Team" },
    "tennis.gameWonTitle": { "id": "GAME DIMENANGKAN!", "en": "GAME WON!" },
    "tennis.winnerLabel": { "id": "Pemenang:", "en": "Winner:" },
    "tennis.gameResetNote": { "id": "Skor game saat ini akan direset. Server berikutnya adalah ", "en": "Current game score will reset. Next server is " },
    "tennis.matchResultTitle": { "id": "HASIL AKHIR PERTANDINGAN", "en": "FINAL MATCH RESULT" },
    "tennis.matchWinnerLabel": { "id": "Pemenang Pertandingan:", "en": "Match Winner:" },
    "tennis.nextMatchTitle": { "id": "Pertandingan Selanjutnya", "en": "Next Match" },
    "tennis.eventFinished": { "id": "Permainan di event ini sudah selesai.", "en": "All matches in this event are finished." },
    "tennis.scheduledRange": { "id": "Terjadwal: {start} - {end}", "en": "Scheduled: {start} - {end}" },
    "tennis.matchDone": { "id": "Permainan Selesai", "en": "Match Finished" },
    "tennis.roundTitle": { "id": "Lapangan {court} - Match {round}", "en": "Court {court} - Match {round}" },
    "tennis.matchTie": { "id": "Seri/Tidak ditentukan ({label} sama)", "en": "Draw/Undecided ({label} tied)" },
    "tennis.warn.noScoreFinish": { "id": "PERINGATAN: Skor masih 0-0. Tidak ada hasil untuk diselesaikan.", "en": "WARNING: Score is still 0-0. Nothing to finish yet." },
    "tennis.warn.noScoreSave": { "id": "PERINGATAN: Skor masih 0-0. Hasil kosong tidak disimpan.", "en": "WARNING: Score is 0-0. Empty result will not be saved." },
    "tennis.noNextMatch": { "id": "Tidak ada match berikutnya di lapangan ini", "en": "No next match on this court" },
    "tennis.error.incompletePlayers": { "id": "Nama pemain belum lengkap untuk ronde ini. Lengkapi Tim A dan Tim B terlebih dahulu.", "en": "Players are incomplete for this round. Fill Team A and Team B first." },
    "tennis.nextMatchUnset": { "id": "Pemain belum ditentukan", "en": "Players not set yet" },
    "tennis.serverRotate": { "id": "Server berotasi ke {player} (Setiap 2 poin).", "en": "Serve rotates to {player} (every 2 points)." },
    "tennis.totalPointsLabel": { "id": "Total Poin", "en": "Total Points" },
    "tennis.confirm.closeTitle": { "id": "Tutup & Batalkan Pertandingan?", "en": "Close & Cancel Match?" },
    "tennis.confirm.closeOk": { "id": "Ya, Batalkan & Tutup", "en": "Yes, Cancel & Close" },
    "tennis.confirm.resetTitle": { "id": "Yakin Ingin Me-Reset Pertandingan?", "en": "Reset this match?" },
    "tennis.confirm.resetOk": { "id": "Ya, Reset Sekarang", "en": "Yes, Reset Now" },
    "tennis.confirm.finishTitle": { "id": "Yakin Ingin Menyelesaikan Pertandingan?", "en": "Finish this match?" },
    "tennis.confirm.finishOk": { "id": "Ya, Selesaikan Sekarang", "en": "Yes, Finish Now" },

    /* Synced additions */
    "cash.delete": { "id": "Hapus", "en": "Delete" },
    "cash.deleteConfirm": { "id": "Hapus baris ini?", "en": "Delete this row?" },
    "cash.edit": { "id": "Edit", "en": "Edit" },
    "cash.exportFile": { "id": "Laporan Cashflow Padel NBC.xlsx", "en": "Padel NBC Cashflow Report.xlsx" },
    "cash.exportFilePdf": { "id": "Laporan Cashflow Padel NBC.pdf", "en": "Padel NBC Cashflow Report.pdf" },
    "cash.exportTitle": { "id": "Laporan Cashflow Padel NBC", "en": "Padel NBC Cashflow Report" },
    "cash.titleRange": { "id": "Cashflow Range", "en": "Cashflow Range" },
    "cash.toast.openEvent": { "id": "Buka event dulu.", "en": "Open an event first." },
    "cash.toast.rangeCloudOnly": { "id": "Range hanya tersedia di mode cloud.", "en": "Range is only available in cloud mode." },

    "event.deleteConfirm": { "id": "Hapus event ini secara permanen? Tindakan ini tidak bisa dibatalkan.", "en": "Delete this event permanently? This cannot be undone." },
    "event.deleteError": { "id": "Gagal menghapus event: {msg}", "en": "Failed to delete event: {msg}" },
    "event.deleteFailed": { "id": "Gagal menghapus event.", "en": "Failed to delete event." },
    "event.deleteForbidden": { "id": "Anda bukan owner event ini.", "en": "You are not the owner of this event." },
    "event.deleted": { "id": "Event dihapus.", "en": "Event deleted." },
    "event.deleting": { "id": "Menghapus event…", "en": "Deleting event…" },
    "event.notFound": { "id": "Event tidak ditemukan.", "en": "Event not found." },

    "join.cancel": { "id": "Batal", "en": "Cancel" },
    "join.close": { "id": "Tutup", "en": "Close" },
    "join.editOpenFail": { "id": "Gagal membuka editor nama.", "en": "Failed to open name editor." },
    "join.editPlayerTitle": { "id": "Ubah nama pemain", "en": "Edit player name" },
    "join.editSelfTitle": { "id": "Ubah nama tampilan Anda", "en": "Change your display name" },
    "join.editTitle": { "id": "Ubah Nama", "en": "Edit Name" },
    "join.gender": { "id": "Gender", "en": "Gender" },
    "join.genderPlaceholder": { "id": "-", "en": "-" },
    "join.leaveConfirm": { "id": "Keluar dari event (hapus nama Anda dari daftar pemain)?", "en": "Leave the event (remove your name from the players list)?" },
    "join.level": { "id": "Level", "en": "Level" },
    "join.levelPlaceholder": { "id": "-", "en": "-" },
    "join.loading": { "id": "Joining…", "en": "Joining…" },
    "join.nameLabel": { "id": "Nama", "en": "Name" },
    "join.namePlaceholder": { "id": "Nama Anda", "en": "Your name" },
    "join.notJoined": { "id": "Anda belum join di event ini.", "en": "You have not joined this event." },
    "join.notOpen": { "id": "Belum bisa join. Pendaftaran belum dibuka.", "en": "Cannot join yet. Registration is not open." },
    "join.notOpenAt": { "id": "Belum bisa join. Pendaftaran dibuka pada {date} {time}.", "en": "Cannot join yet. Registration opens at {date} {time}." },
    "join.playerDuplicate": { "id": "Nama sudah ada di daftar pemain.", "en": "Name already exists in the players list." },
    "join.playerUpdated": { "id": "Nama pemain diperbarui.", "en": "Player name updated." },
    "join.profileUpdated": { "id": "Profil diperbarui.", "en": "Profile updated." },
    "join.save": { "id": "Simpan", "en": "Save" },
    "join.selfRenamed": { "id": "Nama diperbarui menjadi {name}", "en": "Name updated to {name}" },
    "join.updateFail": { "id": "Gagal memperbarui nama. Coba lagi.", "en": "Failed to update name. Please try again." },

    "mobile.chips.toggle": { "id": "Tampilkan/sembunyikan info header", "en": "Show/hide header info" },
    "mobile.insight.fail": { "id": "Gagal membuat insight.", "en": "Failed to build insight." },
    "mobile.recap.fail": { "id": "Gagal membuat recap.", "en": "Failed to build recap." },
    "mobile.recap.search": { "id": "Cari pemain / skor...", "en": "Search players / scores..." },
    "mobile.recap.title": { "id": "Match Recap — {event}", "en": "Match Recap — {event}" },
    "mobile.recap.allCourts": { "id": "Semua Lapangan", "en": "All Courts" },
    "mobile.recap.result.all": { "id": "Semua Hasil", "en": "All Results" },
    "mobile.recap.result.win": { "id": "Menang", "en": "Win" },
    "mobile.recap.result.lose": { "id": "Kalah", "en": "Lose" },
    "mobile.recap.result.draw": { "id": "Seri", "en": "Draw" },
    "mobile.recap.section": { "id": "Rekap Pertandingan", "en": "Match Recap" },
    "mobile.recap.match": { "id": "Match #{round}", "en": "Match #{round}" },

    "players.summary": { "id": "Pemain: {count} | Match/lapangan: {round} | Menit/ronde: {minutes}", "en": "Players: {count} | Match/court: {round} | Minutes/round: {minutes}" },
    "players.waiting.remove": { "id": "Hapus dari waiting list", "en": "Remove from waiting list" },

    "rename.eventMissing": { "id": "Event tidak ditemukan atau sudah dihapus.", "en": "Event not found or already deleted." },
    "rename.waitingRemoveConfirm": { "id": "Hapus {name} dari waiting list?", "en": "Remove {name} from waiting list?" },

    "score.applyPlayersConfirm": { "id": "Menerapkan pemain akan reset pairing+skor pada lapangan aktif. Lanjutkan?", "en": "Applying players will reset pairing+scores on the active court. Continue?" },
    "score.clearAllConfirm": { "id": "Kosongkan semua pemain dan waiting list?", "en": "Clear all players and waiting list?" },
    "score.clearedAll": { "id": "Semua pemain dan waiting list telah dikosongkan", "en": "All players and waiting list have been cleared" },
    "score.dateLocked": { "id": "Tanggal event tidak boleh diubah. Buat event baru untuk tanggal lain.", "en": "Event date cannot be changed. Create a new event for another date." },
    "score.notYet": { "id": "Belum waktunya match ini. Selesaikan match sebelumnya dahulu.", "en": "Not time for this match yet. Finish the previous one first." },
    "score.timeUp": { "id": "Waktu habis untuk ronde ini.\\nKlik OK untuk menyimpan skor saat ini.", "en": "Time is up for this round.\\nClick OK to save the current score." },

    "settings.saveMetaFail": { "id": "Gagal menyimpan ke tabel events", "en": "Failed to save to events table" },

    "standings.exportExcel": { "id": "Export Excel", "en": "Export Excel" },
    "standings.exportPDF": { "id": "Export PDF", "en": "Export PDF" },

    "title.cancel": { "id": "Batal", "en": "Cancel" },
    "title.changed": { "id": "Nama event diubah", "en": "Event name updated" },
    "title.empty": { "id": "Nama event tidak boleh kosong", "en": "Event name cannot be empty" },
    "title.placeholder": { "id": "Nama event", "en": "Event name" },
    "title.rename": { "id": "Rename Event", "en": "Rename Event" },
    "title.save": { "id": "Simpan", "en": "Save" },
    "title.saveFail": { "id": "Gagal menyimpan: {msg}", "en": "Failed to save: {msg}" },
    "title.saved": { "id": "Nama event disimpan", "en": "Event name saved" },
    "title.saving": { "id": "Menyimpan nama event…", "en": "Saving event name…" }
  };

  let translations = null;
  let currentLang = 'id';
  const selectorMap = {
    'header.menu': '#btnHdrMenu',
    'header.save': '#btnSave',
    'event.createTitle': '#btnMakeEventLink',
    'header.share': '#btnShareEvent',
    'header.report': '#btnReport',
    'header.cashflow': '#btnCashflow',
    'header.leave': '#btnLeaveEvent',
    'header.filterToggle': '#btnFilterToggle span:last-child'
  };

  async function loadTranslations(){
    if (translations) return translations;
    if (location.protocol === 'file:'){
      translations = builtinTranslations;
      return translations;
    }
    try{
      const res = await fetch('lang.json', { cache:'no-cache' });
      if (!res.ok) throw new Error('lang fetch failed');
      translations = await res.json();
    }catch(err){
      console.warn('[i18n] gagal memuat lang.json, fallback builtin', err);
      translations = builtinTranslations;
    }
    return translations;
  }

  function applyTranslations(){
    if (!translations) return;
    const t = (key)=> translations?.[key]?.[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      if (el.id === 'appTitle') return; // keep event title from DB, do not translate
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val !== undefined) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
      const key = el.getAttribute('data-i18n-placeholder');
      const val = t(key);
      if (val !== undefined) el.setAttribute('placeholder', val);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el=>{
      const key = el.getAttribute('data-i18n-title');
      const val = t(key);
      if (val !== undefined) el.setAttribute('title', val);
    });
    Object.entries(selectorMap).forEach(([key, sel])=>{
      const val = t(key);
      if (val === undefined) return;
      const el = document.querySelector(sel);
      if (el) el.textContent = val;
    });
    // Update validation boxes rendered without data-i18n tags
    document.querySelectorAll('[data-i18n-errors="ok"]').forEach(el=>{
      const val = t('render.validation.ok');
      if (val !== undefined) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-errors="has-problem"] [data-i18n="render.validation.title"]').forEach(el=>{
      const val = t('render.validation.title');
      if (val !== undefined) el.textContent = val;
    });
    // Fairness alert containers
    document.querySelectorAll('[data-i18n-fairness="alert-title"]').forEach(el=>{
      const val = t('fairness.alert.title');
      if (val !== undefined) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-fairness="alert-spread"]').forEach(el=>{
      const raw = t('fairness.alert.spread');
      if (raw !== undefined && el.dataset.spread){ el.textContent = raw.replace('{spread}', el.dataset.spread); }
    });
    document.querySelectorAll('[data-i18n-fairness="alert-over"]').forEach(el=>{
      const raw = t('fairness.alert.over');
      if (raw !== undefined && el.dataset.count){ el.textContent = raw.replace('{count}', el.dataset.count); }
    });
    document.querySelectorAll('[data-i18n-fairness="alert-under"]').forEach(el=>{
      const raw = t('fairness.alert.under');
      if (raw !== undefined && el.dataset.count){ el.textContent = raw.replace('{count}', el.dataset.count); }
    });
    document.querySelectorAll('[data-i18n-fairness="alert-button"]').forEach(el=>{
      const val = t('fairness.alert.button');
      if (val !== undefined) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-fairness="lap-match"]').forEach(el=>{
      const raw = t('fairness.lapMatch');
      if (raw !== undefined && el.dataset.court && el.dataset.round){
        el.textContent = raw.replace('{court}', el.dataset.court).replace('{round}', el.dataset.round);
      }
    });
    document.querySelectorAll('[data-i18n-fairness="play-count"]').forEach(el=>{
      const raw = t('fairness.playCount');
      if (raw !== undefined && el.dataset.count){
        el.textContent = raw.replace('{count}', el.dataset.count);
      }
    });
    // Re-run validation to refresh dynamically-built text (incl. fairness message/match labels)
    try{ if (typeof validateAll === 'function') validateAll(); }catch{}
    const toggle = document.getElementById('langToggle');
    if (toggle){
      toggle.classList.toggle('lang-en', currentLang === 'en');
      toggle.setAttribute('title', currentLang === 'en' ? 'Switch to Bahasa Indonesia' : 'Ganti ke English');
    }
    // Refresh dynamic renders that build text without data-i18n attributes
    try{ renderHeaderChips?.(); }catch{}
    try{ renderCourtsToolbar?.(); }catch{}
    try{ renderPlayersList?.(); renderViewerPlayersList?.(); }catch{}
    try{ renderAll?.(); }catch{}
    try{ refreshDynamicLabels(); }catch{}
    try{ window.dispatchEvent(new CustomEvent('i18n:applied', { detail:{ lang: currentLang }})); }catch{}
    try{
      window.refreshMobileTabLabels?.();
      // trigger re-render hooks on current mobile tab (helps Insight/Recap rebuild)
      if (typeof window.reapplyMobileTab === 'function') window.reapplyMobileTab();
    }catch{}
  }

  async function setLanguage(lang){
    currentLang = lang;
    try{ localStorage.setItem('app.lang', lang); }catch{}
    // Reload to ensure all dynamic UI picks up the selected language
    try{ window.location.reload(); }catch{}
  }

  async function init(){
    try{ currentLang = localStorage.getItem('app.lang') || 'id'; }catch{}
    await loadTranslations();
    try{
      window.__i18n_apply = applyTranslations;
      window.__i18n_get = (key, fallback)=> translations?.[key]?.[currentLang] ?? fallback ?? key;
    }catch{}
    applyTranslations();
    const toggle = document.getElementById('langToggle');
    if (toggle){
      toggle.addEventListener('click', ()=>{
        const next = currentLang === 'id' ? 'en' : 'id';
        setLanguage(next);
      });
    }
  }

  function refreshDynamicLabels(){
    const get = (k,f)=> (translations?.[k]?.[currentLang] ?? f ?? k);
    try{ const b = document.getElementById('btnMakeEventLink'); if (b) b.textContent = get('event.title','Buat/Cari Event'); }catch{}
    try{ const b = document.getElementById('btnViewerSearchEvent'); if (b) b.textContent = get('event.searchTitle','Cari Event'); }catch{}
    try{ const b = document.getElementById('btnLogin'); if (b) b.textContent = get('login.title','Login'); }catch{}
    try{ const b = document.getElementById('btnAdminLogin'); if (b) b.textContent = get('admin.button','Login as Administrator'); }catch{}
    try{ const b = document.getElementById('btnLogout'); if (b) b.textContent = get('auth.logout','Logout'); }catch{}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

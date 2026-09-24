/**
 * Bilal Cash Desk™ Pro - Enterprise Financial Application Logic
 * Author: Muhammad Bilal
 * Features:
 * - Multi-Currency Denomination Engine (PKR, USD, INR, AED, SAR, GBP, EUR)
 * - Bilingual UI (English / اردو)
 * - Pieces vs Bundles/Gaddi (100 notes) calculation modes
 * - Real-Time POS Cash In / Out (Khata) Ledger with Excel CSV Export
 * - Speech Synthesis Voice Announcer & Web Audio Synthesizer
 * - Register Closing Reconciliation (Difference & Status)
 * - Thermal POS Slip Printing & WhatsApp Sharing
 */

// Supported Currencies Registry
const CURRENCIES = {
  PKR: { name: 'Pakistani Rupee', symbol: 'Rs.', denominations: [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1], wordSystem: 'indian' },
  USD: { name: 'US Dollar', symbol: '$', denominations: [100, 50, 20, 10, 5, 2, 1], wordSystem: 'standard' },
  INR: { name: 'Indian Rupee', symbol: '₹', denominations: [500, 200, 100, 50, 20, 10, 5, 2, 1], wordSystem: 'indian' },
  AED: { name: 'UAE Dirham', symbol: 'د.إ', denominations: [1000, 500, 200, 100, 50, 20, 10, 5], wordSystem: 'standard' },
  SAR: { name: 'Saudi Riyal', symbol: '﷼', denominations: [500, 200, 100, 50, 20, 10, 5, 1], wordSystem: 'standard' },
  GBP: { name: 'British Pound', symbol: '£', denominations: [50, 20, 10, 5, 2, 1], wordSystem: 'standard' },
  EUR: { name: 'Euro', symbol: '€', denominations: [500, 200, 100, 50, 20, 10, 5, 2, 1], wordSystem: 'standard' }
};

// Bilingual Dictionary
const I18N = {
  en: {
    tab_counter: 'Denomination Counter',
    tab_khata: 'Cash In/Out (Khata)',
    tab_breakdown: 'Dispense / Breakdown',
    tab_history: 'Closing History',
    desk_title: 'Physical Cash Counter',
    desk_subtitle: 'Enter pieces or bundles of banknotes to tally',
    col_note: 'Banknote',
    col_count: 'Quantity / Pcs',
    col_bundles: 'Quick Add',
    col_subtotal: 'Subtotal',
    reset: 'Reset',
    total_counted: 'TOTAL COUNTED CASH',
    in_words: 'AMOUNT IN WORDS:',
    total_pieces: 'Total Banknotes',
    gaddis_count: 'Full Bundles (100s)',
    high_val: 'High Notes (≥500)',
    avg_note: 'Avg. Value / Note',
    reconciliation_title: 'Register Closing & Balancing',
    reconciliation_desc: 'Compare physical cash with opening / POS expected',
    expected_cash: 'Expected POS Amount',
    receipt_actions: 'Shift Actions & Reports',
    save_log: 'Save Shift Record',
    copy_summary: 'Copy Text',
    print_slip: 'Print Receipt',
    khata_in: 'Total Cash IN (آمدنی)',
    khata_out: 'Total Cash OUT (خرچ)',
    khata_net: 'Net Cash in Drawer (خالص رقم)',
    new_entry_title: 'New Khata Transaction',
    new_entry_sub: 'Record sales, payments, purchases or expenses',
    ledger_title: 'Daily Cash Register Log'
  },
  ur: {
    tab_counter: 'نوٹوں کی گنتی (کاؤنٹر)',
    tab_khata: 'آمدنی اور خرچ (کھاتہ)',
    tab_breakdown: 'رقم کی تقسیم',
    tab_history: 'ریکارڈ لاگ',
    desk_title: 'پیسوں اور نوٹوں کی گنتی',
    desk_subtitle: 'کل رقم کا حساب کتاب لگانے کے لیے نوٹوں کی تعداد درج کریں',
    col_note: 'نوٹ',
    col_count: 'تعداد (پیس)',
    col_bundles: 'گڈی / بنڈل',
    col_subtotal: 'میزان',
    reset: 'صفر کریں',
    total_counted: 'کل گنی ہوئی رقم',
    in_words: 'رقم الفاظ میں:',
    total_pieces: 'کل نوٹ',
    gaddis_count: 'کل گڈیاں (100 والے)',
    high_val: 'بڑے نوٹ (≥500)',
    avg_note: 'اوسط فی نوٹ',
    reconciliation_title: 'کیش رجسٹر بیلنسنگ',
    reconciliation_desc: 'متوقع رقم سے کیش کا موازنہ کریں',
    expected_cash: 'متوقع مطلوبہ رقم',
    receipt_actions: 'رسید اور ایکشنز',
    save_log: 'ریکارڈ محفوظ کریں',
    copy_summary: 'خلاصہ کاپی کریں',
    print_slip: 'رسید پرنٹ کریں',
    khata_in: 'کل آمدنی (Cash IN)',
    khata_out: 'کل خرچ (Cash OUT)',
    khata_net: 'خالص کیش بیلنس',
    new_entry_title: 'نیا کھاتہ اندراج',
    new_entry_sub: 'سیل، کسٹمر ریکوری، یا خرچہ درج کریں',
    ledger_title: 'روزنامچہ کیش لاگ'
  }
};

// Global App State
let currentLang = 'en';
let currentCurrency = 'PKR';
let currentTheme = 'dark';
let countMode = 'pieces'; // 'pieces' or 'bundles'
let countState = {};
let soundEnabled = true;
let voiceEnabled = false;
let historyLogs = [];
let khataEntries = [];
let currentKhataType = 'IN';
let khataFilter = 'ALL';

// Audio Synthesizer
let audioCtx = null;
function playBeep(type = 'click') {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    }
  } catch (e) {}
}

// Utility: Number formatting
function formatNumber(num) {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-US');
}

// Number to Words Converter
function numberToWords(num, system = 'indian') {
  if (num === 0) return 'Zero Only';
  if (num < 0) return 'Negative ' + numberToWords(Math.abs(num), system);

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(n) {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) str += units[n] + ' ';
    return str.trim();
  }

  let words = '';
  if (system === 'indian') {
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const remainder = num;

    if (crore > 0) words += convertChunk(crore) + ' Crore ';
    if (lakh > 0) words += convertChunk(lakh) + ' Lakh ';
    if (thousand > 0) words += convertChunk(thousand) + ' Thousand ';
    if (remainder > 0) words += convertChunk(remainder) + ' ';
  } else {
    const million = Math.floor(num / 1000000);
    num %= 1000000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const remainder = num;

    if (million > 0) words += convertChunk(million) + ' Million ';
    if (thousand > 0) words += convertChunk(thousand) + ' Thousand ';
    if (remainder > 0) words += convertChunk(remainder) + ' ';
  }

  const curr = CURRENCIES[currentCurrency];
  return words.trim() + ` ${curr.name}s Only`;
}

// Voice Announcer
function speakCurrentTotal() {
  if (!('speechSynthesis' in window)) {
    showToast('Speech synthesis not supported in this browser');
    return;
  }
  const curr = CURRENCIES[currentCurrency];
  let grandTotal = 0;
  curr.denominations.forEach(d => { grandTotal += (countState[d] || 0) * d; });
  
  const text = `Total cash counted is ${grandTotal} ${curr.name}s.`;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
}

// Live Digital Clock
function startClock() {
  const clockEl = document.getElementById('liveClock');
  if (!clockEl) return;
  function update() {
    clockEl.innerText = new Date().toLocaleTimeString('en-US', { hour12: false });
  }
  update();
  setInterval(update, 1000);
}

// Language Toggle
function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'ur' : 'en';
  document.getElementById('langLabel').innerText = currentLang === 'en' ? 'English' : 'اردو';
  
  const dict = I18N[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (dict[key]) el.innerText = dict[key];
  });

  document.body.style.fontFamily = currentLang === 'ur' ? 'var(--font-urdu)' : 'var(--font-sans)';
  showToast(`Language switched to ${currentLang === 'en' ? 'English' : 'اردو'}`);
}

// Theme Switcher
function setTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('bilal_cash_theme', theme);

  document.querySelectorAll('.theme-option-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

// Currency Switcher
function setCurrency(currCode) {
  if (!CURRENCIES[currCode]) return;
  currentCurrency = currCode;
  localStorage.setItem('bilal_cash_currency', currCode);

  const curr = CURRENCIES[currCode];
  document.getElementById('masterCurrencyLabel').innerText = curr.symbol;
  document.getElementById('reconcileCurrPrefix').innerText = curr.symbol;
  document.getElementById('breakdownCurrSymbol').innerText = curr.symbol;
  document.querySelectorAll('.khata-curr-symbol').forEach(el => el.innerText = curr.symbol);

  countState = {};
  curr.denominations.forEach(d => { countState[d] = 0; });
  initDenominationDesk();
  calculateDeskTotals();
  showToast(`Currency: ${curr.name} (${curr.symbol})`);
}

// Count Mode (Pieces vs Bundles)
function setCountMode(mode) {
  countMode = mode;
  document.getElementById('btnModePieces').classList.toggle('active', mode === 'pieces');
  document.getElementById('btnModeBundles').classList.toggle('active', mode === 'bundles');
  initDenominationDesk();
}

// ==================== DENOMINATION DESK ====================
function initDenominationDesk() {
  const container = document.getElementById('denominationDeskList');
  if (!container) return;

  const curr = CURRENCIES[currentCurrency];
  container.innerHTML = '';

  curr.denominations.forEach(denom => {
    const row = document.createElement('div');
    row.className = 'note-desk-row';
    row.dataset.denom = denom;

    const badgeColorClass = currentCurrency === 'PKR' && denom >= 10 
      ? `badge-denom-${denom}` 
      : 'badge-denom-default';

    const currentCount = countState[denom] || 0;
    const displayValue = countMode === 'bundles' ? (currentCount / 100 || '') : (currentCount || '');
    const placeholder = countMode === 'bundles' ? '0 pkt' : '0 pcs';

    const quickChipsHtml = countMode === 'bundles' ? `
      <button class="bundle-chip" onclick="addBundleStep(${denom}, 1)">+1 Gaddi</button>
      <button class="bundle-chip" onclick="addBundleStep(${denom}, 5)">+5 Gaddi</button>
      <button class="bundle-chip" onclick="addBundleStep(${denom}, 10)">+10</button>
    ` : `
      <button class="bundle-chip" onclick="addPieceStep(${denom}, 10)">+10</button>
      <button class="bundle-chip" onclick="addPieceStep(${denom}, 50)">+50</button>
      <button class="bundle-chip" onclick="addPieceStep(${denom}, 100)">+100</button>
    `;

    row.innerHTML = `
      <div class="banknote-badge ${badgeColorClass}">
        <span>${curr.symbol}</span>
        <span>${denom}</span>
      </div>

      <div class="stepper-box">
        <button class="stepper-btn" onclick="modifyDenomStepper(${denom}, -1)">−</button>
        <input 
          type="number" 
          class="stepper-input" 
          id="input-desk-${denom}" 
          value="${displayValue}" 
          placeholder="${placeholder}" 
          min="0"
          oninput="handleManualDeskInput(${denom}, this.value)"
        >
        <button class="stepper-btn" onclick="modifyDenomStepper(${denom}, 1)">+</button>
      </div>

      <div class="bundle-chips-row">
        ${quickChipsHtml}
      </div>

      <div class="row-subtotal-val" id="row-subtotal-${denom}">
        ${curr.symbol} 0
      </div>
    `;

    container.appendChild(row);
  });

  calculateDeskTotals();
}

function modifyDenomStepper(denom, delta) {
  const stepUnit = countMode === 'bundles' ? 100 : 1;
  const current = countState[denom] || 0;
  const updated = Math.max(0, current + (delta * stepUnit));
  countState[denom] = updated;

  const inputEl = document.getElementById(`input-desk-${denom}`);
  if (inputEl) {
    const val = countMode === 'bundles' ? updated / 100 : updated;
    inputEl.value = val === 0 ? '' : val;
  }

  playBeep('click');
  calculateDeskTotals();
}

function addPieceStep(denom, pcs) {
  const current = countState[denom] || 0;
  countState[denom] = current + pcs;
  const inputEl = document.getElementById(`input-desk-${denom}`);
  if (inputEl) inputEl.value = countState[denom];
  playBeep('click');
  calculateDeskTotals();
}

function addBundleStep(denom, gaddis) {
  const current = countState[denom] || 0;
  countState[denom] = current + (gaddis * 100);
  const inputEl = document.getElementById(`input-desk-${denom}`);
  if (inputEl) inputEl.value = countState[denom] / 100;
  playBeep('click');
  calculateDeskTotals();
}

function handleManualDeskInput(denom, val) {
  const parsed = parseFloat(val);
  if (isNaN(parsed) || parsed < 0) {
    countState[denom] = 0;
  } else {
    countState[denom] = countMode === 'bundles' ? Math.round(parsed * 100) : Math.round(parsed);
  }
  playBeep('click');
  calculateDeskTotals();
}

function calculateDeskTotals() {
  const curr = CURRENCIES[currentCurrency];
  let grandTotal = 0;
  let totalNotes = 0;
  let highValTotal = 0;

  curr.denominations.forEach(denom => {
    const count = countState[denom] || 0;
    const subtotal = count * denom;
    grandTotal += subtotal;
    totalNotes += count;

    if (denom >= 500) highValTotal += subtotal;

    const subEl = document.getElementById(`row-subtotal-${denom}`);
    if (subEl) {
      subEl.innerText = `${curr.symbol} ${formatNumber(subtotal)}`;
    }
  });

  document.getElementById('masterGrandTotal').innerText = formatNumber(grandTotal);
  document.getElementById('masterWordsDisplay').innerText = numberToWords(grandTotal, curr.wordSystem);
  document.getElementById('metricTotalNotes').innerText = `${formatNumber(totalNotes)} pcs`;
  document.getElementById('metricTotalGaddis').innerText = `${(totalNotes / 100).toFixed(1)} pkt`;
  
  const highPercent = grandTotal > 0 ? Math.round((highValTotal / grandTotal) * 100) : 0;
  document.getElementById('metricHighVal').innerText = `${highPercent}%`;
  
  const avgNoteVal = totalNotes > 0 ? Math.round(grandTotal / totalNotes) : 0;
  document.getElementById('metricAvgNote').innerText = `${curr.symbol} ${formatNumber(avgNoteVal)}`;

  checkReconciliation(grandTotal);
}

function checkReconciliation(currentTotal) {
  const curr = CURRENCIES[currentCurrency];
  const expectedInput = document.getElementById('expectedCashInput');
  const container = document.getElementById('reconcileDiffContainer');
  const badge = document.getElementById('reconcileBadge');
  const statusLabel = document.getElementById('diffStatusLabel');
  const amountVal = document.getElementById('diffAmountValue');
  const explanation = document.getElementById('diffExplanationText');

  if (!expectedInput || !container) return;

  const expectedVal = parseFloat(expectedInput.value);

  if (isNaN(expectedVal) || expectedInput.value.trim() === '') {
    container.classList.add('hidden');
    if (badge) {
      badge.className = 'status-badge badge-neutral';
      badge.innerText = 'COUNTING';
    }
    return;
  }

  container.classList.remove('hidden');
  const diff = currentTotal - expectedVal;

  if (diff === 0) {
    badge.className = 'status-badge badge-match';
    badge.innerText = 'PERFECT MATCH ✓';
    statusLabel.innerText = 'Closing Status:';
    statusLabel.style.color = '#34d399';
    amountVal.innerText = `Exact Match (${curr.symbol} 0)`;
    amountVal.style.color = '#34d399';
    explanation.innerText = 'Cash in drawer perfectly matches POS closing records.';
  } else if (diff < 0) {
    badge.className = 'status-badge badge-short';
    badge.innerText = 'SHORTAGE ✕';
    statusLabel.innerText = 'Short Amount:';
    statusLabel.style.color = '#f87171';
    amountVal.innerText = `- ${curr.symbol} ${formatNumber(Math.abs(diff))}`;
    amountVal.style.color = '#f87171';
    explanation.innerText = `Physical cash is less than expected. Verify outstanding customer slips or unrecorded expenses.`;
  } else {
    badge.className = 'status-badge badge-excess';
    badge.innerText = 'EXCESS +';
    statusLabel.innerText = 'Excess Amount:';
    statusLabel.style.color = '#fbbf24';
    amountVal.innerText = `+ ${curr.symbol} ${formatNumber(diff)}`;
    amountVal.style.color = '#fbbf24';
    explanation.innerText = `Physical cash exceeds POS expected balance. Check for unbilled sales.`;
  }
}

function resetDeskCounter() {
  const curr = CURRENCIES[currentCurrency];
  curr.denominations.forEach(d => {
    countState[d] = 0;
    const inputEl = document.getElementById(`input-desk-${d}`);
    if (inputEl) inputEl.value = '';
  });

  const expectedInput = document.getElementById('expectedCashInput');
  if (expectedInput) expectedInput.value = '';

  calculateDeskTotals();
  showToast('Counter reset to zero');
}

// ==================== KHATA / LEDGER SYSTEM ====================
const KHATA_KEY = 'bilal_cash_khata_records';

function setKhataType(type) {
  currentKhataType = type;
  document.getElementById('typeInBtn').classList.toggle('active-in', type === 'IN');
  document.getElementById('typeOutBtn').classList.toggle('active-out', type === 'OUT');
}

function handleKhataSubmit(e) {
  e.preventDefault();
  const amountEl = document.getElementById('khataAmountInput');
  const partyEl = document.getElementById('khataPartyInput');
  const catEl = document.getElementById('khataCategorySelect');
  const modeEl = document.getElementById('khataPaymentMode');
  const notesEl = document.getElementById('khataNotesInput');

  const amount = parseFloat(amountEl.value);
  const party = partyEl.value.trim();

  if (isNaN(amount) || amount <= 0 || !party) {
    showToast('Please enter valid amount and party name');
    return;
  }

  const newEntry = {
    id: Date.now(),
    type: currentKhataType,
    amount: amount,
    party: party,
    category: catEl.value,
    mode: modeEl.value,
    remarks: notesEl.value.trim(),
    currency: currentCurrency,
    timestamp: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  };

  khataEntries.unshift(newEntry);
  localStorage.setItem(KHATA_KEY, JSON.stringify(khataEntries));

  amountEl.value = '';
  partyEl.value = '';
  notesEl.value = '';

  renderKhataWorkspace();
  playBeep('success');
  showToast(`Khata entry saved (Cash ${currentKhataType})`);
}

function loadKhataRecords() {
  try {
    const saved = localStorage.getItem(KHATA_KEY);
    khataEntries = saved ? JSON.parse(saved) : [];
  } catch (e) {
    khataEntries = [];
  }
  renderKhataWorkspace();
}

function filterKhata(type, btnEl) {
  khataFilter = type;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderKhataWorkspace();
}

function renderKhataWorkspace() {
  const listEl = document.getElementById('khataEntriesScroll');
  const inEl = document.getElementById('kpiTotalIn');
  const outEl = document.getElementById('kpiTotalOut');
  const netEl = document.getElementById('kpiNetBalance');
  const inCountEl = document.getElementById('kpiInEntriesCount');
  const outCountEl = document.getElementById('kpiOutEntriesCount');
  const badgeAll = document.getElementById('badgeFilterAll');
  const badgeIn = document.getElementById('badgeFilterIn');
  const badgeOut = document.getElementById('badgeFilterOut');

  let totalIn = 0, totalOut = 0, inCount = 0, outCount = 0;

  khataEntries.forEach(entry => {
    if (entry.type === 'IN') {
      totalIn += entry.amount;
      inCount++;
    } else {
      totalOut += entry.amount;
      outCount++;
    }
  });

  const net = totalIn - totalOut;
  const curr = CURRENCIES[currentCurrency];

  if (inEl) inEl.innerText = `${curr.symbol} ${formatNumber(totalIn)}`;
  if (outEl) outEl.innerText = `${curr.symbol} ${formatNumber(totalOut)}`;
  if (netEl) netEl.innerText = `${curr.symbol} ${formatNumber(net)}`;
  if (inCountEl) inCountEl.innerText = `${inCount} Inflow Transactions`;
  if (outCountEl) outCountEl.innerText = `${outCount} Outflow Transactions`;

  if (badgeAll) badgeAll.innerText = khataEntries.length;
  if (badgeIn) badgeIn.innerText = inCount;
  if (badgeOut) badgeOut.innerText = outCount;

  if (!listEl) return;

  const filtered = khataEntries.filter(entry => {
    if (khataFilter === 'ALL') return true;
    return entry.type === khataFilter;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="history-empty-msg">
        <p>No transactions recorded for this filter.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = '';
  filtered.forEach(entry => {
    const card = document.createElement('div');
    card.className = `khata-entry-card ${entry.type === 'IN' ? 'in-type' : 'out-type'}`;
    const sign = entry.type === 'IN' ? '+' : '−';

    card.innerHTML = `
      <div class="entry-left-block">
        <div class="entry-party">${entry.party}</div>
        <div class="entry-details-line">
          <span>📅 ${entry.timestamp}</span> &bull; 
          <span class="entry-cat-badge">${entry.category}</span> &bull; 
          <span>${entry.mode}</span>
          ${entry.remarks ? `&bull; <i>${entry.remarks}</i>` : ''}
        </div>
      </div>
      <div class="entry-amount-block">
        <span class="entry-amount-num">${sign} ${curr.symbol} ${formatNumber(entry.amount)}</span>
        <button class="btn-delete-entry" onclick="deleteKhataEntry(${entry.id})">Delete ✕</button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

function deleteKhataEntry(id) {
  khataEntries = khataEntries.filter(x => x.id !== id);
  localStorage.setItem(KHATA_KEY, JSON.stringify(khataEntries));
  renderKhataWorkspace();
  showToast('Entry removed from ledger');
}

function clearAllKhata() {
  if (khataEntries.length === 0) return;
  if (confirm('Are you sure you want to clear all Khata ledger records?')) {
    khataEntries = [];
    localStorage.removeItem(KHATA_KEY);
    renderKhataWorkspace();
    showToast('All Khata entries cleared');
  }
}

function exportKhataToCSV() {
  if (khataEntries.length === 0) {
    showToast('No entries to export!');
    return;
  }

  const curr = CURRENCIES[currentCurrency];
  let csv = '\uFEFF'; // UTF-8 BOM
  csv += `Transaction ID,Timestamp,Type,Party Name,Category,Payment Method,Amount (${curr.symbol}),Remarks\r\n`;

  khataEntries.forEach(item => {
    const row = [
      item.id,
      `"${item.timestamp}"`,
      item.type === 'IN' ? 'Cash IN' : 'Cash OUT',
      `"${item.party.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      `"${item.mode}"`,
      item.amount,
      `"${(item.remarks || '').replace(/"/g, '""')}"`
    ];
    csv += row.join(',') + '\r\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bilal_Cash_Desk_Khata_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  playBeep('success');
  showToast('Excel/CSV exported successfully!');
}

// ==================== BREAKDOWN / DISPENSER SOLVER ====================
function computeAmountBreakdown() {
  const inputEl = document.getElementById('breakdownTargetInput');
  if (!inputEl) return;

  let amount = parseInt(inputEl.value, 10);
  if (isNaN(amount) || amount <= 0) {
    showToast('Enter a valid payout amount');
    return;
  }

  const curr = CURRENCIES[currentCurrency];
  const initialAmount = amount;
  let totalNotes = 0;
  const tiles = [];

  for (let denom of curr.denominations) {
    let count = Math.floor(amount / denom);
    if (count > 0) {
      tiles.push({ denom, count, total: count * denom });
      totalNotes += count;
      amount %= denom;
    }
  }

  const resultWrap = document.getElementById('breakdownResultWrap');
  const targetDisplay = document.getElementById('bkTargetAmount');
  const notesDisplay = document.getElementById('bkTotalNotes');
  const remainderDisplay = document.getElementById('bkRemainder');
  const grid = document.getElementById('breakdownTilesDesk');

  resultWrap.classList.remove('hidden');
  targetDisplay.innerText = `${curr.symbol} ${formatNumber(initialAmount)}`;
  notesDisplay.innerText = `${formatNumber(totalNotes)} Banknotes`;
  remainderDisplay.innerText = `${curr.symbol} ${formatNumber(amount)}`;

  grid.innerHTML = '';
  tiles.forEach(t => {
    const div = document.createElement('div');
    div.className = 'dispense-tile';
    div.innerHTML = `
      <div class="dispense-top">
        <span class="dispense-denom" style="color: var(--brand-primary)">${curr.symbol} ${t.denom}</span>
        <span class="dispense-count">× ${formatNumber(t.count)}</span>
      </div>
      <div class="dispense-val">= ${curr.symbol} ${formatNumber(t.total)}</div>
    `;
    grid.appendChild(div);
  });

  playBeep('success');
}

function setBreakdownAmount(val) {
  const input = document.getElementById('breakdownTargetInput');
  if (input) {
    input.value = val;
    computeAmountBreakdown();
  }
}

function applyBreakdownToCounter() {
  const input = document.getElementById('breakdownTargetInput');
  let amount = parseInt(input.value, 10);
  if (isNaN(amount) || amount <= 0) return;

  resetDeskCounter();
  const curr = CURRENCIES[currentCurrency];

  for (let denom of curr.denominations) {
    let count = Math.floor(amount / denom);
    if (count > 0) {
      countState[denom] = count;
      const inputEl = document.getElementById(`input-desk-${denom}`);
      if (inputEl) inputEl.value = count;
      amount %= denom;
    }
  }

  calculateDeskTotals();
  switchMasterTab('counter-view');
  showToast('Breakdown transferred to physical counter!');
}

// ==================== SHIFT CLOSING LOGS ====================
const HISTORY_KEY = 'bilal_cash_history_records';

function loadHistoryRecords() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    historyLogs = saved ? JSON.parse(saved) : [];
  } catch (e) {
    historyLogs = [];
  }
  renderHistoryRecords();
}

function saveCurrentShiftLog() {
  const curr = CURRENCIES[currentCurrency];
  let grandTotal = 0, totalNotes = 0;
  let snap = {};

  curr.denominations.forEach(d => {
    const count = countState[d] || 0;
    if (count > 0) {
      snap[d] = count;
      grandTotal += count * d;
      totalNotes += count;
    }
  });

  if (grandTotal === 0) {
    showToast('Cannot save empty cash count!');
    return;
  }

  const exp = parseFloat(document.getElementById('expectedCashInput')?.value) || 0;

  const record = {
    id: Date.now(),
    currency: currentCurrency,
    timestamp: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
    totalAmount: grandTotal,
    totalNotes: totalNotes,
    expectedAmount: exp,
    breakdown: snap,
    words: numberToWords(grandTotal, curr.wordSystem)
  };

  historyLogs.unshift(record);
  if (historyLogs.length > 50) historyLogs.pop();

  localStorage.setItem(HISTORY_KEY, JSON.stringify(historyLogs));
  renderHistoryRecords();
  playBeep('success');
  showToast('Shift cash closing saved to log!');
}

function renderHistoryRecords() {
  const listEl = document.getElementById('historyRecordsList');
  const badgeEl = document.getElementById('historyBadgeCount');
  if (!listEl) return;

  if (badgeEl) badgeEl.innerText = historyLogs.length;

  if (historyLogs.length === 0) {
    listEl.innerHTML = `
      <div class="history-empty-msg">
        <p>No shift records saved yet. Count cash and click "Save Shift Record".</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = '';
  historyLogs.forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-audit-card';
    const cSymbol = CURRENCIES[item.currency]?.symbol || 'Rs.';

    const notesSummary = Object.entries(item.breakdown)
      .map(([denom, count]) => `${cSymbol}${denom} × ${count}`)
      .join(', ');

    card.innerHTML = `
      <div class="history-left-info">
        <span class="history-timestamp">📅 ${item.timestamp} &bull; <strong>${item.currency}</strong></span>
        <div class="history-total-num">${cSymbol} ${formatNumber(item.totalAmount)}</div>
        <div class="history-notes-desc">${notesSummary || '0 notes'} (${item.totalNotes} notes total)</div>
      </div>
      <div class="history-btn-actions">
        <button class="desk-action-btn secondary-btn" onclick="restoreHistoryLog(${item.id})">Load</button>
        <button class="danger-btn-text" onclick="deleteHistoryLog(${item.id})">Delete</button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

function restoreHistoryLog(id) {
  const item = historyLogs.find(x => x.id === id);
  if (!item) return;

  if (item.currency && item.currency !== currentCurrency) {
    document.getElementById('currencySelect').value = item.currency;
    setCurrency(item.currency);
  }

  resetDeskCounter();
  Object.entries(item.breakdown).forEach(([denom, count]) => {
    const d = parseInt(denom, 10);
    countState[d] = count;
    const input = document.getElementById(`input-desk-${d}`);
    if (input) input.value = count;
  });

  if (item.expectedAmount > 0) {
    const expInput = document.getElementById('expectedCashInput');
    if (expInput) expInput.value = item.expectedAmount;
  }

  calculateDeskTotals();
  switchMasterTab('counter-view');
  showToast('Shift record loaded into counter!');
}

function deleteHistoryLog(id) {
  historyLogs = historyLogs.filter(x => x.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(historyLogs));
  renderHistoryRecords();
  showToast('Record deleted');
}

function clearAllHistory() {
  if (historyLogs.length === 0) return;
  if (confirm('Are you sure you want to clear all archived shift records?')) {
    historyLogs = [];
    localStorage.removeItem(HISTORY_KEY);
    renderHistoryRecords();
    showToast('All shift logs deleted');
  }
}

// ==================== SLIP GENERATION & PRINTING ====================
function getSlipTextSummary() {
  const curr = CURRENCIES[currentCurrency];
  let grandTotal = 0, totalNotes = 0;
  let lines = [];

  lines.push(`💵 *BILAL CASH DESK™ PRO REPORT* 💵`);
  lines.push(`📅 Timestamp: ${new Date().toLocaleString()}`);
  lines.push(`👤 Cashier: Muhammad Bilal | Terminal: POS-01`);
  lines.push('──────────────────────────────');

  curr.denominations.forEach(denom => {
    const count = countState[denom] || 0;
    if (count > 0) {
      const sub = count * denom;
      grandTotal += sub;
      totalNotes += count;
      lines.push(`${curr.symbol} ${denom.toString().padEnd(5)} × ${count.toString().padEnd(4)} = ${curr.symbol} ${formatNumber(sub)}`);
    }
  });

  lines.push('──────────────────────────────');
  lines.push(`*TOTAL COUNTED:* ${curr.symbol} ${formatNumber(grandTotal)}`);
  lines.push(`*Total Banknotes:* ${formatNumber(totalNotes)} pcs (${(totalNotes / 100).toFixed(1)} bundles)`);
  lines.push(`*In Words:* ${numberToWords(grandTotal, curr.wordSystem)}`);

  const exp = parseFloat(document.getElementById('expectedCashInput')?.value);
  if (!isNaN(exp) && exp > 0) {
    const diff = grandTotal - exp;
    lines.push('──────────────────────────────');
    lines.push(`Expected POS Amount: ${curr.symbol} ${formatNumber(exp)}`);
    lines.push(`Closing Variance: ${diff === 0 ? 'Balanced (0)' : (diff > 0 ? '+' : '-') + curr.symbol + ' ' + formatNumber(Math.abs(diff))}`);
  }

  lines.push('──────────────────────────────');
  lines.push('✨ Powered by Bilal Cash Desk™ Pro');

  return { text: lines.join('\n'), grandTotal, totalNotes };
}

function copyReportSummary() {
  const { text, grandTotal } = getSlipTextSummary();
  if (grandTotal === 0) {
    showToast('Count some notes first!');
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    showToast('✓ Summary copied to clipboard!');
  }).catch(() => {
    showToast('Could not copy to clipboard.');
  });
}

function shareViaWhatsApp() {
  const { text, grandTotal } = getSlipTextSummary();
  if (grandTotal === 0) {
    showToast('Count some notes first!');
    return;
  }
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

function printThermalReceipt() {
  const curr = CURRENCIES[currentCurrency];
  let grandTotal = 0, totalNotes = 0;
  let rowsHtml = '';

  curr.denominations.forEach(denom => {
    const count = countState[denom] || 0;
    if (count > 0) {
      const sub = count * denom;
      grandTotal += sub;
      totalNotes += count;
      rowsHtml += `
        <div class="receipt-row">
          <span>${curr.symbol} ${denom}</span>
          <span>${count}</span>
          <span>${curr.symbol} ${formatNumber(sub)}</span>
        </div>
      `;
    }
  });

  if (grandTotal === 0) {
    showToast('Please count notes before printing!');
    return;
  }

  const exp = parseFloat(document.getElementById('expectedCashInput')?.value) || 0;
  const diff = grandTotal - exp;

  document.getElementById('rcptTimestamp').innerText = new Date().toLocaleString();
  document.getElementById('rcptCurrency').innerText = `${currentCurrency} (${curr.symbol})`;
  document.getElementById('rcptNotesRows').innerHTML = rowsHtml;
  document.getElementById('rcptGrandTotal').innerText = `${curr.symbol} ${formatNumber(grandTotal)}`;
  document.getElementById('rcptTotalNotes').innerText = `${totalNotes} pcs`;
  document.getElementById('rcptExpected').innerText = `${curr.symbol} ${formatNumber(exp)}`;
  document.getElementById('rcptDiff').innerText = exp === 0 ? 'N/A' : (diff === 0 ? 'Balanced (0)' : (diff > 0 ? '+' : '-') + `${curr.symbol} ${formatNumber(Math.abs(diff))}`);
  document.getElementById('rcptWordsText').innerText = numberToWords(grandTotal, curr.wordSystem);

  window.print();
}

// Toast Alert
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toastAlert');
  if (!toast) return;
  toast.innerHTML = `<span>⚡</span> <span>${msg}</span>`;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.add('hidden'); }, 2600);
}

// Master Tab Navigation
function switchMasterTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));

  const activeBtn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  const activePane = document.getElementById(tabId);

  if (activeBtn) activeBtn.classList.add('active');
  if (activePane) activePane.classList.add('active');
}

// Sound & Voice Toggles
function toggleSoundEffect() {
  soundEnabled = !soundEnabled;
  document.getElementById('soundToggle')?.classList.toggle('active', soundEnabled);
  showToast(soundEnabled ? 'Sound enabled' : 'Sound muted');
}

function toggleVoiceAnnouncer() {
  voiceEnabled = !voiceEnabled;
  document.getElementById('voiceToggle')?.classList.toggle('active', voiceEnabled);
  showToast(voiceEnabled ? 'Voice announcer enabled' : 'Voice muted');
  if (voiceEnabled) speakCurrentTotal();
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  startClock();

  // Load Saved Preferences
  const savedTheme = localStorage.getItem('bilal_cash_theme') || 'dark';
  setTheme(savedTheme);

  const savedCurr = localStorage.getItem('bilal_cash_currency') || 'PKR';
  const currSelect = document.getElementById('currencySelect');
  if (currSelect) currSelect.value = savedCurr;
  setCurrency(savedCurr);

  loadKhataRecords();
  loadHistoryRecords();

  // Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => { switchMasterTab(btn.dataset.tab); });
  });

  // Language & Theme Controls
  document.getElementById('langToggleBtn')?.addEventListener('click', toggleLanguage);
  document.querySelectorAll('.theme-option-btn').forEach(btn => {
    btn.addEventListener('click', () => { setTheme(btn.dataset.theme); });
  });

  // Currency Dropdown
  currSelect?.addEventListener('change', (e) => { setCurrency(e.target.value); });

  // Voice & Sound
  document.getElementById('soundToggle')?.addEventListener('click', toggleSoundEffect);
  document.getElementById('voiceToggle')?.addEventListener('click', toggleVoiceAnnouncer);

  // Counter Actions
  document.getElementById('btnResetCounter')?.addEventListener('click', resetDeskCounter);
  document.getElementById('expectedCashInput')?.addEventListener('input', () => {
    const curr = CURRENCIES[currentCurrency];
    let grandTotal = 0;
    curr.denominations.forEach(d => { grandTotal += (countState[d] || 0) * d; });
    checkReconciliation(grandTotal);
  });

  document.getElementById('btnSaveShiftLog')?.addEventListener('click', saveCurrentShiftLog);
  document.getElementById('btnCopyReport')?.addEventListener('click', copyReportSummary);
  document.getElementById('btnWhatsAppShare')?.addEventListener('click', shareViaWhatsApp);
  document.getElementById('btnPrintReceipt')?.addEventListener('click', printThermalReceipt);
});
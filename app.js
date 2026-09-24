/**
 * Smart Cash Counter & Khata Ledger
 * Features:
 * - Multi-Currency Denomination Counter (PKR, USD, INR, AED, SAR)
 * - Multi-Theme Support (Dark Slate, Clean Light, Luxury Emerald-Gold)
 * - Cash In / Cash Out (Khata / Daily Income & Expense Ledger)
 * - Excel / CSV Ledger Export
 * - Cash Breakdown Solver & Difference Reconciliation
 * - Web Audio API Synthesizer & Receipt Printing
 */

// Supported Currencies Configuration
const CURRENCIES = {
  PKR: {
    name: 'Pakistani Rupee',
    symbol: 'Rs.',
    denominations: [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1],
    wordFormat: 'indian'
  },
  USD: {
    name: 'US Dollar',
    symbol: '$',
    denominations: [100, 50, 20, 10, 5, 2, 1],
    wordFormat: 'standard'
  },
  INR: {
    name: 'Indian Rupee',
    symbol: '₹',
    denominations: [500, 200, 100, 50, 20, 10, 5, 2, 1],
    wordFormat: 'indian'
  },
  AED: {
    name: 'UAE Dirham',
    symbol: 'د.إ',
    denominations: [1000, 500, 200, 100, 50, 20, 10, 5],
    wordFormat: 'standard'
  },
  SAR: {
    name: 'Saudi Riyal',
    symbol: '﷼',
    denominations: [500, 200, 100, 50, 20, 10, 5, 1],
    wordFormat: 'standard'
  }
};

let currentCurrency = 'PKR';
let currentTheme = 'dark';
let countState = {};
let soundEnabled = true;
let historyLogs = [];
let khataEntries = [];
let currentKhataType = 'IN';
let khataFilter = 'ALL';

// Web Audio API Sound Synthesizer
let audioCtx = null;
function playBeep(type = 'click') {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    }
  } catch (e) {
    // Audio context error or blocked
  }
}

// Utility: Format Number
function formatNumber(num) {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-US');
}

// Number to Words Converter (Supports Indian Lakhs/Crores and Standard Millions)
function numberToWords(num, format = 'indian') {
  if (num === 0) return 'Zero Only';
  if (num < 0) return 'Negative ' + numberToWords(Math.abs(num), format);

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
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str.trim();
  }

  let words = '';
  if (format === 'indian') {
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

// ==================== THEMES & CURRENCY ====================
function setTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cash_counter_theme', theme);

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

function setCurrency(currCode) {
  if (!CURRENCIES[currCode]) return;
  currentCurrency = currCode;
  localStorage.setItem('cash_counter_currency', currCode);

  const curr = CURRENCIES[currCode];
  
  // Update currency symbols across the page
  document.getElementById('mainCurrencySymbol').innerText = curr.symbol;
  document.getElementById('diffCurrencySymbol').innerText = curr.symbol;
  document.getElementById('breakdownCurrencySymbol').innerText = curr.symbol;
  document.querySelectorAll('.khata-curr-label').forEach(el => el.innerText = curr.symbol);

  // Reset and rebuild denomination list
  countState = {};
  curr.denominations.forEach(d => { countState[d] = 0; });
  initDenominationList();
  calculateTotals();
  showToast(`Currency changed to ${curr.name} (${curr.symbol})`);
}

// ==================== DENOMINATION COUNTER ====================
function initDenominationList() {
  const container = document.getElementById('denominationList');
  if (!container) return;

  const curr = CURRENCIES[currentCurrency];
  container.innerHTML = '';

  curr.denominations.forEach(denom => {
    const row = document.createElement('div');
    row.className = 'denom-row';
    row.dataset.denom = denom;

    const badgeClass = currentCurrency === 'PKR' && denom >= 10 
      ? `denom-badge-pkr-${denom}` 
      : 'denom-badge-default';

    row.innerHTML = `
      <div class="denom-badge ${badgeClass}">
        <span>${curr.symbol}</span>
        <span>${denom}</span>
      </div>

      <div class="denom-stepper">
        <button class="step-btn" onclick="updateDenomCount(${denom}, -1)">−</button>
        <input 
          type="number" 
          class="denom-input" 
          id="input-denom-${denom}" 
          value="${countState[denom] || ''}" 
          placeholder="0" 
          min="0"
          oninput="handleManualInput(${denom}, this.value)"
        >
        <button class="step-btn" onclick="updateDenomCount(${denom}, 1)">+</button>
      </div>

      <div class="denom-chips">
        <button class="chip-btn" onclick="addBundle(${denom}, 10)">+10</button>
        <button class="chip-btn" onclick="addBundle(${denom}, 50)">+50</button>
        <button class="chip-btn" onclick="addBundle(${denom}, 100)">+100</button>
      </div>

      <div class="denom-subtotal" id="subtotal-${denom}">
        <span class="currency-prefix">${curr.symbol}</span>0
      </div>
    `;

    container.appendChild(row);
  });
}

function updateDenomCount(denom, delta) {
  const current = countState[denom] || 0;
  const updated = Math.max(0, current + delta);
  countState[denom] = updated;

  const inputEl = document.getElementById(`input-denom-${denom}`);
  if (inputEl) {
    inputEl.value = updated === 0 ? '' : updated;
  }

  playBeep('click');
  calculateTotals();
}

function addBundle(denom, bundleSize) {
  updateDenomCount(denom, bundleSize);
}

function handleManualInput(denom, val) {
  const parsed = parseInt(val, 10);
  countState[denom] = isNaN(parsed) || parsed < 0 ? 0 : parsed;
  playBeep('click');
  calculateTotals();
}

function calculateTotals() {
  const curr = CURRENCIES[currentCurrency];
  let grandTotal = 0;
  let totalNotes = 0;
  let highValTotal = 0;

  curr.denominations.forEach(denom => {
    const count = countState[denom] || 0;
    const subtotal = count * denom;
    grandTotal += subtotal;
    totalNotes += count;

    if (denom >= 500) {
      highValTotal += subtotal;
    }

    const subtotalEl = document.getElementById(`subtotal-${denom}`);
    if (subtotalEl) {
      subtotalEl.innerHTML = `<span class="currency-prefix">${curr.symbol} </span>${formatNumber(subtotal)}`;
    }
  });

  const grandTotalEl = document.getElementById('grandTotalAmount');
  const totalNotesEl = document.getElementById('totalNotesCount');
  const amountInWordsEl = document.getElementById('amountInWords');
  const highValEl = document.getElementById('highValPercent');

  if (grandTotalEl) grandTotalEl.innerText = formatNumber(grandTotal);
  if (totalNotesEl) totalNotesEl.innerText = `${formatNumber(totalNotes)} pcs`;
  if (amountInWordsEl) amountInWordsEl.innerText = numberToWords(grandTotal, curr.wordFormat);

  if (highValEl) {
    const percent = grandTotal > 0 ? Math.round((highValTotal / grandTotal) * 100) : 0;
    highValEl.innerText = `${percent}%`;
  }

  checkDifference(grandTotal);
}

function checkDifference(currentTotal) {
  const curr = CURRENCIES[currentCurrency];
  const expectedInput = document.getElementById('expectedAmountInput');
  const diffBox = document.getElementById('differenceResultBox');
  const diffTitle = document.getElementById('diffTitle');
  const diffValue = document.getElementById('diffValue');
  const badge = document.getElementById('balanceStatusBadge');

  if (!expectedInput || !diffBox) return;

  const expectedVal = parseFloat(expectedInput.value);

  if (isNaN(expectedVal) || expectedInput.value.trim() === '') {
    diffBox.classList.add('hidden');
    if (badge) {
      badge.className = 'badge badge-balanced';
      badge.innerText = 'Counting';
    }
    return;
  }

  diffBox.classList.remove('hidden');
  const diff = currentTotal - expectedVal;

  if (diff === 0) {
    badge.className = 'badge badge-balanced';
    badge.innerText = 'Balanced ✓';
    diffTitle.innerText = 'Status:';
    diffValue.innerText = `Exact Match (${curr.symbol} 0)`;
    diffBox.className = 'diff-result-box';
    diffValue.className = 'diff-val matched';
  } else if (diff < 0) {
    badge.className = 'badge badge-short';
    badge.innerText = 'Shortage ✕';
    diffTitle.innerText = 'Short Amount:';
    diffValue.innerText = `- ${curr.symbol} ${formatNumber(Math.abs(diff))}`;
    diffBox.className = 'diff-result-box';
    diffValue.className = 'diff-val short';
  } else {
    badge.className = 'badge badge-excess';
    badge.innerText = 'Excess +';
    diffTitle.innerText = 'Excess Amount:';
    diffValue.innerText = `+ ${curr.symbol} ${formatNumber(diff)}`;
    diffBox.className = 'diff-result-box';
    diffValue.className = 'diff-val excess';
  }
}

function resetCounter() {
  const curr = CURRENCIES[currentCurrency];
  curr.denominations.forEach(d => {
    countState[d] = 0;
    const inputEl = document.getElementById(`input-denom-${d}`);
    if (inputEl) inputEl.value = '';
  });

  const expectedInput = document.getElementById('expectedAmountInput');
  if (expectedInput) expectedInput.value = '';

  calculateTotals();
  showToast('Counter has been reset');
}

// ==================== KHATA / LEDGER (CASH IN & CASH OUT) ====================
const KHATA_STORAGE_KEY = 'smart_cash_counter_khata';

function setKhataType(type) {
  currentKhataType = type;
  const inBtn = document.getElementById('typeBtnIn');
  const outBtn = document.getElementById('typeBtnOut');

  if (type === 'IN') {
    inBtn.className = 'type-toggle-btn active-in';
    outBtn.className = 'type-toggle-btn';
  } else {
    inBtn.className = 'type-toggle-btn';
    outBtn.className = 'type-toggle-btn active-out';
  }
}

function handleKhataSubmit(e) {
  e.preventDefault();
  const amountInput = document.getElementById('khataAmount');
  const partyInput = document.getElementById('khataParty');
  const categorySelect = document.getElementById('khataCategory');
  const modeSelect = document.getElementById('khataMode');
  const remarkInput = document.getElementById('khataRemark');

  const amount = parseFloat(amountInput.value);
  const party = partyInput.value.trim();

  if (isNaN(amount) || amount <= 0 || !party) {
    showToast('Please enter valid amount & party name');
    return;
  }

  const entry = {
    id: Date.now(),
    type: currentKhataType, // 'IN' or 'OUT'
    amount: amount,
    party: party,
    category: categorySelect.value,
    mode: modeSelect.value,
    remark: remarkInput.value.trim(),
    currency: currentCurrency,
    timestamp: new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    rawDate: new Date().toISOString()
  };

  khataEntries.unshift(entry);
  localStorage.setItem(KHATA_STORAGE_KEY, JSON.stringify(khataEntries));

  // Reset form
  amountInput.value = '';
  partyInput.value = '';
  remarkInput.value = '';

  renderKhata();
  playBeep('success');
  showToast(`Khata entry added (Cash ${currentKhataType})`);
}

function loadKhata() {
  try {
    const saved = localStorage.getItem(KHATA_STORAGE_KEY);
    khataEntries = saved ? JSON.parse(saved) : [];
  } catch (e) {
    khataEntries = [];
  }
  renderKhata();
}

function filterKhata(type, btnEl) {
  khataFilter = type;
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderKhata();
}

function renderKhata() {
  const listEl = document.getElementById('khataEntriesList');
  const totalInEl = document.getElementById('khataTotalIn');
  const totalOutEl = document.getElementById('khataTotalOut');
  const netBalanceEl = document.getElementById('khataNetBalance');
  const countAllEl = document.getElementById('countAll');
  const countInEl = document.getElementById('countIn');
  const countOutEl = document.getElementById('countOut');

  let totalIn = 0;
  let totalOut = 0;
  let inCount = 0;
  let outCount = 0;

  khataEntries.forEach(entry => {
    if (entry.type === 'IN') {
      totalIn += entry.amount;
      inCount++;
    } else {
      totalOut += entry.amount;
      outCount++;
    }
  });

  const netBalance = totalIn - totalOut;
  const curr = CURRENCIES[currentCurrency];

  if (totalInEl) totalInEl.innerText = `${curr.symbol} ${formatNumber(totalIn)}`;
  if (totalOutEl) totalOutEl.innerText = `${curr.symbol} ${formatNumber(totalOut)}`;
  if (netBalanceEl) {
    netBalanceEl.innerText = `${curr.symbol} ${formatNumber(netBalance)}`;
    netBalanceEl.style.color = netBalance >= 0 ? 'var(--primary)' : 'var(--accent-red)';
  }

  if (countAllEl) countAllEl.innerText = khataEntries.length;
  if (countInEl) countInEl.innerText = inCount;
  if (countOutEl) countOutEl.innerText = outCount;

  if (!listEl) return;

  const filtered = khataEntries.filter(entry => {
    if (khataFilter === 'ALL') return true;
    return entry.type === khataFilter;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="history-empty-state">
        <p>No transactions recorded for this filter. Add new entries above.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = '';
  filtered.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = `khata-item type-${item.type.toLowerCase()}`;
    const sign = item.type === 'IN' ? '+' : '−';

    itemEl.innerHTML = `
      <div class="khata-item-left">
        <div class="khata-party-name">${item.party}</div>
        <div class="khata-meta-line">
          <span>📅 ${item.timestamp}</span> &bull; 
          <span class="khata-tag">${item.category}</span> &bull;
          <span class="khata-tag">${item.mode}</span>
          ${item.remark ? `&bull; <i>${item.remark}</i>` : ''}
        </div>
      </div>
      <div class="khata-item-right">
        <div class="khata-item-amount">${sign} ${curr.symbol} ${formatNumber(item.amount)}</div>
        <button class="khata-del-btn" onclick="deleteKhataItem(${item.id})">Delete ✕</button>
      </div>
    `;
    listEl.appendChild(itemEl);
  });
}

function deleteKhataItem(id) {
  khataEntries = khataEntries.filter(x => x.id !== id);
  localStorage.setItem(KHATA_STORAGE_KEY, JSON.stringify(khataEntries));
  renderKhata();
  showToast('Entry deleted');
}

function clearAllKhata() {
  if (khataEntries.length === 0) return;
  if (confirm('Are you sure you want to clear all Khata entries?')) {
    khataEntries = [];
    localStorage.removeItem(KHATA_STORAGE_KEY);
    renderKhata();
    showToast('Khata ledger cleared');
  }
}

// Export Khata to CSV (Compatible with Microsoft Excel & Google Sheets)
function exportKhataToCSV() {
  if (khataEntries.length === 0) {
    showToast('No entries to export!');
    return;
  }

  const curr = CURRENCIES[currentCurrency];
  let csvContent = '\uFEFF'; // UTF-8 BOM for Urdu/Arabic support in Excel
  csvContent += 'Transaction ID,Date & Time,Type,Party/Name,Category,Payment Mode,Amount (' + curr.symbol + '),Remarks\r\n';

  khataEntries.forEach(item => {
    const cleanRemark = (item.remark || '').replace(/"/g, '""');
    const cleanParty = item.party.replace(/"/g, '""');
    const row = [
      item.id,
      `"${item.timestamp}"`,
      item.type === 'IN' ? 'Cash IN' : 'Cash OUT',
      `"${cleanParty}"`,
      `"${item.category}"`,
      `"${item.mode}"`,
      item.amount,
      `"${cleanRemark}"`
    ];
    csvContent += row.join(',') + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `Khata_Ledger_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  playBeep('success');
  showToast('✓ Khata Ledger exported to CSV/Excel!');
}

// ==================== AMOUNT BREAKDOWN SOLVER ====================
function computeAmountBreakdown() {
  const inputEl = document.getElementById('breakdownInput');
  if (!inputEl) return;

  let amount = parseInt(inputEl.value, 10);
  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount');
    return;
  }

  const curr = CURRENCIES[currentCurrency];
  const initialAmount = amount;
  let totalNotesNeeded = 0;
  const breakdownResults = [];

  for (let denom of curr.denominations) {
    let count = Math.floor(amount / denom);
    if (count > 0) {
      breakdownResults.push({
        denom: denom,
        count: count,
        total: count * denom
      });
      totalNotesNeeded += count;
      amount = amount % denom;
    }
  }

  renderBreakdownResults(initialAmount, totalNotesNeeded, amount, breakdownResults);
  playBeep('success');
}

function setBreakdownAmount(val) {
  const inputEl = document.getElementById('breakdownInput');
  if (inputEl) {
    inputEl.value = val;
    computeAmountBreakdown();
  }
}

function renderBreakdownResults(targetAmount, totalNotes, remainder, list) {
  const curr = CURRENCIES[currentCurrency];
  const section = document.getElementById('breakdownResultsSection');
  const targetDisplay = document.getElementById('targetAmountDisplay');
  const notesDisplay = document.getElementById('targetNotesCountDisplay');
  const remainderDisplay = document.getElementById('targetRemainderDisplay');
  const grid = document.getElementById('breakdownCardsGrid');

  if (!section || !grid) return;

  section.classList.remove('hidden');
  targetDisplay.innerText = `${curr.symbol} ${formatNumber(targetAmount)}`;
  notesDisplay.innerText = `${formatNumber(totalNotes)} Notes`;
  remainderDisplay.innerText = `${curr.symbol} ${formatNumber(remainder)}`;

  grid.innerHTML = '';
  list.forEach(item => {
    const tile = document.createElement('div');
    tile.className = 'breakdown-tile';
    tile.innerHTML = `
      <div class="tile-top">
        <span class="tile-denom" style="color: var(--primary)">${curr.symbol} ${item.denom}</span>
        <span class="tile-count">× ${formatNumber(item.count)}</span>
      </div>
      <div class="tile-amount">= ${curr.symbol} ${formatNumber(item.total)}</div>
    `;
    grid.appendChild(tile);
  });
}

function applyBreakdownToCounter() {
  const curr = CURRENCIES[currentCurrency];
  const inputEl = document.getElementById('breakdownInput');
  let amount = parseInt(inputEl.value, 10);
  if (isNaN(amount) || amount <= 0) return;

  resetCounter();

  for (let denom of curr.denominations) {
    let count = Math.floor(amount / denom);
    if (count > 0) {
      countState[denom] = count;
      const input = document.getElementById(`input-denom-${denom}`);
      if (input) input.value = count;
      amount = amount % denom;
    }
  }

  calculateTotals();
  switchTab('tally-tab');
  showToast('Breakdown transferred to Counter!');
}

// ==================== HISTORY LOGS ====================
const STORAGE_KEY = 'smart_cash_counter_history';

function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    historyLogs = saved ? JSON.parse(saved) : [];
  } catch (e) {
    historyLogs = [];
  }
  renderHistory();
}

function saveCurrentToHistory() {
  const curr = CURRENCIES[currentCurrency];
  let grandTotal = 0;
  let totalNotes = 0;
  let breakdownSnap = {};

  curr.denominations.forEach(d => {
    const count = countState[d] || 0;
    if (count > 0) {
      breakdownSnap[d] = count;
      grandTotal += count * d;
      totalNotes += count;
    }
  });

  if (grandTotal === 0) {
    showToast('Cannot save empty cash count!');
    return;
  }

  const record = {
    id: Date.now(),
    currency: currentCurrency,
    timestamp: new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    totalAmount: grandTotal,
    totalNotes: totalNotes,
    breakdown: breakdownSnap,
    words: numberToWords(grandTotal, curr.wordFormat)
  };

  historyLogs.unshift(record);
  if (historyLogs.length > 50) historyLogs.pop();

  localStorage.setItem(STORAGE_KEY, JSON.stringify(historyLogs));
  renderHistory();
  playBeep('success');
  showToast('Cash Count saved to History!');
}

function renderHistory() {
  const listEl = document.getElementById('historyList');
  const badgeEl = document.getElementById('historyBadge');
  if (!listEl) return;

  if (badgeEl) badgeEl.innerText = historyLogs.length;

  if (historyLogs.length === 0) {
    listEl.innerHTML = `
      <div class="history-empty-state">
        <p>No saved cash logs yet. Count cash and click "Save to Log" to track records.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = '';
  historyLogs.forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-item';
    const cSymbol = CURRENCIES[item.currency]?.symbol || 'Rs.';

    const notesSummary = Object.entries(item.breakdown)
      .map(([denom, count]) => `${cSymbol}${denom} × ${count}`)
      .join(', ');

    card.innerHTML = `
      <div class="history-meta">
        <span class="history-time">📅 ${item.timestamp} (${item.currency})</span>
        <div class="history-amount">${cSymbol} ${formatNumber(item.totalAmount)}</div>
        <div class="history-notes-summary">${notesSummary || 'No notes'} (${item.totalNotes} notes)</div>
      </div>
      <div class="history-actions">
        <button class="action-btn secondary" onclick="restoreHistoryItem(${item.id})">Load</button>
        <button class="action-btn danger-sm" onclick="deleteHistoryItem(${item.id})">Delete</button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

function restoreHistoryItem(id) {
  const item = historyLogs.find(x => x.id === id);
  if (!item) return;

  if (item.currency && item.currency !== currentCurrency) {
    document.getElementById('currencySelect').value = item.currency;
    setCurrency(item.currency);
  }

  resetCounter();
  Object.entries(item.breakdown).forEach(([denom, count]) => {
    const d = parseInt(denom, 10);
    countState[d] = count;
    const input = document.getElementById(`input-denom-${d}`);
    if (input) input.value = count;
  });

  calculateTotals();
  switchTab('tally-tab');
  showToast('Loaded cash record into counter!');
}

function deleteHistoryItem(id) {
  historyLogs = historyLogs.filter(x => x.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(historyLogs));
  renderHistory();
  showToast('Record deleted');
}

function clearAllHistory() {
  if (historyLogs.length === 0) return;
  if (confirm('Are you sure you want to clear all history records?')) {
    historyLogs = [];
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    showToast('All history cleared');
  }
}

// ==================== SHARE, COPY & PRINT ====================
function getSlipSummaryText() {
  const curr = CURRENCIES[currentCurrency];
  let grandTotal = 0;
  let totalNotes = 0;
  let lines = [];

  lines.push(`💵 *CASH COUNT REPORT (${currentCurrency})* 💵`);
  lines.push(`📅 Date: ${new Date().toLocaleString()}`);
  lines.push('────────────────────────');

  curr.denominations.forEach(denom => {
    const count = countState[denom] || 0;
    if (count > 0) {
      const sub = count * denom;
      grandTotal += sub;
      totalNotes += count;
      lines.push(`${curr.symbol} ${denom.toString().padEnd(5)} × ${count.toString().padEnd(4)} = ${curr.symbol} ${formatNumber(sub)}`);
    }
  });

  lines.push('────────────────────────');
  lines.push(`*TOTAL AMOUNT:* ${curr.symbol} ${formatNumber(grandTotal)}`);
  lines.push(`*Total Notes:* ${formatNumber(totalNotes)} pcs`);
  lines.push(`*In Words:* ${numberToWords(grandTotal, curr.wordFormat)}`);
  lines.push('────────────────────────');

  const exp = parseFloat(document.getElementById('expectedAmountInput')?.value);
  if (!isNaN(exp) && exp > 0) {
    const diff = grandTotal - exp;
    lines.push(`Expected: ${curr.symbol} ${formatNumber(exp)}`);
    lines.push(`Difference: ${diff === 0 ? 'Balanced (0)' : (diff > 0 ? '+' : '-') + curr.symbol + ' ' + formatNumber(Math.abs(diff))}`);
    lines.push('────────────────────────');
  }

  return { text: lines.join('\n'), total: grandTotal };
}

function copySlipText() {
  const { text, total } = getSlipSummaryText();
  if (total === 0) {
    showToast('Count some notes first!');
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    showToast('✓ Cash slip copied to clipboard!');
  }).catch(() => {
    showToast('Could not copy text.');
  });
}

function shareViaWhatsApp() {
  const { text, total } = getSlipSummaryText();
  if (total === 0) {
    showToast('Count some notes first!');
    return;
  }

  const encoded = encodeURIComponent(text);
  window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
}

function printCashSlip() {
  const curr = CURRENCIES[currentCurrency];
  let grandTotal = 0;
  let totalNotes = 0;
  let rowsHtml = '';

  curr.denominations.forEach(denom => {
    const count = countState[denom] || 0;
    if (count > 0) {
      const sub = count * denom;
      grandTotal += sub;
      totalNotes += count;
      rowsHtml += `
        <div class="slip-row">
          <span>${curr.symbol} ${denom} × ${count}</span>
          <span>${curr.symbol} ${formatNumber(sub)}</span>
        </div>
      `;
    }
  });

  if (grandTotal === 0) {
    showToast('Please count notes before printing!');
    return;
  }

  document.getElementById('slipTimestamp').innerText = `Date: ${new Date().toLocaleString()} (${currentCurrency})`;
  document.getElementById('slipTableContent').innerHTML = rowsHtml;
  document.getElementById('slipTotalAmount').innerText = `${curr.symbol} ${formatNumber(grandTotal)}`;
  document.getElementById('slipTotalNotes').innerText = `${totalNotes} pcs`;
  document.getElementById('slipWords').innerText = numberToWords(grandTotal, curr.wordFormat);

  window.print();
}

// Toast Notifications
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.innerHTML = `<span>⚡</span> <span>${msg}</span>`;
  toast.classList.remove('hidden');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

  const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  const activePane = document.getElementById(tabId);

  if (activeBtn) activeBtn.classList.add('active');
  if (activePane) activePane.classList.add('active');
}

// Toggle Sound
function toggleSound() {
  soundEnabled = !soundEnabled;
  const soundOn = document.getElementById('soundOnIcon');
  const soundOff = document.getElementById('soundOffIcon');

  if (soundEnabled) {
    soundOn.classList.remove('hidden');
    soundOff.classList.add('hidden');
    showToast('Sound enabled');
  } else {
    soundOn.classList.add('hidden');
    soundOff.classList.remove('hidden');
    showToast('Sound muted');
  }
}

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Load saved theme and currency
  const savedTheme = localStorage.getItem('cash_counter_theme') || 'dark';
  setTheme(savedTheme);

  const savedCurr = localStorage.getItem('cash_counter_currency') || 'PKR';
  const currSelect = document.getElementById('currencySelect');
  if (currSelect) {
    currSelect.value = savedCurr;
  }
  setCurrency(savedCurr);

  loadKhata();
  loadHistory();

  // Tab Navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Currency Selector
  currSelect?.addEventListener('change', (e) => {
    setCurrency(e.target.value);
  });

  // Theme Buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.theme);
    });
  });

  // Sound Toggle
  document.getElementById('soundToggle')?.addEventListener('click', toggleSound);

  // Counter Reset
  document.getElementById('btnResetTally')?.addEventListener('click', resetCounter);

  // Expected Cash Input
  document.getElementById('expectedAmountInput')?.addEventListener('input', () => {
    const curr = CURRENCIES[currentCurrency];
    let grandTotal = 0;
    curr.denominations.forEach(d => { grandTotal += (countState[d] || 0) * d; });
    checkDifference(grandTotal);
  });

  // Action Buttons
  document.getElementById('btnSaveRecord')?.addEventListener('click', saveCurrentToHistory);
  document.getElementById('btnCopySlip')?.addEventListener('click', copySlipText);
  document.getElementById('btnShareWhatsApp')?.addEventListener('click', shareViaWhatsApp);
  document.getElementById('btnPrintSlip')?.addEventListener('click', printCashSlip);

  // Breakdown Tab
  document.getElementById('btnComputeBreakdown')?.addEventListener('click', computeAmountBreakdown);
  document.getElementById('breakdownInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') computeAmountBreakdown();
  });
  document.getElementById('btnApplyToCounter')?.addEventListener('click', applyBreakdownToCounter);

  // History Tab
  document.getElementById('btnClearHistory')?.addEventListener('click', clearAllHistory);
});
/**
 * Smart Cash Counter & Denomination Calculator
 * Modern, responsive cash counter with audio feedback, history, and slip printing.
 */

// Supported Denominations (Pakistani Rupee PKR standard)
const DENOMINATIONS = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1];

// App State
let countState = {};
DENOMINATIONS.forEach(d => { countState[d] = 0; });

let soundEnabled = true;
let historyLogs = [];

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
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    }
  } catch (e) {
    // Audio not permitted or not supported
  }
}

// Utility: Format Number with commas (e.g. 15,000)
function formatNumber(num) {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-US');
}

// Utility: Convert Amount to Words (Lakhs & Crores format)
function numberToWordsPKR(num) {
  if (num === 0) return 'Zero Rupees Only';
  if (num < 0) return 'Negative ' + numberToWordsPKR(Math.abs(num));

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

  return words.trim() + ' Rupees Only';
}

// Initialize and Render Denomination List
function initDenominationList() {
  const container = document.getElementById('denominationList');
  if (!container) return;

  container.innerHTML = '';

  DENOMINATIONS.forEach(denom => {
    const row = document.createElement('div');
    row.className = 'denom-row';
    row.dataset.denom = denom;

    row.innerHTML = `
      <div class="denom-badge denom-${denom}">
        <span>Rs.</span>
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
        <span class="currency-prefix">Rs.</span>0
      </div>
    `;

    container.appendChild(row);
  });
}

// Update Single Denomination Count
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

// Add Quick Bundle (+10, +50, +100)
function addBundle(denom, bundleSize) {
  updateDenomCount(denom, bundleSize);
}

// Handle Direct Manual Input
function handleManualInput(denom, val) {
  const parsed = parseInt(val, 10);
  countState[denom] = isNaN(parsed) || parsed < 0 ? 0 : parsed;
  playBeep('click');
  calculateTotals();
}

// Calculate All Totals and Update UI
function calculateTotals() {
  let grandTotal = 0;
  let totalNotes = 0;
  let highValTotal = 0;

  DENOMINATIONS.forEach(denom => {
    const count = countState[denom] || 0;
    const subtotal = count * denom;
    grandTotal += subtotal;
    totalNotes += count;

    if (denom >= 500) {
      highValTotal += subtotal;
    }

    const subtotalEl = document.getElementById(`subtotal-${denom}`);
    if (subtotalEl) {
      subtotalEl.innerHTML = `<span class="currency-prefix">Rs.</span>${formatNumber(subtotal)}`;
    }
  });

  // Grand Total & Notes Count Display
  const grandTotalEl = document.getElementById('grandTotalAmount');
  const totalNotesEl = document.getElementById('totalNotesCount');
  const amountInWordsEl = document.getElementById('amountInWords');
  const highValEl = document.getElementById('highValPercent');

  if (grandTotalEl) grandTotalEl.innerText = formatNumber(grandTotal);
  if (totalNotesEl) totalNotesEl.innerText = `${formatNumber(totalNotes)} pcs`;
  if (amountInWordsEl) amountInWordsEl.innerText = numberToWordsPKR(grandTotal);

  if (highValEl) {
    const percent = grandTotal > 0 ? Math.round((highValTotal / grandTotal) * 100) : 0;
    highValEl.innerText = `${percent}%`;
  }

  // Check Balance / Difference with Expected Amount
  checkDifference(grandTotal);
}

// Cash Balancing / Difference Checker
function checkDifference(currentTotal) {
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
    diffValue.innerText = 'Exact Match (Rs. 0 difference)';
    diffBox.className = 'diff-result-box';
    diffValue.className = 'diff-val matched';
  } else if (diff < 0) {
    badge.className = 'badge badge-short';
    badge.innerText = 'Shortage ✕';
    diffTitle.innerText = 'Short Amount:';
    diffValue.innerText = `- Rs. ${formatNumber(Math.abs(diff))}`;
    diffBox.className = 'diff-result-box';
    diffValue.className = 'diff-val short';
  } else {
    badge.className = 'badge badge-excess';
    badge.innerText = 'Excess +';
    diffTitle.innerText = 'Excess Amount:';
    diffValue.innerText = `+ Rs. ${formatNumber(diff)}`;
    diffBox.className = 'diff-result-box';
    diffValue.className = 'diff-val excess';
  }
}

// Reset Denomination Counter
function resetCounter() {
  DENOMINATIONS.forEach(d => {
    countState[d] = 0;
    const inputEl = document.getElementById(`input-denom-${d}`);
    if (inputEl) inputEl.value = '';
  });

  const expectedInput = document.getElementById('expectedAmountInput');
  if (expectedInput) expectedInput.value = '';

  calculateTotals();
  showToast('Counter has been reset');
}

// ==================== TAB 2: BREAKDOWN CALCULATOR ====================
function computeAmountBreakdown() {
  const inputEl = document.getElementById('breakdownInput');
  if (!inputEl) return;

  let amount = parseInt(inputEl.value, 10);
  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount');
    return;
  }

  const initialAmount = amount;
  let totalNotesNeeded = 0;
  const breakdownResults = [];

  for (let denom of DENOMINATIONS) {
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
  const section = document.getElementById('breakdownResultsSection');
  const targetDisplay = document.getElementById('targetAmountDisplay');
  const notesDisplay = document.getElementById('targetNotesCountDisplay');
  const remainderDisplay = document.getElementById('targetRemainderDisplay');
  const grid = document.getElementById('breakdownCardsGrid');

  if (!section || !grid) return;

  section.classList.remove('hidden');
  targetDisplay.innerText = `Rs. ${formatNumber(targetAmount)}`;
  notesDisplay.innerText = `${formatNumber(totalNotes)} Notes`;
  remainderDisplay.innerText = `Rs. ${formatNumber(remainder)}`;

  grid.innerHTML = '';

  if (list.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted)">No notes breakdown available.</p>`;
    return;
  }

  list.forEach(item => {
    const tile = document.createElement('div');
    tile.className = 'breakdown-tile';
    tile.innerHTML = `
      <div class="tile-top">
        <span class="tile-denom" style="color: #60a5fa">Rs. ${item.denom}</span>
        <span class="tile-count">× ${formatNumber(item.count)}</span>
      </div>
      <div class="tile-amount">= Rs. ${formatNumber(item.total)}</div>
    `;
    grid.appendChild(tile);
  });
}

// Transfer Breakdown to Denomination Counter Tab
function applyBreakdownToCounter() {
  const inputEl = document.getElementById('breakdownInput');
  let amount = parseInt(inputEl.value, 10);
  if (isNaN(amount) || amount <= 0) return;

  resetCounter();

  for (let denom of DENOMINATIONS) {
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
  showToast('Breakdown loaded into Counter!');
}

// ==================== TAB 3: HISTORY & PERSISTENCE ====================
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
  let grandTotal = 0;
  let totalNotes = 0;
  let breakdownSnap = {};

  DENOMINATIONS.forEach(d => {
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
    timestamp: new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    totalAmount: grandTotal,
    totalNotes: totalNotes,
    breakdown: breakdownSnap,
    words: numberToWordsPKR(grandTotal)
  };

  historyLogs.unshift(record);
  if (historyLogs.length > 50) historyLogs.pop(); // Keep last 50

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

    // Summary of notes string e.g. "5000×2, 1000×5"
    const notesSummary = Object.entries(item.breakdown)
      .map(([denom, count]) => `Rs.${denom} × ${count}`)
      .join(', ');

    card.innerHTML = `
      <div class="history-meta">
        <span class="history-time">📅 ${item.timestamp}</span>
        <div class="history-amount">Rs. ${formatNumber(item.totalAmount)}</div>
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

// ==================== ACTIONS: COPY, SHARE, PRINT ====================
function getSlipSummaryText() {
  let grandTotal = 0;
  let totalNotes = 0;
  let lines = [];

  lines.push('💵 *CASH COUNT REPORT* 💵');
  lines.push(`📅 Date: ${new Date().toLocaleString()}`);
  lines.push('────────────────────────');

  DENOMINATIONS.forEach(denom => {
    const count = countState[denom] || 0;
    if (count > 0) {
      const sub = count * denom;
      grandTotal += sub;
      totalNotes += count;
      lines.push(`Rs. ${denom.toString().padEnd(5)} × ${count.toString().padEnd(4)} = Rs. ${formatNumber(sub)}`);
    }
  });

  lines.push('────────────────────────');
  lines.push(`*TOTAL AMOUNT:* Rs. ${formatNumber(grandTotal)}`);
  lines.push(`*Total Notes:* ${formatNumber(totalNotes)} pcs`);
  lines.push(`*In Words:* ${numberToWordsPKR(grandTotal)}`);
  lines.push('────────────────────────');

  const exp = parseFloat(document.getElementById('expectedAmountInput')?.value);
  if (!isNaN(exp) && exp > 0) {
    const diff = grandTotal - exp;
    lines.push(`Expected: Rs. ${formatNumber(exp)}`);
    lines.push(`Difference: ${diff === 0 ? 'Balanced (0)' : (diff > 0 ? '+Rs. ' : '-Rs. ') + formatNumber(Math.abs(diff))}`);
    lines.push('────────────────────────');
  }

  return { text: lines.join('\n'), total: grandTotal, totalNotes: totalNotes };
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
  let grandTotal = 0;
  let totalNotes = 0;
  let rowsHtml = '';

  DENOMINATIONS.forEach(denom => {
    const count = countState[denom] || 0;
    if (count > 0) {
      const sub = count * denom;
      grandTotal += sub;
      totalNotes += count;
      rowsHtml += `
        <div class="slip-row">
          <span>Rs. ${denom} × ${count}</span>
          <span>Rs. ${formatNumber(sub)}</span>
        </div>
      `;
    }
  });

  if (grandTotal === 0) {
    showToast('Please count notes before printing!');
    return;
  }

  document.getElementById('slipTimestamp').innerText = `Date: ${new Date().toLocaleString()}`;
  document.getElementById('slipTableContent').innerHTML = rowsHtml;
  document.getElementById('slipTotalAmount').innerText = `Rs. ${formatNumber(grandTotal)}`;
  document.getElementById('slipTotalNotes').innerText = `${totalNotes} pcs`;
  document.getElementById('slipWords').innerText = numberToWordsPKR(grandTotal);

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
    showToast('Sound feedback enabled');
  } else {
    soundOn.classList.add('hidden');
    soundOff.classList.remove('hidden');
    showToast('Sound muted');
  }
}

// Event Listeners on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initDenominationList();
  loadHistory();

  // Tab Buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Sound Toggle
  document.getElementById('soundToggle')?.addEventListener('click', toggleSound);

  // Reset Button
  document.getElementById('btnResetTally')?.addEventListener('click', resetCounter);

  // Expected Amount Input for difference calculation
  document.getElementById('expectedAmountInput')?.addEventListener('input', () => {
    let grandTotal = 0;
    DENOMINATIONS.forEach(d => { grandTotal += (countState[d] || 0) * d; });
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
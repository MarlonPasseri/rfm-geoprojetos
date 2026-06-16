// SEG_NAMES: fornecido por js/api.js (window.SEG_NAMES)

// SUMMARY: fornecido por js/api.js (window.SUMMARY)

// TOP10: fornecido por js/api.js (window.TOP10)

// GRID: fornecido por js/api.js (window.GRID)

// ── Bar chart
const barCtx = document.getElementById('barChart').getContext('2d');
new Chart(barCtx, {
  type: 'bar',
  data: {
    labels: SUMMARY.map(s => s.seg),
    datasets: [{
      data: SUMMARY.map(s => s.count),
      backgroundColor: SUMMARY.map(s => SEG_COLORS[s.seg]),
      borderRadius: 4, borderWidth: 0
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      callbacks: { label: ctx => ` ${ctx.raw} clientes — ${SEG_NAMES[SUMMARY[ctx.dataIndex].seg]}` }
    }},
    scales: {
      x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8892a4' } },
      y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8892a4' } }
    }
  }
});

// ── Top 10 horizontal bar
const t10Ctx = document.getElementById('top10Chart').getContext('2d');
new Chart(t10Ctx, {
  type: 'bar',
  data: {
    labels: TOP10.map(t => t.cliente),
    datasets: [{
      data: TOP10.map(t => t.valor / 1e6),
      backgroundColor: TOP10.map(t => SEG_COLORS[t.seg]),
      borderRadius: 3, borderWidth: 0
    }]
  },
  options: {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      callbacks: { label: ctx => ` R$ ${ctx.raw.toFixed(1)}M — ${SEG_NAMES[TOP10[ctx.dataIndex].seg]}` }
    }},
    scales: {
      x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8892a4', callback: v => `R$ ${v}M` } },
      y: { grid: { display: false }, ticks: { color: '#e8eaf0', font: { size: 10 } } }
    }
  }
});

// ── Seg list
const segList = document.getElementById('segList');
const maxCount = Math.max(...SUMMARY.map(s=>s.count));
SUMMARY.forEach(s => {
  segList.innerHTML += `<div class="seg-row">
    <span class="seg-dot" style="background:${SEG_COLORS[s.seg]}"></span>
    <span class="seg-name">${s.seg} — ${s.segmento}</span>
    <div class="seg-bar-wrap"><div class="seg-bar" style="width:${(s.count/maxCount*100).toFixed(0)}%;background:${SEG_COLORS[s.seg]}"></div></div>
    <span class="seg-count" style="color:${SEG_COLORS[s.seg]}">${s.count}</span>
  </div>`;
});

// ── Matrix
const grid = document.getElementById('matrixGrid');
const mtip = document.getElementById('mtip');
// Y label
const yLabel = document.createElement('div');
yLabel.className = 'y-label'; yLabel.textContent = '← Frequência';
grid.appendChild(yLabel);
for(let f = 5; f >= 1; f--) {
  const axisY = document.createElement('div');
  axisY.className = 'm-axis'; axisY.textContent = f;
  axisY.style.gridColumn = '1'; grid.appendChild(axisY);
  for(let r = 1; r <= 5; r++) {
    const key = `${r}_${f}`;
    const info = GRID[key] || {count:0, seg:'K', clientes:[]};
    const cell = document.createElement('div');
    cell.className = 'm-cell';
    cell.style.background = info.count > 0 ? SEG_COLORS[info.seg] : 'rgba(255,255,255,0.04)';
    if(info.count > 0) {
      cell.innerHTML = `<span class="m-count">${info.count}</span><span class="m-seg">${info.seg}</span>`;
      cell.addEventListener('mouseenter', e => {
        mtip.innerHTML = `<div class="mtip-title" style="color:${SEG_COLORS[info.seg]}">${info.seg} — ${SEG_NAMES[info.seg]}</div>
          <div class="mtip-row">R${r} · F${f} &nbsp;|&nbsp; <strong>${info.count}</strong> clientes</div>
          <div class="mtip-clients">${info.clientes.slice(0,5).map(c=>`<span>· ${c}</span>`).join('')}${info.clientes.length > 5 ? '<span style="opacity:.6">...</span>' : ''}</div>`;
        mtip.style.display = 'block'; moveTip(e);
      });
      cell.addEventListener('mousemove', moveTip);
      cell.addEventListener('mouseleave', () => mtip.style.display = 'none');
    }
    grid.appendChild(cell);
  }
}
function moveTip(e) {
  const x = e.clientX + 14, y = e.clientY - 10;
  mtip.style.left = (x + 220 > window.innerWidth ? e.clientX - 230 : x) + 'px';
  mtip.style.top = y + 'px';
}

// ── Table
// RAW_DATA: fornecido por js/api.js (window.RAW_DATA)
let sortKey = 'frequencia', sortDir = -1;
let filtered = [...RAW_DATA];

function fmtVal(v) {
  if(!v) return '—';
  if(v >= 1e6) return 'R$ ' + (v/1e6).toFixed(1) + 'M';
  if(v >= 1e3) return 'R$ ' + (v/1e3).toFixed(0) + 'K';
  return 'R$ ' + v.toLocaleString('pt-BR');
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  const rows = filtered.slice(0, 500);
  tbody.innerHTML = rows.map((r,i) => `
    <tr class="clickable" data-idx="${i}">
      <td style="font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis">${r.cliente}</td>
      <td>${r.ultima_data}</td>
      <td style="text-align:right">${r.recencia.toLocaleString('pt-BR')}</td>
      <td style="text-align:center">${r.frequencia}</td>
      <td style="text-align:right">${fmtVal(r.valor)}</td>
      <td style="text-align:center;font-weight:700;color:${SEG_COLORS[r.seg]}">${r.R}</td>
      <td style="text-align:center;font-weight:700;color:${SEG_COLORS[r.seg]}">${r.F}</td>
      <td style="text-align:center;font-weight:700;color:${SEG_COLORS[r.seg]}">${r.M}</td>
      <td><span class="badge" style="background:${SEG_COLORS[r.seg]}">${r.seg}</span></td>
    </tr>`).join('');
  document.getElementById('countInfo').textContent = `${filtered.length} clientes${filtered.length > 500 ? ' (mostrando 500)' : ''}`;
}

function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const seg = document.getElementById('segFilter').value;
  filtered = RAW_DATA.filter(r =>
    (!search || r.cliente.toLowerCase().includes(search)) &&
    (!seg || r.seg === seg)
  );
  filtered.sort((a,b) => {
    let va = a[sortKey], vb = b[sortKey];
    if(typeof va === 'string') return va.localeCompare(vb) * sortDir;
    return (va - vb) * sortDir;
  });
  renderTable();
}

function sortTable(key) {
  if(sortKey === key) sortDir *= -1;
  else { sortKey = key; sortDir = -1; }
  applyFilters();
}

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('segFilter').addEventListener('change', applyFilters);

applyFilters();


// ── Cancel data: 566 clientes com breakdown por status
// CANCEL_DATA: fornecido por js/api.js (window.CANCEL_DATA)

let cancelFiltered = [...CANCEL_DATA];
let cancelSortKey = 'pct';
let cancelSortDir = -1;

function pctColor(pct) {
  if (pct === 0)   return '#4a9fd4';
  if (pct <= 25)   return '#9ad4b0';
  if (pct <= 50)   return '#e8a042';
  if (pct < 100)   return '#d95f5f';
  return '#c4384d';
}

function renderCancelTable() {
  const tbody = document.getElementById('cancelTableBody');
  if (!tbody) return;
  tbody.innerHTML = cancelFiltered.slice(0, 600).map(r => {
    const col = pctColor(r.pct);
    return '<tr class="clickable">' +
      '<td>' + r.c + '</td>' +
      '<td style="text-align:center;font-weight:600">' + r.t + '</td>' +
      '<td style="text-align:center;font-weight:700;color:#c4384d">' + r.ca + '</td>' +
      '<td style="text-align:center">' + r.pe + '</td>' +
      '<td style="text-align:center">' + r.de + '</td>' +
      '<td style="text-align:center;color:#4a9fd4">' + r.an + '</td>' +
      '<td style="text-align:center;color:#4a9fd4">' + r.en + '</td>' +
      '<td style="text-align:center"><span class="badge" style="background:' + col + ';min-width:52px;display:inline-block;text-align:center">' + r.pct + '%</span></td>' +
      '</tr>';
  }).join('');
  document.getElementById('cancelCount').textContent = cancelFiltered.length + ' clientes';
}

function applyCancelFilters() {
  const search = (document.getElementById('cancelSearch') ? document.getElementById('cancelSearch').value : '').toLowerCase();
  const filt   = document.getElementById('cancelFilter') ? document.getElementById('cancelFilter').value : '';
  const minT   = parseInt(document.getElementById('cancelMinT') ? document.getElementById('cancelMinT').value : '') || 0;
  const year   = document.getElementById('cancelYear') ? document.getElementById('cancelYear').value : '';
  cancelFiltered = CANCEL_DATA.filter(function(r) {
    if (search && r.c.toLowerCase().indexOf(search) === -1) return false;
    if (filt === '100' && r.pct !== 100) return false;
    if (filt === '50'  && r.pct < 50)   return false;
    if (filt === '1'   && r.ca === 0)   return false;
    if (filt === '0'   && r.pct !== 0)  return false;
    if (minT > 0 && r.t < minT) return false;
    if (year && !(CLIENT_HISTORY[r.c] && CLIENT_HISTORY[r.c][year])) return false;
    return true;
  });
  const key = cancelSortKey;
  const dir = cancelSortDir;
  cancelFiltered.sort(function(a, b) {
    if (a[key] < b[key]) return dir;
    if (a[key] > b[key]) return -dir;
    return 0;
  });
  renderCancelTable();
}

function cancelSortTable(key) {
  if (cancelSortKey === key) { cancelSortDir *= -1; }
  else { cancelSortKey = key; cancelSortDir = (key === 'c') ? 1 : -1; }
  applyCancelFilters();
}
// ── Tab switching
function switchTab(name) {
  if (typeof closeClientPanel === 'function') closeClientPanel();
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('btn-' + name).classList.add('active');
  if (name === 'cancelamentos' && !window._cancelChartsReady) {
    window._cancelChartsReady = true;
    buildCancelCharts();
  }
  if (name === 'analise' && !window._analiseReady && typeof buildAnaliseCharts === 'function') {
    window._analiseReady = true;
    buildAnaliseCharts();
  }
  if (name === 'declinio' && !window._declineReady) {
    window._declineReady = true;
    document.getElementById('declineSearch').addEventListener('input', applyDeclineFilters);
    document.getElementById('declineFilter').addEventListener('change', applyDeclineFilters);
    document.getElementById('declineMinT').addEventListener('change', applyDeclineFilters);
    document.getElementById('declineYear').addEventListener('change', applyDeclineFilters);
    applyDeclineFilters();
  }
  if (name === 'gui' && !window._guiReady) {
    window._guiReady = true;
    document.getElementById('guiSearch').addEventListener('input', applyGuiFilters);
    document.getElementById('guiFilter').addEventListener('change', applyGuiFilters);
    document.getElementById('guiMinT').addEventListener('change', applyGuiFilters);
    document.getElementById('guiTableBody').addEventListener('click', function(e) {
      const tr = e.target.closest('tr');
      if (!tr) return;
      const name = tr.children[0] && tr.children[0].textContent.trim();
      if (name) openHistoryModal(name);
    });
    buildGuiSummary();
    applyGuiFilters();
  }
}

// ── Cancelamentos charts (lazy — só renderiza quando a aba é aberta)
function buildCancelCharts() {
  // Populate year selects from CLIENT_HISTORY
  const _years = Array.from(new Set(
    Object.values(CLIENT_HISTORY).flatMap(function(yrs) { return Object.keys(yrs); })
  )).sort();
  ['cancelYear', 'declineYear'].forEach(function(id) {
    const sel = document.getElementById(id);
    if (!sel) return;
    _years.forEach(function(y) {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      sel.appendChild(opt);
    });
  });

  // Tabela por cliente
  document.getElementById('cancelSearch').addEventListener('input', applyCancelFilters);
  document.getElementById('cancelFilter').addEventListener('change', applyCancelFilters);
  document.getElementById('cancelMinT').addEventListener('change', applyCancelFilters);
  document.getElementById('cancelYear').addEventListener('change', applyCancelFilters);
  applyCancelFilters();

  // Donut: Ganhos vs Cancelado vs Perdemos vs Declinamos
  const donutCtx = document.getElementById('cancelDonutChart').getContext('2d');
  new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: ['Encerrado', 'OK Andamento', 'Cancelado', 'Perdemos', 'Declinamos'],
      datasets: [{
        data: [131, 15, 303, 308, 80],
        backgroundColor: ['#4a9fd4', '#2e6fad', '#c4384d', '#d95f5f', '#7b1c2e'],
        borderWidth: 2,
        borderColor: '#1a1d27',
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#8892a4', font: { size: 11 }, padding: 12, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a,b) => a+b, 0);
              const pct = (ctx.raw / total * 100).toFixed(1);
              return ` ${ctx.raw} clientes (${pct}%)`;
            }
          }
        }
      }
    }
  });

  // Bar: breakdown perdidos com % sobre total perdidos
  const barCtx2 = document.getElementById('cancelBarChart').getContext('2d');
  new Chart(barCtx2, {
    type: 'bar',
    data: {
      labels: ['Cancelado', 'Perdemos', 'Declinamos'],
      datasets: [
        {
          label: 'Clientes únicos',
          data: [303, 308, 80],
          backgroundColor: ['#c4384d', '#d95f5f', '#7b1c2e'],
          borderRadius: 5, borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const pct = (ctx.raw / 519 * 100).toFixed(1);
              return ` ${ctx.raw} clientes — ${pct}% dos perdidos`;
            }
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#e8eaf0' } },
        y: {
          grid: { color: 'rgba(255,255,255,.05)' },
          ticks: { color: '#8892a4' },
          title: { display: true, text: 'Clientes únicos', color: '#8892a4', font: { size: 10 } }
        }
      }
    }
  });
}

// ── Decline tab
let declineFiltered = [...DECLINE_DATA.clientes];
let declineSortKey = 'pct';
let declineSortDir = -1;

function pctDeclineColor(pct) {
  if (pct === 0)   return '#4a9fd4';
  if (pct <= 25)   return '#9ad4b0';
  if (pct <= 50)   return '#e8a042';
  if (pct < 100)   return '#d4863a';
  return '#c4384d';
}

function renderDeclineTable() {
  const tbody = document.getElementById('declineTableBody');
  if (!tbody) return;
  tbody.innerHTML = declineFiltered.slice(0, 600).map(r => {
    const col = pctDeclineColor(r.pct);
    return '<tr class="clickable">' +
      '<td>' + r.c + '</td>' +
      '<td style="text-align:center;font-weight:600">' + r.t + '</td>' +
      '<td style="text-align:center;font-weight:700;color:#e8a042">' + r.de + '</td>' +
      '<td style="text-align:center">' + r.p + '</td>' +
      '<td style="text-align:center"><span class="badge" style="background:' + col + ';min-width:52px;display:inline-block;text-align:center">' + r.pct + '%</span></td>' +
      '</tr>';
  }).join('');
  document.getElementById('declineCount').textContent = declineFiltered.length + ' clientes';
}

function applyDeclineFilters() {
  const search = (document.getElementById('declineSearch') ? document.getElementById('declineSearch').value : '').toLowerCase();
  const filt   = document.getElementById('declineFilter') ? document.getElementById('declineFilter').value : '';
  const minT   = parseInt(document.getElementById('declineMinT') ? document.getElementById('declineMinT').value : '') || 0;
  const year   = document.getElementById('declineYear') ? document.getElementById('declineYear').value : '';
  declineFiltered = DECLINE_DATA.clientes.filter(function(r) {
    if (search && r.c.toLowerCase().indexOf(search) === -1) return false;
    if (filt === '100' && r.pct !== 100) return false;
    if (filt === '50'  && r.pct < 50)   return false;
    if (filt === '1'   && r.de === 0)   return false;
    if (filt === '0'   && r.pct !== 0)  return false;
    if (minT > 0 && r.t < minT) return false;
    if (year && !(CLIENT_HISTORY[r.c] && CLIENT_HISTORY[r.c][year])) return false;
    return true;
  });
  const key = declineSortKey;
  const dir = declineSortDir;
  declineFiltered.sort(function(a, b) {
    if (a[key] < b[key]) return dir;
    if (a[key] > b[key]) return -dir;
    return 0;
  });
  renderDeclineTable();
}

function declineSortTable(key) {
  if (declineSortKey === key) { declineSortDir *= -1; }
  else { declineSortKey = key; declineSortDir = (key === 'c') ? 1 : -1; }
  applyDeclineFilters();
}

// ── History modal (cancel + decline tables)
let _histChart = null;
const _HIST_ANOS = ['2016','2017','2018','2019','2020','2021','2022','2023','2024','2025'];

function openHistoryModal(clientName) {
  document.getElementById('hist-name').textContent = clientName;
  const hist = CLIENT_HISTORY[clientName] || {};
  const ganhos   = _HIST_ANOS.map(function(a) { return hist[a] ? hist[a].g : 0; });
  const perdidos = _HIST_ANOS.map(function(a) { return hist[a] ? hist[a].p : 0; });
  const ctx = document.getElementById('hist-chart').getContext('2d');
  if (_histChart) _histChart.destroy();
  _histChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: _HIST_ANOS,
      datasets: [
        { label: 'Ganhos',   data: ganhos,   backgroundColor: '#2e6fad', borderRadius: 4, borderWidth: 0 },
        { label: 'Perdidos', data: perdidos, backgroundColor: '#c4384d', borderRadius: 4, borderWidth: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8892a4', font: { size: 11 }, boxWidth: 12, padding: 14 } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8892a4' } },
        y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8892a4' }, beginAtZero: true }
      }
    }
  });
  document.getElementById('hist-overlay').classList.add('open');
  document.getElementById('hist-modal').classList.add('open');
}

function closeHistoryModal() {
  document.getElementById('hist-overlay').classList.remove('open');
  document.getElementById('hist-modal').classList.remove('open');
}

document.getElementById('hist-close').addEventListener('click', closeHistoryModal);
document.getElementById('hist-overlay').addEventListener('click', closeHistoryModal);

document.getElementById('cancelTableBody').addEventListener('click', function(e) {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const name = tr.children[0] && tr.children[0].textContent.trim();
  if (name) openHistoryModal(name);
});

document.getElementById('declineTableBody').addEventListener('click', function(e) {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const name = tr.children[0] && tr.children[0].textContent.trim();
  if (name) openHistoryModal(name);
});

// ── Análise GUI tab — GUI_DATA e GUI_SUMMARY vêm da API (js/api.js)
let guiFiltered = (typeof GUI_DATA !== 'undefined') ? [...GUI_DATA] : [];
let guiSortKey = 't';
let guiSortDir = -1;

function guiEscape(value) {
  return String(value).replace(/[&<>"']/g, function(ch) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}

function buildGuiSummary() {
  document.getElementById('guiClientes').textContent = GUI_SUMMARY.clientes;
  document.getElementById('guiTotal').textContent = GUI_SUMMARY.total;
  document.getElementById('guiGanhos').textContent = GUI_SUMMARY.ganhos;
  document.getElementById('guiPerdidos').textContent = GUI_SUMMARY.perdidos;
}

function renderGuiTable() {
  const tbody = document.getElementById('guiTableBody');
  if (!tbody) return;
  tbody.innerHTML = guiFiltered.map(function(r) {
    return '<tr class="clickable">' +
      '<td style="font-weight:500;max-width:420px;overflow:hidden;text-overflow:ellipsis">' + guiEscape(r.c) + '</td>' +
      '<td style="text-align:center;font-weight:700">' + r.t + '</td>' +
      '<td style="text-align:center;font-weight:700;color:#4a9fd4">' + r.g + '</td>' +
      '<td style="text-align:center;font-weight:700;color:#d95f5f">' + r.p + '</td>' +
      '</tr>';
  }).join('');
  document.getElementById('guiCount').textContent = guiFiltered.length + ' clientes';
}

function applyGuiFilters() {
  const search = (document.getElementById('guiSearch') ? document.getElementById('guiSearch').value : '').toLowerCase();
  const filt = document.getElementById('guiFilter') ? document.getElementById('guiFilter').value : '';
  const minT = parseInt(document.getElementById('guiMinT') ? document.getElementById('guiMinT').value : '') || 0;

  guiFiltered = GUI_DATA.filter(function(r) {
    if (search && r.c.toLowerCase().indexOf(search) === -1) return false;
    if (filt === 'ganhos' && r.g === 0) return false;
    if (filt === 'perdidos' && r.p === 0) return false;
    if (filt === 'sem-ganhos' && r.g !== 0) return false;
    if (filt === 'sem-perdidos' && r.p !== 0) return false;
    if (minT > 0 && r.t < minT) return false;
    return true;
  });

  const key = guiSortKey;
  const dir = guiSortDir;
  guiFiltered.sort(function(a, b) {
    if (a[key] < b[key]) return dir;
    if (a[key] > b[key]) return -dir;
    return a.c.localeCompare(b.c);
  });
  renderGuiTable();
}

function guiSortTable(key) {
  if (guiSortKey === key) { guiSortDir *= -1; }
  else { guiSortKey = key; guiSortDir = (key === 'c') ? 1 : -1; }
  applyGuiFilters();
}

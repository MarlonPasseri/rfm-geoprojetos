(function () {
  // Autenticação real contra a API da Geo (/api/auth/login) via js/api.js.
  function showError(msg) {
    const err = document.getElementById('login-error');
    err.textContent = msg || 'Usuário ou senha incorretos.';
    err.style.display = 'block';
    void err.offsetWidth; // reflow para reiniciar a animação
    err.classList.add('shake');
  }

  function showApp(user) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').style.display = '';
    document.getElementById('logged-user-label').textContent = user || '';
  }

  function logout() {
    window.rfmAuth.clear();
    if (typeof closeClientPanel === 'function') closeClientPanel();
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    document.getElementById('login-user').focus();
  }
  window.rfmLogout = logout;

  // Carrega os dados e o dashboard; em 401 volta para o login.
  async function enterDashboard() {
    try {
      await window.loadDashboard();
    } catch (e) {
      if (e instanceof window.RfmAuthError) { logout(); showError('Sessão expirada. Faça login novamente.'); }
      else { showError('Falha ao carregar os dados. Tente novamente.'); console.error(e); }
    }
  }

  // Sessão existente?
  if (window.rfmAuth.getToken()) {
    showApp(window.rfmAuth.getUser());
    enterDashboard();
  } else {
    document.getElementById('login-user').focus();
  }

  // Submit do login
  document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn  = document.getElementById('login-btn');
    const err  = document.getElementById('login-error');
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;

    btn.disabled = true; btn.textContent = 'Verificando…';
    err.style.display = 'none'; err.classList.remove('shake');

    try {
      await window.rfmLogin(user, pass);
      showApp(window.rfmAuth.getUser());
      await enterDashboard();
    } catch (e) {
      showError(e instanceof window.RfmAuthError ? e.message : 'Falha ao conectar à API.');
    } finally {
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  });

  // Mostrar/ocultar senha
  document.getElementById('toggle-pass').addEventListener('click', function () {
    const inp = document.getElementById('login-pass');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Atualizar: re-busca os dados do banco e re-renderiza.
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    const ORIGINAL = refreshBtn.textContent;
    refreshBtn.addEventListener('click', async function () {
      if (refreshBtn.disabled) return;
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Atualizando…';
      try {
        await window.refreshDashboard();
        refreshBtn.textContent = '✓ Atualizado';
        setTimeout(function () { refreshBtn.textContent = ORIGINAL; refreshBtn.disabled = false; }, 1200);
      } catch (e) {
        if (e instanceof window.RfmAuthError) {
          logout();
          showError('Sessão expirada. Faça login novamente.');
        } else {
          console.error(e);
          refreshBtn.textContent = '⚠ Erro ao atualizar';
          setTimeout(function () { refreshBtn.textContent = ORIGINAL; }, 2000);
        }
        refreshBtn.disabled = false;
      }
    });
  }
})();

// ── Client Detail Panel ──────────────────────────────────────
let _cpChart = null;
function openClientPanel(r) {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const SEG_COLORS_MAP = {A:'#1a3a6e',B:'#2e6fad',C:'#4a9fd4',D:'#74c4e8',E:'#9ad4b0',G:'#e8a042',I:'#d95f5f',J:'#c4384d',K:'#7b1c2e'};
  document.getElementById('cp-name').textContent  = r.cliente;
  const badge = document.getElementById('cp-badge');
  badge.textContent = r.segmento;
  badge.style.background = SEG_COLORS_MAP[r.seg] || '#555';
  document.getElementById('cp-freq').textContent   = r.frequencia + ' contratos';
  document.getElementById('cp-valor').textContent  = 'R$ ' + (r.valor/1e6).toFixed(1) + 'M';
  document.getElementById('cp-ultima').textContent = r.ultima_data;
  // RFM bars
  document.getElementById('cp-rbar').style.width   = (r.R/5*100)+'%';
  document.getElementById('cp-rscore').textContent = r.R;
  document.getElementById('cp-fbar').style.width   = (r.F/5*100)+'%';
  document.getElementById('cp-fscore').textContent = r.F;
  document.getElementById('cp-mbar').style.width   = (r.M/5*100)+'%';
  document.getElementById('cp-mscore').textContent = r.M;
  // History chart
  const hist = CLIENT_HISTORY[r.cliente] || {};
  const anos = Object.keys(hist).sort();
  const ganhos    = anos.map(a => hist[a].g);
  const perdidos  = anos.map(a => hist[a].p);
  const cancelados= anos.map(a => hist[a].ca);
  const ctx = document.getElementById('cp-chart').getContext('2d');
  if (_cpChart) _cpChart.destroy();
  _cpChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: anos,
      datasets: [
        { label:'Ganhos',    data:ganhos,    backgroundColor:'#2e6fad', borderRadius:3, stack:'s' },
        { label:'Perdidos',  data:perdidos,  backgroundColor:'#e8a042', borderRadius:3, stack:'s' },
        { label:'Cancelados',data:cancelados,backgroundColor:'#c4384d', borderRadius:3, stack:'s' }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#8892a4',font:{size:10}}}},
      scales:{
        x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8892a4',font:{size:10}}},
        y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8892a4',font:{size:10}},stacked:true}
      }
    }
  });
  document.body.classList.add('cpanel-open');
  document.getElementById('cpanel').classList.add('open');
  document.getElementById('cpanel-overlay').classList.add('open');
  window.scrollTo(scrollX, scrollY);
  requestAnimationFrame(function() {
    window.scrollTo(scrollX, scrollY);
  });
}
function closeClientPanel() {
  document.body.classList.remove('cpanel-open');
  document.getElementById('cpanel').classList.remove('open');
  document.getElementById('cpanel-overlay').classList.remove('open');
}
document.getElementById('cpanel-close').addEventListener('click', closeClientPanel);
document.getElementById('cpanel-overlay').addEventListener('click', closeClientPanel);
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeClientPanel();
});
window.addEventListener('pageshow', closeClientPanel);
closeClientPanel();

// Event delegation for clickable table rows (avoids JSON-in-HTML escaping issue)
document.getElementById('tableBody').addEventListener('click', function(e) {
  const tr = e.target.closest('tr[data-idx]');
  if (!tr) return;
  const idx = parseInt(tr.dataset.idx);
  if (!isNaN(idx) && filtered[idx]) openClientPanel(filtered[idx]);
});

// ── Análise Avançada Charts ───────────────────────────────────
function buildAnaliseCharts() {
  const SEG_COLORS_MAP = {A:'#1a3a6e',B:'#2e6fad',C:'#4a9fd4',D:'#74c4e8',E:'#9ad4b0',G:'#e8a042',I:'#d95f5f',J:'#c4384d',K:'#7b1c2e'};

  // ── Compute avg R, F, M per segment from RAW_DATA
  const segRFM = {};
  RAW_DATA.forEach(c => {
    if (!segRFM[c.seg]) segRFM[c.seg] = {r:0,f:0,m:0,n:0};
    segRFM[c.seg].r += c.R; segRFM[c.seg].f += c.F; segRFM[c.seg].m += c.M; segRFM[c.seg].n++;
  });
  const segsAll = Object.keys(segRFM).sort();
  segsAll.forEach(s => { const d=segRFM[s]; d.r=+(d.r/d.n).toFixed(2); d.f=+(d.f/d.n).toFixed(2); d.m=+(d.m/d.n).toFixed(2); });

  // Destrói gráficos anteriores (idempotente p/ o botão Atualizar).
  if (window.Chart) {
    ['radarChart', 'bubbleChart', 'temporalChart'].forEach(id => { const ex = Chart.getChart(id); if (ex) ex.destroy(); });
  }

  // ── Radar segment filter buttons
  const filterDiv = document.getElementById('radar-seg-filters');
  filterDiv.innerHTML = '';
  let activeSegs = new Set(segsAll);
  segsAll.forEach(s => {
    const btn = document.createElement('button');
    btn.textContent = s + ' ' + SEG_NAMES[s].split(' ')[0];
    btn.style.cssText = `background:${SEG_COLORS_MAP[s]};border:none;color:#fff;padding:3px 10px;border-radius:10px;font-size:10px;font-weight:700;cursor:pointer;opacity:1;font-family:inherit`;
    btn.addEventListener('click', () => {
      if (activeSegs.has(s)) { activeSegs.delete(s); btn.style.opacity='0.3'; }
      else { activeSegs.add(s); btn.style.opacity='1'; }
      updateRadar();
    });
    filterDiv.appendChild(btn);
  });

  // ── Radar Chart
  const radarCtx = document.getElementById('radarChart').getContext('2d');
  let radarChart = new Chart(radarCtx, {
    type:'radar',
    data:{ labels:['Recência (R)','Frequência (F)','Valor (M)'], datasets:[] },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#8892a4',font:{size:10},boxWidth:12}}},
      scales:{r:{
        min:0, max:5, ticks:{stepSize:1,color:'#8892a4',font:{size:9},backdropColor:'transparent'},
        grid:{color:'rgba(255,255,255,.08)'}, pointLabels:{color:'#e8eaf0',font:{size:11,weight:'600'}}
      }}
    }
  });
  function updateRadar() {
    radarChart.data.datasets = segsAll.filter(s=>activeSegs.has(s)).map(s => ({
      label: s + ' — ' + SEG_NAMES[s],
      data: [segRFM[s].r, segRFM[s].f, segRFM[s].m],
      borderColor: SEG_COLORS_MAP[s], backgroundColor: SEG_COLORS_MAP[s]+'33',
      borderWidth:2, pointRadius:3
    }));
    radarChart.update();
  }
  updateRadar();

  // ── Bubble Chart (value vs frequency, size = count)
  const bubCtx = document.getElementById('bubbleChart').getContext('2d');
  new Chart(bubCtx, {
    type:'bubble',
    data:{
      datasets: segsAll.map(s => {
        const d = segRFM[s]; const si = SUMMARY.find(x=>x.seg===s)||{};
        return {
          label: s + ' — ' + SEG_NAMES[s],
          data:[{x:+(d.f).toFixed(1), y:+(d.m).toFixed(1), r: Math.max(5,Math.min(30, (si.count||1)*0.5))}],
          backgroundColor: SEG_COLORS_MAP[s]+'aa', borderColor: SEG_COLORS_MAP[s], borderWidth:1.5
        };
      })
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#8892a4',font:{size:10},boxWidth:10}},
        tooltip:{callbacks:{label:ctx=>{const s=segsAll[ctx.datasetIndex];return `${SEG_NAMES[s]} · F=${ctx.raw.x} M=${ctx.raw.y} · ${SUMMARY.find(x=>x.seg===s)?.count||'?'} clientes`;}}}
      },
      scales:{
        x:{title:{display:true,text:'Frequência média (F)',color:'#8892a4',font:{size:10}},grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8892a4'}},
        y:{title:{display:true,text:'Score de Valor (M)',color:'#8892a4',font:{size:10}},grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8892a4'}}
      }
    }
  });

  // ── Temporal Chart
  const anos = TEMPORAL_DATA.anos;
  const tempCtx = document.getElementById('temporalChart').getContext('2d');
  const tempChart = new Chart(tempCtx, {
    type:'line',
    data:{
      labels: anos,
      datasets:[
        { label:'Ganhos',    data:TEMPORAL_DATA.ganhos,    borderColor:'#4a9fd4', backgroundColor:'rgba(74,159,212,.15)', fill:true, tension:.35, borderWidth:2.5, pointRadius:4 },
        { label:'Perdidos',  data:TEMPORAL_DATA.perdidos,  borderColor:'#e8a042', backgroundColor:'rgba(232,160,66,.10)', fill:true, tension:.35, borderWidth:2.5, pointRadius:4 },
        { label:'Cancelados',data:TEMPORAL_DATA.cancelados,borderColor:'#c4384d', backgroundColor:'rgba(196,56,77,.12)', fill:true, tension:.35, borderWidth:2.5, pointRadius:4 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{labels:{color:'#8892a4',font:{size:11},boxWidth:12}},
        tooltip:{mode:'index',intersect:false}
      },
      scales:{
        x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8892a4'}},
        y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#8892a4'},title:{display:true,text:'Nº de contratos',color:'#8892a4',font:{size:10}}}
      },
      interaction:{mode:'index',intersect:false}
    }
  });
  // Checkbox toggles — liga uma vez só; usa o gráfico vivo (pode ser recriado no Atualizar).
  if (!window._analiseBound) {
    window._analiseBound = true;
    ['ganhos','perdidos','cancelados'].forEach((key,i) => {
      document.getElementById('chk-'+key).addEventListener('change', function() {
        const tc = window.Chart && Chart.getChart('temporalChart');
        if (!tc) return;
        tc.data.datasets[i].hidden = !this.checked;
        tc.update();
      });
    });
  }
}

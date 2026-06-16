// ── Camada de API: autenticação + carga de dados RFM ─────────
// Consome o contratos-backend (window.API_BASE). Substitui os dados
// que antes eram embutidos em data.js / gui-data.js / app.js.
(function () {
  const TOKEN_KEY = 'rfm_token';
  const USER_KEY  = 'rfm_user';

  window.rfmAuth = {
    getToken: () => sessionStorage.getItem(TOKEN_KEY),
    getUser:  () => sessionStorage.getItem(USER_KEY),
    clear() { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(USER_KEY); },
  };

  // Erro de autenticação (401/403) — sinaliza para o auth.js deslogar.
  class AuthError extends Error {}
  window.RfmAuthError = AuthError;

  // POST /auth/login → guarda token + username. Lança em caso de falha.
  window.rfmLogin = async function (username, password) {
    const resp = await fetch(`${window.API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 400) throw new AuthError('Usuário ou senha incorretos.');
      throw new Error('Falha ao conectar à API.');
    }
    const data = await resp.json();
    sessionStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.setItem(USER_KEY, (data.user && (data.user.name || data.user.username)) || username);
    return data;
  };

  async function apiGet(path) {
    const token = window.rfmAuth.getToken();
    const resp = await fetch(`${window.API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (resp.status === 401 || resp.status === 403) throw new AuthError('Sessão expirada.');
    if (!resp.ok) throw new Error(`Erro ${resp.status} em ${path}`);
    return resp.json();
  }

  // Constrói os globais que o app.js/auth.js esperam, no shape antigo.
  function buildGlobals(d) {
    const NAMES = window.SEG_NAMES;

    window.SUMMARY = d.summary.map((s) => ({ ...s, segmento: NAMES[s.seg] || s.seg }));
    window.TOP10 = d.top;
    window.GRID = d.matrix;
    window.TEMPORAL_DATA = d.temporal;

    window.RAW_DATA = d.clientes.map((c) => ({
      cliente: c.cliente,
      seg: c.seg,
      segmento: NAMES[c.seg] || c.seg,
      R: c.R, F: c.F, M: c.M,
      frequencia: c.frequencia,
      valor: c.valor,
      ultima_data: c.ultima_data || '—',
      recencia: Math.max(0, c.recencia_dias == null ? 0 : c.recencia_dias),
    }));

    // CLIENT_HISTORY: array → { cliente: { ano: {g,p,ca,de} } }
    const hist = {};
    for (const r of d.historico) {
      (hist[r.cliente] || (hist[r.cliente] = {}))[r.ano] = { g: r.g, p: r.p, ca: r.ca, de: r.de };
    }
    window.CLIENT_HISTORY = hist;

    // Abas Cancelamentos / Declínios / GUI derivam do status por cliente.
    const cancel = [], decline = [], gui = [];
    let guiClientes = 0, guiTotal = 0, guiGanhos = 0, guiPerdidos = 0;
    for (const s of d.status) {
      const t = s.encerrado + s.andamento + s.cancelado + s.perdemos + s.declinado; // fechados
      if (t === 0) continue;
      cancel.push({
        c: s.cliente, t,
        ca: s.cancelado, pe: s.perdemos, de: s.declinado,
        an: s.andamento, en: s.encerrado,
        pct: Math.round((s.cancelado / t) * 100),
      });
      decline.push({
        c: s.cliente, t,
        de: s.declinado, p: s.perdemos,
        pct: Math.round((s.declinado / t) * 100),
      });
      gui.push({ c: s.cliente, t, g: s.encerrado, p: s.perdemos });
      guiClientes++; guiTotal += t; guiGanhos += s.encerrado; guiPerdidos += s.perdemos;
    }
    window.CANCEL_DATA = cancel;
    window.DECLINE_DATA = { clientes: decline, total: { de: 0, perdidos: 0, base: decline.length } };
    window.GUI_DATA = gui;
    window.GUI_SUMMARY = { clientes: guiClientes, total: guiTotal, ganhos: guiGanhos, perdidos: guiPerdidos };
  }

  // Injeta app.js só depois dos dados prontos (app.js executa no load).
  function injectApp() {
    return new Promise((resolve, reject) => {
      if (window._rfmAppLoaded) return resolve();
      const s = document.createElement('script');
      s.src = 'js/app.js';
      s.onload = () => { window._rfmAppLoaded = true; resolve(); };
      s.onerror = () => reject(new Error('Falha ao carregar app.js'));
      document.body.appendChild(s);
    });
  }

  // O app.js é injetado após o DOMContentLoaded, então o ux.js (transições) e
  // o script de tema inline não conseguiram embrulhar o switchTab. Reaplicamos
  // aqui: animação de troca de aba (igual ao ux.js) + atualização de tema.
  function repatchSwitchTab() {
    if (typeof window.switchTab !== 'function') return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const activePanel = () => document.querySelector('.tab-panel.active');
    const orig = window.switchTab;
    window.switchTab = function (name) {
      const previous = activePanel();
      if (previous && !reduceMotion) {
        previous.classList.add('is-leaving');
        setTimeout(() => previous.classList.remove('is-leaving'), 260);
      }
      orig(name);
      const next = document.getElementById('tab-' + name);
      if (next && !reduceMotion) {
        next.classList.remove('is-entering');
        void next.offsetWidth;
        next.classList.add('is-entering');
        setTimeout(() => next.classList.remove('is-entering'), 420);
      }
      if (typeof window._updateChartsTheme === 'function') {
        setTimeout(() => window._updateChartsTheme(document.documentElement.getAttribute('data-theme') !== 'light'), 80);
      }
    };
  }

  // Preenche os cards de KPI do topo a partir dos globais já montados.
  function set(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }
  function fmtBi(v) {
    if (v >= 1e9) return 'R$ ' + (v / 1e9).toFixed(1).replace('.', ',') + ' Bi';
    if (v >= 1e6) return 'R$ ' + (v / 1e6).toFixed(1).replace('.', ',') + ' Mi';
    return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  }
  function updateKpis() {
    const S = window.SUMMARY || [], R = window.RAW_DATA || [], C = window.CANCEL_DATA || [];
    const segCount = (s) => (S.find((x) => x.seg === s) || {}).count || 0;
    const totalClientes = R.length;
    const valorTotal = S.reduce((a, s) => a + (s.valor || 0), 0);
    const campA = segCount('A');
    const valorA = (S.find((x) => x.seg === 'A') || {}).valor || 0;
    const risco = segCount('I') + segCount('J') + segCount('K');

    const sum = (k) => C.reduce((a, r) => a + (r[k] || 0), 0);
    const canceladosClientes = C.filter((r) => r.ca > 0).length;
    const perdidosClientes = C.filter((r) => (r.ca + r.pe + r.de) > 0).length;
    const ganhosContratos = sum('en') + sum('an');
    const perdidosContratos = sum('ca') + sum('pe') + sum('de');
    const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

    set('kpi-total-val', totalClientes.toLocaleString('pt-BR'));
    set('kpi-valor-val', fmtBi(valorTotal));
    set('kpi-camp-val', campA);
    set('kpi-camp-sub', `${pct(campA, totalClientes)}% da base · ${fmtBi(valorA)}`);
    set('kpi-risco-val', risco);
    set('kpi-risco-sub', `Seg. I + J + K = ${pct(risco, totalClientes)}% da base`);

    set('kpi-canctot-val', pct(canceladosClientes, perdidosClientes).toString().replace('.', ',') + '%');
    set('kpi-canctot-sub', `${canceladosClientes} de ${perdidosClientes} clientes perdidos`);
    set('kpi-cancprop-val', pct(canceladosClientes, totalClientes).toString().replace('.', ',') + '%');
    set('kpi-cancprop-sub', `${canceladosClientes} de ${totalClientes} clientes considerados`);
    set('kpi-ganhos-val', ganhosContratos.toLocaleString('pt-BR'));
    set('kpi-perdidos-val', perdidosContratos.toLocaleString('pt-BR'));
  }

  // Busca todos os endpoints em paralelo e monta os globais + KPIs.
  async function fetchAndBuild() {
    const [summary, top, matrix, clientes, temporal, historico, status] = await Promise.all([
      apiGet('/rfm/summary'),
      apiGet('/rfm/top?limit=10'),
      apiGet('/rfm/matrix'),
      apiGet('/rfm/clientes'),
      apiGet('/rfm/temporal'),
      apiGet('/rfm/historico'),
      apiGet('/rfm/clientes-status'),
    ]);
    buildGlobals({ summary, top, matrix, clientes, temporal, historico, status });
    updateKpis();
  }

  // Carga inicial: monta os dados e injeta o app.js.
  window.loadDashboard = async function () {
    await fetchAndBuild();
    await injectApp();
    repatchSwitchTab();
  };

  // Atualizar: re-busca os dados do banco e re-renderiza in-place.
  window.refreshDashboard = async function () {
    await fetchAndBuild();
    if (typeof window.rerenderAll === 'function') window.rerenderAll();
  };
})();

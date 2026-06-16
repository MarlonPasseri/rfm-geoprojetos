// ── Configuração estática do dashboard ───────────────────────
// Base da API da Geo (contratos-backend).
// - Em localhost: aponta para o dev server (porta 3001).
// - Em produção: caminho relativo "/api". O plano é hospedar o dashboard e o
//   backend no MESMO servidor Linux, atrás de um proxy (ex.: Nginx/NPM) que
//   roteia "/api" -> backend e "/" -> dashboard. Mesma origem = sem CORS e
//   sem domínio fixo no código (igual ao frontend "contratos").
//   Se um dia o dashboard ficar em outra origem, defina window.API_BASE
//   com a URL absoluta da API antes de carregar este script.
window.API_BASE =
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3001/api'
    : '/api';

// Cores e nomes dos segmentos (estático — não vem da API).
window.SEG_COLORS = { A:'#1a3a6e', B:'#2e6fad', C:'#4a9fd4', D:'#74c4e8', E:'#9ad4b0', G:'#e8a042', I:'#d95f5f', J:'#c4384d', K:'#7b1c2e' };
window.SEG_COLORS_MAP = window.SEG_COLORS;
window.SEG_NAMES = { A:'Campeões', B:'Clientes fiéis', C:'Fiéis em potencial', D:'Novos clientes', E:'Clientes promissores', G:'Clientes dormentes', I:'Clientes em risco', J:'Clientes hibernando', K:'Clientes perdidos' };

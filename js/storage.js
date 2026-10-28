// Armazenamento: progresso do jogador, ajustes e registro das partidas.
// - Sempre grava no navegador (localStorage, com plano B em memória se estiver bloqueado,
//   o que pode acontecer dentro de iframe em alguns navegadores).
// - Se o Supabase estiver configurado, também envia cada fase concluída para a tabela "partidas",
//   com fila de reenvio caso a internet falhe.
(function () {
  'use strict';
  const CFG = window.CONFIG || {};
  const K = {
    prog: 'cofrinho:progresso:v1',
    cfg: 'cofrinho:config:v1',
    log: 'cofrinho:partidas:v1',
    fila: 'cofrinho:fila:v1'
  };
  const BASE = (CFG.SUPABASE_URL || '').replace(/\/+$/, '');
  const KEY = CFG.SUPABASE_ANON_KEY || '';
  const remoto = !!(BASE && KEY);
  const mem = {};
  let tokenProfessor = null;

  function ler(k, padrao) {
    try {
      const v = window.localStorage.getItem(k);
      if (v !== null) return JSON.parse(v);
    } catch (e) { /* storage bloqueado: usa memória */ }
    return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : padrao;
  }

  function gravar(k, v) {
    mem[k] = v;
    try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignora */ }
  }

  function remover(k) {
    delete mem[k];
    try { window.localStorage.removeItem(k); } catch (e) { /* ignora */ }
  }

  let enviando = false;
  async function esvaziarFila() {
    if (!remoto || enviando) return;
    enviando = true;
    try {
      let fila = ler(K.fila, []);
      while (fila.length) {
        const corpo = Object.assign({}, fila[0]);
        delete corpo.criado_em; // a data é definida pelo servidor
        const r = await fetch(BASE + '/rest/v1/partidas', {
          method: 'POST',
          headers: {
            apikey: KEY,
            Authorization: 'Bearer ' + KEY,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify(corpo)
        });
        if (!r.ok && r.status >= 500) break;      // servidor com problema: tenta depois
        fila.shift();                               // enviado, ou rejeitado (4xx): não trava a fila
        gravar(K.fila, fila);
      }
    } catch (e) { /* sem internet: tenta na próxima vez */ }
    finally { enviando = false; }
  }

  window.Armazenamento = {
    remoto: remoto,

    lerProgresso: function () { return ler(K.prog, null); },
    gravarProgresso: function (p) { gravar(K.prog, p); },
    apagarProgresso: function () { remover(K.prog); },

    lerConfig: function () { return ler(K.cfg, {}); },
    gravarConfig: function (c) { gravar(K.cfg, c); },

    // Registra o resultado de UMA tentativa de fase.
    registrarFase: function (reg) {
      reg = Object.assign({ criado_em: new Date().toISOString() }, reg);
      const log = ler(K.log, []);
      log.push(reg);
      if (log.length > 2000) log.splice(0, log.length - 2000);
      gravar(K.log, log);
      if (remoto) {
        const fila = ler(K.fila, []);
        fila.push(reg);
        gravar(K.fila, fila);
        esvaziarFila();
      }
    },

    reenviarPendentes: esvaziarFila,

    // ---- usados pelo painel do professor ----
    loginProfessor: async function (email, senha) {
      if (!remoto) throw new Error('modo-local');
      const r = await fetch(BASE + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { apikey: KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: senha })
      });
      if (!r.ok) throw new Error('login');
      const j = await r.json();
      tokenProfessor = j.access_token;
      return true;
    },

    sairProfessor: function () { tokenProfessor = null; },

    listarPartidas: async function () {
      if (!remoto) return ler(K.log, []);
      let saida = [];
      let de = 0;
      for (;;) {
        const r = await fetch(BASE + '/rest/v1/partidas?select=*&order=id.asc', {
          headers: {
            apikey: KEY,
            Authorization: 'Bearer ' + tokenProfessor,
            'Range-Unit': 'items',
            Range: de + '-' + (de + 999)
          }
        });
        if (!r.ok) throw new Error('lista');
        const lote = await r.json();
        saida = saida.concat(lote);
        if (lote.length < 1000 || de > 50000) break;
        de += 1000;
      }
      return saida;
    }
  };

  if (remoto) esvaziarFila();
})();

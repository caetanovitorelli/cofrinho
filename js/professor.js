// Painel do professor: SOMENTE leitura. Não existe nenhuma função para editar moedas ou resultados.
// Com Supabase configurado: login com e-mail e senha de um usuário criado pelo administrador.
// Sem Supabase (modo local): PIN simples, só para demonstração.
(function () {
  'use strict';
  const A = window.Armazenamento;
  const C = window.CONTEUDO;
  const CFG = window.CONFIG || {};
  const raiz = document.getElementById('painel');

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function objetivoTxt(id) {
    const o = C.objetivoPorId(id);
    return o ? o.emoji + ' ' + o.nome : String(id || '');
  }

  // Junta as tentativas de cada aluno (sessão): vale a última tentativa de cada fase.
  function agrupar(linhas) {
    const sessoes = {};
    linhas.forEach(function (l) {
      if (!sessoes[l.sessao]) sessoes[l.sessao] = [];
      sessoes[l.sessao].push(l);
    });
    return Object.keys(sessoes).map(function (id) {
      const ls = sessoes[id];
      const ultima = {};
      ls.forEach(function (l) { ultima[l.fase] = l; }); // linhas já vêm em ordem cronológica
      const fases = Object.keys(ultima).map(Number).sort();
      let rec = 0, gas = 0, gua = 0;
      fases.forEach(function (n) { rec += ultima[n].recebidas; gas += ultima[n].gastas; gua += ultima[n].guardadas; });
      const basicasOk = [1, 2, 3, 4].every(function (n) { return ultima[n] && ultima[n].atingiu; });
      const algumaFalhou = fases.some(function (n) { return !ultima[n].atingiu; });
      let resultado = 'Em andamento';
      if (basicasOk) resultado = 'Alcançou o objetivo';
      else if (algumaFalhou) resultado = 'Ainda não alcançou';
      const ref = ls[ls.length - 1];
      return {
        apelido: ref.apelido, avatar: ref.avatar, objetivo: ref.objetivo,
        recebidas: rec, gastas: gas, guardadas: gua,
        fases: fases.map(function (n) { return { n: n, ok: ultima[n].atingiu, tent: ultima[n].tentativa }; }),
        resultado: resultado, tentativas: ls.length
      };
    });
  }

  function nomeFase(n) { return n === 5 ? 'Bônus' : 'S' + n; }

  function csvCelula(v) {
    let s = String(v === null || v === undefined ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita fórmulas maliciosas ao abrir no Excel
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function baixarCSV(alunos) {
    const cab = ['Apelido', 'Objetivo', 'Moedas recebidas', 'Moedas gastas', 'Moedas economizadas', 'Fases', 'Resultado'];
    const linhas = alunos.map(function (a) {
      return [a.avatar + ' ' + a.apelido, (C.objetivoPorId(a.objetivo) || { nome: a.objetivo }).nome, a.recebidas, a.gastas, a.guardadas,
        a.fases.map(function (f) { return nomeFase(f.n) + (f.ok ? ' ok' : ' não'); }).join(' '), a.resultado];
    });
    const texto = [cab].concat(linhas).map(function (l) { return l.map(csvCelula).join(';'); }).join('\r\n');
    const blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'resultados-cofrinho.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function telaLogin(erro) {
    const remoto = A.remoto;
    raiz.innerHTML =
      '<h1>👩‍🏫 Painel do Professor</h1>' +
      '<form class="login" id="form">' +
        (remoto
          ? '<label for="email">E-mail</label><input id="email" type="email" autocomplete="username" required>' +
            '<label for="senha">Senha</label><input id="senha" type="password" autocomplete="current-password" required>'
          : '<div class="aviso-modo"><strong>Modo local (demonstração).</strong> Mostra só as partidas jogadas neste navegador. O PIN padrão está em js/config.js.</div>' +
            '<label for="pin">PIN</label><input id="pin" type="password" inputmode="numeric" autocomplete="off" required>') +
        (erro ? '<p role="alert"><strong>⚠ ' + esc(erro) + '</strong></p>' : '') +
        '<p><button class="btn grande primario" type="submit">Entrar</button></p>' +
      '</form>';
    document.getElementById('form').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (remoto) {
        try {
          await A.loginProfessor(document.getElementById('email').value.trim(), document.getElementById('senha').value);
          painel();
        } catch (err) { telaLogin('E-mail ou senha incorretos.'); }
      } else {
        if (document.getElementById('pin').value === String(CFG.PIN_PROFESSOR_LOCAL)) painel();
        else telaLogin('PIN incorreto.');
      }
    });
  }

  async function painel() {
    raiz.innerHTML = '<h1>👩‍🏫 Painel do Professor</h1><p>Carregando resultados…</p>';
    let linhas;
    try { linhas = await A.listarPartidas(); }
    catch (e) { raiz.innerHTML = '<h1>👩‍🏫 Painel do Professor</h1><p role="alert">⚠ Não foi possível carregar os resultados. Verifique a internet e a configuração do Supabase.</p><button class="btn" id="tentar">Tentar de novo</button>'; document.getElementById('tentar').addEventListener('click', painel); return; }

    const alunos = agrupar(linhas);
    const alcancaram = alunos.filter(function (a) { return a.resultado === 'Alcançou o objetivo'; }).length;
    const totalRec = alunos.reduce(function (s, a) { return s + a.recebidas; }, 0);
    const totalGas = alunos.reduce(function (s, a) { return s + a.gastas; }, 0);
    const totalGua = alunos.reduce(function (s, a) { return s + a.guardadas; }, 0);

    raiz.innerHTML =
      '<h1>👩‍🏫 Painel do Professor</h1>' +
      (A.remoto ? '' : '<div class="aviso-modo"><strong>Modo local:</strong> aparecem só as partidas feitas neste navegador. Para ver os alunos de todos os dispositivos, configure o Supabase (veja o README).</div>') +
      '<div class="acoes" style="justify-content:flex-start">' +
        '<button class="btn pequeno" id="atualizar">🔄 Atualizar</button>' +
        '<button class="btn pequeno" id="csv">⬇ Baixar CSV</button>' +
        '<button class="btn pequeno" id="sair">Sair</button>' +
      '</div>' +
      '<div class="resumo-cards">' +
        '<div class="card-num"><strong>' + alunos.length + '</strong>jogadores</div>' +
        '<div class="card-num"><strong>' + alcancaram + '</strong>alcançaram o objetivo</div>' +
        '<div class="card-num"><strong>' + totalRec + '</strong>moedas recebidas</div>' +
        '<div class="card-num"><strong>' + totalGas + '</strong>moedas gastas</div>' +
        '<div class="card-num"><strong>' + totalGua + '</strong>moedas economizadas</div>' +
      '</div>' +
      (alunos.length
        ? '<div class="tabela-area"><table>' +
            '<caption class="sr-only">Resultados dos alunos</caption>' +
            '<thead><tr><th scope="col">Aluno (apelido)</th><th scope="col">Objetivo</th><th scope="col">Recebidas</th><th scope="col">Gastas</th><th scope="col">Economizadas</th><th scope="col">Fases</th><th scope="col">Resultado</th></tr></thead><tbody>' +
            alunos.map(function (a) {
              return '<tr><td>' + esc(a.avatar) + ' ' + esc(a.apelido) + '</td><td>' + esc(objetivoTxt(a.objetivo)) + '</td>' +
                '<td>' + a.recebidas + '</td><td>' + a.gastas + '</td><td>' + a.guardadas + '</td>' +
                '<td>' + a.fases.map(function (f) { return '<span class="chip ' + (f.ok ? 'sim' : 'nao') + '">' + nomeFase(f.n) + ' ' + (f.ok ? '✔' : '✖') + '</span>'; }).join('') + '</td>' +
                '<td>' + (a.resultado === 'Alcançou o objetivo' ? '✔ ' : a.resultado === 'Ainda não alcançou' ? '✖ ' : '… ') + esc(a.resultado) + '</td></tr>';
            }).join('') +
          '</tbody></table></div>' +
          '<p class="nota">Moedas e resultado consideram a última tentativa de cada fase. Os alunos aparecem por apelido: o jogo não coleta nomes reais (LGPD).</p>'
        : '<p>Nenhuma partida registrada ainda.</p>');

    document.getElementById('atualizar').addEventListener('click', painel);
    document.getElementById('csv').addEventListener('click', function () { baixarCSV(alunos); });
    document.getElementById('sair').addEventListener('click', function () { A.sairProfessor(); telaLogin(); });
  }

  telaLogin();
})();

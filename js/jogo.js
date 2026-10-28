// Cofrinho dos Sonhos — jogo do aluno.
// Ciclo de cada rodada: receber moedas -> (calcular) -> decidir comprar ou guardar -> (calcular) -> rumo ao sonho.
(function () {
  'use strict';

  const C = window.CONTEUDO;
  const A = window.Armazenamento;
  const S = window.Som;
  const app = document.getElementById('app');
  const ABORTAR = { abortar: true };

  // ---------- estado ----------
  let config = Object.assign(
    { narracao: true, sons: true, contraste: false, dislexia: false, tamanho: 2 },
    A.lerConfig()
  );
  let prog = normalizar(A.lerProgresso());
  let geracao = 0; // aumenta a cada troca de tela; serve para interromper fases abandonadas

  function normalizar(p) {
    if (!p || typeof p !== 'object') return null;
    p.concluidas = Array.isArray(p.concluidas) ? p.concluidas : [];
    p.melhor = p.melhor || {};
    p.estrelas = p.estrelas || {};
    p.tentativas = p.tentativas || {};
    p.conquistas = Array.isArray(p.conquistas) ? p.conquistas : [];
    return p;
  }

  function salvarProg() { A.gravarProgresso(prog); }
  function pontosTotal() {
    return Object.keys(prog.melhor).reduce(function (soma, k) { return soma + prog.melhor[k]; }, 0);
  }

  // ---------- utilitários ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pausa(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function embaralhar(v) {
    for (let i = v.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = v[i]; v[i] = v[j]; v[j] = t;
    }
    return v;
  }
  function novoId() {
    const b = new Uint8Array(8);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(b);
    else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  function moedasVisual(n) {
    if (n <= 0) return '—';
    if (n > 30) return '🪙 × ' + n;
    let s = '';
    for (let i = 1; i <= n; i++) { s += '🪙'; if (i % 5 === 0 && i < n) s += ' '; }
    return s;
  }
  function estrelasTxt(n) { return '⭐'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n)); }
  function sonhoAtual() { return (prog && C.objetivoPorId(prog.objetivo)) || C.OBJETIVOS[0]; }

  // 3 alternativas: a certa + 2 erros plausíveis (nunca negativos nem repetidos)
  function opcoes(correta, candidatos) {
    const lista = [correta];
    for (let i = 0; i < candidatos.length && lista.length < 3; i++) {
      const c = candidatos[i];
      if (Number.isInteger(c) && c >= 0 && lista.indexOf(c) === -1) lista.push(c);
    }
    let extra = 1;
    while (lista.length < 3) { if (lista.indexOf(correta + extra) === -1) lista.push(correta + extra); extra++; }
    return embaralhar(lista);
  }

  function aplicarConfig() {
    const b = document.body.classList;
    b.toggle('contraste', !!config.contraste);
    b.toggle('dislexia', !!config.dislexia);
    b.remove('tam-1', 'tam-2', 'tam-3');
    b.add('tam-' + config.tamanho);
    S.narracao = !!config.narracao;
    S.sons = !!config.sons;
  }
  function salvarConfig() { A.gravarConfig(config); aplicarConfig(); }

  // Troca a tela inteira. data-foco marca o título que recebe o foco (leitores de tela).
  function tela(html, narrar) {
    geracao++;
    app.innerHTML = html;
    window.scrollTo(0, 0);
    const foco = app.querySelector('[data-foco]') || app;
    try { foco.focus({ preventScroll: true }); } catch (e) { /* ignora */ }
    if (narrar) S.falar(narrar);
  }
  function on(seletor, fn) {
    const el = app.querySelector(seletor);
    if (el) el.addEventListener('click', fn);
    return el;
  }

  // Botões "🔊 Ouvir" funcionam em qualquer tela (delegação de evento).
  app.addEventListener('click', function (e) {
    const b = e.target.closest ? e.target.closest('[data-ouvir]') : null;
    if (b) S.falar(b.getAttribute('data-ouvir'), true);
  });

  // =====================================================
  // MENU
  // =====================================================
  function menu() {
    const jogador = prog ? '<p class="jogador">' + prog.avatar + ' ' + esc(prog.apelido) + '</p>' : '';
    tela(
      '<section class="tela menu">' +
        '<div class="emoji-gigante" aria-hidden="true">🐷</div>' +
        '<h1 tabindex="-1" data-foco>Cofrinho dos Sonhos</h1>' +
        '<p class="sub">Junte moedas e realize o seu sonho!</p>' +
        jogador +
        '<div class="grade-botoes">' +
          '<button class="btn grande primario" id="jogar">▶ Jogar</button>' +
          '<button class="btn grande" id="como">📖 Como jogar</button>' +
          '<button class="btn grande" id="ajustes">♿ Ajustes</button>' +
          '<button class="btn grande" id="avatar">🧑 Meu avatar</button>' +
        '</div>' +
        (prog ? '<button class="btn link" id="novo">🔄 Começar com outro jogador</button>' : '') +
      '</section>',
      'Cofrinho dos Sonhos. Junte moedas e realize o seu sonho! Aperte jogar para começar.'
    );
    on('#jogar', jogar);
    on('#como', comoJogar);
    on('#ajustes', ajustes);
    on('#avatar', function () { avatar(false); });
    on('#novo', function () {
      A.apagarProgresso();
      prog = null;
      avatar(true);
    });
  }

  function jogar() {
    if (!prog) return avatar(true);
    if (!prog.objetivo) return objetivo();
    return mapa();
  }

  function comoJogar() {
    const passos = [
      ['🎁', 'Você ganha moedas a cada rodada.'],
      ['🛍️', 'Aparece algo para comprar. Você escolhe: comprar ou guardar.'],
      ['🧮', 'Resolva a conta para continuar. Se errar, tudo bem! É só tentar de novo.'],
      ['🐷', 'Junte moedas suficientes no cofrinho para realizar o seu sonho.']
    ];
    const texto = passos.map(function (p) { return p[1]; }).join(' ');
    tela(
      '<section class="tela">' +
        '<h1 tabindex="-1" data-foco>📖 Como jogar</h1>' +
        '<ol class="passos">' +
          passos.map(function (p) {
            return '<li><span class="passo-emoji" aria-hidden="true">' + p[0] + '</span><span>' + esc(p[1]) + '</span></li>';
          }).join('') +
        '</ol>' +
        '<button class="btn ouvir" data-ouvir="' + esc(texto) + '">🔊 Ouvir tudo</button>' +
        '<div class="acoes"><button class="btn grande primario" id="voltar">⬅ Voltar</button></div>' +
      '</section>',
      'Como jogar. ' + texto
    );
    on('#voltar', menu);
  }

  // =====================================================
  // AJUSTES (acessibilidade)
  // =====================================================
  function ajustes() {
    const itens = [
      ['narracao', '🔊 Narração em áudio'],
      ['sons', '🎵 Sons do jogo'],
      ['contraste', '🌓 Alto contraste'],
      ['dislexia', '🔤 Letra fácil de ler']
    ];
    tela(
      '<section class="tela">' +
        '<h1 tabindex="-1" data-foco>♿ Ajustes</h1>' +
        '<div class="lista-ajustes">' +
          itens.map(function (it) {
            return '<button class="btn ajuste" data-chave="' + it[0] + '" aria-pressed="' + (config[it[0]] ? 'true' : 'false') + '">' +
              '<span>' + it[1] + '</span><strong class="estado">' + (config[it[0]] ? '✔ Ligado' : '✖ Desligado') + '</strong></button>';
          }).join('') +
          '<div class="ajuste tamanho">' +
            '<span>🔠 Tamanho da letra</span>' +
            '<button class="btn pequeno" id="menos" aria-label="Diminuir letra">A−</button>' +
            '<strong id="nivel">' + config.tamanho + ' de 3</strong>' +
            '<button class="btn pequeno" id="mais" aria-label="Aumentar letra">A+</button>' +
          '</div>' +
        '</div>' +
        '<div class="acoes"><button class="btn grande primario" id="voltar">⬅ Voltar</button></div>' +
      '</section>',
      'Ajustes. Aqui você pode ligar ou desligar a narração, os sons, o alto contraste e a letra fácil de ler.'
    );
    app.querySelectorAll('[data-chave]').forEach(function (b) {
      b.addEventListener('click', function () {
        const k = b.getAttribute('data-chave');
        config[k] = !config[k];
        salvarConfig();
        b.setAttribute('aria-pressed', config[k] ? 'true' : 'false');
        b.querySelector('.estado').textContent = config[k] ? '✔ Ligado' : '✖ Desligado';
        if (k === 'narracao' && config[k]) S.falar('Narração ligada.');
        if (k === 'sons') S.bip('moeda');
      });
    });
    function tamanho(delta) {
      config.tamanho = Math.max(1, Math.min(3, config.tamanho + delta));
      salvarConfig();
      app.querySelector('#nivel').textContent = config.tamanho + ' de 3';
    }
    on('#menos', function () { tamanho(-1); });
    on('#mais', function () { tamanho(1); });
    on('#voltar', menu);
  }

  // =====================================================
  // AVATAR E APELIDO (100% genérico: nada de nome real, por causa da LGPD)
  // =====================================================
  function avatar(novo) {
    let av = (prog && prog.avatar) || C.AVATARES[0];
    let sugestoes = C.sugerirNomes(av, 3);
    let apelido = (prog && prog.apelido) || sugestoes[0];

    tela(
      '<section class="tela">' +
        '<h1 tabindex="-1" data-foco>🧑 Escolha seu avatar</h1>' +
        '<div class="grade avatares" role="group" aria-label="Avatares">' +
          C.AVATARES.map(function (a) {
            return '<button class="btn avatar-op" data-av="' + a + '" aria-label="Avatar ' + a + '">' + a + '</button>';
          }).join('') +
        '</div>' +
        '<h2>Seu apelido</h2>' +
        '<div id="nomes" class="lista-nomes" role="group" aria-label="Apelidos"></div>' +
        '<button class="btn" id="outros">🎲 Outros nomes</button>' +
        '<p class="nota">🔒 Por segurança, o jogo nunca pede o seu nome de verdade.</p>' +
        '<div class="acoes">' +
          '<button class="btn grande" id="voltar">⬅ Voltar</button>' +
          '<button class="btn grande primario" id="pronto">Pronto ➜</button>' +
        '</div>' +
      '</section>',
      'Escolha seu avatar e um apelido divertido.'
    );

    function marcarAvatar() {
      app.querySelectorAll('[data-av]').forEach(function (b) {
        const ativo = b.getAttribute('data-av') === av;
        b.setAttribute('aria-pressed', ativo ? 'true' : 'false');
        b.classList.toggle('marcado', ativo);
      });
    }
    function listarNomes() {
      const caixa = app.querySelector('#nomes');
      caixa.innerHTML = sugestoes.map(function (n) {
        return '<button class="btn nome-op" data-nome="' + esc(n) + '" aria-pressed="' + (n === apelido ? 'true' : 'false') + '">' +
          (n === apelido ? '✔ ' : '') + esc(n) + '</button>';
      }).join('');
      caixa.querySelectorAll('[data-nome]').forEach(function (b) {
        b.addEventListener('click', function () { apelido = b.getAttribute('data-nome'); listarNomes(); });
      });
    }
    if (sugestoes.indexOf(apelido) === -1) sugestoes[0] = apelido;
    marcarAvatar();
    listarNomes();

    app.querySelectorAll('[data-av]').forEach(function (b) {
      b.addEventListener('click', function () {
        av = b.getAttribute('data-av');
        sugestoes = C.sugerirNomes(av, 3);
        apelido = sugestoes[0];
        marcarAvatar();
        listarNomes();
      });
    });
    on('#outros', function () { sugestoes = C.sugerirNomes(av, 3); apelido = sugestoes[0]; listarNomes(); });
    on('#voltar', menu);
    on('#pronto', function () {
      if (!prog) prog = normalizar({ v: 1, sessao: novoId(), avatar: av, apelido: apelido, objetivo: null });
      else { prog.avatar = av; prog.apelido = apelido; }
      salvarProg();
      if (novo) return prog.objetivo ? mapa() : objetivo();
      return menu();
    });
  }

  // =====================================================
  // OBJETIVO (o sonho)
  // =====================================================
  function objetivo() {
    tela(
      '<section class="tela">' +
        '<h1 tabindex="-1" data-foco>💭 Qual é o seu sonho?</h1>' +
        '<p class="sub">Escolha o que você quer conquistar juntando moedas.</p>' +
        '<div class="grade objetivos">' +
          C.OBJETIVOS.map(function (o) {
            return '<button class="btn objetivo-op" data-obj="' + o.id + '"><span class="emoji-grande" aria-hidden="true">' + o.emoji + '</span><span>' + esc(o.nome) + '</span></button>';
          }).join('') +
        '</div>' +
      '</section>',
      'Qual é o seu sonho? Escolha o que você quer conquistar juntando moedas.'
    );
    app.querySelectorAll('[data-obj]').forEach(function (b) {
      b.addEventListener('click', function () {
        prog.objetivo = b.getAttribute('data-obj');
        salvarProg();
        S.bip('ok');
        mapa();
      });
    });
  }

  // =====================================================
  // MAPA DE FASES
  // =====================================================
  function liberada(id) {
    if (id === 1) return true;
    if (id === 5) return [1, 2, 3, 4].every(function (n) { return prog.concluidas.indexOf(n) !== -1; });
    return prog.concluidas.indexOf(id - 1) !== -1;
  }

  function mapa() {
    const sonho = sonhoAtual();
    const nos = C.FASES.concat([C.BONUS]);
    tela(
      '<section class="tela">' +
        '<h1 tabindex="-1" data-foco>🗺️ Sua jornada</h1>' +
        '<p class="sub">Sonho: <strong>' + sonho.emoji + ' ' + esc(sonho.nome) + '</strong> · Pontos: <strong>' + pontosTotal() + '</strong></p>' +
        '<ul class="mapa">' +
          nos.map(function (f) {
            const feita = prog.concluidas.indexOf(f.id) !== -1;
            const livre = liberada(f.id);
            const estado = feita ? '✔ Concluída' : (livre ? '▶ Jogar' : '🔒 Fechada');
            const estrelas = feita ? estrelasTxt(prog.estrelas[f.id] || 1) : '';
            return '<li><button class="btn no ' + (feita ? 'feita' : (livre ? 'livre' : 'trancada')) + '" data-fase="' + f.id + '" ' + (livre ? '' : 'disabled') +
              ' aria-label="' + esc(f.nome + ': ' + f.titulo + '. ' + estado.replace(/[✔▶🔒]/g, '').trim()) + '">' +
              '<span class="no-emoji" aria-hidden="true">' + f.emoji + '</span>' +
              '<span class="no-texto"><strong>' + esc(f.nome) + '</strong><small>' + esc(f.titulo) + '</small></span>' +
              '<span class="no-estado">' + (estrelas ? '<span aria-hidden="true">' + estrelas + '</span> ' : '') + estado + '</span>' +
              '</button></li>';
          }).join('') +
        '</ul>' +
        (prog.conquistas.length
          ? '<div class="conquistas"><h2>Suas conquistas</h2><p>' +
            prog.conquistas.map(function (k) { const c = C.CONQUISTAS[k]; return c ? '<span class="selo">' + c.emoji + ' ' + esc(c.nome) + '</span>' : ''; }).join(' ') +
            '</p></div>'
          : '') +
        '<div class="acoes">' +
          '<button class="btn" id="menu">🏠 Menu</button>' +
          (prog.concluidas.length === 0 ? '<button class="btn" id="trocar">💭 Trocar sonho</button>' : '') +
        '</div>' +
      '</section>',
      'Sua jornada. Escolha uma semana para jogar.'
    );
    app.querySelectorAll('[data-fase]').forEach(function (b) {
      b.addEventListener('click', function () { iniciarFase(parseInt(b.getAttribute('data-fase'), 10)); });
    });
    on('#menu', menu);
    on('#trocar', objetivo);
  }

  function iniciarFase(id) {
    const p = id === 5 ? jogarBonus() : jogarFase(C.FASES[id - 1]);
    p.catch(function (e) { if (e !== ABORTAR) console.error(e); });
  }

  // =====================================================
  // ESTRUTURA DA TELA DE FASE
  // =====================================================
  function esqueletoFase(f) {
    const sonho = sonhoAtual();
    tela(
      '<section class="tela fase">' +
        '<header class="hud">' +
          '<button class="btn pequeno" id="sair" aria-label="Voltar ao mapa">⬅ Mapa</button>' +
          '<div class="hud-info"><strong>' + esc(f.nome) + '</strong>' + (f.rodadas > 1 ? ' · Rodada <span id="rod">1/' + f.rodadas + '</span>' : '') + '</div>' +
          '<div class="hud-saldo" aria-live="polite" aria-label="Moedas no cofrinho">🐷 <span id="saldo">0</span></div>' +
        '</header>' +
        '<div class="meta">' +
          '<div>' + sonho.emoji + ' Meta do sonho: <strong>' + f.meta + '</strong> moedas · <span id="progtxt">0 de ' + f.meta + '</span></div>' +
          '<div class="barra" id="barra" role="progressbar" aria-label="Progresso até o sonho" aria-valuemin="0" aria-valuemax="' + f.meta + '" aria-valuenow="0"><div class="barra-cheia" id="cheia"></div></div>' +
        '</div>' +
        '<div id="palco" class="palco"></div>' +
      '</section>'
    );
    on('#sair', mapa);
  }

  function atualizarHUD(est) {
    const f = est.f;
    const q = function (id) { return document.getElementById(id); };
    if (!q('saldo')) throw ABORTAR;
    q('saldo').textContent = est.saldo;
    q('progtxt').textContent = est.saldo + ' de ' + f.meta;
    q('cheia').style.width = Math.min(100, Math.round(est.saldo / f.meta * 100)) + '%';
    q('barra').setAttribute('aria-valuenow', Math.min(est.saldo, f.meta));
    if (q('rod') && est.rodada) q('rod').textContent = est.rodada + '/' + f.rodadas;
  }

  // Escreve no palco da fase. Se a criança saiu da fase, interrompe a execução antiga.
  function palco(est, html, narrar) {
    if (est.tok !== geracao) throw ABORTAR;
    const el = document.getElementById('palco');
    if (!el) throw ABORTAR;
    el.innerHTML = html;
    const foco = el.querySelector('[data-foco]');
    if (foco) { try { foco.focus({ preventScroll: true }); } catch (e) { /* ignora */ } }
    if (narrar) S.falar(narrar);
    return el;
  }
  function checar(est) { if (est.tok !== geracao) throw ABORTAR; }

  function novoEst(f) {
    return { f: f, tok: geracao, saldo: 0, recebidas: 0, gastas: 0, pontos: 0, perguntas: 0, primeira: 0, rodada: 0, compras: 0 };
  }

  // ---------- blocos reutilizáveis ----------

  // Mensagem com botão "Continuar".
  function continuar(est, emoji, titulo, detalhe, narrar) {
    return new Promise(function (resolve) {
      const el = palco(est,
        '<div class="cartao">' +
          '<div class="emoji-gigante" aria-hidden="true">' + emoji + '</div>' +
          '<p class="pergunta" tabindex="-1" data-foco>' + esc(titulo) + '</p>' +
          (detalhe ? '<p class="detalhe">' + detalhe + '</p>' : '') +
          '<button class="btn ouvir" data-ouvir="' + esc(narrar || titulo) + '">🔊 Ouvir</button>' +
          '<div class="acoes"><button class="btn grande primario" id="continuar">Continuar ➜</button></div>' +
        '</div>', narrar || titulo);
      el.querySelector('#continuar').addEventListener('click', resolve);
    });
  }

  // Mensagem curta que some sozinha.
  async function aviso(est, emoji, titulo, narrar, ms) {
    palco(est,
      '<div class="cartao">' +
        '<div class="emoji-gigante" aria-hidden="true">' + emoji + '</div>' +
        '<p class="pergunta" tabindex="-1" data-foco>' + esc(titulo) + '</p>' +
      '</div>', narrar || titulo);
    await pausa(ms || 1600);
    checar(est);
  }

  // Pergunta de múltipla escolha. Errar nunca tira pontos nem vidas:
  // a criança ganha uma dica e pode tentar de novo; na 2ª vez errada a resposta é mostrada.
  function perguntar(est, o) {
    return new Promise(function (resolve) {
      let erros = 0;
      const el = palco(est,
        '<div class="cartao">' +
          (o.visual ? '<p class="moedas-visual" aria-hidden="true">' + o.visual + '</p>' : '') +
          '<p class="pergunta" tabindex="-1" data-foco>' + esc(o.texto) + '</p>' +
          '<button class="btn ouvir" data-ouvir="' + esc(o.narrar || o.texto) + '">🔊 Ouvir</button>' +
          '<div class="opcoes">' +
            o.opcoes.map(function (v) { return '<button class="btn opcao" data-v="' + v + '">' + v + '</button>'; }).join('') +
          '</div>' +
          '<p class="retorno" id="retorno" role="status"></p>' +
          '<div class="acoes" id="acao"></div>' +
        '</div>', o.narrar || o.texto);

      const retorno = el.querySelector('#retorno');
      const botoes = Array.prototype.slice.call(el.querySelectorAll('[data-v]'));

      function terminar(msg, tom) {
        botoes.forEach(function (b) { b.disabled = true; });
        retorno.textContent = msg;
        retorno.className = 'retorno ' + tom;
        S.falar(msg);
        const acao = el.querySelector('#acao');
        acao.innerHTML = '<button class="btn grande primario" id="seguir">Continuar ➜</button>';
        const seguir = acao.querySelector('#seguir');
        seguir.focus();
        seguir.addEventListener('click', function () { resolve({ erros: erros }); });
      }

      botoes.forEach(function (b) {
        b.addEventListener('click', function () {
          if (est.tok !== geracao) return;
          const v = parseInt(b.getAttribute('data-v'), 10);
          if (v === o.correta) {
            b.classList.add('certa');
            b.textContent = '✔ ' + v;
            S.bip('ok');
            terminar(erros === 0 ? '🎉 Isso mesmo! Muito bem!' : '🎉 Conseguiu! Errar faz parte de aprender.', 'ok');
          } else {
            erros++;
            b.classList.add('errada');
            b.textContent = '✖ ' + v;
            b.disabled = true;
            S.bip('erro');
            if (erros >= 2) {
              botoes.forEach(function (x) {
                if (parseInt(x.getAttribute('data-v'), 10) === o.correta) { x.classList.add('certa'); x.textContent = '✔ ' + o.correta; }
              });
              terminar('A resposta é ' + o.correta + '. Vamos em frente, você está aprendendo!', 'dica');
            } else {
              retorno.textContent = '💡 Quase! ' + o.dica + ' Tente de novo!';
              retorno.className = 'retorno dica';
              S.falar('Quase! ' + o.dica + ' Tente de novo!');
            }
          }
        });
      });
    });
  }

  function contar(est, r) {
    est.perguntas++;
    if (r.erros === 0) { est.primeira++; est.pontos += 10; }
    else if (r.erros === 1) est.pontos += 5;
  }

  // Decisão central do jogo: comprar ou guardar.
  function decidir(est, emoji, nome, preco) {
    return new Promise(function (resolve) {
      const pode = est.saldo >= preco;
      const falta = est.f.meta - est.saldo;
      const narrar = nome + ' custa ' + preco + ' moedas. Você tem ' + est.saldo + '. ' +
        (falta > 0 ? 'Faltam ' + falta + ' para o seu sonho. ' : 'Você já tem moedas para o sonho! ') + 'Quer comprar ou guardar?';
      const el = palco(est,
        '<div class="cartao oferta">' +
          '<div class="emoji-gigante" aria-hidden="true">' + emoji + '</div>' +
          '<p class="pergunta" tabindex="-1" data-foco>' + esc(nome) + ': ' + preco + ' moedas</p>' +
          '<p class="moedas-visual" aria-hidden="true">' + moedasVisual(preco) + '</p>' +
          '<p class="detalhe">Você tem <strong>' + est.saldo + '</strong> moedas.' +
            (falta > 0 ? ' Faltam <strong>' + falta + '</strong> para o sonho.' : ' Você já alcançou a meta!') + '</p>' +
          '<button class="btn ouvir" data-ouvir="' + esc(narrar) + '">🔊 Ouvir</button>' +
          '<div class="duas">' +
            '<button class="btn grande" id="comprar"' + (pode ? '' : ' disabled') + '>🛍️ Comprar</button>' +
            '<button class="btn grande primario" id="guardar">🐷 Guardar</button>' +
          '</div>' +
          (pode ? '' : '<p class="retorno dica">Faltam ' + (preco - est.saldo) + ' moedas para comprar. Que tal guardar?</p>') +
        '</div>', narrar);
      el.querySelector('#guardar').addEventListener('click', function () { resolve('guardar'); });
      el.querySelector('#comprar').addEventListener('click', function () { resolve('comprar'); });
    });
  }

  // =====================================================
  // FASES 1 a 4
  // =====================================================
  async function jogarFase(f) {
    esqueletoFase(f);
    const est = novoEst(f);
    atualizarHUD(est);

    for (let r = 0; r < f.rodadas; r++) {
      est.rodada = r + 1;
      atualizarHUD(est);
      await passoReceber(est);
      await passoOferta(est, f.ofertas[r]);
    }
    finalizarFase(est);
  }

  // 1) Receber moedas
  async function passoReceber(est) {
    const f = est.f;
    const antes = est.saldo;
    const novo = antes + f.renda;
    if (f.tipo === 'soma' && antes > 0) {
      const r = await perguntar(est, {
        visual: moedasVisual(antes) + ' ➕ ' + moedasVisual(f.renda),
        texto: 'Você tinha ' + antes + ' moedas e ganhou mais ' + f.renda + '. Com quantas moedas você ficou?',
        correta: novo,
        opcoes: opcoes(novo, [novo - 1, novo + 1, novo + 10, novo - 10, antes]),
        dica: 'Conte juntos: ' + antes + ' e mais ' + f.renda + '.'
      });
      contar(est, r);
    } else {
      await continuar(est, '🎁', 'Você ganhou ' + f.renda + ' moedas!',
        antes === 0 ? 'Seu cofrinho estava vazio. Agora ele tem ' + novo + '.' : 'Agora o cofrinho tem ' + novo + ' moedas.',
        'Você ganhou ' + f.renda + ' moedas! Agora o cofrinho tem ' + novo + '.');
    }
    S.bip('moeda');
    est.saldo = novo;
    est.recebidas += f.renda;
    atualizarHUD(est);
  }

  // 2) Oferta: calcular preço (fases 3 e 4), decidir, e calcular o que sobrou (fases 1 e 2)
  async function passoOferta(est, of) {
    const f = est.f;
    let preco = of.preco;
    let nome = of.nome;

    if (f.tipo === 'mult') {
      preco = of.qtd * of.unit;
      const grupos = [];
      for (let i = 0; i < of.qtd; i++) grupos.push(moedasVisual(of.unit));
      const r = await perguntar(est, {
        visual: of.emoji.repeat(of.qtd),
        texto: 'Você viu ' + of.qtd + ' ' + of.nome + '! Cada unidade custa ' + of.unit + ' moedas. Quanto custa tudo?',
        correta: preco,
        opcoes: opcoes(preco, [of.qtd + of.unit, preco + of.unit, preco - of.unit, preco + 1]),
        dica: 'São ' + of.qtd + ' grupos de ' + of.unit + ' moedas: ' + grupos.join(' + ')
      });
      contar(est, r);
      nome = of.qtd + ' ' + of.nome;
    } else if (f.tipo === 'div') {
      preco = of.total / of.amigos;
      const r = await perguntar(est, {
        visual: of.emoji,
        texto: 'Um pacote de ' + of.nome + ' custa ' + of.total + ' moedas. Vocês são ' + of.amigos + ' amigos e vão dividir o preço igualmente. Quanto cada um paga?',
        correta: preco,
        opcoes: opcoes(preco, [preco + 1, preco - 1, of.total - of.amigos, preco + 2]),
        dica: 'Divida ' + of.total + ' moedas em ' + of.amigos + ' montinhos iguais.'
      });
      contar(est, r);
      nome = 'Sua parte do pacote de ' + of.nome;
    }

    const escolha = await decidir(est, of.emoji, nome, preco);

    if (escolha === 'comprar') {
      const antes = est.saldo;
      S.bip('compra');
      if (f.tipo === 'soma') {
        const r = await perguntar(est, {
          visual: moedasVisual(antes) + ' ➖ ' + moedasVisual(preco),
          texto: 'Você tinha ' + antes + ' moedas e gastou ' + preco + '. Quantas moedas sobraram?',
          correta: antes - preco,
          opcoes: opcoes(antes - preco, [antes + preco, antes - preco + 1, antes - preco - 1, preco]),
          dica: 'Tire ' + preco + ' de ' + antes + '.'
        });
        contar(est, r);
      } else {
        await aviso(est, '🛍️', 'Você comprou! Agora tem ' + (antes - preco) + ' moedas.', null, 1800);
      }
      est.saldo = antes - preco;
      est.gastas += preco;
      est.compras++;
      atualizarHUD(est);
    } else {
      await aviso(est, '🐷', 'Você guardou! Seu cofrinho continua com ' + est.saldo + ' moedas.', null, 1800);
    }
  }

  // =====================================================
  // RESULTADO DE FASE
  // =====================================================
  function dar(conquista, novas) {
    if (prog.conquistas.indexOf(conquista) === -1) { prog.conquistas.push(conquista); novas.push(conquista); }
  }

  function registrar(est, atingiu, tentativa, extra) {
    A.registrarFase({
      sessao: prog.sessao,
      apelido: prog.apelido,
      avatar: prog.avatar,
      objetivo: prog.objetivo,
      fase: est.f.id,
      tentativa: tentativa,
      recebidas: est.recebidas,
      gastas: est.gastas,
      guardadas: est.saldo,
      atingiu: atingiu,
      pontos: est.pontos + (extra || 0)
    });
  }

  function finalizarFase(est) {
    const f = est.f;
    const atingiu = est.saldo >= f.meta;
    prog.tentativas[f.id] = (prog.tentativas[f.id] || 0) + 1;
    const precisao = est.perguntas ? est.primeira / est.perguntas : 0;
    const perfeito = est.perguntas > 0 && est.primeira === est.perguntas;
    let estrelas = 1;
    if (atingiu) estrelas++;
    if (precisao >= 0.8) estrelas++;
    const pontosFase = est.pontos + (atingiu ? 20 : 0);
    const novas = [];

    registrar(est, atingiu, prog.tentativas[f.id], atingiu ? 20 : 0);

    if (atingiu) {
      if (prog.concluidas.indexOf(f.id) === -1) prog.concluidas.push(f.id);
      prog.estrelas[f.id] = Math.max(prog.estrelas[f.id] || 0, estrelas);
      prog.melhor[f.id] = Math.max(prog.melhor[f.id] || 0, pontosFase);
      if (f.id === 1) dar('primeiro-sonho', novas);
      if (perfeito) dar('craque', novas);
      if (est.gastas > 0) dar('escolha-esperta', novas);
      if ([1, 2, 3, 4].every(function (n) { return prog.concluidas.indexOf(n) !== -1; })) dar('campeao', novas);
    }
    salvarProg();

    const sonho = sonhoAtual();
    const selos = novas.length
      ? '<p class="conquistas">' + novas.map(function (k) { const c = C.CONQUISTAS[k]; return '<span class="selo">' + c.emoji + ' ' + esc(c.nome) + '</span>'; }).join(' ') + '</p>'
      : '';
    const proxima = f.id < 4 ? 'Próxima semana ➜' : 'Fase bônus 🎪';

    if (atingiu) {
      const narrar = 'Você conseguiu! Juntou ' + est.saldo + ' moedas e alcançou o seu sonho: ' + sonho.nome + '! Você ganhou ' + estrelas + ' estrelas.';
      tela(
        '<section class="tela resultado">' +
          '<div class="emoji-gigante" aria-hidden="true">' + sonho.emoji + '</div>' +
          '<h1 tabindex="-1" data-foco>🎉 Você conseguiu!</h1>' +
          '<p class="estrelas" aria-label="' + estrelas + ' de 3 estrelas">' + estrelasTxt(estrelas) + '</p>' +
          '<p class="detalhe">Você juntou <strong>' + est.saldo + '</strong> moedas e alcançou o seu sonho!</p>' +
          '<p class="resumo">🎁 Recebeu ' + est.recebidas + ' · 🛍️ Gastou ' + est.gastas + ' · 🐷 Guardou ' + est.saldo + '</p>' +
          '<p class="detalhe">Pontos: <strong>' + pontosFase + '</strong></p>' +
          selos +
          '<button class="btn ouvir" data-ouvir="' + esc(narrar) + '">🔊 Ouvir</button>' +
          '<div class="acoes">' +
            '<button class="btn" id="mapa">🗺️ Mapa</button>' +
            '<button class="btn grande primario" id="proxima">' + proxima + '</button>' +
          '</div>' +
        '</section>', narrar);
      S.bip('vitoria');
      on('#mapa', mapa);
      on('#proxima', function () { iniciarFase(f.id + 1); });
    } else {
      const falta = f.meta - est.saldo;
      const narrar = 'Quase lá! Faltaram ' + falta + ' moedas para o seu sonho. Cada compra deixa o cofrinho mais leve. Que tal tentar de novo?';
      tela(
        '<section class="tela resultado">' +
          '<div class="emoji-gigante" aria-hidden="true">💪</div>' +
          '<h1 tabindex="-1" data-foco>Quase lá!</h1>' +
          '<p class="detalhe">Faltaram <strong>' + falta + '</strong> moedas para o seu sonho.</p>' +
          '<p class="resumo">🎁 Recebeu ' + est.recebidas + ' · 🛍️ Gastou ' + est.gastas + ' · 🐷 Guardou ' + est.saldo + '</p>' +
          '<p class="detalhe">💡 Cada compra deixa o cofrinho mais leve. Tente guardar um pouquinho mais!</p>' +
          '<button class="btn ouvir" data-ouvir="' + esc(narrar) + '">🔊 Ouvir</button>' +
          '<div class="acoes">' +
            '<button class="btn" id="mapa">🗺️ Mapa</button>' +
            '<button class="btn grande primario" id="de-novo">🔁 Tentar de novo</button>' +
          '</div>' +
        '</section>', narrar);
      on('#mapa', mapa);
      on('#de-novo', function () { iniciarFase(f.id); });
    }
  }

  // =====================================================
  // FASE BÔNUS: FEIRA ESPECIAL
  // 20 moedas para repartir em 3 potinhos (arrastar e soltar, ou usar os botões ➕ ➖).
  // =====================================================
  async function jogarBonus() {
    const f = C.BONUS;
    esqueletoFase(f);
    const est = novoEst(f);
    const jar = { guardar: 0, gastar: 0, presente: 0 };
    let pilha = f.renda;
    const potes = [
      ['guardar', '🐷', 'Guardar para o sonho'],
      ['gastar', '🛍️', 'Gastar em algo'],
      ['presente', '🎁', 'Dar de presente']
    ];

    est.saldo = 0;
    atualizarHUD(est);

    palco(est,
      '<div class="cartao">' +
        '<p class="pergunta" tabindex="-1" data-foco>Você ganhou ' + f.renda + ' moedas! Coloque todas nos potinhos. O sonho precisa de pelo menos ' + f.meta + ' no cofrinho.</p>' +
        '<button class="btn ouvir" data-ouvir="Você ganhou ' + f.renda + ' moedas. Coloque todas nos potinhos. O sonho precisa de pelo menos ' + f.meta + ' moedas no cofrinho. Você pode arrastar a moeda ou usar os botões de mais e menos.">🔊 Ouvir</button>' +
        '<div class="pilha-area"><button class="btn moeda-pilha" id="pilha" draggable="true" aria-label="Pilha de moedas">🪙 <strong id="resta">' + pilha + '</strong></button>' +
          '<span class="nota">Arraste a moeda até um potinho, ou use ➕ e ➖</span></div>' +
        '<div class="jarros">' +
          potes.map(function (p) {
            return '<div class="jarro" data-pote="' + p[0] + '">' +
              '<div class="jarro-emoji" aria-hidden="true">' + p[1] + '</div>' +
              '<div class="jarro-nome">' + p[2] + '</div>' +
              '<div class="jarro-qtd" aria-live="polite"><strong id="q-' + p[0] + '">0</strong> moedas</div>' +
              '<div class="jarro-botoes">' +
                '<button class="btn pequeno" data-menos="' + p[0] + '" aria-label="Tirar uma moeda de: ' + p[2] + '">➖</button>' +
                '<button class="btn pequeno" data-mais="' + p[0] + '" aria-label="Colocar uma moeda em: ' + p[2] + '">➕</button>' +
              '</div></div>';
          }).join('') +
        '</div>' +
        '<p class="retorno" id="retorno" role="status"></p>' +
        '<div class="acoes"><button class="btn grande primario" id="pronto">Pronto ✔</button></div>' +
      '</div>',
      'Fase bônus: a Feira Especial! Você ganhou ' + f.renda + ' moedas. Coloque todas nos potinhos. O sonho precisa de pelo menos ' + f.meta + ' moedas no cofrinho.');

    const q = function (id) { return document.getElementById(id); };
    function mostrar() {
      q('resta').textContent = pilha;
      potes.forEach(function (p) { q('q-' + p[0]).textContent = jar[p[0]]; });
      est.saldo = jar.guardar;
      atualizarHUD(est);
    }
    function por(pote) { if (pilha > 0) { pilha--; jar[pote]++; S.bip('moeda'); mostrar(); } }
    function tirar(pote) { if (jar[pote] > 0) { jar[pote]--; pilha++; mostrar(); } }

    document.querySelectorAll('[data-mais]').forEach(function (b) { b.addEventListener('click', function () { por(b.getAttribute('data-mais')); }); });
    document.querySelectorAll('[data-menos]').forEach(function (b) { b.addEventListener('click', function () { tirar(b.getAttribute('data-menos')); }); });

    // arrastar e soltar (mouse). Em telas de toque, os botões ➕ ➖ fazem o mesmo.
    q('pilha').addEventListener('dragstart', function (e) { if (e.dataTransfer) e.dataTransfer.setData('text/plain', 'moeda'); });
    document.querySelectorAll('[data-pote]').forEach(function (z) {
      z.addEventListener('dragover', function (e) { e.preventDefault(); z.classList.add('sobre'); });
      z.addEventListener('dragleave', function () { z.classList.remove('sobre'); });
      z.addEventListener('drop', function (e) { e.preventDefault(); z.classList.remove('sobre'); por(z.getAttribute('data-pote')); });
    });
    q('pilha').addEventListener('click', function () { por('guardar'); });

    // espera a criança confirmar uma distribuição válida
    await new Promise(function (resolve) {
      q('pronto').addEventListener('click', function () {
        const msg = q('retorno');
        if (est.tok !== geracao) return;
        if (pilha > 0) {
          msg.textContent = '💡 Ainda sobraram ' + pilha + ' moedas na pilha. Coloque todas nos potinhos.';
          msg.className = 'retorno dica'; S.falar(msg.textContent); return;
        }
        if (jar.guardar < f.meta) {
          msg.textContent = '💡 Para o seu sonho, o cofrinho precisa de pelo menos ' + f.meta + ' moedas. Faltam ' + (f.meta - jar.guardar) + '.';
          msg.className = 'retorno dica'; S.falar(msg.textContent); return;
        }
        resolve();
      });
    });

    est.recebidas = f.renda;
    est.gastas = jar.gastar + jar.presente;
    est.saldo = jar.guardar;
    atualizarHUD(est);

    const correta = f.renda - jar.guardar - jar.presente; // = o que foi gasto
    const r = await perguntar(est, {
      visual: '🪙 ' + f.renda + ' ➖ 🐷 ' + jar.guardar + ' ➖ 🎁 ' + jar.presente,
      texto: 'Você tinha ' + f.renda + ' moedas. Guardou ' + jar.guardar + ' e deu ' + jar.presente + ' de presente. Quantas moedas você gastou?',
      correta: correta,
      opcoes: opcoes(correta, [correta + 1, correta + 2, jar.guardar, jar.presente, correta + 3]),
      dica: 'Tire as moedas guardadas e as do presente de ' + f.renda + '.'
    });
    contar(est, r);

    finalizarBonus(est);
  }

  function finalizarBonus(est) {
    const f = est.f;
    prog.tentativas[f.id] = (prog.tentativas[f.id] || 0) + 1;
    const estrelas = est.primeira === est.perguntas ? 3 : 2;
    const pontosFase = est.pontos + 20;
    const novas = [];
    registrar(est, true, prog.tentativas[f.id], 20);
    if (prog.concluidas.indexOf(f.id) === -1) prog.concluidas.push(f.id);
    prog.estrelas[f.id] = Math.max(prog.estrelas[f.id] || 0, estrelas);
    prog.melhor[f.id] = Math.max(prog.melhor[f.id] || 0, pontosFase);
    dar('feira', novas);
    salvarProg();

    const narrar = 'Parabéns! Você completou a jornada do Cofrinho dos Sonhos! Você fez ' + pontosTotal() + ' pontos.';
    tela(
      '<section class="tela resultado">' +
        '<div class="emoji-gigante" aria-hidden="true">🏆</div>' +
        '<h1 tabindex="-1" data-foco>Parabéns! Você completou tudo!</h1>' +
        '<p class="estrelas" aria-label="' + estrelas + ' de 3 estrelas">' + estrelasTxt(estrelas) + '</p>' +
        '<p class="detalhe">Você aprendeu que guardar, gastar e presentear são escolhas, e que as moedas são limitadas. 💛</p>' +
        '<p class="detalhe">Pontos no total: <strong>' + pontosTotal() + '</strong></p>' +
        '<p class="conquistas">' + prog.conquistas.map(function (k) { const c = C.CONQUISTAS[k]; return c ? '<span class="selo">' + c.emoji + ' ' + esc(c.nome) + '</span>' : ''; }).join(' ') + '</p>' +
        '<button class="btn ouvir" data-ouvir="' + esc(narrar) + '">🔊 Ouvir</button>' +
        '<div class="acoes">' +
          '<button class="btn" id="menu">🏠 Menu</button>' +
          '<button class="btn grande primario" id="mapa">🗺️ Jogar de novo</button>' +
        '</div>' +
      '</section>', narrar);
    S.bip('vitoria');
    on('#menu', menu);
    on('#mapa', mapa);
  }

  // =====================================================
  // INÍCIO
  // =====================================================
  aplicarConfig();
  menu();
  window.addEventListener('online', function () { A.reenviarPendentes(); });
})();

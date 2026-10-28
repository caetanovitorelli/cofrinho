// Narração em áudio (voz do próprio navegador, pt-BR) e efeitos sonoros suaves.
// Nenhum arquivo de áudio externo: funciona offline e não gera custo.
window.Som = (function () {
  'use strict';
  const api = { narracao: true, sons: true };
  let ctx = null;

  function contexto() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended' && ctx.resume) ctx.resume();
    return ctx;
  }

  function nota(freq, inicio, dur, volume) {
    const c = contexto();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, c.currentTime + inicio);
    g.gain.exponentialRampToValueAtTime(volume, c.currentTime + inicio + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + inicio + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(c.currentTime + inicio);
    o.stop(c.currentTime + inicio + dur + 0.05);
  }

  // Sons curtos e agradáveis. O "erro" é propositalmente suave: errar é aprender.
  api.bip = function (tipo) {
    if (!api.sons) return;
    try {
      if (tipo === 'ok') { nota(660, 0, 0.12, 0.15); nota(880, 0.12, 0.18, 0.15); }
      else if (tipo === 'erro') { nota(392, 0, 0.25, 0.08); }
      else if (tipo === 'moeda') { nota(988, 0, 0.08, 0.12); nota(1319, 0.08, 0.16, 0.12); }
      else if (tipo === 'compra') { nota(523, 0, 0.1, 0.12); nota(659, 0.1, 0.14, 0.12); }
      else if (tipo === 'vitoria') {
        [523, 659, 784, 1047].forEach(function (f, i) { nota(f, i * 0.14, 0.25, 0.14); });
      }
    } catch (e) { /* som é opcional */ }
  };

  // forcar = true quando a criança aperta "Ouvir" (fala mesmo com a narração automática desligada)
  api.falar = function (texto, forcar) {
    if (!forcar && !api.narracao) return;
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(texto));
      u.lang = 'pt-BR';
      u.rate = 0.9;
      const vozes = window.speechSynthesis.getVoices() || [];
      const v = vozes.find(function (x) { return x.lang && x.lang.toLowerCase() === 'pt-br'; }) ||
                vozes.find(function (x) { return x.lang && x.lang.toLowerCase().indexOf('pt') === 0; });
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch (e) { /* narração é opcional */ }
  };

  api.parar = function () {
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) { /* ignora */ }
  };

  return api;
})();

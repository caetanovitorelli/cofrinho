// Conteúdo pedagógico e dados fixos do jogo (Modelo "Jogo Fixo" do projeto).
//
// Disciplina: Matemática, habilidades EF02MA06 e EF03MA06 — resolução de problemas com
// adição, subtração, multiplicação e divisão de números naturais em situações do cotidiano.
// Progressão:
//   Semana 1 e 2 -> adição e subtração (números até ~40)
//   Semana 3     -> multiplicação (preço de "quantidade x preço unitário")
//   Semana 4     -> divisão (dividir o preço de um pacote igualmente entre amigos)
//   Feira Especial (bônus) -> distribuir moedas em 3 potinhos e calcular o que sobrou
//
// Regra de equilíbrio: em toda fase, "renda x rodadas" é um pouco maior que a meta.
// Ou seja: dá para comprar alguma coisa e ainda alcançar o sonho, mas não tudo. Recursos são limitados!
window.CONTEUDO = (function () {
  'use strict';

  const AVATARES = ['🦊', '🐼', '🐯', '🐸', '🐙', '🦄', '🐢', '🦉'];
  const BICHOS = {
    '🦊': 'Raposa', '🐼': 'Panda', '🐯': 'Tigre', '🐸': 'Sapo',
    '🐙': 'Polvo', '🦄': 'Unicórnio', '🐢': 'Tartaruga', '🦉': 'Coruja'
  };
  // Adjetivos que não mudam com o gênero, para combinar com qualquer bicho.
  const ADJETIVOS = ['Valente', 'Feliz', 'Veloz', 'Sorridente', 'Gentil', 'Brilhante', 'Incrível', 'Inteligente'];

  const OBJETIVOS = [
    { id: 'bicicleta', emoji: '🚲', nome: 'uma bicicleta' },
    { id: 'bola', emoji: '⚽', nome: 'uma bola' },
    { id: 'livro', emoji: '📚', nome: 'livros de histórias' },
    { id: 'patins', emoji: '🛼', nome: 'um par de patins' },
    { id: 'tinta', emoji: '🎨', nome: 'um kit de pintura' },
    { id: 'ursinho', emoji: '🧸', nome: 'um ursinho' }
  ];

  const FASES = [
    {
      id: 1, nome: 'Semana 1', titulo: 'Somar e guardar', emoji: '🍭', tipo: 'soma',
      renda: 3, meta: 9, rodadas: 4,
      ofertas: [
        { nome: 'Figurinha brilhante', emoji: '🌟', preco: 1 },
        { nome: 'Pirulito', emoji: '🍭', preco: 2 },
        { nome: 'Gibi', emoji: '📖', preco: 3 },
        { nome: 'Sorvete', emoji: '🍦', preco: 2 }
      ]
    },
    {
      id: 2, nome: 'Semana 2', titulo: 'Somar e subtrair', emoji: '🎈', tipo: 'soma',
      renda: 8, meta: 30, rodadas: 5,
      ofertas: [
        { nome: 'Balão gigante', emoji: '🎈', preco: 3 },
        { nome: 'Boneco', emoji: '🧸', preco: 6 },
        { nome: 'Lanche', emoji: '🥪', preco: 5 },
        { nome: 'Adesivos', emoji: '✨', preco: 4 },
        { nome: 'Picolé', emoji: '🍧', preco: 3 }
      ]
    },
    {
      id: 3, nome: 'Semana 3', titulo: 'Multiplicar preços', emoji: '📦', tipo: 'mult',
      renda: 10, meta: 38, rodadas: 5,
      ofertas: [
        { nome: 'figurinhas', emoji: '🌟', qtd: 3, unit: 2 },
        { nome: 'chaveiros', emoji: '🔑', qtd: 2, unit: 4 },
        { nome: 'balas', emoji: '🍬', qtd: 4, unit: 3 },
        { nome: 'lápis coloridos', emoji: '✏️', qtd: 5, unit: 2 },
        { nome: 'adesivos', emoji: '✨', qtd: 3, unit: 3 }
      ]
    },
    {
      id: 4, nome: 'Semana 4', titulo: 'Dividir com os amigos', emoji: '🧩', tipo: 'div',
      renda: 12, meta: 45, rodadas: 5,
      ofertas: [
        { nome: 'figurinhas', emoji: '🌟', total: 12, amigos: 3 },
        { nome: 'pipoca', emoji: '🍿', total: 20, amigos: 4 },
        { nome: 'massinha de modelar', emoji: '🎨', total: 18, amigos: 3 },
        { nome: 'jogo de tabuleiro', emoji: '🎲', total: 16, amigos: 2 },
        { nome: 'bolo de aniversário', emoji: '🎂', total: 24, amigos: 4 }
      ]
    }
  ];

  const BONUS = {
    id: 5, nome: 'Feira Especial', titulo: 'Guardar, gastar e presentear', emoji: '🎪',
    tipo: 'bonus', renda: 20, meta: 12, rodadas: 1
  };

  const CONQUISTAS = {
    'primeiro-sonho': { emoji: '🌱', nome: 'Primeiro sonho' },
    'craque': { emoji: '🧮', nome: 'Craque das contas' },
    'escolha-esperta': { emoji: '🧠', nome: 'Escolha esperta' },
    'campeao': { emoji: '🏆', nome: 'Campeão do cofrinho' },
    'feira': { emoji: '🎪', nome: 'Fera da feira' }
  };

  function aleatorio(n) { return Math.floor(Math.random() * n); }

  function sugerirNomes(avatar, quantidade) {
    const bicho = BICHOS[avatar] || 'Amigo';
    const usados = {};
    const lista = [];
    let tentativas = 0;
    while (lista.length < quantidade && tentativas < 50) {
      tentativas++;
      const nome = bicho + ' ' + ADJETIVOS[aleatorio(ADJETIVOS.length)] + ' ' + (10 + aleatorio(90));
      if (!usados[nome]) { usados[nome] = true; lista.push(nome); }
    }
    return lista;
  }

  function objetivoPorId(id) {
    for (let i = 0; i < OBJETIVOS.length; i++) if (OBJETIVOS[i].id === id) return OBJETIVOS[i];
    return null;
  }

  return {
    AVATARES: AVATARES, OBJETIVOS: OBJETIVOS, FASES: FASES, BONUS: BONUS, CONQUISTAS: CONQUISTAS,
    sugerirNomes: sugerirNomes, objetivoPorId: objetivoPorId
  };
})();

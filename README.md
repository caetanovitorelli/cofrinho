# 🐷 Cofrinho dos Sonhos

Jogo educativo de matemática e educação financeira para crianças de 7 a 10 anos (2º ao 5º ano), feito para o **Cruzeiro HUB**.
HTML + CSS + JavaScript puro, sem build e sem dependências. Roda direto no navegador (teclado, mouse e toque).

## Como funciona

A criança escolhe um **sonho** (bicicleta, bola, livros...) e, em cada rodada: **recebe moedas → resolve uma conta → decide entre comprar ou guardar → segue rumo ao sonho**.
Recursos são limitados: em toda fase dá para comprar algumas coisas e ainda alcançar o sonho, mas não tudo.

| Fase | Conteúdo (Matemática, EF02MA06 / EF03MA06) |
|---|---|
| Semana 1 | Adição e subtração pequenas |
| Semana 2 | Adição e subtração maiores |
| Semana 3 | Multiplicação (quantidade × preço) |
| Semana 4 | Divisão (dividir o preço entre amigos) |
| Feira Especial (bônus) | Reparte 20 moedas em 3 potinhos (arrastar e soltar) e calcula quanto gastou. Abre após concluir as 4 fases |

Errar nunca tira pontos: a criança recebe uma dica, tenta de novo e, na segunda vez errada, vê a resposta e segue.
Para liberar a fase seguinte é preciso alcançar a meta; se não alcançar, pode tentar de novo quantas vezes quiser.

> Confirme com o professor se a divisão das habilidades (EF02MA06 para soma e subtração, EF03MA06 para multiplicação e divisão) é a que ele espera.

## Requisitos do PDF do projeto atendidos

- Menu inicial: Jogar, Como jogar (com áudio), Ajustes de acessibilidade e Avatar/Apelido.
- 4 fases progressivas + 1 fase bônus liberada depois das 4.
- Progresso salvo (fases concluídas, estrelas, pontos e conquistas).
- Acessibilidade: narração em áudio em todo texto (botão 🔊 e automática), alto contraste, letra fácil de ler, 3 tamanhos de letra, paleta segura para daltonismo (sempre com ícone ou texto além da cor).
- UX infantil: botões grandes, feedback imediato, mecânicas de clicar e arrastar/soltar.
- Zero violência, sem punição por erro.
- LGPD: **nenhum dado pessoal**. O aluno escolhe um avatar e um apelido gerado (ex.: "Raposa Valente 42"). Não existe campo de texto livre.
- Deploy na Vercel, controle de versão no GitHub, integração por iframe.

## Rodar no seu computador

```bash
npx serve .
# abra http://localhost:3000 (jogo) e http://localhost:3000/professor (painel)
```

## Publicar (GitHub + Vercel)

1. Suba esta pasta para um repositório no GitHub.
2. Na Vercel: **Add New → Project**, importe o repositório. Framework: **Other**. Sem build command e sem output directory. Deploy.
3. A cada `git push` a Vercel publica de novo sozinha.

O `vercel.json` já libera o jogo para ser embutido **somente** no `cruzeirodosulhub.vercel.app` e bloqueia o painel do professor de ser embutido em qualquer site. Para incorporar no Hub:

```html
<iframe src="https://SEU-JOGO.vercel.app" title="Cofrinho dos Sonhos" width="100%" height="720" allow="autoplay"></iframe>
```

Se o Hub estiver em outro domínio, ajuste o `frame-ancestors` no `vercel.json`.

## Painel do professor

Acesse `/professor`. É **somente leitura** (não existe como editar moedas ou resultados) e mostra, por aluno (apelido): objetivo, moedas recebidas, gastas e economizadas, fases concluídas e se alcançou o objetivo. Tem botão para baixar CSV.

### Modo local (padrão, para demonstração)

Sem configurar nada, os resultados ficam no navegador de quem jogou e o painel só enxerga o que foi jogado **naquele mesmo navegador**. O PIN de demonstração é `1234` (em `js/config.js`). **Não é segurança de verdade.**

### Modo real com Supabase (recomendado para usar em sala de aula)

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode:

```sql
create table public.partidas (
  id         bigint generated always as identity primary key,
  criado_em  timestamptz not null default now(),
  sessao     text    not null check (char_length(sessao) between 8 and 64),
  apelido    text    not null check (char_length(apelido) <= 40),
  avatar     text    not null check (char_length(avatar) <= 8),
  objetivo   text    not null check (char_length(objetivo) <= 30),
  fase       int     not null check (fase between 1 and 5),
  tentativa  int     not null check (tentativa between 1 and 999),
  recebidas  int     not null check (recebidas between 0 and 500),
  gastas     int     not null check (gastas    between 0 and 500),
  guardadas  int     not null check (guardadas between 0 and 500),
  atingiu    boolean not null,
  pontos     int     not null default 0 check (pontos between 0 and 1000)
);

alter table public.partidas enable row level security;

-- alunos (chave anônima) só podem ENVIAR resultados, nunca ler nem alterar
create policy "alunos enviam resultados" on public.partidas
  for insert to anon with check (true);

-- só usuários logados (professores) podem LER
create policy "professores leem resultados" on public.partidas
  for select to authenticated using (true);
```

3. Em **Authentication → Sign In / Providers**, **desligue o cadastro público** ("Allow new users to sign up"). Isso é importante: com o cadastro aberto, qualquer pessoa criaria uma conta e leria os resultados.
4. Em **Authentication → Users**, crie o usuário do professor (e-mail e senha).
5. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public** para `js/config.js`:

```js
SUPABASE_URL: "https://xxxx.supabase.co",
SUPABASE_ANON_KEY: "eyJ...",
```

Pronto: cada fase concluída vai para a tabela (com reenvio automático se a internet cair) e o painel pede e-mail e senha.

## Estrutura

```
index.html          jogo do aluno
professor.html      painel do professor (somente leitura)
vercel.json         cabeçalhos para iframe no Hub
css/style.css       estilos e temas de acessibilidade
js/config.js        Supabase e PIN do modo local
js/conteudo.js      fases, ofertas, avatares e objetivos (dá para editar sem mexer na lógica)
js/jogo.js          lógica do jogo
js/storage.js       salvamento local + envio ao Supabase
js/som.js           narração e efeitos sonoros
js/professor.js     painel do professor
```

## Limitações conhecidas

- A narração usa a voz do navegador (pt-BR). Se o computador da escola não tiver voz em português instalada, a voz pode sair com sotaque estrangeiro ou não sair; vale testar nos computadores reais.
- Em telas de toque, o arrastar e soltar do bônus não funciona; os botões ➕ e ➖ fazem o mesmo.
- Se o navegador bloquear o armazenamento dentro do iframe, o progresso vale só até fechar a página (os resultados continuam indo para o Supabase).
- Moedas dadas de presente na Feira Especial contam como "gastas" no painel.

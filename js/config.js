// Configuração do Cofrinho dos Sonhos.
// Deixe SUPABASE_URL e SUPABASE_ANON_KEY vazios para rodar em "modo local":
// os resultados ficam salvos só no navegador de quem jogou (bom para demonstração).
// Preenchendo os dois, os resultados de todos os alunos vão para o Supabase
// e o professor enxerga tudo no painel (/professor). Veja o README.
//
// A chave "anon" do Supabase é pública por natureza: quem protege os dados
// são as regras (RLS) criadas pelo SQL do README, não o segredo da chave.
window.CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  // PIN do painel do professor SOMENTE no modo local (demonstração).
  // Não é segurança de verdade: com Supabase configurado, o painel usa login com e-mail e senha.
  PIN_PROFESSOR_LOCAL: "1234"
};

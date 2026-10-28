// Configuração do site. Os dois valores do Supabase são PÚBLICOS por natureza:
// a URL do projeto e a chave publicável ("anon"/"publishable") podem ficar no site,
// porque quem protege os dados é a RLS do banco.
// NUNCA coloque aqui a chave secreta ("service_role" / "secret").
window.BAIRROMETRO_CONFIG = {
  supabaseUrl: 'https://vhrlznnfgqgbeqgmggvn.supabase.co',
  supabasePublishableKey: 'sb_publishable_Gb1jrePhKgYStparQgQ8sw_5zDUsSx9',
  dataUrl: 'data/sorocaba.json', // dados que o site lê (gerado por pipeline/build_city.py)
  inactivityMinutes: 30,         // sai da conta após este tempo sem uso
  // O e-mail padrão do Supabase só chega a quem é da equipe do projeto (D040): sem confirmação
  // de cadastro e sem recuperação de senha por e-mail. Vira true com um servidor de e-mail próprio.
  emailEnabled: false,
};

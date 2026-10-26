# Batalha do Céu

Plataforma web para o movimento de batalhas de MCs de Santa Bárbara d'Oeste (SP), com páginas públicas para acompanhar MCs, rankings, edições e galeria, além de um painel administrativo.

## Tecnologias

- React 18
- TypeScript
- Vite
- React Router 6
- Supabase (banco de dados, autenticação, Storage e Realtime)

## Funcionalidades

### Área pública
- Página inicial com informações sobre o evento
- Listagem e perfil dos MCs
- Ranking por pontuação
- Listagem e detalhes das edições
- Chaves de batalha (bracket)
- Galeria de fotos com filtro por edição e visualização ampliada
- Páginas Sobre e Contato

### Painel administrativo
- Login e logout com Supabase Auth
- Rotas administrativas protegidas
- Cadastro, edição e exclusão de MCs
- Cadastro, edição e exclusão de edições
- Upload de fotos de MCs, banners e imagens da galeria
- Gerenciamento de chaves e registro de vencedores
- Atualizações em tempo real do bracket para administradores conectados

## Requisitos

- Node.js e npm
- Projeto Supabase
- Conta Vercel (opcional, para deploy)

## Configuração local

1. Clone o repositório e entre na pasta do projeto:

   ```bash
   git clone https://github.com/marcosfariasjavafx/BatalhaDoCEU.git
   cd BatalhaDoCEU
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Crie um arquivo `.env` a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

   Preencha as variáveis com os dados do seu projeto Supabase, disponíveis em **Settings → API**:

   ```env
   VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
   ```

   Não envie o arquivo `.env` nem chaves secretas para o GitHub. Use somente as credenciais apropriadas para o cliente web e mantenha as políticas de segurança (RLS) configuradas no Supabase.

4. Configure o banco de dados no Supabase executando o script `supabase/schema.sql` pelo **SQL Editor**, caso esse script corresponda à versão atual do projeto.

5. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   O Vite exibirá o endereço local, normalmente `http://localhost:5173`.

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Executa a verificação TypeScript e gera a build de produção |
| `npm run preview` | Serve localmente a build gerada para conferência |

Para validar a build antes de publicar:

```bash
npm run build
npm run preview
```

## Estrutura principal

```
src/
├── components/    # Componentes reutilizáveis e da interface pública
├── hooks/         # Hooks, incluindo autenticação e notificações
├── lib/           # Cliente Supabase e utilitários
├── pages/         # Páginas públicas e painel administrativo
├── types/         # Tipos TypeScript
├── App.tsx        # Rotas da aplicação
├── main.tsx       # Ponto de entrada
└── index.css      # Estilos globais
supabase/
└── schema.sql     # Estrutura e configuração inicial do banco
```

## Deploy na Vercel

1. Importe o repositório no painel da Vercel.
2. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY) nas variáveis de ambiente do projeto.
3. Execute o deploy usando as configurações padrão do Vite.
4. Confira a build e teste as rotas públicas e administrativas após a publicação.

## Observações de segurança

- O painel administrativo deve permanecer protegido por autenticação.
- Configure e revise as políticas de Row Level Security (RLS) e as permissões dos buckets no Supabase.
- Nunca publique senhas, tokens de serviço ou chaves privadas.
- Tornar o repositório privado não torna automaticamente privado o site já publicado nem remove cópias ou histórico previamente acessíveis.

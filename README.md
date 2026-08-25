# 🎤 Batalha do Céu

Site + painel admin do evento de batalha de MCs de Santa Bárbara d'Oeste.

**Stack:** React 18 · TypeScript · Vite · Supabase · React Router v6

---

## Setup em 5 passos

### 1. Criar projeto no Supabase

- Acesse [supabase.com](https://supabase.com) → **New Project**
- Aguarde provisionar (~1 min)

### 2. Rodar o SQL

No Supabase → **SQL Editor** → cole e execute o arquivo:

```
supabase/schema.sql
```

Isso cria as tabelas, RLS, Realtime, buckets de Storage e **12 MCs + 7 edições** de seed.

### 3. Criar usuário admin

Supabase → **Authentication → Users → Add User**
- Informe email e senha (serão usados no login do painel)

### 4. Configurar variáveis

```bash
cp .env.example .env
```

Edite `.env` com os valores do seu projeto (Supabase → **Settings → API**):

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 5. Instalar e rodar

```bash
npm install
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173)

---

## Estrutura

```
src/
├── pages/
│   ├── Home.tsx            # Home com próxima edição, MCs e ranking
│   ├── MCs.tsx             # Grid de todos os MCs
│   ├── MCPerfil.tsx        # Perfil individual com edições participadas
│   ├── Ranking.tsx         # Ranking completo por pontos
│   ├── Edicoes.tsx         # Listagem de todas as edições
│   ├── EdicaoDetalhe.tsx   # Detalhe + bracket + fotos
│   ├── Galeria.tsx         # Galeria com lightbox e filtro por edição
│   ├── Sobre.tsx           # Sobre o movimento
│   ├── Contato.tsx         # Contato e redes sociais
│   └── admin/
│       ├── Login.tsx       # Login via Supabase Auth
│       ├── AdminLayout.tsx # Sidebar + proteção de rota
│       ├── Dashboard.tsx   # Visão geral e atalhos
│       ├── AdminMCs.tsx    # CRUD de MCs + upload de foto
│       ├── AdminEdicoes.tsx# CRUD de edições + upload de banner
│       ├── AdminBracket.tsx# Bracket com Realtime ao vivo
│       └── AdminGaleria.tsx# Upload múltiplo de fotos
│
├── components/
│   ├── ui/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── MCAvatar.tsx
│   └── public/
│       └── BracketView.tsx
│
├── hooks/
│   ├── useAuth.tsx   # Contexto de autenticação
│   └── useToast.tsx  # Sistema de notificações
│
├── lib/
│   ├── supabase.ts   # Cliente Supabase
│   └── utils.ts      # Helpers + upload + compressão
│
├── types/index.ts    # Tipos TypeScript
├── App.tsx           # Rotas
├── main.tsx          # Entry point
└── index.css         # CSS global (design tokens)
```

---

## Funcionalidades

| Área | Recursos |
|------|----------|
| **Público** | Home, MCs, Ranking, Edições+Bracket, Galeria, Sobre, Contato |
| **Auth** | Login/logout via Supabase Auth, rota admin protegida |
| **CRUD MCs** | Criar, editar, excluir + upload de foto comprimida |
| **CRUD Edições** | Criar, editar, excluir + upload de banner |
| **Bracket** | Geração aleatória (8 ou 16 MCs), clique no vencedor, campeão automático (+100 pts +1 título) |
| **Realtime** | Bracket atualiza ao vivo para todos os admins conectados |
| **Galeria** | Upload múltiplo, compressão automática, filtro por edição, lightbox |

---

## Deploy (Vercel)

```bash
npm i -g vercel
vercel
```

Configure as variáveis de ambiente no painel da Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

# PeladaFC ⚽

App para organizar peladas de futebol: criação de grupos, partidas, votação de jogadores, hall da fama e rankings.

## Funcionalidades

- **Autenticação** — email/senha e Google OAuth via Supabase
- **Grupos** — criar, entrar por código, convidar membros
- **Partidas** — agendar, confirmar presença, montar times, registrar resultados
- **Avaliações** — votar em jogadores (1 a 5 estrelas) após cada partida
- **Hall da Fama** — histórico de premiações (melhor jogador, artilheiro, etc.)
- **Rankings** — estatísticas por jogador e por grupo
- **Mapa de Quadras** — localização de quadras próximas

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4
- **Backend:** Supabase (Auth, PostgreSQL, Storage)
- **Estado:** TanStack React Query
- **Roteamento:** React Router v7
- **Ícones:** Lucide React
- **Testes:** Vitest + Testing Library (126 testes)

## Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com)

## Configuração

1. Clone o repositório
2. Copie `.env.example` para `.env` e preencha:

   ```env
   VITE_SUPABASE_URL=sua_url
   VITE_SUPABASE_ANON_KEY=sua_chave_anon
   ```

3. Instale as dependências:

   ```bash
   npm install
   ```

4. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

## Scripts

| Comando               | Descrição                |
| --------------------- | ------------------------ |
| `npm run dev`         | Servidor de desenvolvimento |
| `npm run build`       | Build de produção        |
| `npm run preview`     | Preview do build         |
| `npm run lint`        | ESLint                   |
| `npm test`            | Rodar testes             |
| `npm run test:watch`  | Testes em modo watch     |
| `npm run test:coverage` | Cobertura de testes    |

## Estrutura

```
src/
├── components/      # Componentes UI (StarRating, ConfirmModal, Header, etc.)
├── contexts/        # AuthContext, GroupContext
├── hooks/           # React Query hooks (useMatches, useGroups, useDashboard)
├── lib/             # Utilitários (supabase client, sanitize, constants)
├── pages/           # Páginas (Dashboard, Matches, Groups, Hall, Rankings, etc.)
├── services/        # API services (matchService, groupService, storage)
├── types/           # TypeScript interfaces
└── test/            # Setup e utilitários de teste
```

## Deploy

Conecte o repositório ao [Vercel](https://vercel.com) ou [Netlify](https://netlify.com) e configure as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Licença

MIT

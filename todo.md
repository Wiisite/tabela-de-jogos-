# Tournament Manager - TODO

## Banco de Dados
- [x] Schema: tabela tournaments (id, name, category, status, champion, createdAt)
- [x] Schema: tabela teams (id, tournamentId, name, shortName, color)
- [x] Schema: tabela matches (id, tournamentId, phase, homeTeamId, awayTeamId, homeScore, awayScore, status, round)
- [x] Gerar migration SQL e aplicar via webdev_execute_sql
- [x] Seed: 6 equipes pré-cadastradas no torneio de exemplo (Sub-9 MASC)

## Backend (tRPC Routers)
- [x] tournament.list - listar todos os torneios
- [x] tournament.getById - buscar torneio com equipes e partidas
- [x] tournament.create - criar novo torneio com equipes
- [x] tournament.generateGroupMatches - gerar confrontos turno único
- [x] tournament.generateSemifinals - gerar semifinais com top 2 classificados
- [x] tournament.generateFinal - gerar final após semifinais
- [x] match.updateScore - atualizar placar de uma partida (protegido)
- [x] tournament.getStandings - calcular e retornar classificação
- [x] tournament.getBracket - retornar chaveamento completo

## Frontend - Páginas
- [x] Home.tsx - landing page elegante com lista de torneios
- [x] TournamentDetail.tsx - página do torneio com abas (Grupos, Classificação, Bracket, Semifinal, Final)
- [x] AdminDashboard.tsx - painel admin protegido por login
- [x] CreateTournament.tsx - formulário para criar novo torneio

## Frontend - Componentes
- [x] StandingsTable - tabela de classificação (inline em TournamentDetail)
- [x] MatchCard - card de partida com placar editável (inline em TournamentDetail)
- [x] TournamentBracket - visualização do chaveamento (inline em TournamentDetail)
- [x] ScoreModal - modal para registrar placar (inline em TournamentDetail)
- [x] TeamBadge - badge visual da equipe (inline em TournamentDetail)

## Estilo e Design
- [x] Paleta de cores elegante (dark premium: azul escuro + dourado + branco)
- [x] Tipografia refinada (Google Fonts: Inter + Playfair Display)
- [x] index.css com variáveis CSS e tema dark sofisticado
- [x] Componentes com sombras, bordas e animações premium
- [x] Classificação atualizada em tempo real (invalidação de cache tRPC)

## Testes
- [x] Vitest: round-robin generation (3 testes)
- [x] Vitest: standings calculation (5 testes - vitória, empate, derrota, saldo de gols, partidas não finalizadas)
- [x] Vitest: auth.logout test

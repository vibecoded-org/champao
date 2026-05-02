import { Fixture } from './fixture.model';
import { Player } from './player.model';
import { RankingCriterion } from './ranking.model';
import { Team } from './team.model';

export interface LeagueConfig {
  homeAndAway: boolean;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
}

export interface CupConfig {
  homeAndAway: boolean;
  singleElimination: boolean;
  uniqueFinalMatch: boolean;
  drawTiebreaker: 'away-goals' | 'penalties';
}

export interface DisciplineConfig {
  yellowCardsThreshold: number;
  yellowSuspensionGames: number;
  redCardsThreshold: number;
  redSuspensionGames: number;
}

export type CompetitionScope = 'league' | 'cup';

export type AppScope = CompetitionScope | 'total';

export type CompetitionMode = 'league' | 'cup' | 'both';

export interface ChampionshipConfig {
  name: string;
  mode: CompetitionMode;
  league: LeagueConfig;
  cup: CupConfig;
  discipline: DisciplineConfig;
  rankingCriteria: RankingCriterion[];
}

export interface ChampionshipState {
  version: number;
  config: ChampionshipConfig;
  teams: Team[];
  players: Player[];
  fixturesByCompetition: Record<CompetitionScope, Fixture[]>;
}

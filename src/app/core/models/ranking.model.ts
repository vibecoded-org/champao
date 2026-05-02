export type RankingField =
  | 'points'
  | 'victories'
  | 'goalDifference'
  | 'goalsFor'
  | 'goalsAgainst'
  | 'gamesPlayed'
  | 'teamName';

export interface RankingCriterion {
  field: RankingField;
  direction: 'asc' | 'desc';
}

export interface RankingRow {
  teamId: string;
  teamName: string;
  teamFlag?: string;
  gamesPlayed: number;
  points: number;
  victories: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  effectiveness: number;
  yellowCards: number;
  redCards: number;
  totalCards: number;
}

export interface ScorerRankingRow {
  teamId: string | null;
  teamName: string;
  teamFlag?: string;
  scorerName: string;
  goals: number;
  isOwnGoalsRow?: boolean;
}

export interface CardsRankingRow {
  teamId: string | null;
  teamName: string;
  teamFlag?: string;
  playerName: string;
  yellowCards: number;
  redCards: number;
  totalCards: number;
}

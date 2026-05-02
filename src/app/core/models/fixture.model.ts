export type FixtureStatus = 'not-finished' | 'finished';

export type CardType = 'yellow' | 'red';

export interface GoalEvent {
  id: string;
  teamId: string;
  playerId?: string;
  playerName?: string;
  isOwnGoal: boolean;
  ownGoalByTeamId?: string;
  minute?: number;
}

export interface CardEvent {
  id: string;
  teamId: string;
  playerId?: string;
  playerName?: string;
  cardType: CardType;
  minute?: number;
}

export interface Fixture {
  id: string;
  round: number;
  matchNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  homeSourceMatch?: { round: number; matchNumber: number };
  awaySourceMatch?: { round: number; matchNumber: number };
  penaltyWinnerTeamId?: string;
  status: FixtureStatus;
  goals: GoalEvent[];
  cards: CardEvent[];
}

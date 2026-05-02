import { Injectable } from '@angular/core';
import { ChampionshipState } from '../models/championship.model';
import { CardEvent, Fixture, GoalEvent } from '../models/fixture.model';
import { Player } from '../models/player.model';
import { RankingCriterion, RankingField } from '../models/ranking.model';
import { Team } from '../models/team.model';

export type ImportResult = { ok: true; state: ChampionshipState } | { ok: false; errors: string[] };

const fields: RankingField[] = [
  'points',
  'victories',
  'goalDifference',
  'goalsFor',
  'goalsAgainst',
  'gamesPlayed',
  'teamName'
];

const defaultRankingCriteria: RankingCriterion[] = [
  { field: 'points', direction: 'desc' },
  { field: 'victories', direction: 'desc' },
  { field: 'goalDifference', direction: 'desc' },
  { field: 'goalsFor', direction: 'desc' },
  { field: 'goalsAgainst', direction: 'asc' },
  { field: 'teamName', direction: 'asc' }
];

@Injectable({ providedIn: 'root' })
export class ImportExportService {
  export(state: ChampionshipState): string {
    return JSON.stringify(state, null, 2);
  }

  import(json: string): ImportResult {
    try {
      const parsed = JSON.parse(json) as Partial<ChampionshipState> & { scorers?: Array<{ id: string; teamId: string; name: string }> };
      const errors: string[] = [];

      if (!parsed || typeof parsed !== 'object') {
        errors.push('Invalid JSON object.');
      }

      if (!Array.isArray(parsed?.teams)) {
        errors.push('teams must be an array.');
      }

      if (!Array.isArray(parsed?.fixtures)) {
        errors.push('fixtures must be an array.');
      }

      if (!parsed?.config || typeof parsed.config !== 'object') {
        errors.push('config is required.');
      }

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const teams = (parsed.teams ?? []).filter((team): team is Team => Boolean(team?.id && team?.name));
      const players = Array.isArray(parsed.players)
        ? (parsed.players ?? []).filter((player): player is Player => Boolean(player?.id && player?.teamId && player?.name))
        : [];
      const fixtures = (parsed.fixtures ?? [])
        .filter((fixture): fixture is Fixture => Boolean(fixture?.id && fixture?.homeTeamId && fixture?.awayTeamId))
        .map((fixture) => ({
          id: fixture.id,
          round: Number(fixture.round ?? 1),
          matchNumber: Number(fixture.matchNumber ?? 1),
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          homeSourceMatch: fixture.homeSourceMatch
            ? {
                round: Number(fixture.homeSourceMatch.round ?? 0),
                matchNumber: Number(fixture.homeSourceMatch.matchNumber ?? 0)
              }
            : undefined,
          awaySourceMatch: fixture.awaySourceMatch
            ? {
                round: Number(fixture.awaySourceMatch.round ?? 0),
                matchNumber: Number(fixture.awaySourceMatch.matchNumber ?? 0)
              }
            : undefined,
          penaltyWinnerTeamId: fixture.penaltyWinnerTeamId,
          status: (fixture.status === 'finished' ? 'finished' : 'not-finished') as Fixture['status'],
          goals: (fixture.goals ?? []).map(
            (goal): GoalEvent => ({
              id: goal.id,
              teamId: goal.teamId,
              playerId: goal.playerId,
              playerName: goal.playerName,
              isOwnGoal: Boolean(goal.isOwnGoal),
              ownGoalByTeamId: goal.ownGoalByTeamId,
              minute: goal.minute
            })
          ),
          cards: (fixture.cards ?? []).map(
            (card): CardEvent => ({
              id: card.id,
              teamId: card.teamId,
              playerId: card.playerId,
              playerName: card.playerName,
              cardType: card.cardType === 'red' ? 'red' : 'yellow',
              minute: card.minute
            })
          )
        }));

      const criteriaFromPayload = parsed.config?.rankingCriteria;
      const rankingCriteria: RankingCriterion[] = Array.isArray(criteriaFromPayload)
        ? criteriaFromPayload.filter(
            (criterion): criterion is RankingCriterion =>
              Boolean(criterion && fields.includes(criterion.field) && (criterion.direction === 'asc' || criterion.direction === 'desc'))
          )
        : [];

      const state: ChampionshipState = {
        version: 2,
        config: {
          name: String(parsed.config?.name ?? 'Championship'),
          format: parsed.config?.format === 'cup' ? 'cup' : 'league',
          league: {
            homeAndAway: Boolean(parsed.config?.league?.homeAndAway),
            pointsWin: Number(parsed.config?.league?.pointsWin ?? 3),
            pointsDraw: Number(parsed.config?.league?.pointsDraw ?? 1),
            pointsLoss: Number(parsed.config?.league?.pointsLoss ?? 0)
          },
          cup: {
            homeAndAway: Boolean(parsed.config?.cup?.homeAndAway),
            singleElimination: parsed.config?.cup?.singleElimination !== false,
            uniqueFinalMatch: parsed.config?.cup?.uniqueFinalMatch === true,
            drawTiebreaker: parsed.config?.cup?.drawTiebreaker === 'penalties' ? 'penalties' : 'away-goals'
          },
          discipline: {
            yellowCardsThreshold: Number(parsed.config?.discipline?.yellowCardsThreshold ?? 3),
            yellowSuspensionGames: Number(parsed.config?.discipline?.yellowSuspensionGames ?? 1),
            redCardsThreshold: Number(parsed.config?.discipline?.redCardsThreshold ?? 1),
            redSuspensionGames: Number(parsed.config?.discipline?.redSuspensionGames ?? 1)
          },
          rankingCriteria: rankingCriteria.length > 0 ? rankingCriteria : defaultRankingCriteria
        },
        teams,
        players,
        fixtures
      };

      return { ok: true, state };
    } catch {
      return { ok: false, errors: ['Invalid JSON format.'] };
    }
  }
}

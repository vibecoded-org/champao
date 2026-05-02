import { Injectable } from '@angular/core';
import { ChampionshipState } from '../models/championship.model';
import { Fixture } from '../models/fixture.model';
import { CardsRankingRow, RankingCriterion, RankingRow, ScorerRankingRow } from '../models/ranking.model';

function getScore(fixture: Fixture): { home: number; away: number } {
  const home = fixture.goals.filter((goal) => goal.teamId === fixture.homeTeamId).length;
  const away = fixture.goals.filter((goal) => goal.teamId === fixture.awayTeamId).length;
  return { home, away };
}

@Injectable({ providedIn: 'root' })
export class RankingService {
  computeTable(state: ChampionshipState): RankingRow[] {
    const rows = state.teams.map((team) => ({
      teamId: team.id,
      teamName: team.displayName || team.name,
      teamFlag: team.flag,
      gamesPlayed: 0,
      points: 0,
      victories: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      effectiveness: 0,
      yellowCards: 0,
      redCards: 0,
      totalCards: 0
    }));

    const map = new Map(rows.map((row) => [row.teamId, row]));
    const finished = state.fixtures.filter((fixture) => fixture.status === 'finished');

    for (const fixture of finished) {
      const home = map.get(fixture.homeTeamId);
      const away = map.get(fixture.awayTeamId);
      if (!home || !away) {
        continue;
      }

      const score = getScore(fixture);
      home.gamesPlayed += 1;
      away.gamesPlayed += 1;
      home.goalsFor += score.home;
      home.goalsAgainst += score.away;
      away.goalsFor += score.away;
      away.goalsAgainst += score.home;

      for (const card of fixture.cards) {
        const row = map.get(card.teamId);
        if (!row) {
          continue;
        }
        if (card.cardType === 'yellow') {
          row.yellowCards += 1;
        } else {
          row.redCards += 1;
        }
      }

      if (score.home > score.away) {
        home.victories += 1;
        away.losses += 1;
        home.points += state.config.league.pointsWin;
        away.points += state.config.league.pointsLoss;
      } else if (score.home < score.away) {
        away.victories += 1;
        home.losses += 1;
        away.points += state.config.league.pointsWin;
        home.points += state.config.league.pointsLoss;
      } else {
        home.draws += 1;
        away.draws += 1;
        home.points += state.config.league.pointsDraw;
        away.points += state.config.league.pointsDraw;
      }
    }

    for (const row of rows) {
      row.goalDifference = row.goalsFor - row.goalsAgainst;
      row.totalCards = row.yellowCards + row.redCards;
      const maxPoints = row.gamesPlayed * state.config.league.pointsWin;
      row.effectiveness = maxPoints === 0 ? 0 : Number(((row.points / maxPoints) * 100).toFixed(2));
    }

    return rows.sort((a, b) => this.compareRows(a, b, state.config.rankingCriteria));
  }

  computeScorers(state: ChampionshipState): ScorerRankingRow[] {
    const finishedFixtures = state.fixtures.filter((fixture) => fixture.status === 'finished');
    const scoreMap = new Map<string, number>();
    let ownGoals = 0;

    for (const fixture of finishedFixtures) {
      for (const goal of fixture.goals) {
        if (goal.isOwnGoal) {
          ownGoals += 1;
          continue;
        }

        const scorerKey = goal.playerId ?? `${goal.teamId}:${goal.playerName ?? 'Unknown'}`;
        scoreMap.set(scorerKey, (scoreMap.get(scorerKey) ?? 0) + 1);
      }
    }

    const rows: ScorerRankingRow[] = [];

    for (const [key, goals] of scoreMap.entries()) {
      const player = state.players.find((entry) => entry.id === key);
      if (player) {
        const team = state.teams.find((entry) => entry.id === player.teamId);
        rows.push({
          teamId: player.teamId,
          teamName: team?.displayName || team?.name || 'Unknown team',
          teamFlag: team?.flag,
          scorerName: player.name,
          goals
        });
      } else {
        const [teamId, scorerName] = key.split(':');
        const team = state.teams.find((entry) => entry.id === teamId);
        rows.push({
          teamId,
          teamName: team?.displayName || team?.name || 'Unknown team',
          teamFlag: team?.flag,
          scorerName,
          goals
        });
      }
    }

    rows.sort((a, b) => b.goals - a.goals || a.scorerName.localeCompare(b.scorerName));

    if (ownGoals > 0) {
      rows.push({
        teamId: null,
        teamName: 'All teams',
        scorerName: 'Own goals',
        goals: ownGoals,
        isOwnGoalsRow: true
      });
    }

    return rows;
  }

  computeCards(state: ChampionshipState): CardsRankingRow[] {
    const finishedFixtures = state.fixtures.filter((fixture) => fixture.status === 'finished');
    const cardsMap = new Map<string, { teamId: string; playerName: string; yellowCards: number; redCards: number }>();

    for (const fixture of finishedFixtures) {
      for (const card of fixture.cards) {
        const key = card.playerId ?? `${card.teamId}:${card.playerName ?? 'Unknown'}`;
        const current = cardsMap.get(key) ?? {
          teamId: card.teamId,
          playerName: card.playerName ?? 'Unknown',
          yellowCards: 0,
          redCards: 0
        };

        if (card.cardType === 'yellow') {
          current.yellowCards += 1;
        } else {
          current.redCards += 1;
        }

        cardsMap.set(key, current);
      }
    }

    const rows: CardsRankingRow[] = [];
    for (const [key, value] of cardsMap.entries()) {
      const player = state.players.find((entry) => entry.id === key);
      const teamId = player?.teamId ?? value.teamId;
      const team = state.teams.find((entry) => entry.id === teamId);

      rows.push({
        teamId,
        teamName: team?.displayName || team?.name || 'Unknown team',
        teamFlag: team?.flag,
        playerName: player?.name ?? value.playerName,
        yellowCards: value.yellowCards,
        redCards: value.redCards,
        totalCards: value.yellowCards + value.redCards
      });
    }

    return rows.sort((a, b) => b.totalCards - a.totalCards || b.redCards - a.redCards || a.playerName.localeCompare(b.playerName));
  }

  playerGoals(state: ChampionshipState, playerId: string): number {
    let total = 0;
    for (const fixture of state.fixtures) {
      if (fixture.status !== 'finished') {
        continue;
      }
      total += fixture.goals.filter((goal) => goal.playerId === playerId).length;
    }
    return total;
  }

  private compareRows(a: RankingRow, b: RankingRow, criteria: RankingCriterion[]): number {
    for (const criterion of criteria) {
      const direction = criterion.direction === 'asc' ? 1 : -1;
      let compare = 0;
      switch (criterion.field) {
        case 'points':
          compare = a.points - b.points;
          break;
        case 'victories':
          compare = a.victories - b.victories;
          break;
        case 'goalDifference':
          compare = a.goalDifference - b.goalDifference;
          break;
        case 'goalsFor':
          compare = a.goalsFor - b.goalsFor;
          break;
        case 'goalsAgainst':
          compare = a.goalsAgainst - b.goalsAgainst;
          break;
        case 'gamesPlayed':
          compare = a.gamesPlayed - b.gamesPlayed;
          break;
        case 'teamName':
          compare = a.teamName.localeCompare(b.teamName);
          break;
      }

      if (compare !== 0) {
        return compare * -direction;
      }
    }

    return a.teamName.localeCompare(b.teamName);
  }
}

import { Injectable } from '@angular/core';
import { ChampionshipConfig } from '../models/championship.model';
import { Fixture } from '../models/fixture.model';
import { Team } from '../models/team.model';

const byeTeamId = '__BYE__';

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const temp = copy[index];
    copy[index] = copy[randomIndex];
    copy[randomIndex] = temp;
  }
  return copy;
}

@Injectable({ providedIn: 'root' })
export class FixtureGeneratorService {
  generateLeague(teams: Team[], homeAndAway: boolean): Fixture[] {
    const normalized = shuffle(teams);
    const rounds: Fixture[][] = [];

    if (normalized.length % 2 !== 0) {
      normalized.push({ id: byeTeamId, name: 'BYE' });
    }

    const size = normalized.length;
    const pivot = normalized[0];
    let rotatable = normalized.slice(1);

    for (let round = 0; round < size - 1; round += 1) {
      const current = [pivot, ...rotatable];
      const fixtures: Fixture[] = [];

      for (let index = 0; index < size / 2; index += 1) {
        const home = current[index];
        const away = current[size - 1 - index];

        if (home.id === byeTeamId || away.id === byeTeamId) {
          continue;
        }

        fixtures.push({
          id: id('fx'),
          round: round + 1,
          matchNumber: index + 1,
          homeTeamId: home.id,
          awayTeamId: away.id,
          status: 'not-finished',
          goals: [],
          cards: []
        });
      }

      rounds.push(fixtures);
      rotatable = [rotatable[rotatable.length - 1], ...rotatable.slice(0, -1)];
    }

    const singleLeg = rounds.flat();
    if (!homeAndAway) {
      return singleLeg;
    }

    const returnLeg = singleLeg.map((fixture) => ({
      ...fixture,
      id: id('fx'),
      round: fixture.round + rounds.length,
      matchNumber: fixture.matchNumber,
      homeTeamId: fixture.awayTeamId,
      awayTeamId: fixture.homeTeamId,
      goals: [],
      cards: [],
      status: 'not-finished' as const
    }));

    return [...singleLeg, ...returnLeg];
  }

  generateCup(teams: Team[], config: ChampionshipConfig): Fixture[] {
    const working = shuffle(teams);
    while ((working.length & (working.length - 1)) !== 0) {
      working.push({ id: `${byeTeamId}-${working.length}`, name: 'BYE' });
    }

    const rounds = Math.log2(working.length);
    const fixtures: Fixture[] = [];

    for (let round = 1; round <= rounds; round += 1) {
      const matchesInRound = Math.pow(2, rounds - round);
      for (let match = 0; match < matchesInRound; match += 1) {
        if (round === 1) {
          const home = working[match * 2];
          const away = working[match * 2 + 1];
          fixtures.push({
            id: id('cup'),
            round,
            matchNumber: match + 1,
            homeTeamId: home.id,
            awayTeamId: away.id,
            status: home.id.includes(byeTeamId) || away.id.includes(byeTeamId) ? 'finished' : 'not-finished',
            goals: [],
            cards: []
          });
          const isFinalRound = round === rounds;
          const shouldCreateReturnLeg = config.cup.homeAndAway && (!config.cup.uniqueFinalMatch || !isFinalRound);
          if (shouldCreateReturnLeg && !home.id.includes(byeTeamId) && !away.id.includes(byeTeamId)) {
            fixtures.push({
              id: id('cup'),
              round,
              matchNumber: match + 1,
              homeTeamId: away.id,
              awayTeamId: home.id,
              status: 'not-finished',
              goals: [],
              cards: []
            });
          }
        } else {
          fixtures.push({
            id: id('cup'),
            round,
            matchNumber: match + 1,
            homeTeamId: `WINNER_R${round - 1}_M${match * 2 + 1}`,
            awayTeamId: `WINNER_R${round - 1}_M${match * 2 + 2}`,
            homeSourceMatch: { round: round - 1, matchNumber: match * 2 + 1 },
            awaySourceMatch: { round: round - 1, matchNumber: match * 2 + 2 },
            status: 'not-finished',
            goals: [],
            cards: []
          });
        }
      }
    }

    return fixtures;
  }
}

import { TestBed } from '@angular/core/testing';
import { ChampionshipState } from '../models/championship.model';
import { RankingService } from './ranking.service';

describe('RankingService', () => {
  let service: RankingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RankingService);
  });

  it('computes ranking, scorers and cards from finished fixtures only', () => {
    const state: ChampionshipState = {
      version: 3,
      config: {
        name: 'Test',
        league: { homeAndAway: false, pointsWin: 3, pointsDraw: 1, pointsLoss: 0 },
        cup: { homeAndAway: false, singleElimination: true, uniqueFinalMatch: false, drawTiebreaker: 'away-goals' },
        discipline: { yellowCardsThreshold: 3, yellowSuspensionGames: 1, redCardsThreshold: 1, redSuspensionGames: 1 },
        rankingCriteria: [
          { field: 'points', direction: 'desc' },
          { field: 'victories', direction: 'desc' },
          { field: 'goalDifference', direction: 'desc' },
          { field: 'teamName', direction: 'asc' }
        ]
      },
      teams: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' }
      ],
      players: [{ id: 'p1', name: 'P1', teamId: 'a' }],
      fixturesByCompetition: {
        league: [
          {
            id: '1',
            round: 1,
            matchNumber: 1,
            homeTeamId: 'a',
            awayTeamId: 'b',
            status: 'finished',
            goals: [
              { id: 'g1', teamId: 'a', playerId: 'p1', isOwnGoal: false },
              { id: 'g2', teamId: 'a', playerId: 'p1', isOwnGoal: false }
            ],
            cards: [
              { id: 'c1', teamId: 'a', playerId: 'p1', cardType: 'yellow' },
              { id: 'c2', teamId: 'a', playerId: 'p1', cardType: 'red' }
            ]
          },
          {
            id: '2',
            round: 2,
            matchNumber: 1,
            homeTeamId: 'b',
            awayTeamId: 'a',
            status: 'not-finished',
            goals: [{ id: 'g3', teamId: 'b', playerName: 'X', isOwnGoal: false }],
            cards: [{ id: 'c3', teamId: 'b', playerName: 'X', cardType: 'yellow' }]
          }
        ],
        cup: []
      }
    };

    const fixtures = state.fixturesByCompetition.league;
    const table = service.computeTable(state, fixtures);
    expect(table[0].teamId).toBe('a');
    expect(table[0].position).toBe(1);
    expect(table[0].points).toBe(3);
    expect(table[0].yellowCards).toBe(1);
    expect(table[0].redCards).toBe(1);
    expect(table[0].totalCards).toBe(2);

    const scorers = service.computeScorers(state, fixtures);
    expect(scorers[0].scorerName).toBe('P1');
    expect(scorers[0].position).toBe(1);
    expect(scorers[0].goals).toBe(2);

    const cards = service.computeCards(state, fixtures);
    expect(cards[0].playerName).toBe('P1');
    expect(cards[0].position).toBe(1);
    expect(cards[0].yellowCards).toBe(1);
    expect(cards[0].redCards).toBe(1);
  });
});

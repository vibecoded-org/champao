import { computed, effect, Injectable, signal } from '@angular/core';
import { ChampionshipConfig, ChampionshipState, CupConfig, DisciplineConfig, LeagueConfig } from '../models/championship.model';
import { CardEvent, CardType, Fixture, FixtureStatus, GoalEvent } from '../models/fixture.model';
import { Player } from '../models/player.model';
import { RankingCriterion } from '../models/ranking.model';
import { Team } from '../models/team.model';
import { FixtureGeneratorService } from './fixture-generator.service';
import { ImportExportService } from './import-export.service';
import { RankingService } from './ranking.service';
import { StorageService } from './storage.service';

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

const defaultCriteria: RankingCriterion[] = [
  { field: 'points', direction: 'desc' },
  { field: 'victories', direction: 'desc' },
  { field: 'goalDifference', direction: 'desc' },
  { field: 'goalsFor', direction: 'desc' },
  { field: 'goalsAgainst', direction: 'asc' },
  { field: 'teamName', direction: 'asc' }
];

const defaultState: ChampionshipState = {
  version: 2,
  config: {
    name: 'Video Game Soccer Championship',
    format: 'league',
    league: {
      homeAndAway: false,
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0
    },
    cup: {
      homeAndAway: false,
      singleElimination: true,
      uniqueFinalMatch: false,
      drawTiebreaker: 'away-goals'
    },
    discipline: {
      yellowCardsThreshold: 3,
      yellowSuspensionGames: 1,
      redCardsThreshold: 1,
      redSuspensionGames: 1
    },
    rankingCriteria: defaultCriteria
  },
  teams: [],
  players: [],
  fixtures: []
};

export interface SuspensionCause {
  cardType: 'yellow' | 'red';
  threshold: number;
  suspensionGames: number;
  triggerFixtureId: string;
  triggerRound: number;
  triggerMatchNumber: number;
}

@Injectable({ providedIn: 'root' })
export class ChampionshipStoreService {
  private readonly stateSignal = signal<ChampionshipState>(defaultState);
  readonly state = computed(() => this.stateSignal());

  readonly config = computed(() => this.stateSignal().config);
  readonly teams = computed(() => this.stateSignal().teams);
  readonly players = computed(() => this.stateSignal().players);
  readonly fixtures = computed(() => this.stateSignal().fixtures);
  readonly fixturesByRound = computed(() => {
    const rounds = new Map<number, Fixture[]>();
    for (const fixture of this.stateSignal().fixtures) {
      const list = rounds.get(fixture.round) ?? [];
      list.push(fixture);
      rounds.set(fixture.round, list);
    }
    return [...rounds.entries()].sort((a, b) => a[0] - b[0]);
  });

  readonly rankingTable = computed(() => this.rankingService.computeTable(this.stateSignal()));
  readonly scorersRanking = computed(() => this.rankingService.computeScorers(this.stateSignal()));
  readonly cardsRanking = computed(() => this.rankingService.computeCards(this.stateSignal()));
  readonly hasFixtures = computed(() => this.stateSignal().fixtures.length > 0);
  readonly canGenerateFixtures = computed(() => this.stateSignal().teams.length >= 2);

  constructor(
    private readonly storageService: StorageService,
    private readonly fixtureGeneratorService: FixtureGeneratorService,
    private readonly importExportService: ImportExportService,
    private readonly rankingService: RankingService
  ) {
    const restored = this.storageService.load();
    if (restored) {
      this.stateSignal.set(restored);
    }

    effect(() => {
      this.storageService.save(this.stateSignal());
    });
  }

  addTeam(payload: Omit<Team, 'id'>): void {
    const team: Team = { id: uid('team'), ...payload };
    this.patch((state) => ({ ...state, teams: [...state.teams, team] }));
  }

  updateTeam(teamId: string, payload: Partial<Omit<Team, 'id'>>): void {
    this.patch((state) => ({
      ...state,
      teams: state.teams.map((team) => (team.id === teamId ? { ...team, ...payload } : team))
    }));
  }

  removeTeam(teamId: string): void {
    this.patch((state) => ({
      ...state,
      teams: state.teams.filter((team) => team.id !== teamId),
      players: state.players.filter((player) => player.teamId !== teamId),
      fixtures: state.fixtures.filter((fixture) => fixture.homeTeamId !== teamId && fixture.awayTeamId !== teamId)
    }));
  }

  setFormat(format: ChampionshipConfig['format']): void {
    this.patch((state) => ({ ...state, config: { ...state.config, format } }));
  }

  setLeagueConfig(config: Partial<LeagueConfig>): void {
    this.patch((state) => ({
      ...state,
      config: { ...state.config, league: { ...state.config.league, ...config } }
    }));
  }

  setCupConfig(config: Partial<CupConfig>): void {
    this.patch((state) => ({
      ...state,
      config: { ...state.config, cup: { ...state.config.cup, ...config } }
    }));
  }

  setDisciplineConfig(config: Partial<DisciplineConfig>): void {
    this.patch((state) => ({
      ...state,
      config: { ...state.config, discipline: { ...state.config.discipline, ...config } }
    }));
  }

  setRankingCriteria(criteria: RankingCriterion[]): void {
    this.patch((state) => ({ ...state, config: { ...state.config, rankingCriteria: criteria } }));
  }

  reorderRankingCriteria(from: number, to: number): void {
    const criteria = [...this.stateSignal().config.rankingCriteria];
    const [item] = criteria.splice(from, 1);
    criteria.splice(to, 0, item);
    this.setRankingCriteria(criteria);
  }

  addPlayer(payload: Omit<Player, 'id'>): string {
    const player: Player = { id: uid('player'), ...payload };
    this.patch((state) => ({ ...state, players: [...state.players, player] }));
    return player.id;
  }

  updatePlayer(playerId: string, name: string): void {
    this.patch((state) => ({
      ...state,
      players: state.players.map((player) => (player.id === playerId ? { ...player, name } : player))
    }));
  }

  removePlayer(playerId: string): boolean {
    const state = this.stateSignal();
    const linkedGoals = state.fixtures.some((fixture) => fixture.goals.some((goal) => goal.playerId === playerId));
    const linkedCards = state.fixtures.some((fixture) => fixture.cards.some((card) => card.playerId === playerId));
    if (linkedGoals || linkedCards) {
      return false;
    }

    this.patch((next) => ({ ...next, players: next.players.filter((player) => player.id !== playerId) }));
    return true;
  }

  generateFixtures(force = false): { ok: boolean; error?: string } {
    const state = this.stateSignal();
    if (state.teams.length < 2) {
      return { ok: false, error: 'Add at least 2 teams before generating fixtures.' };
    }

    if (state.fixtures.length > 0 && !force) {
      return { ok: false, error: 'Fixtures already exist.' };
    }

    const fixtures = state.config.format === 'league'
      ? this.fixtureGeneratorService.generateLeague(state.teams, state.config.league.homeAndAway)
      : this.fixtureGeneratorService.generateCup(state.teams, state.config);

    this.patch((next) => ({ ...next, fixtures }));
    return { ok: true };
  }

  setFixtureStatus(fixtureId: string, status: FixtureStatus): void {
    this.patch((state) => ({
      ...this.resolveCupReferences({
        ...state,
        fixtures: state.fixtures.map((fixture) => (fixture.id === fixtureId ? { ...fixture, status } : fixture))
      })
    }));
  }

  addGoal(fixtureId: string, goal: Omit<GoalEvent, 'id'>): void {
    this.patch((state) => ({
      ...this.resolveCupReferences({
        ...state,
        fixtures: state.fixtures.map((fixture) => {
          if (fixture.id !== fixtureId) {
            return fixture;
          }
          return {
            ...fixture,
            goals: [...fixture.goals, { ...goal, id: uid('goal') }]
          };
        })
      })
    }));
  }

  removeGoal(fixtureId: string, goalId: string): void {
    this.patch((state) => ({
      ...this.resolveCupReferences({
        ...state,
        fixtures: state.fixtures.map((fixture) =>
          fixture.id === fixtureId ? { ...fixture, goals: fixture.goals.filter((goal) => goal.id !== goalId) } : fixture
        )
      })
    }));
  }

  addCard(fixtureId: string, card: Omit<CardEvent, 'id'>): void {
    this.patch((state) => ({
      ...state,
      fixtures: state.fixtures.map((fixture) => {
        if (fixture.id !== fixtureId) {
          return fixture;
        }
        return {
          ...fixture,
          cards: [...fixture.cards, { ...card, id: uid('card') }]
        };
      })
    }));
  }

  removeCard(fixtureId: string, cardId: string): void {
    this.patch((state) => ({
      ...state,
      fixtures: state.fixtures.map((fixture) =>
        fixture.id === fixtureId ? { ...fixture, cards: fixture.cards.filter((card) => card.id !== cardId) } : fixture
      )
    }));
  }

  upsertPlayerForTeam(teamId: string, playerName: string): string {
    const name = playerName.trim();
    const existing = this.stateSignal().players.find(
      (player) => player.teamId === teamId && player.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    );
    if (existing) {
      return existing.id;
    }
    return this.addPlayer({ teamId, name });
  }

  importState(json: string): { ok: boolean; errors?: string[] } {
    const result = this.importExportService.import(json);
    if (!result.ok) {
      return { ok: false, errors: result.errors };
    }

    this.stateSignal.set(result.state);
    return { ok: true };
  }

  exportState(): string {
    return this.importExportService.export(this.stateSignal());
  }

  resetChampionship(): void {
    this.storageService.clear();
    this.stateSignal.set(defaultState);
  }

  playerGoals(playerId: string): number {
    return this.rankingService.playerGoals(this.stateSignal(), playerId);
  }

  setPenaltyWinner(fixtureId: string, teamId: string): void {
    this.patch((state) => ({
      ...this.resolveCupReferences({
        ...state,
        fixtures: state.fixtures.map((fixture) =>
          fixture.id === fixtureId ? { ...fixture, penaltyWinnerTeamId: teamId } : fixture
        )
      })
    }));
  }

  suspendedPlayersForFixture(fixtureId: string): Set<string> {
    const details = this.playerSuspensionDetailsForFixture(fixtureId);
    return new Set(Object.keys(details));
  }

  playerSuspensionDetailsForFixture(fixtureId: string): Record<string, SuspensionCause[]> {
    const current = this.stateSignal();
    const state = current.config.format === 'cup' ? this.resolveCupReferences(current) : current;
    const fixtureIndex = state.fixtures.findIndex((fixture) => fixture.id === fixtureId);
    if (fixtureIndex < 0) {
      return {};
    }

    const fixture = state.fixtures[fixtureIndex];
    const involvedTeams = new Set([fixture.homeTeamId, fixture.awayTeamId]);
    const suspensionState = this.suspensionStateBeforeFixture(state, fixtureIndex);
    const result: Record<string, SuspensionCause[]> = {};

    for (const player of state.players) {
      if (!involvedTeams.has(player.teamId)) {
        continue;
      }

      const activeCauses = suspensionState.causes.get(player.id) ?? [];
      if (activeCauses.length > 0) {
        result[player.id] = activeCauses.map((entry) => entry.cause);
      }
    }

    return result;
  }

  private resolveCupReferences(state: ChampionshipState): ChampionshipState {
    if (state.config.format !== 'cup') {
      return state;
    }

    let fixtures = state.fixtures.map((fixture) => ({ ...fixture }));
    let changed = true;
    let guard = 0;

    while (changed && guard < fixtures.length + 2) {
      changed = false;
      guard += 1;

      fixtures = fixtures.map((fixture) => {
        const nextFixture = { ...fixture };
        let localChanged = false;

        if (nextFixture.homeSourceMatch) {
          const winner = this.resolveWinner(state, fixtures, nextFixture.homeSourceMatch.round, nextFixture.homeSourceMatch.matchNumber);
          if (winner && nextFixture.homeTeamId !== winner) {
            nextFixture.homeTeamId = winner;
            localChanged = true;
          }
        }

        if (nextFixture.awaySourceMatch) {
          const winner = this.resolveWinner(state, fixtures, nextFixture.awaySourceMatch.round, nextFixture.awaySourceMatch.matchNumber);
          if (winner && nextFixture.awayTeamId !== winner) {
            nextFixture.awayTeamId = winner;
            localChanged = true;
          }
        }

        if (localChanged) {
          changed = true;
        }

        return nextFixture;
      });
    }

    return { ...state, fixtures };
  }

  private resolveWinner(state: ChampionshipState, fixtures: Fixture[], round: number, matchNumber: number): string | null {
    const sourceFixtures = fixtures.filter((fixture) => fixture.round === round && fixture.matchNumber === matchNumber);

    if (sourceFixtures.length === 0 || sourceFixtures.some((fixture) => fixture.status !== 'finished')) {
      return null;
    }

    const teamTotals = new Map<string, number>();
    for (const fixture of sourceFixtures) {
      const homeScore = fixture.goals.filter((goal) => goal.teamId === fixture.homeTeamId).length;
      const awayScore = fixture.goals.filter((goal) => goal.teamId === fixture.awayTeamId).length;
      teamTotals.set(fixture.homeTeamId, (teamTotals.get(fixture.homeTeamId) ?? 0) + homeScore);
      teamTotals.set(fixture.awayTeamId, (teamTotals.get(fixture.awayTeamId) ?? 0) + awayScore);
    }

    const [firstLeg] = sourceFixtures;
    const homeTotal = teamTotals.get(firstLeg.homeTeamId) ?? 0;
    const awayTotal = teamTotals.get(firstLeg.awayTeamId) ?? 0;
    if (homeTotal !== awayTotal) {
      return homeTotal > awayTotal ? firstLeg.homeTeamId : firstLeg.awayTeamId;
    }

    if (sourceFixtures.length > 1 && state.config.cup.drawTiebreaker === 'away-goals') {
      let firstLegAwayGoals = 0;
      let secondLegAwayGoals = 0;

      for (const fixture of sourceFixtures) {
        if (fixture.homeTeamId === firstLeg.homeTeamId && fixture.awayTeamId === firstLeg.awayTeamId) {
          firstLegAwayGoals += fixture.goals.filter((goal) => goal.teamId === firstLeg.awayTeamId).length;
        }
        if (fixture.homeTeamId === firstLeg.awayTeamId && fixture.awayTeamId === firstLeg.homeTeamId) {
          secondLegAwayGoals += fixture.goals.filter((goal) => goal.teamId === firstLeg.homeTeamId).length;
        }
      }

      if (firstLegAwayGoals !== secondLegAwayGoals) {
        return secondLegAwayGoals > firstLegAwayGoals ? firstLeg.homeTeamId : firstLeg.awayTeamId;
      }
    }

    if (state.config.cup.drawTiebreaker === 'penalties') {
      for (const fixture of sourceFixtures) {
        if (fixture.penaltyWinnerTeamId === firstLeg.homeTeamId || fixture.penaltyWinnerTeamId === firstLeg.awayTeamId) {
          return fixture.penaltyWinnerTeamId;
        }
      }
      return null;
    }

    return firstLeg.homeTeamId;
  }

  private suspensionStateBeforeFixture(
    state: ChampionshipState,
    targetFixtureIndex: number
  ): {
    count: Map<string, number>;
    causes: Map<string, Array<{ remainingGames: number; cause: SuspensionCause }>>;
  } {
    const yellowCount = new Map<string, number>();
    const redCount = new Map<string, number>();
    const suspension = new Map<string, number>();
    const suspensionCauses = new Map<string, Array<{ remainingGames: number; cause: SuspensionCause }>>();
    const discipline = state.config.discipline;

    const yellowThreshold = Math.max(1, Math.trunc(discipline.yellowCardsThreshold || 1));
    const redThreshold = Math.max(1, Math.trunc(discipline.redCardsThreshold || 1));
    const yellowSuspensionGames = Math.max(0, Math.trunc(discipline.yellowSuspensionGames || 0));
    const redSuspensionGames = Math.max(0, Math.trunc(discipline.redSuspensionGames || 0));

    for (let index = 0; index < targetFixtureIndex; index += 1) {
      const fixture = state.fixtures[index];
      if (fixture.status !== 'finished') {
        continue;
      }

      const teamsInFixture = new Set([fixture.homeTeamId, fixture.awayTeamId]);
      for (const player of state.players) {
        if (!teamsInFixture.has(player.teamId)) {
          continue;
        }
        const pending = suspension.get(player.id) ?? 0;
        if (pending > 0) {
          suspension.set(player.id, pending - 1);
        }

        const active = suspensionCauses.get(player.id) ?? [];
        if (active.length > 0) {
          const decremented = active
            .map((entry) => ({ ...entry, remainingGames: entry.remainingGames - 1 }))
            .filter((entry) => entry.remainingGames > 0);
          suspensionCauses.set(player.id, decremented);
        }
      }

      for (const card of fixture.cards) {
        const playerId = card.playerId;
        if (!playerId) {
          continue;
        }

        if (card.cardType === 'yellow') {
          const nextYellow = (yellowCount.get(playerId) ?? 0) + 1;
          yellowCount.set(playerId, nextYellow);
          if (yellowSuspensionGames > 0 && nextYellow % yellowThreshold === 0) {
            suspension.set(playerId, (suspension.get(playerId) ?? 0) + yellowSuspensionGames);
            const entry = {
              remainingGames: yellowSuspensionGames,
              cause: {
                cardType: 'yellow' as const,
                threshold: yellowThreshold,
                suspensionGames: yellowSuspensionGames,
                triggerFixtureId: fixture.id,
                triggerRound: fixture.round,
                triggerMatchNumber: fixture.matchNumber
              }
            };
            suspensionCauses.set(playerId, [...(suspensionCauses.get(playerId) ?? []), entry]);
          }
          continue;
        }

        const nextRed = (redCount.get(playerId) ?? 0) + 1;
        redCount.set(playerId, nextRed);
        if (redSuspensionGames > 0 && nextRed % redThreshold === 0) {
          suspension.set(playerId, (suspension.get(playerId) ?? 0) + redSuspensionGames);
          const entry = {
            remainingGames: redSuspensionGames,
            cause: {
              cardType: 'red' as const,
              threshold: redThreshold,
              suspensionGames: redSuspensionGames,
              triggerFixtureId: fixture.id,
              triggerRound: fixture.round,
              triggerMatchNumber: fixture.matchNumber
            }
          };
          suspensionCauses.set(playerId, [...(suspensionCauses.get(playerId) ?? []), entry]);
        }
      }
    }

    return { count: suspension, causes: suspensionCauses };
  }

  private patch(updater: (state: ChampionshipState) => ChampionshipState): void {
    this.stateSignal.update(updater);
  }
}

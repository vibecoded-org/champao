import { computed, effect, Injectable, signal } from '@angular/core';
import { AppScope, ChampionshipConfig, ChampionshipState, CompetitionMode, CompetitionScope, CupConfig, DisciplineConfig, LeagueConfig } from '../models/championship.model';
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
  { field: 'points', direction: 'asc' },
  { field: 'victories', direction: 'asc' },
  { field: 'goalDifference', direction: 'asc' },
  { field: 'goalsFor', direction: 'asc' }
];

const defaultState: ChampionshipState = {
  version: 3,
  config: {
    name: 'Video Game Soccer Championship',
    mode: 'both',
    league: {
      homeAndAway: false,
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0
    },
    cup: {
      homeAndAway: true,
      singleElimination: true,
      uniqueFinalMatch: false,
      drawTiebreaker: 'penalties'
    },
    discipline: {
      yellowCardsThreshold: 2,
      yellowSuspensionGames: 1,
      redCardsThreshold: 1,
      redSuspensionGames: 1
    },
    rankingCriteria: defaultCriteria
  },
  teams: [],
  players: [],
  fixturesByCompetition: {
    league: [],
    cup: []
  }
};

export interface SuspensionCause {
  cardType: 'yellow' | 'red';
  threshold: number;
  suspensionGames: number;
  triggerFixtureId: string;
  triggerRound: number;
  triggerMatchNumber: number;
}

export interface ChampionshipResultSummary {
  totalMatches: number;
  totalGoals: number;
  yellowCards: number;
  redCards: number;
  totalCards: number;
}

@Injectable({ providedIn: 'root' })
export class ChampionshipStoreService {
  private readonly stateSignal = signal<ChampionshipState>(defaultState);
  readonly state = computed(() => this.stateSignal());

  private readonly appScopeSignal = signal<AppScope>('league');

  readonly appScope = computed<AppScope>(() => {
    const mode = this.stateSignal().config.mode ?? 'both';
    if (mode === 'league') return 'league';
    if (mode === 'cup') return 'cup';
    return this.appScopeSignal();
  });

  readonly competitionScope = computed<CompetitionScope | null>(() => {
    const scope = this.appScope();
    return scope === 'total' ? null : scope;
  });

  readonly config = computed(() => this.stateSignal().config);
  readonly teams = computed(() => this.stateSignal().teams);
  readonly players = computed(() => this.stateSignal().players);
  readonly fixturesByCompetition = computed(() => this.stateSignal().fixturesByCompetition);

  readonly rankingTable = computed(() => this.rankingForScope(this.appScope()));
  readonly scorersRanking = computed(() => this.scorersForScope(this.appScope()));
  readonly cardsRanking = computed(() => this.cardsForScope(this.appScope()));

  readonly hasLeagueFixtures = computed(() => this.stateSignal().fixturesByCompetition.league.length > 0);
  readonly hasCupFixtures = computed(() => this.stateSignal().fixturesByCompetition.cup.length > 0);
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

  setAppScope(scope: AppScope): void {
    this.appScopeSignal.set(scope);
  }

  fixtures(scope: CompetitionScope): Fixture[] {
    return this.scopeState(scope).fixturesByCompetition[scope];
  }

  fixturesByRound(scope: CompetitionScope): Array<[number, Fixture[]]> {
    const rounds = new Map<number, Fixture[]>();
    for (const fixture of this.fixtures(scope)) {
      const list = rounds.get(fixture.round) ?? [];
      list.push(fixture);
      rounds.set(fixture.round, list);
    }
    return [...rounds.entries()].sort((a, b) => a[0] - b[0]);
  }

  hasFixtures(scope: CompetitionScope): boolean {
    return this.fixtures(scope).length > 0;
  }

  fixturesForScope(scope: AppScope): Fixture[] {
    return this.fixturesForAppScope(scope);
  }

  rankingForScope(scope: AppScope) {
    return this.rankingService.computeTable(this.stateSignal(), this.fixturesForAppScope(scope));
  }

  scorersForScope(scope: AppScope) {
    return this.rankingService.computeScorers(this.stateSignal(), this.fixturesForAppScope(scope));
  }

  cardsForScope(scope: AppScope) {
    return this.rankingService.computeCards(this.stateSignal(), this.fixturesForAppScope(scope));
  }

  isScopeFinished(scope: AppScope): boolean {
    const fixtures = this.fixturesForAppScope(scope);
    return fixtures.length > 0 && fixtures.every((fixture) => fixture.status === 'finished');
  }

  resultSummary(scope: AppScope): ChampionshipResultSummary {
    const fixtures = this.fixturesForAppScope(scope);
    let totalGoals = 0;
    let yellowCards = 0;
    let redCards = 0;

    for (const fixture of fixtures) {
      totalGoals += fixture.goals.length;
      for (const card of fixture.cards) {
        if (card.cardType === 'yellow') {
          yellowCards += 1;
        } else {
          redCards += 1;
        }
      }
    }

    return {
      totalMatches: fixtures.length,
      totalGoals,
      yellowCards,
      redCards,
      totalCards: yellowCards + redCards
    };
  }

  cupChampionTeamId(): string | null {
    const fixtures = this.scopeState('cup').fixturesByCompetition.cup;
    if (fixtures.length === 0) {
      return null;
    }

    const maxRound = Math.max(...fixtures.map((fixture) => fixture.round));
    const finalLegs = fixtures.filter((fixture) => fixture.round === maxRound && fixture.matchNumber === 1);
    if (finalLegs.length === 0) {
      return null;
    }

    const finalMatch = finalLegs[finalLegs.length - 1];
    if (finalMatch.status !== 'finished') {
      return null;
    }

    if (finalMatch.penaltyWinnerTeamId === finalMatch.homeTeamId || finalMatch.penaltyWinnerTeamId === finalMatch.awayTeamId) {
      return finalMatch.penaltyWinnerTeamId;
    }

    const score = this.fixtureScore(finalMatch);
    const homeGoals = score.home;
    const awayGoals = score.away;
    if (homeGoals !== awayGoals) {
      return homeGoals > awayGoals ? finalMatch.homeTeamId : finalMatch.awayTeamId;
    }

    return null;
  }

  private fixtureScore(fixture: Fixture): { home: number; away: number } {
    let home = 0;
    let away = 0;
    for (const goal of fixture.goals) {
      const scoringTeamId = goal.isOwnGoal && goal.ownGoalByTeamId ? goal.ownGoalByTeamId : goal.teamId;
      if (scoringTeamId === fixture.homeTeamId) {
        home += 1;
      } else if (scoringTeamId === fixture.awayTeamId) {
        away += 1;
      }
    }
    return { home, away };
  }

  private clearPenaltyWinnerIfScoreNotDrawn(fixture: Fixture): Fixture {
    if (!fixture.penaltyWinnerTeamId) {
      return fixture;
    }

    const score = this.fixtureScore(fixture);
    if (score.home !== score.away) {
      return { ...fixture, penaltyWinnerTeamId: undefined };
    }

    return fixture;
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
      fixturesByCompetition: {
        league: state.fixturesByCompetition.league.filter((fixture) => fixture.homeTeamId !== teamId && fixture.awayTeamId !== teamId),
        cup: state.fixturesByCompetition.cup.filter((fixture) => fixture.homeTeamId !== teamId && fixture.awayTeamId !== teamId)
      }
    }));
  }

  setMode(mode: CompetitionMode): void {
    this.patch((state) => ({
      ...state,
      config: { ...state.config, mode }
    }));
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
    const fixtures = [...this.stateSignal().fixturesByCompetition.league, ...this.stateSignal().fixturesByCompetition.cup];
    const linkedGoals = fixtures.some((fixture) => fixture.goals.some((goal) => goal.playerId === playerId));
    const linkedCards = fixtures.some((fixture) => fixture.cards.some((card) => card.playerId === playerId));
    if (linkedGoals || linkedCards) {
      return false;
    }

    this.patch((next) => ({ ...next, players: next.players.filter((player) => player.id !== playerId) }));
    return true;
  }

  generateFixtures(scope: CompetitionScope, force = false): { ok: boolean; error?: string } {
    const state = this.stateSignal();
    if (state.teams.length < 2) {
      return { ok: false, error: 'Add at least 2 teams before generating fixtures.' };
    }

    if (state.fixturesByCompetition[scope].length > 0 && !force) {
      return { ok: false, error: 'Fixtures already exist.' };
    }

    const fixtures = scope === 'league'
      ? this.fixtureGeneratorService.generateLeague(state.teams, state.config.league.homeAndAway)
      : this.fixtureGeneratorService.generateCup(state.teams, state.config.cup);

    this.patch((next) => ({
      ...next,
      fixturesByCompetition: {
        ...next.fixturesByCompetition,
        [scope]: fixtures
      }
    }));
    return { ok: true };
  }

  setFixtureStatus(scope: CompetitionScope, fixtureId: string, status: FixtureStatus): void {
    this.updateScopeFixtures(scope, (fixtures) => fixtures.map((fixture) => (fixture.id === fixtureId ? { ...fixture, status } : fixture)));
  }

  addGoal(scope: CompetitionScope, fixtureId: string, goal: Omit<GoalEvent, 'id'>): void {
    this.updateScopeFixtures(scope, (fixtures) =>
      fixtures.map((fixture) => {
        if (fixture.id !== fixtureId) {
          return fixture;
        }
        return this.clearPenaltyWinnerIfScoreNotDrawn({
          ...fixture,
          goals: [...fixture.goals, { ...goal, id: uid('goal') }]
        });
      })
    );
  }

  removeGoal(scope: CompetitionScope, fixtureId: string, goalId: string): void {
    this.updateScopeFixtures(scope, (fixtures) =>
      fixtures.map((fixture) =>
        fixture.id === fixtureId
          ? this.clearPenaltyWinnerIfScoreNotDrawn({ ...fixture, goals: fixture.goals.filter((goal) => goal.id !== goalId) })
          : fixture
      )
    );
  }

  addCard(scope: CompetitionScope, fixtureId: string, card: Omit<CardEvent, 'id'>): void {
    this.updateScopeFixtures(scope, (fixtures) =>
      fixtures.map((fixture) => {
        if (fixture.id !== fixtureId) {
          return fixture;
        }
        return {
          ...fixture,
          cards: [...fixture.cards, { ...card, id: uid('card') }]
        };
      })
    );
  }

  removeCard(scope: CompetitionScope, fixtureId: string, cardId: string): void {
    this.updateScopeFixtures(scope, (fixtures) =>
      fixtures.map((fixture) => (fixture.id === fixtureId ? { ...fixture, cards: fixture.cards.filter((card) => card.id !== cardId) } : fixture))
    );
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
    this.appScopeSignal.set('league');
  }

  playerGoals(playerId: string): number {
    return this.rankingService.playerGoals(this.fixturesForAppScope('total'), playerId);
  }

  setPenaltyWinner(scope: CompetitionScope, fixtureId: string, teamId: string): void {
    this.updateScopeFixtures(scope, (fixtures) =>
      fixtures.map((fixture) => (fixture.id === fixtureId ? { ...fixture, penaltyWinnerTeamId: teamId } : fixture))
    );
  }

  suspendedPlayersForFixture(scope: CompetitionScope, fixtureId: string): Set<string> {
    const details = this.playerSuspensionDetailsForFixture(scope, fixtureId);
    return new Set(Object.keys(details));
  }

  playerSuspensionDetailsForFixture(scope: CompetitionScope, fixtureId: string): Record<string, SuspensionCause[]> {
    const state = this.scopeState(scope);
    const fixtures = state.fixturesByCompetition[scope];
    const fixtureIndex = fixtures.findIndex((fixture) => fixture.id === fixtureId);
    if (fixtureIndex < 0) {
      return {};
    }

    const fixture = fixtures[fixtureIndex];
    const involvedTeams = new Set([fixture.homeTeamId, fixture.awayTeamId]);
    const suspensionState = this.suspensionStateBeforeFixture(state, scope, fixtureIndex);
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

  private scopeState(scope: CompetitionScope): ChampionshipState {
    if (scope !== 'cup') {
      return this.stateSignal();
    }

    const nextCup = this.resolveCupReferences(this.stateSignal(), this.stateSignal().fixturesByCompetition.cup);
    return {
      ...this.stateSignal(),
      fixturesByCompetition: {
        ...this.stateSignal().fixturesByCompetition,
        cup: nextCup
      }
    };
  }

  private fixturesForAppScope(scope: AppScope): Fixture[] {
    const state = this.stateSignal();
    if (scope === 'league') {
      return state.fixturesByCompetition.league;
    }
    if (scope === 'cup') {
      return this.resolveCupReferences(state, state.fixturesByCompetition.cup);
    }
    return [
      ...state.fixturesByCompetition.league,
      ...this.resolveCupReferences(state, state.fixturesByCompetition.cup)
    ];
  }

  private updateScopeFixtures(scope: CompetitionScope, updater: (fixtures: Fixture[]) => Fixture[]): void {
    this.patch((state) => {
      const fixtures = updater(state.fixturesByCompetition[scope]);
      const updated = scope === 'cup' ? this.resolveCupReferences(state, fixtures) : fixtures;
      return {
        ...state,
        fixturesByCompetition: {
          ...state.fixturesByCompetition,
          [scope]: updated
        }
      };
    });
  }

  private resolveCupReferences(state: ChampionshipState, fixtures: Fixture[]): Fixture[] {
    let nextFixtures = fixtures.map((fixture) => ({ ...fixture }));
    let changed = true;
    let guard = 0;

    while (changed && guard < nextFixtures.length + 2) {
      changed = false;
      guard += 1;

      nextFixtures = nextFixtures.map((fixture) => {
        const nextFixture = { ...fixture };
        let localChanged = false;

        if (nextFixture.homeSourceMatch) {
          const winner = this.resolveWinner(state, nextFixtures, nextFixture.homeSourceMatch.round, nextFixture.homeSourceMatch.matchNumber);
          if (winner && nextFixture.homeTeamId !== winner) {
            nextFixture.homeTeamId = winner;
            localChanged = true;
          }
        }

        if (nextFixture.awaySourceMatch) {
          const winner = this.resolveWinner(state, nextFixtures, nextFixture.awaySourceMatch.round, nextFixture.awaySourceMatch.matchNumber);
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

    return nextFixtures;
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
    scope: CompetitionScope,
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
    const fixtures = state.fixturesByCompetition[scope];

    const yellowThreshold = Math.max(1, Math.trunc(discipline.yellowCardsThreshold || 1));
    const redThreshold = Math.max(1, Math.trunc(discipline.redCardsThreshold || 1));
    const yellowSuspensionGames = Math.max(0, Math.trunc(discipline.yellowSuspensionGames || 0));
    const redSuspensionGames = Math.max(0, Math.trunc(discipline.redSuspensionGames || 0));

    for (let index = 0; index < targetFixtureIndex; index += 1) {
      const fixture = fixtures[index];
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

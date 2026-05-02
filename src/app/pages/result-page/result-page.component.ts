import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { ChampionshipStoreService } from '../../core/services/championship-store.service';
import { Fixture } from '../../core/models/fixture.model';
import { MatchModalComponent } from '../../components/match-modal/match-modal.component';
import { CompetitionScope } from '../../core/models/championship.model';

@Component({
  selector: 'app-result-page',
  imports: [TranslatePipe, RouterLink, MatchModalComponent],
  templateUrl: './result-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultPageComponent {
  protected readonly store = inject(ChampionshipStoreService);
  protected readonly selectedFixtureId = signal<string | null>(null);
  protected readonly scope = this.store.appScope;
  protected readonly teamsMap = computed(() => new Map(this.store.teams().map((team) => [team.id, team])));
  protected readonly fixtures = computed(() => this.store.fixturesForScope(this.scope()));
  protected readonly ranking = computed(() => this.store.rankingForScope(this.scope()));
  protected readonly scorers = computed(() => this.store.scorersForScope(this.scope()));
  protected readonly cards = computed(() => this.store.cardsForScope(this.scope()));
  protected readonly summary = computed(() => this.store.resultSummary(this.scope()));
  protected readonly isFinished = computed(() => this.store.isScopeFinished(this.scope()));

  protected readonly champion = computed(() => this.ranking()[0] ?? null);
  protected readonly leagueChampion = computed(() => this.store.rankingForScope('league')[0] ?? null);
  protected readonly cupChampion = computed(() => {
    const championId = this.store.cupChampionTeamId();
    if (!championId) {
      return null;
    }
    return this.store.rankingForScope('cup').find((row) => row.teamId === championId) ?? null;
  });
  protected readonly bestCampaignChampion = computed(() => this.store.rankingForScope('total')[0] ?? null);
  protected readonly resultChampion = computed(() => {
    if (this.scope() === 'cup') {
      return this.cupChampion();
    }
    return this.champion();
  });
  protected readonly bestScorers = computed(() => this.tiedBy(this.scorers().filter((row) => !row.isOwnGoalsRow), (row) => row.goals, 'max'));
  protected readonly teamsMostCards = computed(() => this.tiedBy(this.ranking(), (row) => row.totalCards, 'max'));
  protected readonly playersMostCards = computed(() => this.tiedBy(this.cards(), (row) => row.totalCards, 'max'));
  protected readonly teamsMostGoalsFor = computed(() => this.tiedBy(this.ranking(), (row) => row.goalsFor, 'max'));
  protected readonly teamsLeastGoalsFor = computed(() => this.tiedBy(this.ranking(), (row) => row.goalsFor, 'min'));
  protected readonly teamsMostGoalsAgainst = computed(() => this.tiedBy(this.ranking(), (row) => row.goalsAgainst, 'max'));
  protected readonly teamsLeastGoalsAgainst = computed(() => this.tiedBy(this.ranking(), (row) => row.goalsAgainst, 'min'));

  protected readonly biggestWins = computed(() => this.pickTiedBy((fixture) => this.goalDiff(fixture), 'max'));
  protected readonly mostGoalsMatches = computed(() => this.pickTiedBy((fixture) => fixture.goals.length, 'max'));
  protected readonly mostBoringMatches = computed(() => this.pickTiedBy((fixture) => fixture.goals.length + fixture.cards.length, 'min'));
  protected readonly mostExcitingMatches = computed(() => this.pickTiedBy((fixture) => fixture.goals.length + fixture.cards.length, 'max'));
  protected readonly selectedFixture = computed(() => {
    const fixtureId = this.selectedFixtureId();
    if (!fixtureId) {
      return null;
    }
    return this.fixtures().find((fixture) => fixture.id === fixtureId) ?? null;
  });
  protected readonly selectedFixtureScope = computed<CompetitionScope | null>(() => {
    const fixture = this.selectedFixture();
    if (!fixture) {
      return null;
    }
    const isCup = this.store.fixtures('cup').some((entry) => entry.id === fixture.id);
    return isCup ? 'cup' : 'league';
  });
  protected readonly selectedFixtureSuspendedIds = computed(() => {
    const fixture = this.selectedFixture();
    const scope = this.selectedFixtureScope();
    if (!fixture || !scope) {
      return new Set<string>();
    }
    return this.store.suspendedPlayersForFixture(scope, fixture.id);
  });
  protected readonly selectedFixtureSuspendedDetails = computed(() => {
    const fixture = this.selectedFixture();
    const scope = this.selectedFixtureScope();
    if (!fixture || !scope) {
      return {};
    }
    return this.store.playerSuspensionDetailsForFixture(scope, fixture.id);
  });

  protected teamLabel(teamId: string): string {
    const team = this.store.teams().find((entry) => entry.id === teamId);
    return team ? `${team.flag || '⚽'} ${team.displayName || team.name}` : teamId;
  }

  protected matchLabel(fixture: Fixture | null): string {
    if (!fixture) {
      return '-';
    }
    return `${this.teamLabel(fixture.homeTeamId)} x ${this.teamLabel(fixture.awayTeamId)}`;
  }

  protected score(fixture: Fixture, teamId: string): number {
    return fixture.goals.filter((goal) => goal.teamId === teamId).length;
  }

  protected yellowCards(fixture: Fixture, teamId: string): number {
    return fixture.cards.filter((card) => card.teamId === teamId && card.cardType === 'yellow').length;
  }

  protected redCards(fixture: Fixture, teamId: string): number {
    return fixture.cards.filter((card) => card.teamId === teamId && card.cardType === 'red').length;
  }

  protected cardStack(count: number): number[] {
    return Array.from({ length: Math.min(count, 6) });
  }

  protected openFixtureDetails(fixture: Fixture): void {
    this.selectedFixtureId.set(fixture.id);
  }

  protected closeFixtureDetails(): void {
    this.selectedFixtureId.set(null);
  }

  protected campaignLabel(): string {
    const champion = this.champion();
    if (!champion) {
      return '-';
    }

    return `${champion.gamesPlayed}J · ${champion.victories}V · ${champion.draws}E · ${champion.losses}D · ${champion.goalsFor} GP · ${champion.goalsAgainst} GC`;
  }

  protected campaignLabelFor(row: {
    gamesPlayed: number;
    victories: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  }): string {
    return `${row.gamesPlayed}J · ${row.victories}V · ${row.draws}E · ${row.losses}D · ${row.goalsFor} GP · ${row.goalsAgainst} GC`;
  }

  private goalDiff(fixture: Fixture): number {
    const home = fixture.goals.filter((goal) => goal.teamId === fixture.homeTeamId).length;
    const away = fixture.goals.filter((goal) => goal.teamId === fixture.awayTeamId).length;
    return Math.abs(home - away);
  }

  private pickTiedBy(metric: (fixture: Fixture) => number, mode: 'max' | 'min'): Fixture[] {
    const finished = this.fixtures().filter((fixture) => fixture.status === 'finished');
    if (finished.length === 0) {
      return [];
    }

    return this.tiedBy(finished, metric, mode);
  }

  private tiedBy<T>(items: T[], metric: (item: T) => number, mode: 'max' | 'min'): T[] {
    if (items.length === 0) {
      return [];
    }

    const values = items.map(metric);
    const target = mode === 'max' ? Math.max(...values) : Math.min(...values);
    return items.filter((item) => metric(item) === target);
  }
}

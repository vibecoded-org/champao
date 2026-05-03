import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, RefreshCw } from 'lucide-angular';
import { FixtureRoundComponent } from '../../components/fixture-round/fixture-round.component';
import { MatchModalComponent } from '../../components/match-modal/match-modal.component';
import { SuspendedPlayersModalComponent } from '../../components/suspended-players-modal/suspended-players-modal.component';
import { CardType, Fixture } from '../../core/models/fixture.model';
import { ChampionshipStoreService, SuspensionCause } from '../../core/services/championship-store.service';
import { I18nService } from '../../core/services/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { CompetitionScope } from '../../core/models/championship.model';

@Component({
  selector: 'app-fixtures-page',
  imports: [FixtureRoundComponent, MatchModalComponent, SuspendedPlayersModalComponent, TranslatePipe, RouterLink, LucideAngularModule],
  templateUrl: './fixtures-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FixturesPageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly selectedFixtureId = signal<string | null>(null);

  protected readonly selectedCompetitionScope = computed<CompetitionScope | null>(() => {
    const scope = this.store.competitionScope();
    if (scope) {
      return scope;
    }
    return null;
  });

  protected readonly selectedFixture = computed<Fixture | null>(() => {
    const fixtureId = this.selectedFixtureId();
    const scope = this.selectedCompetitionScope();
    if (!fixtureId || !scope) {
      return null;
    }
    return this.store.fixtures(scope).find((fixture) => fixture.id === fixtureId) ?? null;
  });
  protected readonly teamsMap = computed(() => new Map(this.store.teams().map((team) => [team.id, team])));
  protected readonly maxRound = computed(() => {
    const scope = this.selectedCompetitionScope();
    if (!scope) {
      return 0;
    }
    return Math.max(0, ...this.store.fixtures(scope).map((fixture) => fixture.round));
  });
  protected readonly suspensionsModalFixtureId = signal<string | null>(null);
  protected readonly suspendedPlayerIds = computed(() => {
    const fixture = this.selectedFixture();
    const scope = this.selectedCompetitionScope();
    if (!fixture || !scope) {
      return new Set<string>();
    }
    return this.store.suspendedPlayersForFixture(scope, fixture.id);
  });
  protected readonly suspendedCountByFixtureId = computed(() => {
    const scope = this.selectedCompetitionScope();
    const map: Record<string, number> = {};
    if (!scope) {
      return map;
    }
    for (const fixture of this.store.fixtures(scope)) {
      map[fixture.id] = this.store.suspendedPlayersForFixture(scope, fixture.id).size;
    }
    return map;
  });
  protected readonly suspendedPlayerIdsForModal = computed(() => {
    const fixtureId = this.suspensionsModalFixtureId();
    const scope = this.selectedCompetitionScope();
    if (!fixtureId || !scope) {
      return new Set<string>();
    }
    return this.store.suspendedPlayersForFixture(scope, fixtureId);
  });
  protected readonly suspendedDetailsForModal = computed<Record<string, SuspensionCause[]>>(() => {
    const fixtureId = this.suspensionsModalFixtureId();
    const scope = this.selectedCompetitionScope();
    if (!fixtureId || !scope) {
      return {};
    }
    return this.store.playerSuspensionDetailsForFixture(scope, fixtureId);
  });
  protected readonly fixturesByRoundWithLegs = computed(() => {
    const scope = this.selectedCompetitionScope();
    if (!scope) return [];
    const rounds = this.store.fixturesByRound(scope);
    const isCupHomeAway = scope === 'cup' && this.store.config().cup.homeAndAway;
    return rounds.map(([round, fixtures]) => {
      if (!isCupHomeAway) {
        return { round, firstLegs: fixtures, secondLegs: [] as Fixture[] };
      }
      const seen = new Set<number>();
      const firstLegs: Fixture[] = [];
      const secondLegs: Fixture[] = [];
      for (const fixture of fixtures) {
        if (!seen.has(fixture.matchNumber)) {
          seen.add(fixture.matchNumber);
          firstLegs.push(fixture);
        } else {
          secondLegs.push(fixture);
        }
      }
      return { round, firstLegs, secondLegs };
    });
  });

  protected readonly suspendedDetailsForSelectedFixture = computed<Record<string, SuspensionCause[]>>(() => {
    const fixture = this.selectedFixture();
    const scope = this.selectedCompetitionScope();
    if (!fixture || !scope) {
      return {};
    }
    return this.store.playerSuspensionDetailsForFixture(scope, fixture.id);
  });

  protected readonly refreshIcon = RefreshCw;
  private readonly toast = inject(ToastService);

  constructor(protected readonly store: ChampionshipStoreService) {}

  protected generateFixtures(): void {
    const scope = this.selectedCompetitionScope();
    if (!scope) return;
    const result = this.store.generateFixtures(scope, false);
    if (result.ok) {
      this.toast.show(this.i18n.translate('toast.fixturesGenerated'), 'success');
    } else {
      this.toast.show(this.i18n.translate('toast.fixturesGenerateFailed'), 'error');
    }
  }

  protected roundLabel(round: number): string {
    const scope = this.selectedCompetitionScope();
    if (scope !== 'cup') {
      return `Round ${round}`;
    }

    const maxRound = this.maxRound();
    const roundsFromEnd = maxRound - round;
    if (roundsFromEnd === 0) {
      return this.i18n.translate('common.final');
    }
    if (roundsFromEnd === 1) {
      return this.i18n.translate('common.semiFinals');
    }
    if (roundsFromEnd === 2) {
      return this.i18n.translate('common.quarterFinals');
    }
    return `Round ${round}`;
  }

  protected pickScope(scope: CompetitionScope): void {
    this.store.setAppScope(scope);
  }

  protected openFixture(fixture: Fixture): void {
    this.selectedFixtureId.set(fixture.id);
  }

  protected closeFixture(): void {
    this.selectedFixtureId.set(null);
  }

  protected openSuspensionsForFixture(fixture: Fixture): void {
    this.suspensionsModalFixtureId.set(fixture.id);
  }

  protected closeSuspensionsModal(): void {
    this.suspensionsModalFixtureId.set(null);
  }

  protected onAddGoal(payload: {
    fixtureId: string;
    teamId: string;
    playerId?: string;
    playerName?: string;
    isOwnGoal: boolean;
  }): void {
    const scope = this.selectedCompetitionScope();
    if (!scope) {
      return;
    }

    const fixture = this.store.fixtures(scope).find((item) => item.id === payload.fixtureId);
    if (!fixture) {
      return;
    }

    if (payload.isOwnGoal) {
      const oppositeTeamId = payload.teamId === fixture.homeTeamId ? fixture.awayTeamId : fixture.homeTeamId;
      this.store.addGoal(scope, payload.fixtureId, {
        teamId: payload.teamId,
        isOwnGoal: true,
        ownGoalByTeamId: oppositeTeamId,
        playerName: this.i18n.translate('common.ownGoal')
      });
      return;
    }

    const playerId = payload.playerId ?? (payload.playerName ? this.store.upsertPlayerForTeam(payload.teamId, payload.playerName) : undefined);
    if (playerId && this.store.suspendedPlayersForFixture(scope, payload.fixtureId).has(playerId)) {
      return;
    }
    this.store.addGoal(scope, payload.fixtureId, {
      teamId: payload.teamId,
      playerId,
      playerName: payload.playerName,
      isOwnGoal: false
    });
  }

  protected onAddCard(payload: { fixtureId: string; teamId: string; cardType: CardType; playerId?: string; playerName?: string }): void {
    const scope = this.selectedCompetitionScope();
    if (!scope) {
      return;
    }

    const playerId = payload.playerId ?? (payload.playerName ? this.store.upsertPlayerForTeam(payload.teamId, payload.playerName) : undefined);
    if (playerId && this.store.suspendedPlayersForFixture(scope, payload.fixtureId).has(playerId)) {
      return;
    }
    this.store.addCard(scope, payload.fixtureId, {
      teamId: payload.teamId,
      cardType: payload.cardType,
      playerId,
      playerName: payload.playerName
    });
  }

  protected onSetPenaltyWinner(payload: { fixtureId: string; teamId: string }): void {
    const scope = this.selectedCompetitionScope();
    if (!scope) {
      return;
    }
    this.store.setPenaltyWinner(scope, payload.fixtureId, payload.teamId);
  }
}

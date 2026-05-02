import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FixtureRoundComponent } from '../../components/fixture-round/fixture-round.component';
import { MatchModalComponent } from '../../components/match-modal/match-modal.component';
import { SuspendedPlayersModalComponent } from '../../components/suspended-players-modal/suspended-players-modal.component';
import { CardType, Fixture } from '../../core/models/fixture.model';
import { ChampionshipStoreService, SuspensionCause } from '../../core/services/championship-store.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/t.pipe';

@Component({
  selector: 'app-fixtures-page',
  imports: [FixtureRoundComponent, MatchModalComponent, SuspendedPlayersModalComponent, TranslatePipe],
  templateUrl: './fixtures-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FixturesPageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly selectedFixtureId = signal<string | null>(null);
  protected readonly selectedFixture = computed<Fixture | null>(() => {
    const fixtureId = this.selectedFixtureId();
    if (!fixtureId) {
      return null;
    }
    return this.store.fixtures().find((fixture) => fixture.id === fixtureId) ?? null;
  });
  protected readonly teamsMap = computed(() => new Map(this.store.teams().map((team) => [team.id, team])));
  protected readonly maxRound = computed(() => Math.max(0, ...this.store.fixtures().map((fixture) => fixture.round)));
  protected readonly suspensionsModalFixtureId = signal<string | null>(null);
  protected readonly suspendedPlayerIds = computed(() => {
    const fixture = this.selectedFixture();
    if (!fixture) {
      return new Set<string>();
    }
    return this.store.suspendedPlayersForFixture(fixture.id);
  });
  protected readonly suspendedCountByFixtureId = computed(() => {
    const map: Record<string, number> = {};
    for (const fixture of this.store.fixtures()) {
      map[fixture.id] = this.store.suspendedPlayersForFixture(fixture.id).size;
    }
    return map;
  });
  protected readonly suspendedPlayerIdsForModal = computed(() => {
    const fixtureId = this.suspensionsModalFixtureId();
    if (!fixtureId) {
      return new Set<string>();
    }
    return this.store.suspendedPlayersForFixture(fixtureId);
  });
  protected readonly suspendedDetailsForModal = computed<Record<string, SuspensionCause[]>>(() => {
    const fixtureId = this.suspensionsModalFixtureId();
    if (!fixtureId) {
      return {};
    }
    return this.store.playerSuspensionDetailsForFixture(fixtureId);
  });
  protected readonly suspendedDetailsForSelectedFixture = computed<Record<string, SuspensionCause[]>>(() => {
    const fixture = this.selectedFixture();
    if (!fixture) {
      return {};
    }
    return this.store.playerSuspensionDetailsForFixture(fixture.id);
  });

  constructor(protected readonly store: ChampionshipStoreService) {}

  protected roundLabel(round: number): string {
    if (this.store.config().format !== 'cup') {
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
    const fixture = this.store.fixtures().find((item) => item.id === payload.fixtureId);
    if (!fixture) {
      return;
    }

    if (payload.isOwnGoal) {
      const oppositeTeamId = payload.teamId === fixture.homeTeamId ? fixture.awayTeamId : fixture.homeTeamId;
      this.store.addGoal(payload.fixtureId, {
        teamId: payload.teamId,
        isOwnGoal: true,
        ownGoalByTeamId: oppositeTeamId,
        playerName: this.i18n.translate('common.ownGoal')
      });
      return;
    }

    const playerId = payload.playerId ?? (payload.playerName ? this.store.upsertPlayerForTeam(payload.teamId, payload.playerName) : undefined);
    if (playerId && this.store.suspendedPlayersForFixture(payload.fixtureId).has(playerId)) {
      return;
    }
    this.store.addGoal(payload.fixtureId, {
      teamId: payload.teamId,
      playerId,
      playerName: payload.playerName,
      isOwnGoal: false
    });
  }

  protected onAddCard(payload: { fixtureId: string; teamId: string; cardType: CardType; playerId?: string; playerName?: string }): void {
    const playerId = payload.playerId ?? (payload.playerName ? this.store.upsertPlayerForTeam(payload.teamId, payload.playerName) : undefined);
    if (playerId && this.store.suspendedPlayersForFixture(payload.fixtureId).has(playerId)) {
      return;
    }
    this.store.addCard(payload.fixtureId, {
      teamId: payload.teamId,
      cardType: payload.cardType,
      playerId,
      playerName: payload.playerName
    });
  }

  protected onSetPenaltyWinner(payload: { fixtureId: string; teamId: string }): void {
    this.store.setPenaltyWinner(payload.fixtureId, payload.teamId);
  }
}

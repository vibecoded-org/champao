import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { I18nService } from '../../core/services/i18n.service';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, OctagonAlert, Plus, Volleyball, X } from 'lucide-angular';
import { SuspendedPlayersModalComponent } from '../suspended-players-modal/suspended-players-modal.component';
import { CardType, Fixture } from '../../core/models/fixture.model';
import { CupConfig } from '../../core/models/championship.model';
import { Player } from '../../core/models/player.model';
import { Team } from '../../core/models/team.model';
import { SuspensionCause } from '../../core/services/championship-store.service';

@Component({
  selector: 'app-match-modal',
  imports: [FormsModule, LucideAngularModule, SuspendedPlayersModalComponent, TranslatePipe],
  templateUrl: './match-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchModalComponent {
  protected readonly i18n = inject(I18nService);
  readonly fixture = input<Fixture | null>(null);
  readonly allFixtures = input.required<Fixture[]>();
  readonly format = input.required<'league' | 'cup'>();
  readonly cupConfig = input.required<CupConfig>();
  readonly teamsMap = input.required<Map<string, Team>>();
  readonly players = input.required<Player[]>();
  readonly suspendedPlayerIds = input.required<Set<string>>();
  readonly suspendedDetails = input.required<Record<string, SuspensionCause[]>>();

  readonly close = output<void>();
  readonly statusChange = output<{ fixtureId: string; status: 'not-finished' | 'finished' }>();
  readonly addGoal = output<{ fixtureId: string; teamId: string; playerId?: string; playerName?: string; isOwnGoal: boolean }>();
  readonly removeGoal = output<{ fixtureId: string; goalId: string }>();
  readonly addCard = output<{ fixtureId: string; teamId: string; cardType: CardType; playerId?: string; playerName?: string }>();
  readonly removeCard = output<{ fixtureId: string; cardId: string }>();
  readonly setPenaltyWinner = output<{ fixtureId: string; teamId: string }>();

  protected readonly goalIcon = Volleyball;
  protected readonly yellowCardIcon = OctagonAlert;
  protected readonly redCardIcon = OctagonAlert;
  protected readonly addPlayerIcon = Plus;
  protected readonly ownGoalIcon = X;

  protected readonly pickerOpen = signal(false);
  protected readonly newPlayerOpen = signal(false);
  protected readonly suspendedInfoOpen = signal(false);
  protected readonly selectedTeamId = signal<string | null>(null);
  protected readonly selectedAction = signal<'goal' | CardType>('goal');
  protected readonly newPlayerName = signal('');
  protected readonly playerSearch = signal('');

  protected readonly teamPlayers = computed(() => {
    const teamId = this.selectedTeamId();
    if (!teamId) {
      return [];
    }
    return this.players().filter((player) => player.teamId === teamId);
  });

  protected readonly filteredTeamPlayers = computed(() => {
    const query = this.playerSearch().trim().toLocaleLowerCase();
    if (!query) {
      return this.teamPlayers();
    }
    return this.teamPlayers().filter((player) => player.name.toLocaleLowerCase().includes(query));
  });

  protected readonly tieFixtures = computed(() => {
    const fixture = this.fixture();
    if (!fixture) {
      return [];
    }
    return this.allFixtures().filter((item) => item.round === fixture.round && item.matchNumber === fixture.matchNumber);
  });

  protected readonly isLastLegOfTie = computed(() => {
    const fixture = this.fixture();
    const tie = this.tieFixtures();
    if (!fixture || tie.length < 2) {
      return false;
    }
    return tie[tie.length - 1].id === fixture.id;
  });

  protected readonly isAggregateTie = computed(() => {
    const tie = this.tieFixtures();
    if (tie.length < 2) {
      return false;
    }

    const [firstLeg] = tie;
    let firstTeamGoals = 0;
    let secondTeamGoals = 0;
    for (const fixture of tie) {
      if (fixture.homeTeamId === firstLeg.homeTeamId && fixture.awayTeamId === firstLeg.awayTeamId) {
        firstTeamGoals += fixture.goals.filter((goal) => goal.teamId === firstLeg.homeTeamId).length;
        secondTeamGoals += fixture.goals.filter((goal) => goal.teamId === firstLeg.awayTeamId).length;
      } else if (fixture.homeTeamId === firstLeg.awayTeamId && fixture.awayTeamId === firstLeg.homeTeamId) {
        firstTeamGoals += fixture.goals.filter((goal) => goal.teamId === firstLeg.homeTeamId).length;
        secondTeamGoals += fixture.goals.filter((goal) => goal.teamId === firstLeg.awayTeamId).length;
      }
    }

    return firstTeamGoals === secondTeamGoals;
  });

  protected readonly canSetPenaltyWinner = computed(() => {
    const fixture = this.fixture();
    if (!fixture) {
      return false;
    }
    if (this.format() !== 'cup' || !this.cupConfig().homeAndAway || this.cupConfig().drawTiebreaker !== 'penalties') {
      return false;
    }

    const tie = this.tieFixtures();
    return this.isLastLegOfTie() && tie.length > 1 && tie.every((item) => item.status === 'finished') && this.isAggregateTie();
  });

  protected readonly showPenaltyBadge = computed(() => {
    return this.format() === 'cup' && this.cupConfig().homeAndAway && this.cupConfig().drawTiebreaker === 'penalties' && this.isLastLegOfTie();
  });

  protected openPicker(teamId: string, action: 'goal' | CardType): void {
    this.selectedTeamId.set(teamId);
    this.selectedAction.set(action);
    this.pickerOpen.set(true);
  }

  protected closePicker(): void {
    this.pickerOpen.set(false);
    this.newPlayerOpen.set(false);
    this.newPlayerName.set('');
    this.playerSearch.set('');
  }

  protected chooseOwnGoal(): void {
    const fixture = this.fixture();
    const teamId = this.selectedTeamId();
    if (!fixture || !teamId) {
      return;
    }

    this.addGoal.emit({
      fixtureId: fixture.id,
      teamId,
      isOwnGoal: true
    });
    this.closePicker();
  }

  protected choosePlayer(player: Player): void {
    const fixture = this.fixture();
    const teamId = this.selectedTeamId();
    if (!fixture || !teamId || this.isPlayerSuspended(player.id)) {
      return;
    }

    if (this.selectedAction() === 'goal') {
      this.addGoal.emit({ fixtureId: fixture.id, teamId, playerId: player.id, isOwnGoal: false });
    } else {
      const action = this.selectedAction() as CardType;
      this.addCard.emit({ fixtureId: fixture.id, teamId, cardType: action, playerId: player.id });
    }

    this.closePicker();
  }

  protected saveNewPlayer(): void {
    const fixture = this.fixture();
    const teamId = this.selectedTeamId();
    const playerName = this.newPlayerName().trim();
    if (!fixture || !teamId || !playerName) {
      return;
    }

    if (this.selectedAction() === 'goal') {
      this.addGoal.emit({ fixtureId: fixture.id, teamId, playerName, isOwnGoal: false });
    } else {
      const action = this.selectedAction() as CardType;
      this.addCard.emit({ fixtureId: fixture.id, teamId, cardType: action, playerName });
    }

    this.closePicker();
  }

  protected teamLabel(teamId: string): string {
    const team = this.teamsMap().get(teamId);
    return team ? `${team.flag || '⚽'} ${team.displayName || team.name}` : teamId;
  }

  protected playerLabel(playerId?: string, fallback?: string): string {
    if (!playerId) {
      return fallback || this.i18n.translate('common.unknownPlayer');
    }

    const player = this.players().find((entry) => entry.id === playerId);
    return player?.name || fallback || this.i18n.translate('common.unknownPlayer');
  }

  protected cardTypeLabel(type: CardType): string {
    return type === 'yellow' ? this.i18n.translate('match.yellowCard') : this.i18n.translate('match.redCard');
  }

  protected finishAndClose(): void {
    const fixture = this.fixture();
    if (!fixture || fixture.status === 'finished') {
      return;
    }

    this.statusChange.emit({ fixtureId: fixture.id, status: 'finished' });
    this.close.emit();
  }

  protected applyPenaltyWinner(teamId: string): void {
    const fixture = this.fixture();
    if (!fixture) {
      return;
    }
    this.setPenaltyWinner.emit({ fixtureId: fixture.id, teamId });
  }

  protected isPlayerSuspended(playerId: string): boolean {
    return this.suspendedPlayerIds().has(playerId);
  }

  protected openSuspendedInfo(): void {
    this.suspendedInfoOpen.set(true);
  }

  protected closeSuspendedInfo(): void {
    this.suspendedInfoOpen.set(false);
  }

}

import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { I18nService } from '../../core/services/i18n.service';
import { Fixture } from '../../core/models/fixture.model';
import { Player } from '../../core/models/player.model';
import { Team } from '../../core/models/team.model';
import { SuspensionCause } from '../../core/services/championship-store.service';

@Component({
  selector: 'app-suspended-players-modal',
  imports: [TranslatePipe],
  templateUrl: './suspended-players-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuspendedPlayersModalComponent {
  private readonly i18n = inject(I18nService);
  readonly open = input.required<boolean>();
  readonly players = input.required<Player[]>();
  readonly suspendedPlayerIds = input.required<Set<string>>();
  readonly suspendedDetails = input.required<Record<string, SuspensionCause[]>>();
  readonly allFixtures = input.required<Fixture[]>();
  readonly teamsMap = input.required<Map<string, Team>>();

  readonly close = output<void>();

  protected readonly suspendedPlayers = computed(() => {
    const suspended = this.suspendedPlayerIds();
    return this.players().filter((player) => suspended.has(player.id));
  });

  protected readonly suspendedPlayersByTeam = computed(() => {
    const groups = new Map<string, Player[]>();
    for (const player of this.suspendedPlayers()) {
      const current = groups.get(player.teamId) ?? [];
      current.push(player);
      groups.set(player.teamId, current);
    }

    return [...groups.entries()].map(([teamId, players]) => {
      const team = this.teamsMap().get(teamId);
      return {
        teamId,
        teamName: team ? team.displayName || team.name : teamId,
        teamFlag: team?.flag || '⚽',
        players
      };
    });
  });

  protected suspensionCausesForPlayer(playerId: string): SuspensionCause[] {
    return this.suspendedDetails()[playerId] || [];
  }

  protected suspensionCauseLabel(playerId: string, cause: SuspensionCause): string {
    const cardName = cause.cardType === 'yellow' ? this.i18n.translate('suspended.yellowCards') : this.i18n.translate('suspended.redCards');
    const fixture = this.allFixtures().find((item) => item.id === cause.triggerFixtureId);
    const matchLabel = fixture
      ? `${this.teamLabel(fixture.homeTeamId)} x ${this.teamLabel(fixture.awayTeamId)}`
      : `${this.i18n.translate('common.round')} ${cause.triggerRound}, ${this.i18n.translate('common.match')} ${cause.triggerMatchNumber}`;

    const relatedMatches = this.relatedSuspensionMatches(playerId, cause);
    const relatedInfo = relatedMatches.length > 0 ? ` | ${this.i18n.translate('suspended.related')}: ${relatedMatches.join(' · ')}` : '';
    const suffix = cause.suspensionGames === 1 ? '' : 's';
    return this.i18n.translate('suspended.threshold', { cards: cardName, threshold: cause.threshold, match: matchLabel, games: cause.suspensionGames, suffix }) + relatedInfo;
  }

  private teamLabel(teamId: string): string {
    const team = this.teamsMap().get(teamId);
    return team ? team.displayName || team.name : teamId;
  }

  private relatedSuspensionMatches(playerId: string, cause: SuspensionCause): string[] {
    if (cause.suspensionGames <= 1) {
      return [];
    }

    const player = this.players().find((item) => item.id === playerId);
    if (!player) {
      return [];
    }

    const fixtures = this.allFixtures();
    const triggerIndex = fixtures.findIndex((item) => item.id === cause.triggerFixtureId);
    if (triggerIndex < 0) {
      return [];
    }

    const related: string[] = [];
    for (let index = triggerIndex + 1; index < fixtures.length; index += 1) {
      const fixture = fixtures[index];
      if (fixture.homeTeamId !== player.teamId && fixture.awayTeamId !== player.teamId) {
        continue;
      }
      related.push(`${this.teamLabel(fixture.homeTeamId)} x ${this.teamLabel(fixture.awayTeamId)}`);
      if (related.length >= cause.suspensionGames) {
        break;
      }
    }

    return related;
  }
}

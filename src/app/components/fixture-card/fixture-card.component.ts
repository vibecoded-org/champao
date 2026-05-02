import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { I18nService } from '../../core/services/i18n.service';
import { Fixture } from '../../core/models/fixture.model';
import { Team } from '../../core/models/team.model';

@Component({
  selector: 'app-fixture-card',
  imports: [TranslatePipe],
  templateUrl: './fixture-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FixtureCardComponent {
  protected readonly i18n = inject(I18nService);
  readonly fixture = input.required<Fixture>();
  readonly teamsMap = input.required<Map<string, Team>>();
  readonly suspendedCount = input<number>(0);
  readonly open = output<Fixture>();
  readonly openSuspensions = output<Fixture>();

  protected score(teamId: string): number {
    return this.fixture().goals.filter((goal) => goal.teamId === teamId).length;
  }

  protected yellowCards(teamId: string): number {
    return this.fixture().cards.filter((card) => card.teamId === teamId && card.cardType === 'yellow').length;
  }

  protected redCards(teamId: string): number {
    return this.fixture().cards.filter((card) => card.teamId === teamId && card.cardType === 'red').length;
  }

  protected cardStack(count: number): number[] {
    return Array.from({ length: count }, (_, index) => index);
  }

  protected teamLabel(teamId: string): string {
    const team = this.teamsMap().get(teamId);
    if (!team) {
      return teamId.startsWith('WINNER_') ? teamId.replaceAll('_', ' ') : this.i18n.translate('common.bye');
    }
    return `${team.flag || '⚽'} ${team.displayName || team.name}`;
  }
}

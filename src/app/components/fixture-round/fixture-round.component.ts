import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Fixture } from '../../core/models/fixture.model';
import { Team } from '../../core/models/team.model';
import { FixtureCardComponent } from '../fixture-card/fixture-card.component';
import { TranslatePipe } from '../../core/pipes/t.pipe';

@Component({
  selector: 'app-fixture-round',
  imports: [FixtureCardComponent, TranslatePipe],
  templateUrl: './fixture-round.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FixtureRoundComponent {
  readonly round = input.required<number>();
  readonly label = input<string | null>(null);
  readonly fixtures = input.required<Fixture[]>();
  readonly teamsMap = input.required<Map<string, Team>>();
  readonly suspendedCountByFixtureId = input.required<Record<string, number>>();
  readonly openFixture = output<Fixture>();
  readonly openSuspensions = output<Fixture>();
}

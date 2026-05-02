import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { Team } from '../../core/models/team.model';

@Component({
  selector: 'app-team-list',
  imports: [TranslatePipe],
  templateUrl: './team-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamListComponent {
  readonly teams = input.required<Team[]>();
  readonly edit = output<Team>();
  readonly remove = output<string>();
}

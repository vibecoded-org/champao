import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { Scorer } from '../../core/models/scorer.model';

@Component({
  selector: 'app-goal-form',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './goal-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoalFormComponent {
  readonly title = input.required<string>();
  readonly scorers = input.required<Scorer[]>();
  readonly showOwnGoal = input<boolean>(false);
  readonly add = output<{ scorerId?: string; scorerName?: string; isOwnGoal: boolean }>();

  protected readonly selectedScorerId = signal('');
  protected readonly scorerName = signal('');
  protected readonly ownGoal = signal(false);

  protected submit(): void {
    const isOwnGoal = this.showOwnGoal() && this.ownGoal();
    const scorerId = this.selectedScorerId() || undefined;
    const scorerName = this.scorerName().trim() || undefined;

    if (!isOwnGoal && !scorerId && !scorerName) {
      return;
    }

    this.add.emit({ scorerId, scorerName, isOwnGoal });
    this.selectedScorerId.set('');
    this.scorerName.set('');
    this.ownGoal.set(false);
  }
}

import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { Team } from '../../core/models/team.model';

@Component({
  selector: 'app-team-form',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './team-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamFormComponent {
  readonly editing = input<Team | null>(null);
  readonly save = output<Omit<Team, 'id'>>();

  protected readonly name = signal('');
  protected readonly displayName = signal('');
  protected readonly flag = signal('');
  protected readonly color = signal('#1d4ed8');

  protected submit(): void {
    const name = this.name().trim();
    if (!name) {
      return;
    }

    this.save.emit({
      name,
      displayName: this.displayName().trim() || undefined,
      flag: this.flag().trim() || undefined,
      color: this.color().trim() || undefined
    });

    this.name.set('');
    this.displayName.set('');
    this.flag.set('');
    this.color.set('#1d4ed8');
  }
}

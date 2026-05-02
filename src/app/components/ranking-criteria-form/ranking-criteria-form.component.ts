import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { RankingCriterion, RankingField } from '../../core/models/ranking.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ranking-criteria-form',
  imports: [DragDropModule, FormsModule, TranslatePipe],
  templateUrl: './ranking-criteria-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RankingCriteriaFormComponent {
  readonly criteria = input.required<RankingCriterion[]>();
  readonly criteriaChange = output<RankingCriterion[]>();

  protected readonly labels: Record<RankingCriterion['field'], string> = {
    points: 'criteria.points',
    victories: 'criteria.victories',
    goalDifference: 'criteria.goalDifference',
    goalsFor: 'criteria.goalsFor',
    goalsAgainst: 'criteria.goalsAgainst',
    gamesPlayed: 'criteria.gamesPlayed',
    teamName: 'criteria.teamName'
  };
  protected readonly availableFields: RankingField[] = [
    'points',
    'victories',
    'goalDifference',
    'goalsFor',
    'goalsAgainst',
    'gamesPlayed',
    'teamName'
  ];

  protected drop(event: CdkDragDrop<RankingCriterion[]>): void {
    const next = [...this.criteria()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.criteriaChange.emit(next);
  }

  protected toggleDirection(index: number): void {
    const next = [...this.criteria()];
    const item = next[index];
    next[index] = { ...item, direction: item.direction === 'asc' ? 'desc' : 'asc' };
    this.criteriaChange.emit(next);
  }

  protected addCriterion(field: string): void {
    const normalized = field as RankingField;
    if (!this.availableFields.includes(normalized)) {
      return;
    }
    if (this.criteria().some((criterion) => criterion.field === normalized)) {
      return;
    }
    this.criteriaChange.emit([...this.criteria(), { field: normalized, direction: normalized === 'goalsAgainst' || normalized === 'teamName' ? 'asc' : 'desc' }]);
  }

  protected removeCriterion(index: number): void {
    if (this.criteria().length <= 1) {
      return;
    }
    const next = [...this.criteria()];
    next.splice(index, 1);
    this.criteriaChange.emit(next);
  }

  protected isAvailable(field: RankingField): boolean {
    return !this.criteria().some((criterion) => criterion.field === field);
  }
}

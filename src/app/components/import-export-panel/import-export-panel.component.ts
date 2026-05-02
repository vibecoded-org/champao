import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { TranslatePipe } from '../../core/pipes/t.pipe';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-import-export-panel',
  imports: [TranslatePipe],
  templateUrl: './import-export-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportExportPanelComponent {
  protected readonly i18n = inject(I18nService);
  readonly exportJson = output<void>();
  readonly importFile = output<File>();
  readonly reset = output<void>();

  protected readonly selectedFileName = signal<string | null>(null);
  private selectedFile: File | null = null;

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;
    this.selectedFileName.set(file?.name ?? null);
  }

  protected submitImport(): void {
    if (!this.selectedFile) {
      return;
    }
    this.importFile.emit(this.selectedFile);
  }
}

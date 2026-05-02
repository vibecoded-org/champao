import { Injectable, signal } from '@angular/core';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  type: ToastType;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  show(text: string, type: ToastType = 'info', durationMs = 3200): void {
    const toast: ToastMessage = {
      id: `toast-${crypto.randomUUID()}`,
      type,
      text
    };

    this.toasts.update((items) => [...items, toast]);

    if (durationMs > 0) {
      setTimeout(() => {
        this.dismiss(toast.id);
      }, durationMs);
    }
  }

  dismiss(id: string): void {
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }
}

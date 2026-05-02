import { Injectable } from '@angular/core';
import { ChampionshipState } from '../models/championship.model';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly key = 'champao.state.v2';

  load(): ChampionshipState | null {
    try {
      const value = localStorage.getItem(this.key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as ChampionshipState;
    } catch {
      return null;
    }
  }

  save(state: ChampionshipState): void {
    localStorage.setItem(this.key, JSON.stringify(state));
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }
}

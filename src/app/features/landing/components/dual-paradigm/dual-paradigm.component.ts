import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export type ParadigmTab = 'all' | 'public' | 'private';

@Component({
  selector: 'app-dual-paradigm',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dual-paradigm.component.html',
  styleUrl: './dual-paradigm.component.scss',
})
export class DualParadigmComponent {
  readonly activeTab = signal<ParadigmTab>('all');

  setActiveTab(tab: ParadigmTab): void {
    this.activeTab.set(tab);
  }
}

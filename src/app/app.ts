import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MainComponent } from './components/main-component/main-component';
import { VencimentoComponent } from './components/vencimento-component/vencimento-component';
import { MetricsComponent } from './components/metrics-component/metrics-component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, MainComponent, VencimentoComponent, MetricsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('systemPetShopFront');
  protected activeTab: 'cadastro' | 'vencimento' | 'metricas' = 'cadastro';

  selectTab(tab: 'cadastro' | 'vencimento' | 'metricas'): void {
    this.activeTab = tab;
  }
}

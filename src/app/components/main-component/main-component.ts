import { Component } from '@angular/core';
import { DistributorComponent } from '../distributor-component/distributor-component';
import { BrandComponent } from '../brand-component/brand-component';
import { ProductComponent } from '../product-component/product-component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-component',
  imports: [CommonModule, DistributorComponent, BrandComponent, ProductComponent],
  templateUrl: './main-component.html',
  styleUrl: './main-component.css',
})
export class MainComponent {
  selectedDistributorId: string | null = null;
  selectedBrandId: string | null = null;

  openBrands(distributorId: string): void {
    const normalizedId = distributorId.trim();

    if (normalizedId) {
      this.selectedDistributorId = normalizedId;
      this.selectedBrandId = null;
    }
  }

  openProducts(brandId: string): void {
    const normalizedId = brandId.trim();

    if (normalizedId) {
      this.selectedBrandId = normalizedId;
    }
  }

  showBrands(): void {
    this.selectedBrandId = null;
  }

  showDistributors(): void {
    this.selectedBrandId = null;
    this.selectedDistributorId = null;
  }
}

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ComponentCommunicationService {
  private distributorName = '';
  private brandName = '';

  setDistributorName(name: string): void {
    this.distributorName = name.trim();
  }

  getDistributorName(): string {
    return this.distributorName;
  }

  setBrandName(name: string): void {
    this.brandName = name.trim();
  }

  getBrandName(): string {
    return this.brandName;
  }

  clearBrandName(): void {
    this.brandName = '';
  }
}

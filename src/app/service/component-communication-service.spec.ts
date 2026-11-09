import { TestBed } from '@angular/core/testing';

import { ComponentCommunicationService } from './component-communication-service';

describe('ComponentCommunicationService', () => {
  let service: ComponentCommunicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ComponentCommunicationService);
  });

  it('should store the selected distributor and brand names', () => {
    service.setDistributorName('  Distribuidora A  ');
    service.setBrandName('  Marca B  ');

    expect(service.getDistributorName()).toBe('Distribuidora A');
    expect(service.getBrandName()).toBe('Marca B');
  });

  it('should clear the selected brand when requested', () => {
    service.setBrandName('Marca antiga');

    service.clearBrandName();

    expect(service.getBrandName()).toBe('');
  });
});

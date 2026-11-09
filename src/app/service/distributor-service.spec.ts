import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DistributorService } from './distributor-service';

describe('DistributorService', () => {
  let service: DistributorService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DistributorService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('searches distributors by name with the requested page', () => {
    service.searchDistributorMetrics('Distribuição & Cia', 2).subscribe();
    const request = httpTesting.expectOne((req) =>
      req.url === 'http://localhost:8080/distributor/metrics/search');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('name')).toBe('Distribuição & Cia');
    expect(request.request.params.get('page')).toBe('2');
    request.flush([]);
  });

  it('searches registration distributors by name and page', () => {
    service.searchDistributors('Distribuição & Cia', 2).subscribe();
    const request = httpTesting.expectOne((req) =>
      req.url === 'http://localhost:8080/distributor/search');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('name')).toBe('Distribuição & Cia');
    expect(request.request.params.get('page')).toBe('2');
    request.flush([]);
  });

  it('starts distributor searches on the first page by default', () => {
    service.searchDistributorMetrics('Distribuidora').subscribe();
    const request = httpTesting.expectOne(
      'http://localhost:8080/distributor/metrics/search?name=Distribuidora&page=0');
    request.flush([]);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

});

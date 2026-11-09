import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { BrandService } from './brand-service';
import { BrandDto, BrandEditDto, BrandFindAllByDistributorDto } from '../interfaces/brand';

describe('BrandService', () => {
  let service: BrandService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BrandService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('searches brands by name with the requested page', () => {
    service.searchBrandMetrics('Ração & Cia', 2).subscribe();
    const request = httpTesting.expectOne((req) =>
      req.url === 'http://localhost:8080/brand/metrics/search');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('name')).toBe('Ração & Cia');
    expect(request.request.params.get('page')).toBe('2');
    request.flush([]);
  });

  it('searches registration brands by name and page', () => {
    service.searchBrands('Ração & Cia', 2).subscribe();
    const request = httpTesting.expectOne((req) =>
      req.url === 'http://localhost:8080/brand/search');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('name')).toBe('Ração & Cia');
    expect(request.request.params.get('page')).toBe('2');
    request.flush([]);
  });

  it('starts brand searches on the first page by default', () => {
    service.searchBrandMetrics('Marca').subscribe();
    const request = httpTesting.expectOne('http://localhost:8080/brand/metrics/search?name=Marca&page=0');
    request.flush([]);
  });

  it('should save a brand', () => {
    const brand: BrandDto = {
      idDistributor: 'distributor-id',
      nameBrand: 'Brand name',
      typeBrand: 'Food',
    };

    service.saveBrand(brand).subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/brand/save');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(brand);
    request.flush({ ...brand, idBrand: 'brand-id' });
  });

  it('requests the first page by default when given a distributor DTO', () => {
    const filter: BrandFindAllByDistributorDto = { idDistributor: 'distributor-id' };

    service.getAllBrand(filter).subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/brand/all?idDistributor=distributor-id&page=0');
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    request.flush([]);
  });

  it('requests the selected metrics page for a distributor', () => {
    service.getAllBrandMetrics('distributor-id', 2).subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/brand/metrics?idDistributor=distributor-id&page=2');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('requests all metric brands for the chart', () => {
    service.getAllBrandMetricsTotal('distributor-id').subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/brand/metricsTotal?idDistributor=distributor-id');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('should edit a brand', () => {
    const brand: BrandEditDto = {
      idBrand: 'brand-id',
      idDistributor: 'distributor-id',
      nameBrand: 'Updated brand',
      typeBrand: 'Hygiene',
    };
    let response = '';

    service.editBrand(brand).subscribe((value) => (response = value));

    const request = httpTesting.expectOne('http://localhost:8080/brand/edit');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(brand);
    expect(request.request.responseType).toBe('text');
    request.flush('Atualizado com sucesso!');
    expect(response).toBe('Atualizado com sucesso!');
  });

  it('should delete a brand by id', () => {
    service.deleteBrand('brand-id').subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/brand/delete?id=brand-id');
    expect(request.request.method).toBe('DELETE');
    request.flush('Marca deletada com sucesso.');
  });

  it('should reject deleting a brand without an id', () => {
    let receivedError: Error | undefined;

    service.deleteBrand('  ').subscribe({
      error: (error: Error) => {
        receivedError = error;
      },
    });

    expect(receivedError?.message).toBe('O ID da marca é obrigatório.');
  });
});

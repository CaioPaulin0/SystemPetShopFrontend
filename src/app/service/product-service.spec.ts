import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import {
  Product,
  ProductDto,
  ProductEditDto,
  ProductIdFindAllDto,
} from '../interfaces/product';
import { ProductService } from './product-service';
import { BrandService } from './brand-service';
import { DistributorService } from './distributor-service';

describe('ProductService', () => {
  let service: ProductService;
  let httpTesting: HttpTestingController;

  const product: Product = {
    idProduct: 'product-id',
    idBrand: 'brand-id',
    idDistributor: 'distributor-id',
    nameProduct: 'Product name',
    typeProduct: 'Food',
    descriptionProduct: 'Product description',
    dataCreatedProduct: '2026-08-28',
    dataDueProduct: '2027-08-28',
    versionProduct: 1,
    lotProduct: '0010-A',
    priceBuy: 12.5,
    priceSell: 20,
    stockProduct: 25,
    dataDueProductVerify: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save a product', () => {
    const productDto: ProductDto = {
      idBrand: product.idBrand,
      idDistributor: product.idDistributor,
      nameProduct: product.nameProduct,
      typeProduct: product.typeProduct,
      descriptionProduct: product.descriptionProduct,
      dataCreatedProduct: product.dataCreatedProduct,
      dataDueProduct: product.dataDueProduct,
      versionProduct: product.versionProduct,
      lotProduct: product.lotProduct,
      priceBuy: product.priceBuy,
      priceSell: product.priceSell,
      stockProduct: product.stockProduct,
      dataDueProductVerify: product.dataDueProductVerify,
    };

    service.saveProduct(productDto).subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/product/save');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(productDto);
    request.flush(product);
  });

  it('should register a product version with its updated values', () => {
    const productWithNewValues: Product = {
      ...product,
      priceBuy: 14.5,
      priceSell: 23,
    };

    service.newVersion(productWithNewValues).subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/product/newVersion');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(productWithNewValues);
    request.flush(productWithNewValues);
  });

  it('should find all products by brand', () => {
    const filter: ProductIdFindAllDto = { idBrand: 'brand-id' };

    service.getAllProduct(filter).subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/product/all?idBrand=brand-id&page=0');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('idBrand')).toBe(filter.idBrand);
    request.flush([]);
  });

  it('should request distributor metrics with the distributor id', () => {
    let values: number[] | undefined;
    TestBed.inject(DistributorService).metricDistributor('distributor-id')
      .subscribe((response) => (values = response));

    const request = httpTesting.expectOne(
      'http://localhost:8080/distributor/metricDistributor?idDistributor=distributor-id',
    );
    expect(request.request.method).toBe('GET');
    request.flush([250, 100]);
    expect(values).toEqual([250, 100]);
  });

  it('should find product metrics by brand', () => {
    service.metricsProduct('brand-id').subscribe();

    const request = httpTesting.expectOne(
      'http://localhost:8080/product/metricProduct?idBrand=brand-id&page=0',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('idBrand')).toBe('brand-id');
    request.flush([]);
  });

  it('should request a specific product metrics page', () => {
    service.metricsProduct('brand-id', 2).subscribe();
    const request = httpTesting.expectOne(
      'http://localhost:8080/product/metricProduct?idBrand=brand-id&page=2',
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('should search product metrics by name and page', () => {
    service.searchProductMetrics('Ração & gatos', 2).subscribe();

    const request = httpTesting.expectOne((req) =>
      req.url === 'http://localhost:8080/product/metrics/search');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('name')).toBe('Ração & gatos');
    expect(request.request.params.get('page')).toBe('2');
    request.flush([]);
  });

  it('should search products by name and page', () => {
    service.searchProducts('Ração & gatos', 2).subscribe();

    const request = httpTesting.expectOne((req) =>
      req.url === 'http://localhost:8080/product/search');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('name')).toBe('Ração & gatos');
    expect(request.request.params.get('page')).toBe('2');
    request.flush([]);
  });

  it('should request brand metrics with the brand id', () => {
    let values: number[] | undefined;
    TestBed.inject(BrandService).metricBrand('brand-id').subscribe((response) => (values = response));

    const request = httpTesting.expectOne(
      'http://localhost:8080/brand/metricBrand?idBrand=brand-id',
    );
    expect(request.request.method).toBe('GET');
    request.flush([150, 60]);
    expect(values).toEqual([150, 60]);
  });

  it('should find all products that need due-date attention', () => {
    service.getAllDueProduct().subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/product/allDueProduct');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('should verify a product due date', () => {
    let response = '';

    service.verifyProductDue('product-id').subscribe((value) => (response = value));

    const request = httpTesting.expectOne(
      'http://localhost:8080/product/productDueVerify?idProduct=product-id',
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.params.get('idProduct')).toBe('product-id');
    expect(request.request.responseType).toBe('text');
    request.flush('não precisa verificar');
    expect(response).toBe('não precisa verificar');
  });

  it('should edit a product', () => {
    const productEditDto: ProductEditDto = product;
    let response = '';

    service.editProduct(productEditDto).subscribe((value) => (response = value));

    const request = httpTesting.expectOne('http://localhost:8080/product/edit');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(productEditDto);
    expect(request.request.responseType).toBe('text');
    request.flush('atualizado com sucesso!');
    expect(response).toBe('atualizado com sucesso!');
  });

  it('should delete a product by id', () => {
    service.deleteProduct('product-id').subscribe();

    const request = httpTesting.expectOne(
      'http://localhost:8080/product/delete?idProduct=product-id',
    );
    expect(request.request.method).toBe('DELETE');
    request.flush('Produto deletado com sucesso.');
  });

  it('should reject deleting a product without an id', () => {
    let receivedError: Error | undefined;

    service.deleteProduct('  ').subscribe({
      error: (error: Error) => {
        receivedError = error;
      },
    });

    expect(receivedError?.message).toBe('O ID do produto é obrigatório.');
  });
});

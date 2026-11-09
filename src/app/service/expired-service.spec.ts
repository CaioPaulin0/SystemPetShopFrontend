import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ExpiredService } from './expired-service';

describe('ExpiredService', () => {
  let service: ExpiredService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExpiredService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('loads the expiration list from the expired endpoint', () => {
    let received: unknown;
    service.findAll().subscribe((response) => received = response);
    const request = httpTesting.expectOne('http://localhost:8080/expired/findAll?page=0');
    expect(request.request.method).toBe('GET');
    request.flush([]);
    expect(received).toEqual([]);
  });

  it('sends the requested page as a query parameter', () => {
    service.findAll(2).subscribe();
    const request = httpTesting.expectOne('http://localhost:8080/expired/findAll?page=2');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('searches expiration products by name and page', () => {
    service.search('Pet', 2).subscribe();
    const request = httpTesting.expectOne('http://localhost:8080/expired/search?name=Pet&page=2');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it.each([true, false])('filters by expiration status %s and page', (status) => {
    let received: unknown;
    service.filter(status, 2).subscribe((response) => received = response);
    const request = httpTesting.expectOne(
      `http://localhost:8080/expired/filter?dataDueProductVerify=${status}&page=2`,
    );
    expect(request.request.method).toBe('GET');
    const products = [{ idProduct: 'p1', nameProduct: 'Produto', dataDueProductVerify: status }];
    request.flush(products);
    expect(received).toEqual(products);
  });

  it('verifies a product with PUT, the UUID query parameter and a text response', () => {
    const id = '1d548218-6bc8-4c99-b1b9-5ad821b84a46';
    const message = 'Produto estar perto do prazo de vencimento, prazo para vencer o produto em 1 dia';
    let received = '';
    service.productExpiredVerify(id).subscribe((response) => received = response);
    const request = httpTesting.expectOne(`http://localhost:8080/expired/productExpiredVerify?idProduct=${id}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBeNull();
    expect(request.request.responseType).toBe('text');
    request.flush(message);
    expect(received).toBe(message);
  });

  it('rejects verification without a product ID before making a request', () => {
    let received: Error | undefined;
    service.productExpiredVerify('  ').subscribe({ error: (error) => received = error });
    expect(received?.message).toBe('O ID do produto é obrigatório.');
    httpTesting.expectNone((request) => request.url.includes('productExpiredVerify'));
  });
});

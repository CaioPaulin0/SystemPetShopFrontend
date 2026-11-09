import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ExpiredResponse } from '../../interfaces/expired-response';
import { ExpiredService } from '../../service/expired-service';
import { BrandService } from '../../service/brand-service';
import { DistributorService } from '../../service/distributor-service';
import { Brand } from '../../interfaces/brand';
import { VencimentoComponent } from './vencimento-component';

describe('VencimentoComponent', () => {
  let fixture: ComponentFixture<VencimentoComponent>;
  let dueProducts: ExpiredResponse[];
  const expiredService = {
    findAll: vi.fn(),
    search: vi.fn(),
    filter: vi.fn(),
    productExpiredVerify: vi.fn(),
  };
  const distributorService = { getAllDistributor: vi.fn() };
  const brandService = { getAllBrand: vi.fn(), pageSize: 6 };

  beforeEach(async () => {
    vi.resetAllMocks();
    dueProducts = [
      {
        idProduct: 'p0',
        idBrand: 'd1-b1',
        idDistributor: 'd1',
        nameBrand: 'Marca A',
        nameDistributor: 'Distribuidora A',
        lotProduct: '123',
        dataCreated: '2026-02-03T10:30:00',
        dataCreatedProduct: '2026-01-01',
        dataDueProduct: '2026-12-31',
        nameProduct: 'Produto sem alerta',
        stockProduct: 0,
        dataDueProductVerify: false,
      },
      {
        idProduct: 'p1',
        idBrand: 'd1-b2',
        idDistributor: 'd1',
        nameBrand: 'Marca B',
        nameDistributor: 'Distribuidora A',
        lotProduct: '456',
        dataCreated: '2025-02-03T10:30:00',
        dataCreatedProduct: '2025-01-01',
        dataDueProduct: '2026-08-01',
        nameProduct: 'Produto vencido',
        stockProduct: 12,
        dataDueProductVerify: true,
      },
    ];
    expiredService.findAll.mockImplementation(() => of(dueProducts));
    expiredService.search.mockImplementation(() => of([dueProducts[1]]));
    expiredService.filter.mockImplementation((expired: boolean) => of(
      dueProducts.filter((product) => product.dataDueProductVerify === expired),
    ));
    expiredService.productExpiredVerify.mockImplementation((id: string) => of(
      id === 'p1' ? 'Produto vencido' : 'Produto dentro do prazo de vencimento',
    ));
    distributorService.getAllDistributor.mockReturnValue(of([
      { id: 'd1', nameDistributor: 'Distribuidora A' },
      { id: 'd2', nameDistributor: 'Distribuidora B' },
    ]));
    brandService.getAllBrand.mockImplementation((id: string) => of([
      { idBrand: `${id}-b1`, idDistributor: id, nameBrand: 'Marca A' },
      { idBrand: `${id}-b2`, idDistributor: id, nameBrand: 'Marca B' },
    ]));

    await TestBed.configureTestingModule({
      imports: [VencimentoComponent],
      providers: [
        { provide: ExpiredService, useValue: expiredService },
        { provide: DistributorService, useValue: distributorService },
        { provide: BrandService, useValue: brandService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VencimentoComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders the API response fields, treating verification as a boolean', () => {
    expect(expiredService.findAll).toHaveBeenCalledWith(0);
    const cards = fixture.nativeElement.querySelectorAll('.dueCard') as NodeListOf<HTMLElement>;
    expect(cards.length).toBe(2);
    expect(cards[1].querySelector('h3')?.textContent).toBe('Produto sem alerta');
    const values = Array.from(cards[1].querySelectorAll('.productValue'))
      .map((element) => element.textContent?.trim());
    expect(values).toEqual([
      'Marca A', 'Distribuidora A', '123', '01/01/2026', '31/12/2026',
      '0', 'Não', '03/02/2026',
    ]);
    expect(cards[0].textContent).toContain('12');
    expect(cards[0].querySelectorAll('.productValue')[6].textContent?.trim()).toBe('Sim');
    expect(expiredService.productExpiredVerify).toHaveBeenCalledWith('p0');
    expect(expiredService.productExpiredVerify).toHaveBeenCalledWith('p1');
    expect(fixture.nativeElement.querySelector('.filterBar')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('a API precisa retornar idDistributor e idBrand');
    expect(fixture.nativeElement.textContent).not.toContain('ID do produto');
    expect(fixture.nativeElement.textContent).toContain('Lote');
  });

  it('uses the search endpoint only after submitting and restores the previous list when cleared', () => {
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = '  vencido  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(2);
    expect(expiredService.search).not.toHaveBeenCalled();

    fixture.nativeElement.querySelector('.searchButton').click();
    fixture.detectChanges();
    expect(expiredService.search).toHaveBeenCalledWith('vencido', 0);
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(1);
    expect(expiredService.productExpiredVerify).toHaveBeenLastCalledWith('p1');

    expiredService.search.mockReturnValueOnce(of([]));
    fixture.componentInstance.changePage(1);
    fixture.detectChanges();
    expect(expiredService.search).toHaveBeenLastCalledWith('vencido', 1);
    expect(fixture.componentInstance.page).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(1);

    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(2);
    expect(fixture.componentInstance.page).toBe(0);
  });

  it('requests the selected status on every click, pagination and refresh', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.expirationFilters button');
    buttons[1].click();
    fixture.detectChanges();
    expect(expiredService.filter).toHaveBeenLastCalledWith(true, 0);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.querySelector('.dueCard h3').textContent).toBe('Produto vencido');
    fixture.componentInstance.changePage(1);
    expect(expiredService.filter).toHaveBeenLastCalledWith(true, 1);
    fixture.componentInstance.loadDueProducts();
    expect(expiredService.filter).toHaveBeenLastCalledWith(true, 1);
    buttons[2].click();
    fixture.detectChanges();
    expect(expiredService.filter).toHaveBeenLastCalledWith(false, 0);
    expect(fixture.componentInstance.page).toBe(0);
    expect(fixture.nativeElement.querySelector('.dueCard h3').textContent).toBe('Produto sem alerta');
    buttons[2].click();
    expect(expiredService.filter).toHaveBeenCalledTimes(5);
    buttons[0].click();
    expect(expiredService.findAll).toHaveBeenLastCalledWith(0);
  });

  it.each(['expired', 'notExpired'] as const)('resets %s when searching and clears to all products', (filter) => {
    const component = fixture.componentInstance;
    component.selectExpirationFilter(filter);
    component.searchProducts('vencido');
    component.submitSearch();
    fixture.detectChanges();
    expect(component.selectedExpirationFilter).toBe('all');
    expect(expiredService.search).toHaveBeenLastCalledWith('vencido', 0);
    expect(fixture.nativeElement.querySelector('.expirationFilters button').getAttribute('aria-pressed')).toBe('true');
    component.searchProducts('');
    fixture.detectChanges();
    expect(expiredService.findAll).toHaveBeenLastCalledWith(0);
    expect(component.activeSearch).toBe('');
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(2);
  });

  it('renders every object in the filter response and clears the list for an empty filter', () => {
    const filtered = [
      dueProducts[1],
      { ...dueProducts[1], idProduct: 'p2', nameProduct: 'Outro produto vencido' },
    ];
    expiredService.filter.mockReturnValueOnce(of(filtered));
    fixture.componentInstance.selectExpirationFilter('expired');
    fixture.detectChanges();
    const names = Array.from(fixture.nativeElement.querySelectorAll('.dueCard h3') as NodeListOf<HTMLElement>)
      .map((element) => element.textContent?.trim());
    expect(names).toEqual(filtered.map((product) => product.nameProduct));

    expiredService.filter.mockReturnValueOnce(of([]));
    fixture.componentInstance.selectExpirationFilter('notExpired');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.emptyState')).not.toBeNull();
    expect(fixture.componentInstance.hasNextPage).toBe(false);
  });

  it('cancels a pending filter when switching tabs and discards previous search results', () => {
    const pending = new Subject<ExpiredResponse[]>();
    expiredService.filter.mockReturnValueOnce(pending);
    const component = fixture.componentInstance;
    component.selectExpirationFilter('expired');
    component.selectExpirationFilter('notExpired');
    pending.next([dueProducts[1]]);
    pending.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dueCard h3').textContent).toBe('Produto sem alerta');
    component.searchProducts('vencido');
    component.submitSearch();
    component.selectExpirationFilter('expired');
    expect(component.activeSearch).toBe('');
    expect(component.searchTerm).toBe('');
    component.clearFilters();
    fixture.detectChanges();
    expect(component.selectedExpirationFilter).toBe('all');
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(2);
  });

  it('navigates pages, keeps filters and retains the last page after an empty response', () => {
    const buttons = () => fixture.nativeElement.querySelectorAll('.pagination button');
    expect(buttons()[0].disabled).toBe(true);
    expiredService.findAll.mockReturnValueOnce(of([dueProducts[0]]));
    buttons()[1].click();
    fixture.detectChanges();
    expect(expiredService.findAll).toHaveBeenLastCalledWith(1);
    expect(fixture.nativeElement.querySelector('.pagination span').textContent).toContain('Página 2');
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(1);
    expect(buttons()[1].disabled).toBe(false);

    fixture.componentInstance.clearFilters();
    expiredService.findAll.mockReturnValueOnce(of([]));
    buttons()[1].click();
    fixture.detectChanges();
    expect(expiredService.findAll).toHaveBeenLastCalledWith(2);
    expect(fixture.componentInstance.page).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(1);
    expect(buttons()[1].disabled).toBe(true);

    buttons()[0].click();
    fixture.detectChanges();
    expect(expiredService.findAll).toHaveBeenLastCalledWith(0);
    expect(fixture.componentInstance.page).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(2);
  });

  it('blocks navigation while loading and preserves the current page after a failed request', () => {
    const pending = new Subject<ExpiredResponse[]>();
    expiredService.findAll.mockReturnValueOnce(pending);
    fixture.componentInstance.changePage(1);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.pagination button');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);
    fixture.componentInstance.changePage(1);
    expect(expiredService.findAll).toHaveBeenCalledTimes(2);

    pending.error(new Error('Falha de rede'));
    fixture.detectChanges();
    expect(fixture.componentInstance.page).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(2);
    expect(fixture.componentInstance.hasLoadError).toBe(true);
    expect(buttons[1].disabled).toBe(false);

    buttons[1].click();
    fixture.detectChanges();
    expect(expiredService.findAll).toHaveBeenLastCalledWith(1);
    expect(fixture.componentInstance.page).toBe(1);
    expect(fixture.componentInstance.hasLoadError).toBe(false);
  });

  it('prioritizes and highlights products marked as expired without mutating the response', () => {
    dueProducts = dueProducts.map((product, index) => ({ ...product, idProduct: `p${index}` }));
    const regularMessage = new Subject<string>();
    const expiredMessage = new Subject<string>();
    expiredService.productExpiredVerify.mockImplementation((id: string) =>
      id === 'p0' ? regularMessage : expiredMessage,
    );
    fixture.componentInstance.loadDueProducts();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(0);
    expiredMessage.next('Produto com prazo vencido');
    expiredMessage.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(0);
    regularMessage.next('Produto dentro do prazo de vencimento');
    regularMessage.complete();
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.dueCard') as NodeListOf<HTMLElement>;
    expect(cards[0].querySelector('h3')?.textContent).toBe('Produto vencido');
    expect(cards[0].classList.contains('dueCardExpired')).toBe(true);
    expect(cards[0].textContent).toContain('prazo vencido');
    expect(cards[1].classList.contains('dueCardExpired')).toBe(false);
    expect(cards[0].querySelector('.verificationMessage')?.textContent?.trim()).toBe('Produto com prazo vencido');
    expect(cards[1].querySelector('.verificationMessage')?.textContent?.trim()).toBe('Produto dentro do prazo de vencimento');
    expect(dueProducts[0].nameProduct).toBe('Produto sem alerta');
  });

  it.each([
    'Produto estar perto do prazo de vencimento, prazo para vencer o produto em 1 dia',
    'Produto estar perto do prazo de vencimento, prazo para vencer o produto em 10 dias',
    '  PRODUTO ESTÁ PERTO DO PRAZO DE VENCIMENTO, prazo para vencer o produto em 2 dias  ',
  ])('uses an orange border for the near-expiry message: %s', (message) => {
    expiredService.productExpiredVerify.mockReturnValue(of(message));
    fixture.componentInstance.loadDueProducts();
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.dueCard') as NodeListOf<HTMLElement>;
    expect(cards.length).toBe(2);
    for (const card of cards) {
      expect(card.classList.contains('dueCardNearExpiry')).toBe(true);
      expect(card.classList.contains('dueCardExpired')).toBe(false);
      expect(card.querySelector('.verificationMessage')?.textContent?.trim()).toBe(message.trim());
    }
  });

  it('keeps the default border for products within the deadline', () => {
    const card = fixture.nativeElement.querySelectorAll('.dueCard')[1] as HTMLElement;
    expect(card.classList.contains('dueCardExpired')).toBe(false);
    expect(card.classList.contains('dueCardNearExpiry')).toBe(false);
    expect(card.querySelector('.verificationMessage')?.textContent)
      .toContain('Produto dentro do prazo de vencimento');
  });

  it('shows individual verification failures without discarding other products', () => {
    expiredService.productExpiredVerify.mockImplementation((id: string) => id === 'p0'
      ? throwError(() => new Error('Falha de rede'))
      : of('Produto vencido'));
    fixture.componentInstance.loadDueProducts();
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.dueCard') as NodeListOf<HTMLElement>;
    expect(cards.length).toBe(2);
    expect(cards[0].classList.contains('dueCardExpired')).toBe(true);
    expect(cards[1].textContent).toContain('Não foi possível verificar a validade deste produto.');
    expect(cards[1].classList.contains('dueCardExpired')).toBe(false);
    expect(cards[1].classList.contains('dueCardNearExpiry')).toBe(false);
    expect(fixture.componentInstance.isLoading).toBe(false);
    expect(fixture.componentInstance.hasLoadError).toBe(false);
  });

  it('cancels previous verifications when refreshing again', () => {
    const stale = new Subject<string>();
    expiredService.productExpiredVerify.mockReturnValue(stale);
    fixture.componentInstance.loadDueProducts();
    expiredService.productExpiredVerify.mockReturnValue(of('Produto dentro do prazo de vencimento'));
    fixture.componentInstance.loadDueProducts();
    stale.next('Produto vencido');
    stale.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.dueCardExpired').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(2);
  });

  it('filters by distributor and brand, keeps filters on refresh and clears dependent selections', () => {
    dueProducts = [
      { ...dueProducts[0], idDistributor: 'd1', idBrand: 'd1-b1' },
      { ...dueProducts[1], idDistributor: 'd1', idBrand: 'd1-b2' },
      { ...dueProducts[0], nameProduct: 'Outra distribuidora', idDistributor: 'd2', idBrand: 'd2-b1' },
    ];
    fixture.nativeElement.querySelector('.refreshButton').click();
    fixture.detectChanges();
    const selects = fixture.nativeElement.querySelectorAll('.filterBar select');
    const change = (index: number, value: string) => {
      selects[index].value = value;
      selects[index].dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    expect(selects[1].disabled).toBe(true);
    change(0, 'd1');
    expect(brandService.getAllBrand).toHaveBeenLastCalledWith('d1', 0);
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(2);
    change(1, 'd1-b2');
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.dueCard h3').textContent).toBe('Produto vencido');
    fixture.nativeElement.querySelector('.refreshButton').click();
    fixture.detectChanges();
    expect(selects[1].value).toBe('d1-b2');
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(1);
    change(0, 'd2');
    expect(selects[1].value).toBe('');
    expect(fixture.nativeElement.querySelector('.dueCard h3').textContent).toBe('Outra distribuidora');
    fixture.nativeElement.querySelector('.filterBar button:last-child').click();
    fixture.detectChanges();
    expect(selects[0].value).toBe('');
    expect(selects[1].disabled).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(3);
  });

  it('ignores brands from a previous distributor when requests finish out of order', () => {
    const stale = new Subject<Brand[]>();
    brandService.getAllBrand.mockReturnValueOnce(stale);
    fixture.componentInstance.selectDistributor('d1');
    fixture.componentInstance.selectDistributor('d2');
    stale.next([{ idBrand: 'old', idDistributor: 'd1', nameBrand: 'Antiga', typeBrand: '' }]);
    stale.complete();
    expect(fixture.componentInstance.brands.map((brand) => brand.idBrand)).toEqual(['d2-b1', 'd2-b2']);
    expect(fixture.componentInstance.isLoadingBrands).toBe(false);
  });

  it('includes brands from subsequent pages in the expiry filter', () => {
    const firstPage = Array.from({ length: 6 }, (_, i) => ({
      idBrand: String(i), idDistributor: 'd1', nameBrand: String(i), typeBrand: '',
    }));
    const lastBrand = { ...firstPage[0], idBrand: 'last' };
    brandService.getAllBrand.mockReturnValueOnce(of(firstPage)).mockReturnValueOnce(of([lastBrand]));
    fixture.componentInstance.selectDistributor('d1');
    expect(brandService.getAllBrand).toHaveBeenLastCalledWith('d1', 1);
    expect(fixture.componentInstance.brands).toEqual([...firstPage, lastBrand]);
  });

  it('refreshes the list and shows the empty state after an empty response', async () => {
    expiredService.findAll.mockReturnValueOnce(of([]));
    fixture.nativeElement.querySelector('.refreshButton').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(expiredService.findAll).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.emptyState')).not.toBeNull();
  });

  it('disables refresh during loading and allows retrying after a failure', async () => {
    const pending = new Subject<ExpiredResponse[]>();
    expiredService.findAll.mockReturnValueOnce(pending);
    fixture.nativeElement.querySelector('.refreshButton').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.refreshButton').disabled).toBe(true);
    pending.error(new Error('Falha de rede'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.refreshButton').disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.emptyState')).toBeNull();

    fixture.nativeElement.querySelector('.refreshButton').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.dueCard').length).toBe(2);
  });
});

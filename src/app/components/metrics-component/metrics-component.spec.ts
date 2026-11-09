import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Brand } from '../../interfaces/brand';
import { Distributor } from '../../interfaces/distributor';
import { ProductMetrics } from '../../interfaces/product-metrics';
import { BrandService } from '../../service/brand-service';
import { DistributorService } from '../../service/distributor-service';
import { ProductService } from '../../service/product-service';
import { MetricsComponent } from './metrics-component';

describe('MetricsComponent', () => {
  let component: MetricsComponent;
  let fixture: ComponentFixture<MetricsComponent>;
  let requestedDistributorId: string;
  let requestedBrandId: string;

  const distributor: Distributor = {
    id: 'distributor-id',
    nameDistributor: 'Distribuidor teste',
    localizationDistributor: 'São Paulo',
    salespeopleDistributor: [],
    typeDistributor: 'Nacional',
    telephones: [],
    CNPJ: '00.000.000/0001-00',
  };
  const brand: Brand = {
    idBrand: 'brand-id',
    idDistributor: distributor.id,
    nameBrand: 'Marca teste',
    typeBrand: 'Ração',
  };
  const products: ProductMetrics[] = [
    {
      idProduct: 'product-id',
      idBrand: brand.idBrand,
      idDistributor: distributor.id,
      nameProduct: 'Produto teste',
      typeProduct: 'Ração',
      descriptionProduct: 'Descrição',
      dataCreated: '2026-09-26T10:00:00',
      dataDueProduct: '2027-09-27',
      versionProduct: 2,
      lotProduct: '001-A',
      priceBuy: 12,
      priceSell: 20,
      stockProduct: 10,
      dataDueProductVerify: false,
    },
    {
      idProduct: 'older-product-id',
      idBrand: brand.idBrand,
      idDistributor: distributor.id,
      nameProduct: 'Produto teste',
      typeProduct: 'Ração',
      descriptionProduct: 'Descrição',
      dataCreated: '2026-09-27T10:00:00',
      dataDueProduct: '2027-09-26',
      versionProduct: 1,
      lotProduct: '001-A',
      priceBuy: 10,
      priceSell: 15,
      stockProduct: 8,
      dataDueProductVerify: false,
    },
  ];

  const distributorService = {
    searchDistributorMetrics: (_name: string, _page: number) => of([distributor]),
    getAllDistributorMetrics: (_page: number) => of([distributor]),
    getAllDistributorMetricsTotal: () => of([distributor]),
    metricDistributor: (_idDistributor: string) => of([250, 100]),
  };
  const brandService = {
    searchBrandMetrics: (_name: string, _page: number) => of([brand]),
    pageSize: 6,
    metricBrand: (_idBrand: string) => of([150, 60]),
    getAllBrandMetricsTotal: (_idDistributor: string) => of([brand]),
    getAllBrandMetrics: (idDistributor: string, _page: number) => {
      requestedDistributorId = idDistributor;
      return of([brand]);
    },
  };
  const productService = {
    searchProductMetrics: (_name: string, _page: number) => of(products),
    metricsProduct: (idBrand: string, _page: number) => {
      requestedBrandId = idBrand;
      return of(products);
    },
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    requestedDistributorId = '';
    requestedBrandId = '';

    await TestBed.configureTestingModule({
      imports: [MetricsComponent],
      providers: [
        { provide: DistributorService, useValue: distributorService },
        { provide: BrandService, useValue: brandService },
        { provide: ProductService, useValue: productService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it.each(['distributors', 'brands'] as const)(
    'searches %s on click, paginates the submitted name and restores the original list', (kind) => {
      const isBrand = kind === 'brands';
      const distributorResults = [{ ...distributor, id: 'found-distributor', nameDistributor: 'Resultado' }];
      const brandResults = [{ ...brand, idBrand: 'found-brand', nameBrand: 'Resultado' }];
      const distributorSearch = vi.spyOn(distributorService, 'searchDistributorMetrics')
        .mockReturnValue(of(distributorResults));
      const brandSearch = vi.spyOn(brandService, 'searchBrandMetrics').mockReturnValue(of(brandResults));
      if (isBrand) {
        component.selectDistributor(distributor);
        component.loadBrands(distributor.id, 2);
      } else {
        component.loadDistributors(2, false);
      }
      const list = () => isBrand ? component.brands : component.distributors;
      const page = () => isBrand ? component.brandPage : component.distributorPage;
      const original = list();
      const originalHasNext = isBrand ? component.hasNextBrandPage : component.hasNextDistributorPage;
      const search = isBrand ? brandSearch : distributorSearch;
      const changePage = () => isBrand ? component.changeBrandPage(1) : component.changeDistributorPage(1);
      fixture.detectChanges();
      const input: HTMLInputElement = fixture.nativeElement.querySelector(isBrand ? '#brandSearch' : '#distributorSearch');
      const type = (value: string) => {
        input.value = value;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
      };
      type('  Consulta  ');
      expect(search).not.toHaveBeenCalled();
      expect(list()).toBe(original);
      fixture.nativeElement.querySelector('.searchControls button').click();
      fixture.detectChanges();
      expect(search).toHaveBeenLastCalledWith('Consulta', 0);
      expect(list()).toEqual(isBrand ? brandResults : distributorResults);
      expect(fixture.nativeElement.querySelector('.selectionGrid').textContent).toContain('Resultado');
      type('Texto ainda não enviado');
      changePage();
      expect(search).toHaveBeenLastCalledWith('Consulta', 1);
      distributorSearch.mockReturnValue(of([]));
      brandSearch.mockReturnValue(of([]));
      changePage();
      expect(page()).toBe(1);
      expect(list()).toEqual(isBrand ? brandResults : distributorResults);
      expect(isBrand ? component.hasNextBrandPage : component.hasNextDistributorPage).toBe(false);
      type('');
      expect(list()).toBe(original);
      expect(page()).toBe(2);
      expect(isBrand ? component.hasNextBrandPage : component.hasNextDistributorPage).toBe(originalHasNext);
      type('Sem resultado');
      fixture.nativeElement.querySelector('.searchControls button').click();
      fixture.detectChanges();
      expect(list()).toBe(original);
      expect(page()).toBe(2);
      expect(fixture.nativeElement.textContent).toContain('A lista anterior foi mantida.');
    },
  );

  it.each(['distributors', 'brands'] as const)(
    'retries a failed %s search and ignores its response after clearing', (kind) => {
      const isBrand = kind === 'brands';
      if (isBrand) component.selectDistributor(distributor);
      const original = isBrand ? component.brands : component.distributors;
      const pendingDistributors = new Subject<Distributor[]>();
      const pendingBrands = new Subject<Brand[]>();
      const distributorSearch = vi.spyOn(distributorService, 'searchDistributorMetrics')
        .mockReturnValueOnce(throwError(() => new Error('Unavailable')))
        .mockReturnValue(pendingDistributors);
      const brandSearch = vi.spyOn(brandService, 'searchBrandMetrics')
        .mockReturnValueOnce(throwError(() => new Error('Unavailable')))
        .mockReturnValue(pendingBrands);
      vi.spyOn(console, 'error').mockImplementation(() => {});
      if (isBrand) {
        component.updateBrandSearch('Consulta');
        component.searchBrands();
      } else {
        component.updateDistributorSearch('Consulta');
        component.searchDistributors();
      }
      expect(isBrand ? component.hasBrandListError : component.hasDistributorListError).toBe(true);
      component.retry();
      expect(isBrand ? brandSearch : distributorSearch).toHaveBeenLastCalledWith('Consulta', 0);
      expect(isBrand ? component.isLoadingBrands : component.isLoadingDistributors).toBe(true);
      if (isBrand) component.updateBrandSearch('   ');
      else component.updateDistributorSearch('   ');
      pendingDistributors.next([{ ...distributor, id: 'stale' }]);
      pendingBrands.next([{ ...brand, idBrand: 'stale' }]);
      pendingDistributors.complete();
      pendingBrands.complete();
      expect(isBrand ? component.brands : component.distributors).toBe(original);
      expect(isBrand ? component.isLoadingBrands : component.isLoadingDistributors).toBe(false);
      expect(isBrand ? component.hasBrandListError : component.hasDistributorListError).toBe(false);
    },
  );

  it('cancels and resets a brand search when selecting another distributor', () => {
    component.selectDistributor(distributor);
    const pending = new Subject<Brand[]>();
    vi.spyOn(brandService, 'searchBrandMetrics').mockReturnValue(pending);
    component.updateBrandSearch('Consulta');
    component.searchBrands();
    const nextBrands = [{ ...brand, idBrand: 'next-brand' }];
    const loadBrands = vi.spyOn(brandService, 'getAllBrandMetrics').mockReturnValue(of(nextBrands));
    component.selectDistributor({ ...distributor, id: 'next-distributor' });
    pending.next([brand]);
    pending.complete();
    component.updateBrandSearch('');
    expect(component.brands).toEqual(nextBrands);
    expect(component.activeBrandSearch).toBe('');
    expect(loadBrands).toHaveBeenLastCalledWith('next-distributor', 0);
  });

  it('should replace distributors with brands after selecting a distributor', () => {
    component.selectDistributor(distributor);

    expect(component.step).toBe('brands');
    expect(component.selectedDistributor).toEqual(distributor);
    expect(component.brands).toEqual([brand]);
    expect(requestedDistributorId).toBe(distributor.id);
  });

  it('loads and paginates the brands returned by the metrics endpoint', () => {
    const firstPage = Array.from({ length: 6 }, (_, index) => ({
      ...brand, idBrand: `brand-${index}`, nameBrand: `Marca ${index}`,
    }));
    const nextPage = new Subject<Brand[]>();
    const loadBrands = vi.spyOn(brandService, 'getAllBrandMetrics')
      .mockImplementation((_id, page) => page === 0 ? of(firstPage) : nextPage);
    component.selectDistributor(distributor);
    fixture.detectChanges();
    const chart = fixture.nativeElement.querySelector('.brandSummary apx-chart');
    const list = fixture.nativeElement.querySelector('.brandsList');
    expect(loadBrands).toHaveBeenCalledWith(distributor.id, 0);
    expect(component.hasNextBrandPage).toBe(true);
    expect(list.querySelectorAll('.selectionGrid li').length).toBe(6);

    list.querySelector('[aria-label="Próxima página de marcas"]').click();
    fixture.detectChanges();
    expect(loadBrands).toHaveBeenCalledWith(distributor.id, 1);
    expect(component.brandPage).toBe(0);
    expect(list.querySelector('.loadingState')).not.toBeNull();
    expect(list.querySelectorAll('.selectionGrid li').length).toBe(6);
    expect(fixture.nativeElement.querySelector('.brandSummary apx-chart')).toBe(chart);

    nextPage.next([{ ...brand, idBrand: 'last-brand', nameBrand: 'Última marca' }]);
    nextPage.complete();
    fixture.detectChanges();
    expect(component.brandPage).toBe(1);
    expect(component.hasNextBrandPage).toBe(false);
    expect(list.querySelector('.selectionGrid').textContent).toContain('Última marca');
    expect(list.querySelector('.pagination').textContent).toContain('Página 2');

    list.querySelector('[aria-label="Página anterior de marcas"]').click();
    fixture.detectChanges();
    expect(loadBrands).toHaveBeenLastCalledWith(distributor.id, 0);
    expect(component.brandPage).toBe(0);
  });

  it('uses all brands for the chart without changing it when the cards paginate', () => {
    const otherBrand = { ...brand, idBrand: 'other-brand', nameBrand: 'Outra marca' };
    const totalRequest = vi.spyOn(brandService, 'getAllBrandMetricsTotal')
      .mockReturnValue(of([brand, otherBrand]));
    const pageRequest = vi.spyOn(brandService, 'getAllBrandMetrics')
      .mockImplementation((_id, page) => of(page === 0
        ? Array.from({ length: 6 }, (_, index) => ({ ...brand, idBrand: `page-${index}` }))
        : [otherBrand]));
    vi.spyOn(brandService, 'metricBrand').mockImplementation((id) =>
      of(id === otherBrand.idBrand ? [400, 200] : [150, 60]));
    component.selectDistributor(distributor);
    fixture.detectChanges();
    expect(totalRequest).toHaveBeenCalledWith(distributor.id);
    expect(pageRequest).toHaveBeenCalledWith(distributor.id, 0);
    expect(component.brandDonutSeries).toEqual([260, 550]);
    expect(component.brandDonutLabels).toEqual(['Preço de compra', 'Preço de venda']);

    fixture.nativeElement.querySelector('[aria-label="Próxima página de marcas"]').click();
    fixture.detectChanges();
    expect(pageRequest).toHaveBeenCalledWith(distributor.id, 1);
    expect(totalRequest).toHaveBeenCalledTimes(1);
    expect(component.brandDonutSeries).toEqual([260, 550]);
    component.showBrandDonutDetail('priceSell');
    expect(component.brandDonutLabels).toEqual([brand.nameBrand, otherBrand.nameBrand]);
    expect(component.brandDonutSeries).toEqual([150, 400]);
  });

  it('pages distributors while keeping totals and drilldown for all distributors', () => {
    const firstPage = Array.from({ length: 6 }, (_, index) => ({ ...distributor, id: String(index) }));
    const lastDistributor = { ...distributor, id: 'last', nameDistributor: 'Última distribuidora' };
    const loadTotals = vi.spyOn(distributorService, 'getAllDistributorMetricsTotal')
      .mockReturnValue(of([...firstPage, lastDistributor]));
    const loadPage = vi.spyOn(distributorService, 'getAllDistributorMetrics')
      .mockImplementation(page => of(page === 0 ? firstPage : [lastDistributor]));
    component.loadDistributors();
    fixture.detectChanges();
    const pagination = () => fixture.nativeElement.querySelector('.pagination');
    expect(loadPage).toHaveBeenLastCalledWith(0);
    expect(pagination().firstElementChild.disabled).toBe(true);
    pagination().lastElementChild.click();
    fixture.detectChanges();
    expect(loadPage).toHaveBeenLastCalledWith(1);
    expect(component.distributors).toEqual([lastDistributor]);
    expect(component.donutSeries).toEqual([700, 1750]);
    expect(pagination().textContent).toContain('Página 2');
    expect(pagination().lastElementChild.disabled).toBe(true);

    component.selectDistributor(lastDistributor);
    component.showDistributors();
    fixture.detectChanges();
    expect(component.distributorPage).toBe(1);
    pagination().firstElementChild.click();
    fixture.detectChanges();
    expect(loadPage).toHaveBeenLastCalledWith(0);
    expect(component.donutSeries).toEqual([700, 1750]);
    expect(loadTotals).toHaveBeenCalledTimes(1);
    component.showDonutDetail('priceSell');
    expect(component.donutSeries).toEqual(Array(7).fill(250));
    expect(component.donutLabels).toContain(lastDistributor.nameDistributor);
  });

  it('preserves the chart while an asynchronous distributor page loads', () => {
    const nextPage = new Subject<Distributor[]>();
    const loadPage = vi.spyOn(distributorService, 'getAllDistributorMetrics').mockReturnValue(nextPage);
    const loadTotals = vi.spyOn(distributorService, 'getAllDistributorMetricsTotal');
    component.hasNextDistributorPage = true;
    component.showDonutDetail('priceSell');
    fixture.detectChanges();
    const summary = fixture.nativeElement.querySelector('.distributorSummary');
    const chart = summary.querySelector('apx-chart');
    const series = component.donutSeries;
    const list = fixture.nativeElement.querySelector('.distributorsList');

    fixture.nativeElement.querySelector('[aria-label="Próxima página"]').click();
    fixture.detectChanges();
    expect(list.querySelector('.loadingState')).not.toBeNull();
    expect(list.getAttribute('aria-busy')).toBe('true');
    expect(list.querySelector('.selectionGrid').textContent).toContain(distributor.nameDistributor);
    expect([...list.querySelectorAll('.pagination button')].every((button: any) => button.disabled)).toBe(true);
    expect(fixture.nativeElement.querySelector('.distributorSummary')).toBe(summary);
    expect(summary.querySelector('apx-chart')).toBe(chart);
    component.changeDistributorPage(1);
    expect(loadPage).toHaveBeenCalledTimes(1);

    nextPage.next([{ ...distributor, nameDistributor: 'Distribuidor da próxima página' }]);
    nextPage.complete();
    fixture.detectChanges();
    expect(list.querySelector('.loadingState')).toBeNull();
    expect(list.querySelector('.selectionGrid').textContent).toContain('Distribuidor da próxima página');
    expect(component.distributorPage).toBe(1);
    expect(fixture.nativeElement.querySelector('.distributorSummary apx-chart')).toBe(chart);
    expect(component.donutSeries).toBe(series);
    expect(component.donutDetail).toBe('priceSell');
    expect(loadTotals).not.toHaveBeenCalled();
  });

  it('keeps the chart and previous page on a pagination error and retries only the list', () => {
    const nextPage = new Subject<Distributor[]>();
    const loadPage = vi.spyOn(distributorService, 'getAllDistributorMetrics').mockReturnValue(nextPage);
    const loadTotals = vi.spyOn(distributorService, 'getAllDistributorMetricsTotal');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    component.hasNextDistributorPage = true;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const chart = fixture.nativeElement.querySelector('.distributorSummary apx-chart');
    fixture.nativeElement.querySelector('[aria-label="Próxima página"]').click();
    fixture.detectChanges();
    nextPage.error(new Error('Page unavailable'));
    fixture.detectChanges();

    expect(component.distributorPage).toBe(0);
    expect(component.distributors).toEqual([distributor]);
    expect(fixture.nativeElement.querySelector('.distributorSummary apx-chart')).toBe(chart);
    const retryButton = fixture.nativeElement.querySelector('.distributorsList .errorState button');
    expect(retryButton).not.toBeNull();
    loadPage.mockReturnValue(of([{ ...distributor, nameDistributor: 'Nova página' }]));
    retryButton.click();
    fixture.detectChanges();
    expect(loadPage).toHaveBeenLastCalledWith(1);
    expect(component.distributorPage).toBe(1);
    expect(fixture.nativeElement.querySelector('.distributorsList .errorState')).toBeNull();
    expect(fixture.nativeElement.querySelector('.distributorSummary apx-chart')).toBe(chart);
    expect(loadTotals).not.toHaveBeenCalled();
  });

  it('should render all distributors returned by the service', () => {
    fixture.detectChanges();

    const distributorCards = fixture.nativeElement.querySelectorAll(
      '.selectionGrid li',
    ) as NodeListOf<HTMLElement>;

    expect(distributorCards.length).toBe(1);
    expect(distributorCards[0].textContent).toContain(distributor.nameDistributor);
  });

  it.each([[250, 100], [100, 250], [0, 0]])(
    'should display purchases and sales regardless of response order (%s, %s)',
    (first, second) => {
      const metricsRequest = vi.spyOn(distributorService, 'metricDistributor')
        .mockReturnValue(of([first, second]));
      component.loadDistributors();
      fixture.detectChanges();

      expect(metricsRequest).toHaveBeenCalledWith(distributor.id);
      const values = fixture.nativeElement.querySelectorAll('.distributorMetrics b');
      expect(values[0].textContent).toBe(component.formatCurrency(Math.min(first, second)));
      expect(values[1].textContent).toBe(component.formatCurrency(Math.max(first, second)));
    },
  );

  it('should keep metrics associated with each distributor when one request fails', () => {
    const otherDistributor = { ...distributor, id: '', idDistributor: 'other-id' };
    vi.spyOn(distributorService, 'getAllDistributorMetricsTotal').mockReturnValue(of([distributor, otherDistributor]));
    vi.spyOn(distributorService, 'getAllDistributorMetrics').mockReturnValue(
      of([distributor, otherDistributor]),
    );
    const metricsRequest = vi.spyOn(distributorService, 'metricDistributor')
      .mockImplementation((id) => id === distributor.id
        ? throwError(() => new Error('Failed to load metrics'))
        : of([400, 200]));

    component.loadDistributors();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.selectionGrid li');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Métricas indisponíveis.');
    expect(cards[1].textContent).toContain(component.formatCurrency(200));
    expect(cards[1].textContent).toContain(component.formatCurrency(400));
    expect(metricsRequest).toHaveBeenCalledWith('other-id');
    expect(component.hasLoadError).toBe(false);
    expect(component.distributorTotals).toEqual({ priceBuy: 200, priceSell: 400 });
    expect(component.unavailableDistributorMetrics).toBe(1);
    expect(fixture.nativeElement.querySelector('.summaryStatus').textContent).toContain('Totais parciais');
  });

  it('should sum minimum and maximum values and drill into each total by distributor', () => {
    const otherDistributor = { ...distributor, id: 'other-id', nameDistributor: 'Outro distribuidor' };
    vi.spyOn(distributorService, 'getAllDistributorMetricsTotal').mockReturnValue(of([distributor, otherDistributor]));
    vi.spyOn(distributorService, 'getAllDistributorMetrics').mockReturnValue(of([distributor, otherDistributor]));
    vi.spyOn(distributorService, 'metricDistributor').mockImplementation((id) =>
      of(id === distributor.id ? [250, 100] : [200, 400]),
    );
    component.loadDistributors();
    fixture.detectChanges();

    expect(component.donutSeries).toEqual([300, 650]);
    expect(component.distributorTotals).toEqual({ priceBuy: 300, priceSell: 650 });
    expect(fixture.nativeElement.querySelector('.buyTotal strong').textContent).toBe(component.formatCurrency(300));
    expect(fixture.nativeElement.querySelector('.sellTotal strong').textContent).toBe(component.formatCurrency(650));

    fixture.nativeElement.querySelector('.sellTotal').click();
    fixture.detectChanges();
    expect(component.donutSeries).toEqual([250, 400]);
    expect(component.donutLabels).toEqual([distributor.nameDistributor, otherDistributor.nameDistributor]);
    expect(fixture.nativeElement.querySelectorAll('.donutBreakdown li').length).toBe(2);

    fixture.nativeElement.querySelector('.donutBack').click();
    fixture.detectChanges();
    expect(component.donutSeries).toEqual([300, 650]);
    component.donutChart.events?.dataPointSelection?.(new MouseEvent('click'), undefined, {
      dataPointIndex: 0, seriesIndex: 0, w: { config: {}, globals: {} },
    });
    expect(component.donutDetail).toBe('priceBuy');
    expect(component.donutSeries).toEqual([100, 200]);

    component.selectDistributor(distributor);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.distributorSummary')).toBeNull();
  });

  it('should update partial totals as responses arrive and reset them on reload', () => {
    const response = new Subject<number[]>();
    vi.spyOn(distributorService, 'metricDistributor').mockReturnValue(response);
    component.loadDistributors();
    expect(component.pendingDistributorMetrics).toBe(1);
    expect(component.donutSeries).toEqual([0, 0]);

    response.next([80, 40]);
    expect(component.pendingDistributorMetrics).toBe(0);
    expect(component.donutSeries).toEqual([40, 80]);
    response.complete();

    vi.spyOn(distributorService, 'getAllDistributorMetrics').mockReturnValue(of([]));
    vi.spyOn(distributorService, 'getAllDistributorMetricsTotal').mockReturnValue(of([]));
    component.loadDistributors();
    expect(component.donutSeries).toEqual([0, 0]);
    expect(component.hasDonutValues).toBe(false);
  });

  it('keeps the paged list available when global totals fail and allows retry', () => {
    const totalsRequest = vi.spyOn(distributorService, 'getAllDistributorMetricsTotal')
      .mockReturnValue(throwError(() => new Error('Unavailable')));
    component.loadDistributors();
    fixture.detectChanges();

    expect(component.distributors).toEqual([distributor]);
    expect(component.hasLoadError).toBe(false);
    expect(component.hasDistributorTotalsError).toBe(true);
    expect(fixture.nativeElement.querySelector('.distributorSummary .summaryTotals')).toBeNull();
    expect(fixture.nativeElement.querySelector('.distributorSummary').textContent)
      .toContain('Não foi possível carregar');

    totalsRequest.mockReturnValue(of([distributor]));
    fixture.nativeElement.querySelector('.distributorSummary .summaryStatus button').click();
    expect(component.hasDistributorTotalsError).toBe(false);
    expect(component.donutSeries).toEqual([100, 250]);
  });

  it('ignores stale global lists and metric responses after reloading totals', () => {
    const staleList = new Subject<Distributor[]>();
    const staleMetrics = new Subject<number[]>();
    vi.spyOn(distributorService, 'getAllDistributorMetricsTotal').mockReturnValueOnce(staleList);
    vi.spyOn(distributorService, 'metricDistributor').mockReturnValueOnce(staleMetrics);
    component.loadDistributors();
    expect(component.isLoadingDistributorTotals).toBe(true);
    component.loadDistributors();
    staleList.next([{ ...distributor, id: 'stale' }]);
    staleMetrics.next([999, 999]);

    expect(component.chartDistributors).toEqual([distributor]);
    expect(component.donutSeries).toEqual([100, 250]);
    expect(component.isLoadingDistributorTotals).toBe(false);
  });

  it('should show zero totals without rendering an empty donut', () => {
    vi.spyOn(distributorService, 'metricDistributor').mockReturnValue(of([0, 0]));
    component.loadDistributors();
    fixture.detectChanges();

    expect(component.distributorTotals).toEqual({ priceBuy: 0, priceSell: 0 });
    expect(fixture.nativeElement.querySelector('.donutWrapper')).toBeNull();
    expect(fixture.nativeElement.querySelector('.distributorSummary').textContent).toContain('Sem valores');
  });

  it('should mark incomplete metrics as unavailable instead of displaying zero', () => {
    vi.spyOn(distributorService, 'metricDistributor').mockReturnValue(of([100]));
    component.loadDistributors();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.distributorMetrics')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Métricas indisponíveis.');
  });

  it('paginates product metrics, keeps the search and returns from the chart to the same page', () => {
    const loadPage = vi.spyOn(productService, 'metricsProduct');
    component.selectDistributor(distributor);
    component.selectBrand(brand);
    fixture.detectChanges();
    expect(loadPage).toHaveBeenLastCalledWith(brand.idBrand, 0);
    const pagination = () => fixture.nativeElement.querySelector('[aria-label="Paginação dos produtos"]');
    expect(pagination().firstElementChild.disabled).toBe(true);

    const nextProducts = [{ ...products[0], nameProduct: 'Outro produto', priceBuy: 30 }];
    loadPage.mockReturnValueOnce(of(nextProducts));
    component.productSearch = 'Outro';
    pagination().lastElementChild.click();
    fixture.detectChanges();
    expect(loadPage).toHaveBeenLastCalledWith(brand.idBrand, 1);
    expect(component.products).toEqual(nextProducts);
    expect(component.productSearch).toBe('Outro');
    expect(pagination().textContent).toContain('Página 2');
    expect(component.productGroups.length).toBe(1);
    fixture.nativeElement.querySelector('[aria-label="Produtos disponíveis"] button').click();
    expect(component.chartSeries[0].data).toEqual([30]);
    component.showProducts();
    fixture.detectChanges();
    expect(component.productPage).toBe(1);
    expect(component.products).toEqual(nextProducts);
    expect(loadPage).toHaveBeenCalledTimes(2);

    pagination().firstElementChild.click();
    fixture.detectChanges();
    expect(loadPage).toHaveBeenLastCalledWith(brand.idBrand, 0);
    expect(component.productPage).toBe(0);
    expect(component.filteredProductGroups).toEqual(component.productGroups);
    expect(pagination().lastElementChild.disabled).toBe(false);
  });

  it('searches on click, paginates the submitted name and restores the original page when cleared', () => {
    component.selectBrand(brand);
    component.changeProductPage(1);
    const originalGroups = component.productGroups;
    const loadPage = vi.spyOn(productService, 'metricsProduct');
    const results = [{ ...products[0], nameProduct: 'Ração encontrada' }];
    const search = vi.spyOn(productService, 'searchProductMetrics').mockReturnValue(of(results));
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#productSearch');
    input.value = '  Ração  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(search).not.toHaveBeenCalled();
    expect(component.products).toEqual(products);
    fixture.nativeElement.querySelector('.searchControls button').click();
    fixture.detectChanges();
    expect(search).toHaveBeenLastCalledWith('Ração', 0);
    expect(component.products).toEqual(results);
    expect(fixture.nativeElement.querySelector('[aria-label="Produtos disponíveis"]').textContent)
      .toContain('Ração encontrada');
    component.updateProductSearch('Outra consulta ainda não enviada');
    component.changeProductPage(1);
    expect(search).toHaveBeenLastCalledWith('Ração', 1);
    search.mockReturnValueOnce(of([]));
    component.changeProductPage(1);
    expect(component.productPage).toBe(1);
    expect(component.hasNextProductPage).toBe(false);
    component.searchProducts();
    expect(search).toHaveBeenLastCalledWith('Outra consulta ainda não enviada', 0);
    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.products).toEqual(products);
    expect(component.productGroups).toBe(originalGroups);
    expect(component.productPage).toBe(1);
    expect(component.hasNextProductPage).toBe(true);
    expect(loadPage).not.toHaveBeenCalled();
  });

  it('cancels a pending search when the input is cleared', () => {
    component.selectBrand(brand);
    const pending = new Subject<ProductMetrics[]>();
    vi.spyOn(productService, 'searchProductMetrics').mockReturnValue(pending);
    component.updateProductSearch('Ração');
    component.searchProducts();
    component.updateProductSearch('   ');
    pending.next([{ ...products[0], nameProduct: 'Resposta antiga' }]);
    pending.complete();
    expect(component.products).toEqual(products);
    expect(component.activeProductSearch).toBe('');
    expect(component.isLoading).toBe(false);
    expect(component.hasLoadError).toBe(false);
  });

  it('retries failed searches and displays an empty search result', () => {
    component.selectBrand(brand);
    const search = vi.spyOn(productService, 'searchProductMetrics')
      .mockReturnValueOnce(throwError(() => new Error('Search unavailable')))
      .mockReturnValue(of([]));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    component.updateProductSearch('Inexistente');
    component.searchProducts();
    expect(component.hasLoadError).toBe(true);
    component.retry();
    fixture.detectChanges();
    expect(search).toHaveBeenLastCalledWith('Inexistente', 0);
    expect(component.products).toEqual([]);
    expect(component.hasNextProductPage).toBe(false);
    expect(component.hasLoadError).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Nenhum produto encontrado com esse nome.');
    component.updateProductSearch('');
    expect(component.products).toEqual(products);
  });

  it('resets a pending search when another brand is selected', () => {
    component.selectBrand(brand);
    const pending = new Subject<ProductMetrics[]>();
    vi.spyOn(productService, 'searchProductMetrics').mockReturnValue(pending);
    component.updateProductSearch('Ração');
    component.searchProducts();
    const nextProducts = [{ ...products[0], nameProduct: 'Outra marca' }];
    vi.spyOn(productService, 'metricsProduct').mockReturnValue(of(nextProducts));
    component.selectBrand({ ...brand, idBrand: 'other-brand' });
    pending.next(products);
    pending.complete();
    component.updateProductSearch('');
    expect(component.products).toEqual(nextProducts);
    expect(component.activeProductSearch).toBe('');
    expect(component.productPage).toBe(0);
  });

  it('keeps the last product page when the next page is empty and handles an empty first page', () => {
    const loadPage = vi.spyOn(productService, 'metricsProduct');
    component.selectBrand(brand);
    loadPage.mockReturnValue(of([]));
    component.changeProductPage(1);
    fixture.detectChanges();
    expect(loadPage).toHaveBeenLastCalledWith(brand.idBrand, 1);
    expect(component.productPage).toBe(0);
    expect(component.products).toEqual(products);
    expect(component.hasNextProductPage).toBe(false);
    expect(fixture.nativeElement.querySelector('[aria-label="Próxima página de produtos"]').disabled).toBe(true);

    component.selectBrand({ ...brand, idBrand: 'empty-brand' });
    fixture.detectChanges();
    expect(component.products).toEqual([]);
    expect(component.productGroups).toEqual([]);
    expect(component.hasNextProductPage).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Nenhum produto encontrado para esta marca.');
  });

  it('blocks repeated navigation during loading and retries the requested product page after an error', () => {
    component.selectBrand(brand);
    const pending = new Subject<ProductMetrics[]>();
    const loadPage = vi.spyOn(productService, 'metricsProduct').mockReturnValueOnce(pending);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    component.changeProductPage(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Próxima página de produtos"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[aria-label="Produtos disponíveis"] button').disabled).toBe(true);
    component.changeProductPage(1);
    expect(loadPage).toHaveBeenCalledTimes(1);
    pending.error(new Error('Page unavailable'));
    fixture.detectChanges();
    expect(component.productPage).toBe(0);
    expect(component.products).toEqual(products);
    fixture.nativeElement.querySelector('.errorState button').click();
    fixture.detectChanges();
    expect(loadPage).toHaveBeenLastCalledWith(brand.idBrand, 1);
    expect(component.productPage).toBe(1);
    expect(component.hasLoadError).toBe(false);
  });

  it('resets product pagination for another brand and ignores the previous response', () => {
    component.selectBrand(brand);
    component.changeProductPage(1);
    const stale = new Subject<ProductMetrics[]>();
    const loadPage = vi.spyOn(productService, 'metricsProduct').mockReturnValueOnce(stale);
    component.changeProductPage(1);
    const otherBrand = { ...brand, idBrand: 'other-brand' };
    const otherProducts = [{ ...products[0], nameProduct: 'Nova marca' }];
    loadPage.mockReturnValueOnce(of(otherProducts));
    component.selectBrand(otherBrand);
    stale.next(products);
    stale.complete();
    expect(loadPage).toHaveBeenLastCalledWith(otherBrand.idBrand, 0);
    expect(component.productPage).toBe(0);
    expect(component.products).toEqual(otherProducts);
    expect(component.isLoading).toBe(false);
  });

  it.each(['showBrands', 'showDistributors', 'ngOnDestroy'] as const)(
    'cancels a pending product request on %s', (action) => {
      const pending = new Subject<ProductMetrics[]>();
      vi.spyOn(productService, 'metricsProduct').mockReturnValue(pending);
      component.selectBrand(brand);
      component[action]();
      pending.next(products);
      pending.complete();
      expect(component.products).toEqual([]);
      expect(component.productGroups).toEqual([]);
    },
  );

  it('should load product metrics and configure the requested price chart', () => {
    component.selectDistributor(distributor);
    component.selectBrand(brand);

    expect(component.step).toBe('products');
    expect(component.products).toEqual(products);
    expect(requestedBrandId).toBe(brand.idBrand);
    expect(component.productGroups.length).toBe(1);
    expect(component.chartSeries).toEqual([
      { name: 'Preço de compra', data: [] },
      { name: 'Preço de venda', data: [] },
    ]);

    component.selectProduct(component.productGroups[0]);

    expect(component.step).toBe('chart');
    expect(component.chartSeries[0]).toEqual({ name: 'Preço de compra', data: [10, 12] });
    expect(component.chartSeries[1]).toEqual({ name: 'Preço de venda', data: [15, 20] });
    expect(component.xaxis.categories).toEqual(['27/09/2026', '26/09/2026']);
    expect(component.yaxis.min).toBe(0);
    expect(component.yaxis.max).toBe(20);
    expect(component.stroke.dashArray).toEqual([7, 7]);
  });

  it.each([[150, 60], [60, 150], [0, 0]])(
    'should load and display brand purchase and sale prices (%s, %s)',
    (first, second) => {
      const request = vi.spyOn(brandService, 'metricBrand').mockReturnValue(of([first, second]));
      component.selectDistributor(distributor);
      fixture.detectChanges();

      expect(request).toHaveBeenCalledWith(brand.idBrand);
      const prices = fixture.nativeElement.querySelectorAll('.brandMetrics b');
      expect(prices[0].textContent).toBe(component.formatCurrency(Math.min(first, second)));
      expect(prices[1].textContent).toBe(component.formatCurrency(Math.max(first, second)));
      expect(component.brandDonutSeries).toEqual([Math.min(first, second), Math.max(first, second)]);
    },
  );

  it('should total brands, drill down and switch to columns grouped by brand', () => {
    const otherBrand = { ...brand, idBrand: 'other-brand', nameBrand: 'Outra marca' };
    vi.spyOn(brandService, 'getAllBrandMetricsTotal').mockReturnValue(of([brand, otherBrand]));
    vi.spyOn(brandService, 'metricBrand').mockImplementation((id) =>
      of(id === brand.idBrand ? [150, 60] : [40, 200]),
    );
    component.selectDistributor(distributor);
    fixture.detectChanges();
    expect(component.brandDonutSeries).toEqual([100, 350]);

    fixture.nativeElement.querySelector('.brandSummary .sellTotal').click();
    fixture.detectChanges();
    expect(component.brandDonutSeries).toEqual([150, 200]);
    expect(component.brandDonutLabels).toEqual([brand.nameBrand, otherBrand.nameBrand]);
    expect(fixture.nativeElement.querySelectorAll('.brandSummary .donutBreakdown li').length).toBe(2);
    fixture.nativeElement.querySelector('.brandSummary .donutBack').click();
    expect(component.brandDonutSeries).toEqual([100, 350]);
    component.brandDonutChart.events?.dataPointSelection?.(new MouseEvent('click'), undefined, {
      dataPointIndex: 0, seriesIndex: 0, w: { config: {}, globals: {} },
    });
    expect(component.brandDonutSeries).toEqual([60, 40]);

    const selector = fixture.nativeElement.querySelector('#brandChartType') as HTMLSelectElement;
    selector.value = 'column-group-labels';
    selector.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.selectedBrandChartType).toBe('column-group-labels');
    expect(component.brandDonutDetail).toBeNull();
    expect(component.brandColumnXAxis.group?.groups).toEqual([
      { title: brand.nameBrand, cols: 2 }, { title: otherBrand.nameBrand, cols: 2 },
    ]);
    expect(component.brandColumnSeries[0].data).toEqual([
      { x: 'Compra', y: 60, fillColor: '#2563eb' },
      { x: 'Venda', y: 150, fillColor: '#16a34a' },
      { x: 'Compra', y: 40, fillColor: '#2563eb' },
      { x: 'Venda', y: 200, fillColor: '#16a34a' },
    ]);
    expect(fixture.nativeElement.querySelector('.brandSummary .donutWrapper')).toBeNull();
    selector.value = 'donut';
    selector.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.brandDonutSeries).toEqual([100, 350]);
    expect(fixture.nativeElement.querySelector('.brandSummary .donutWrapper')).not.toBeNull();
  });

  it('should update partial brand totals and distinguish errors from zero values', () => {
    const delayed = new Subject<number[]>();
    const otherBrand = { ...brand, idBrand: 'other-brand' };
    const invalidBrand = { ...brand, idBrand: 'invalid-brand' };
    vi.spyOn(brandService, 'getAllBrandMetricsTotal').mockReturnValue(of([brand, otherBrand, invalidBrand]));
    vi.spyOn(brandService, 'metricBrand').mockImplementation((id) =>
      id === brand.idBrand ? delayed : id === otherBrand.idBrand
        ? throwError(() => new Error('Unavailable')) : of([100]),
    );
    component.selectDistributor(distributor);
    fixture.detectChanges();
    expect(component.pendingBrandMetrics).toBe(1);
    expect(component.unavailableBrandMetrics).toBe(2);
    expect(fixture.nativeElement.querySelector('.brandSummary').textContent).toContain('Totais parciais');
    delayed.next([0, 0]);
    delayed.complete();
    fixture.detectChanges();
    expect(component.pendingBrandMetrics).toBe(0);
    expect(component.brandTotals).toEqual({ priceBuy: 0, priceSell: 0 });
    expect(component.hasBrandMetrics).toBe(true);
    expect(component.hasBrandDonutValues).toBe(false);
    expect(fixture.nativeElement.querySelector('.brandSummary').textContent).toContain('Sem valores');
    expect(component.hasLoadError).toBe(false);
  });

  it('should ignore stale brand metrics and reset totals when another distributor is loaded', () => {
    const stale = new Subject<number[]>();
    vi.spyOn(brandService, 'metricBrand').mockReturnValueOnce(stale);
    component.selectDistributor(distributor);
    component.showDistributors();
    component.selectDistributor({ ...distributor, id: 'new-distributor' });
    stale.next([999, 999]);
    stale.complete();
    expect(component.brandTotals).toEqual({ priceBuy: 60, priceSell: 150 });

    vi.spyOn(brandService, 'getAllBrandMetricsTotal').mockReturnValue(of([]));
    component.loadBrandTotals(distributor.id);
    expect(component.brandTotals).toEqual({ priceBuy: 0, priceSell: 0 });
    expect(component.brandColumnXAxis.group?.groups).toEqual([]);
  });

  it('should return from the chart to the product selection', () => {
    component.selectDistributor(distributor);
    component.selectBrand(brand);
    component.selectProduct(component.productGroups[0]);
    component.showProducts();

    expect(component.step).toBe('products');
    expect(component.selectedProduct).toBeNull();
    expect(component.productGroups.length).toBe(1);
  });

  it('should switch chart types without changing the selected product or price history', () => {
    component.selectDistributor(distributor);
    component.selectBrand(brand);
    component.selectProduct(component.productGroups[0]);
    const selectedProduct = component.selectedProduct;
    const priceHistory = component.chartSeries;

    component.selectChartType('column-group-labels');

    expect(component.chart.type).toBe('bar');
    expect(component.selectedProduct).toBe(selectedProduct);
    expect(component.chartSeries).toEqual(priceHistory);
    expect(component.xaxis.categories).toEqual(['27/09/2026', '26/09/2026']);
    expect(component.xaxis.group?.groups).toEqual([
      { title: '27/09/2026', cols: 1 },
      { title: '26/09/2026', cols: 1 },
    ]);

    component.selectChartType('line');

    expect(component.chart.type).toBe('line');
    expect(component.chartSeries).toEqual(priceHistory);
    expect(component.xaxis.categories).toEqual(['27/09/2026', '26/09/2026']);
    expect(component.xaxis.group?.groups).toEqual([]);
    expect(component.stroke.dashArray).toEqual([7, 7]);
    expect(component.markers.size).toBe(4);
  });

  it('should group consecutive versions by date and clear labels when leaving the product', () => {
    const versions = [
      { ...products[0], versionProduct: 3, dataCreated: '' },
      { ...products[0], versionProduct: 2, dataCreated: '2026-09-27T12:00:00' },
      products[1],
    ];
    component.selectProduct({ key: 'test', product: versions[0], versions });
    component.selectChartType('column-group-labels');

    expect(component.xaxis.group?.groups).toEqual([
      { title: '27/09/2026', cols: 2 },
      { title: 'Sem data', cols: 1 },
    ]);
    expect(component.chartSeries[0].data).toEqual([10, 12, 12]);

    component.showProducts();

    expect(component.xaxis.group?.groups).toEqual([]);
    expect(component.xaxis.categories).toEqual([]);
    expect(component.selectedChartType).toBe('column-group-labels');
  });
});

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ChartComponent,
} from 'ng-apexcharts';
import { Brand } from '../../interfaces/brand';
import { Distributor } from '../../interfaces/distributor';
import { ProductMetrics } from '../../interfaces/product-metrics';
import { BrandService } from '../../service/brand-service';
import { DistributorService } from '../../service/distributor-service';
import { ProductService } from '../../service/product-service';

type MetricsStep = 'distributors' | 'brands' | 'products' | 'chart';
type MetricsChartType = 'line' | 'column-group-labels';

interface MetricsProductGroup {
  key: string;
  product: ProductMetrics;
  versions: ProductMetrics[];
}

interface SearchListSnapshot<T> {
  items: T[];
  page: number;
  hasNextPage: boolean;
  requestedPage: number;
  hasLoadError: boolean;
}

@Component({
  selector: 'app-metrics-component',
  imports: [CommonModule, ChartComponent],
  templateUrl: './metrics-component.html',
  styleUrls: ['./metrics-component.css', '../list-controls.css'],
})
export class MetricsComponent implements OnInit, OnDestroy {
  step: MetricsStep = 'distributors';
  distributorSearch = '';
  brandSearch = '';
  productSearch = '';

  get filteredDistributors(): Distributor[] {
    return this.distributors;
  }

  get filteredBrands(): Brand[] {
    return this.brands;
  }

  get filteredProductGroups(): MetricsProductGroup[] {
    return this.productGroups;
  }

  activeDistributorSearch = '';
  activeBrandSearch = '';
  distributorSearchEmpty = false;
  brandSearchEmpty = false;
  private distributorsBeforeSearch?: SearchListSnapshot<Distributor>;
  private brandsBeforeSearch?: SearchListSnapshot<Brand>;
  private brandListRequest?: Subscription;

  distributors: Distributor[] = [];
  isLoadingDistributors = false;
  hasDistributorListError = false;
  distributorPage = 0;
  hasNextDistributorPage = false;
  private readonly distributorPageSize = 6;
  private requestedDistributorPage = 0;
  private distributorListRequest?: Subscription;
  private distributorTotalRequest?: Subscription;
  private distributorMetricRequests = new Subscription();
  private requestedDistributorMetrics = new Set<string>();
  chartDistributors: Distributor[] = [];
  isLoadingDistributorTotals = false;
  hasDistributorTotalsError = false;
  distributorMetrics: Record<string, { priceBuy: number; priceSell: number } | null | undefined> = {};
  distributorTotals = { priceBuy: 0, priceSell: 0 };
  donutDetail: 'priceBuy' | 'priceSell' | null = null;
  donutSeries: number[] = [0, 0];
  donutLabels = ['Preço de compra', 'Preço de venda'];
  donutColors = ['#2563eb', '#16a34a'];
  donutChart: ApexChart = {
    type: 'donut',
    height: 320,
    fontFamily: 'inherit',
    toolbar: { show: false },
    events: {
      dataPointSelection: (_event, _chart, options) => {
        if (this.donutDetail === null) {
          const index = options?.dataPointIndex;
          if (index === 0 || index === 1) {
            this.showDonutDetail(index === 0 ? 'priceBuy' : 'priceSell');
          }
        }
      },
    },
  };
  donutPlotOptions: ApexPlotOptions = {
    pie: { expandOnClick: false, donut: { size: '68%' } },
  };
  donutLegend: ApexLegend = { show: false };
  donutTooltip: ApexTooltip = {
    y: { formatter: (value: number) => this.formatCurrency(value) },
  };

  get pendingDistributorMetrics(): number {
    return this.chartDistributors.filter(
      (distributor) => this.distributorMetrics[this.getDistributorId(distributor)] === undefined,
    ).length;
  }

  get unavailableDistributorMetrics(): number {
    return this.chartDistributors.filter(
      (distributor) => this.distributorMetrics[this.getDistributorId(distributor)] === null,
    ).length;
  }

  get hasDonutValues(): boolean {
    return this.donutSeries.some((value) => value > 0);
  }
  brands: Brand[] = [];
  chartBrands: Brand[] = [];
  chartBrandMetrics: Record<string, { priceBuy: number; priceSell: number } | null | undefined> = {};
  isLoadingBrandTotals = false;
  hasBrandTotalsError = false;
  private brandChartLoadVersion = 0;
  brandPage = 0;
  hasNextBrandPage = false;
  isLoadingBrands = false;
  hasBrandListError = false;
  private requestedBrandPage = 0;
  brandMetrics: Record<string, { priceBuy: number; priceSell: number } | null | undefined> = {};
  brandTotals = { priceBuy: 0, priceSell: 0 };
  selectedBrandChartType: 'donut' | 'column-group-labels' = 'donut';
  brandDonutDetail: 'priceBuy' | 'priceSell' | null = null;
  brandDonutSeries: number[] = [0, 0];
  brandDonutLabels = ['Preço de compra', 'Preço de venda'];
  brandDonutColors = ['#2563eb', '#16a34a'];
  brandDonutChart: ApexChart = {
    type: 'donut', height: 320, fontFamily: 'inherit', toolbar: { show: false },
    events: {
      dataPointSelection: (_event, _chart, options) => {
        const index = options?.dataPointIndex;
        if (this.brandDonutDetail === null && (index === 0 || index === 1)) {
          this.showBrandDonutDetail(index === 0 ? 'priceBuy' : 'priceSell');
        }
      },
    },
  };
  brandColumnSeries: ApexAxisChartSeries = [];
  brandColumnChart: ApexChart = {
    type: 'bar', height: 420, fontFamily: 'inherit', toolbar: { show: true },
  };
  brandColumnPlotOptions: ApexPlotOptions = {
    bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 },
  };
  brandColumnXAxis: ApexXAxis = { categories: [] };
  brandColumnYAxis: ApexYAxis = this.createYAxis(0);
  private brandLoadVersion = 0;

  get pendingBrandMetrics(): number {
    return this.chartBrands.filter((brand) => this.chartBrandMetrics[brand.idBrand] === undefined).length;
  }

  get unavailableBrandMetrics(): number {
    return this.chartBrands.filter((brand) => this.chartBrandMetrics[brand.idBrand] === null).length;
  }

  get hasBrandDonutValues(): boolean {
    return this.brandDonutSeries.some((value) => value > 0);
  }

  get hasBrandMetrics(): boolean {
    return this.chartBrands.some((brand) => !!this.chartBrandMetrics[brand.idBrand]);
  }
  products: ProductMetrics[] = [];
  productPage = 0;
  hasNextProductPage = false;
  private requestedProductPage = 0;
  private productMetricsRequest?: Subscription;
  activeProductSearch = '';
  private productsBeforeSearch?: {
    products: ProductMetrics[];
    groups: MetricsProductGroup[];
    page: number;
    hasNextPage: boolean;
    requestedPage: number;
    hasLoadError: boolean;
  };
  productGroups: MetricsProductGroup[] = [];
  selectedDistributor: Distributor | null = null;
  selectedBrand: Brand | null = null;
  selectedProduct: MetricsProductGroup | null = null;
  isLoading = false;
  hasLoadError = false;
  selectedChartType: MetricsChartType = 'line';
  readonly chartTypes: { value: MetricsChartType; label: string }[] = [
    { value: 'line', label: 'Linhas — histórico de preços' },
    { value: 'column-group-labels', label: 'Column with Group Labels — colunas agrupadas' },
  ];

  chartSeries: ApexAxisChartSeries = [];
  chart: ApexChart = {
    type: 'line',
    height: 420,
    fontFamily: 'inherit',
    toolbar: { show: true },
    zoom: { enabled: false },
  };
  chartColors = ['#2563eb', '#16a34a'];
  dataLabels: ApexDataLabels = { enabled: false };
  plotOptions: ApexPlotOptions = {
    bar: {
      horizontal: false,
      columnWidth: '55%',
      borderRadius: 4,
      borderRadiusApplication: 'end',
    },
  };
  stroke: ApexStroke = {
    curve: 'straight',
    dashArray: [7, 7],
    lineCap: 'round',
    width: [3, 3],
  };
  markers: ApexMarkers = {
    size: 4,
    hover: { sizeOffset: 3 },
  };
  legend: ApexLegend = {
    horizontalAlign: 'right',
    position: 'top',
  };
  grid: ApexGrid = {
    borderColor: '#e2e8f0',
    strokeDashArray: 4,
  };
  xaxis: ApexXAxis = {
    categories: [],
    labels: {
      rotate: -35,
      trim: false,
    },
    title: { text: 'Data de criação' },
  };
  yaxis: ApexYAxis = this.createYAxis(0);
  tooltip: ApexTooltip = {
    shared: true,
    intersect: false,
    y: {
      formatter: (value: number) => this.formatCurrency(value),
    },
  };

  constructor(
    private readonly distributorService: DistributorService,
    private readonly brandService: BrandService,
    private readonly productService: ProductService,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDistributors();
  }

  ngOnDestroy(): void {
    ++this.brandLoadVersion;
    this.brandListRequest?.unsubscribe();
    this.productMetricsRequest?.unsubscribe();
    this.distributorListRequest?.unsubscribe();
    this.distributorTotalRequest?.unsubscribe();
    this.distributorMetricRequests.unsubscribe();
  }

  changeDistributorPage(step: -1 | 1): void {
    if (this.isLoadingDistributors || (step === -1 ? this.distributorPage === 0 : !this.hasNextDistributorPage)) return;
    this.loadDistributors(this.distributorPage + step, false);
  }

  updateDistributorSearch(value: string): void {
    this.distributorSearch = value;
    if (value.trim()) return;
    this.distributorSearchEmpty = false;
    this.restoreDistributors();
  }

  searchDistributors(): void {
    const name = this.distributorSearch.trim();
    if (!name || this.isLoadingDistributors) return;
    this.distributorsBeforeSearch ??= {
      items: this.distributors,
      page: this.distributorPage,
      hasNextPage: this.hasNextDistributorPage,
      requestedPage: this.requestedDistributorPage,
      hasLoadError: this.hasDistributorListError,
    };
    this.activeDistributorSearch = name;
    this.distributorPage = 0;
    this.hasNextDistributorPage = false;
    this.loadDistributors(0, false);
  }

  private restoreDistributors(): void {
    const previous = this.distributorsBeforeSearch;
    if (!previous) return;
    this.distributorListRequest?.unsubscribe();
    this.distributors = previous.items;
    this.distributorPage = previous.page;
    this.hasNextDistributorPage = previous.hasNextPage;
    this.requestedDistributorPage = previous.requestedPage;
    this.hasDistributorListError = previous.hasLoadError;
    this.isLoadingDistributors = false;
    this.activeDistributorSearch = '';
    this.distributorsBeforeSearch = undefined;
  }

  loadDistributors(page = this.distributorPage, reloadTotals = true): void {
    if (reloadTotals) this.loadDistributorTotals();
    this.distributorListRequest?.unsubscribe();
    this.requestedDistributorPage = page;
    this.isLoadingDistributors = true;
    this.hasDistributorListError = false;
    this.distributorSearchEmpty = false;

    const request = this.activeDistributorSearch
      ? this.distributorService.searchDistributorMetrics(this.activeDistributorSearch, page)
      : this.distributorService.getAllDistributorMetrics(page);
    this.distributorListRequest = request.subscribe({
      next: (distributors) => {
        this.isLoadingDistributors = false;
        const items = distributors ?? [];
        if (this.activeDistributorSearch && page === 0 && items.length === 0) {
          this.restoreDistributors();
          this.distributorSearchEmpty = true;
          this.changeDetectorRef.markForCheck();
          return;
        }
        this.hasNextDistributorPage = this.activeDistributorSearch
          ? items.length > 0 : items.length >= this.distributorPageSize;
        if (page > this.distributorPage && items.length === 0) {
          this.changeDetectorRef.markForCheck();
          return;
        }
        this.distributorPage = page;
        this.distributors = items;
        this.distributors.forEach((distributor) =>
          this.metricDistributor(this.getDistributorId(distributor)),
        );
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error(error);
        this.hasDistributorListError = true;
        this.isLoadingDistributors = false;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  loadDistributorTotals(): void {
    this.distributorTotalRequest?.unsubscribe();
    this.distributorMetricRequests.unsubscribe();
    this.distributorMetricRequests = new Subscription();
    this.requestedDistributorMetrics.clear();
    this.distributorMetrics = {};
    this.chartDistributors = [];
    this.isLoadingDistributorTotals = true;
    this.hasDistributorTotalsError = false;
    this.showDonutDetail(null);

    this.distributorTotalRequest = this.distributorService.getAllDistributorMetricsTotal().subscribe({
      next: (distributors) => {
        this.chartDistributors = distributors ?? [];
        this.isLoadingDistributorTotals = false;
        this.updateDistributorDonut();
        this.chartDistributors.forEach((distributor) =>
          this.metricDistributor(this.getDistributorId(distributor)),
        );
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.isLoadingDistributorTotals = false;
        this.hasDistributorTotalsError = true;
        this.changeDetectorRef.markForCheck();
      },
    });
    this.distributors.forEach((distributor) =>
      this.metricDistributor(this.getDistributorId(distributor)),
    );
  }

  selectDistributor(distributor: Distributor): void {
    const distributorId = this.getDistributorId(distributor);

    if (!distributorId) {
      return;
    }

    this.selectedDistributor = distributor;
    this.resetProductPagination();
    this.brandListRequest?.unsubscribe();
    this.activeBrandSearch = '';
    this.brandsBeforeSearch = undefined;
    this.brandSearchEmpty = false;
    this.brandSearch = '';
    this.productSearch = '';
    this.selectedBrand = null;
    this.selectedProduct = null;
    this.brands = [];
    this.brandPage = 0;
    this.hasNextBrandPage = false;
    this.products = [];
    this.productGroups = [];
    this.step = 'brands';
    this.isLoading = true;
    this.hasLoadError = false;

    this.loadBrands(distributorId, 0);
    this.loadBrandTotals(distributorId);
  }

  metricDistributor(idDistributor: string): void {
    if (this.requestedDistributorMetrics.has(idDistributor)) return;
    this.requestedDistributorMetrics.add(idDistributor);
    if (!idDistributor) {
      this.distributorMetrics[idDistributor] = null;
      this.updateDistributorDonut();
      return;
    }

    const request = this.distributorService.metricDistributor(idDistributor).subscribe({
      next: (values) => {
        this.distributorMetrics[idDistributor] =
          Array.isArray(values) && values.length === 2 && values.every(Number.isFinite)
            ? { priceBuy: Math.min(...values), priceSell: Math.max(...values) }
            : null;
        this.updateDistributorDonut();
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.distributorMetrics[idDistributor] = null;
        this.updateDistributorDonut();
        this.changeDetectorRef.markForCheck();
      },
    });
    this.distributorMetricRequests.add(request);
  }

  showDonutDetail(detail: 'priceBuy' | 'priceSell' | null): void {
    this.donutDetail = detail;
    this.updateDistributorDonut();
    this.changeDetectorRef.markForCheck();
  }

  private updateDistributorDonut(): void {
    const entries = this.chartDistributors.flatMap((distributor) => {
      const metrics = this.distributorMetrics[this.getDistributorId(distributor)];
      return metrics ? [{ distributor, metrics }] : [];
    });
    this.distributorTotals = entries.reduce(
      (totals, { metrics }) => ({
        priceBuy: totals.priceBuy + metrics.priceBuy,
        priceSell: totals.priceSell + metrics.priceSell,
      }),
      { priceBuy: 0, priceSell: 0 },
    );

    const detail = this.donutDetail;
    this.donutSeries = detail
      ? entries.map(({ metrics }) => metrics[detail])
      : [this.distributorTotals.priceBuy, this.distributorTotals.priceSell];
    this.donutLabels = detail
      ? entries.map(({ distributor }) => distributor.nameDistributor || 'Não informado')
      : ['Preço de compra', 'Preço de venda'];
    this.donutColors = detail
      ? ['#2563eb', '#0f766e', '#9333ea', '#ea580c', '#db2777', '#0891b2']
      : ['#2563eb', '#16a34a'];
  }

  changeBrandPage(step: -1 | 1): void {
    if (this.isLoadingBrands || !this.selectedDistributor ||
      (step === -1 ? this.brandPage === 0 : !this.hasNextBrandPage)) return;
    this.loadBrands(this.getDistributorId(this.selectedDistributor), this.brandPage + step);
  }

  updateBrandSearch(value: string): void {
    this.brandSearch = value;
    if (value.trim()) return;
    this.brandSearchEmpty = false;
    this.restoreBrands();
  }

  searchBrands(): void {
    const name = this.brandSearch.trim();
    if (!name || !this.selectedDistributor || this.isLoadingBrands) return;
    this.brandsBeforeSearch ??= {
      items: this.brands,
      page: this.brandPage,
      hasNextPage: this.hasNextBrandPage,
      requestedPage: this.requestedBrandPage,
      hasLoadError: this.hasBrandListError,
    };
    this.activeBrandSearch = name;
    this.brandPage = 0;
    this.hasNextBrandPage = false;
    this.loadBrands(this.getDistributorId(this.selectedDistributor), 0);
  }

  private restoreBrands(): void {
    const previous = this.brandsBeforeSearch;
    if (!previous) return;
    this.brandListRequest?.unsubscribe();
    ++this.brandLoadVersion;
    this.brands = previous.items;
    this.brandPage = previous.page;
    this.hasNextBrandPage = previous.hasNextPage;
    this.requestedBrandPage = previous.requestedPage;
    this.hasBrandListError = previous.hasLoadError;
    this.isLoadingBrands = false;
    this.isLoading = false;
    this.activeBrandSearch = '';
    this.brandsBeforeSearch = undefined;
    this.brandMetrics = {};
    this.brands.forEach((brand) => this.metricBrand(brand.idBrand));
  }

  loadBrands(idDistributor: string, page = this.brandPage): void {
    this.brandListRequest?.unsubscribe();
    const distributorId = idDistributor.trim();
    this.requestedBrandPage = page;
    const loadVersion = ++this.brandLoadVersion;
    this.isLoadingBrands = true;
    this.hasBrandListError = false;
    this.brandSearchEmpty = false;

    if (!distributorId) {
      this.brands = [];
      this.isLoadingBrands = false;
      this.hasBrandListError = true;
      return;
    }

    const request = this.activeBrandSearch
      ? this.brandService.searchBrandMetrics(this.activeBrandSearch, page)
      : this.brandService.getAllBrandMetrics(distributorId, page);
    this.brandListRequest = request.subscribe({
      next: (brands) => {
        if (loadVersion !== this.brandLoadVersion) return;
        const items = brands ?? [];
        this.isLoadingBrands = false;
        if (this.activeBrandSearch && page === 0 && items.length === 0) {
          this.restoreBrands();
          this.brandSearchEmpty = true;
          this.changeDetectorRef.markForCheck();
          return;
        }
        this.hasNextBrandPage = this.activeBrandSearch
          ? items.length > 0 : items.length >= this.brandService.pageSize;
        if (page > this.brandPage && items.length === 0) {
          this.hasNextBrandPage = false;
          this.changeDetectorRef.markForCheck();
          return;
        }
        this.brandPage = page;
        this.brands = items;
        this.brandMetrics = {};
        this.brands.forEach((brand) => this.metricBrand(brand.idBrand, loadVersion));
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        if (loadVersion !== this.brandLoadVersion) return;
        console.error(error);
        this.hasBrandListError = true;
        this.isLoadingBrands = false;
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  loadBrandTotals(idDistributor: string): void {
    const loadVersion = ++this.brandChartLoadVersion;
    this.chartBrands = [];
    this.chartBrandMetrics = {};
    this.brandDonutDetail = null;
    this.isLoadingBrandTotals = true;
    this.hasBrandTotalsError = false;
    this.updateBrandCharts();
    this.brandService.getAllBrandMetricsTotal(idDistributor).subscribe({
      next: (brands) => {
        if (loadVersion !== this.brandChartLoadVersion) return;
        this.chartBrands = brands ?? [];
        this.isLoadingBrandTotals = false;
        this.chartBrands.forEach((brand) => this.metricChartBrand(brand.idBrand, loadVersion));
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        if (loadVersion !== this.brandChartLoadVersion) return;
        this.isLoadingBrandTotals = false;
        this.hasBrandTotalsError = true;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  retryBrandTotals(): void {
    if (this.selectedDistributor) {
      this.loadBrandTotals(this.getDistributorId(this.selectedDistributor));
    }
  }

  private metricChartBrand(idBrand: string, loadVersion: number): void {
    if (!idBrand?.trim()) {
      this.chartBrandMetrics[idBrand] = null;
      this.updateBrandCharts();
      return;
    }
    this.brandService.metricBrand(idBrand).subscribe({
      next: (values) => {
        if (loadVersion !== this.brandChartLoadVersion) return;
        this.chartBrandMetrics[idBrand] =
          Array.isArray(values) && values.length === 2 && values.every(Number.isFinite)
            ? { priceBuy: Math.min(...values), priceSell: Math.max(...values) }
            : null;
        this.updateBrandCharts();
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        if (loadVersion !== this.brandChartLoadVersion) return;
        this.chartBrandMetrics[idBrand] = null;
        this.updateBrandCharts();
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  metricBrand(idBrand: string, loadVersion = this.brandLoadVersion): void {
    if (!idBrand?.trim()) {
      this.brandMetrics[idBrand] = null;
      return;
    }

    this.brandService.metricBrand(idBrand).subscribe({
      next: (values) => {
        if (loadVersion !== this.brandLoadVersion) return;
        this.brandMetrics[idBrand] =
          Array.isArray(values) && values.length === 2 && values.every(Number.isFinite)
            ? { priceBuy: Math.min(...values), priceSell: Math.max(...values) }
            : null;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        if (loadVersion !== this.brandLoadVersion) return;
        this.brandMetrics[idBrand] = null;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  selectBrandChartType(value: string): void {
    if (value !== 'donut' && value !== 'column-group-labels') return;
    this.selectedBrandChartType = value;
    this.showBrandDonutDetail(null);
  }

  showBrandDonutDetail(detail: 'priceBuy' | 'priceSell' | null): void {
    this.brandDonutDetail = detail;
    this.updateBrandCharts();
    this.changeDetectorRef.markForCheck();
  }

  private updateBrandCharts(): void {
    const entries = this.chartBrands.flatMap((brand) => {
      const metrics = this.chartBrandMetrics[brand.idBrand];
      return metrics ? [{ brand, metrics }] : [];
    });
    this.brandTotals = entries.reduce(
      (totals, { metrics }) => ({
        priceBuy: totals.priceBuy + metrics.priceBuy,
        priceSell: totals.priceSell + metrics.priceSell,
      }),
      { priceBuy: 0, priceSell: 0 },
    );
    const detail = this.brandDonutDetail;
    this.brandDonutSeries = detail
      ? entries.map(({ metrics }) => metrics[detail])
      : [this.brandTotals.priceBuy, this.brandTotals.priceSell];
    this.brandDonutLabels = detail
      ? entries.map(({ brand }) => brand.nameBrand || 'Não informada')
      : ['Preço de compra', 'Preço de venda'];
    this.brandDonutColors = detail
      ? ['#2563eb', '#0f766e', '#9333ea', '#ea580c', '#db2777', '#0891b2']
      : ['#2563eb', '#16a34a'];
    this.brandColumnSeries = [{
      name: 'Preço',
      data: entries.flatMap(({ metrics }) => [
        { x: 'Compra', y: metrics.priceBuy, fillColor: '#2563eb' },
        { x: 'Venda', y: metrics.priceSell, fillColor: '#16a34a' },
      ]),
    }];
    this.brandColumnXAxis = {
      type: 'category',
      categories: entries.flatMap(() => ['Compra', 'Venda']),
      tickPlacement: 'between',
      group: {
        groups: entries.map(({ brand }) => ({ title: brand.nameBrand || 'Não informada', cols: 2 })),
        style: { fontSize: '12px', fontWeight: 600 },
      },
      title: { text: 'Preços por marca' },
    };
    this.brandColumnYAxis = this.createYAxis(
      entries.reduce((maximum, { metrics }) => Math.max(maximum, metrics.priceSell), 0),
    );
  }

  selectBrand(brand: Brand): void {
    const brandId = String(brand.idBrand || '').trim();

    if (!brandId) {
      return;
    }

    this.selectedBrand = brand;
    this.resetProductPagination();
    this.productSearch = '';
    this.selectedProduct = null;
    this.products = [];
    this.productGroups = [];
    this.step = 'products';
    this.isLoading = true;
    this.hasLoadError = false;

    this.loadProductMetrics(brandId, 0);
  }

  changeProductPage(step: -1 | 1): void {
    if (this.isLoading || !this.selectedBrand ||
      (step === -1 ? this.productPage === 0 : !this.hasNextProductPage)) return;
    this.loadProductMetrics(this.selectedBrand.idBrand, this.productPage + step);
  }

  updateProductSearch(value: string): void {
    this.productSearch = value;
    if (value.trim()) return;

    const previous = this.productsBeforeSearch;
    if (!previous) return;

    this.productMetricsRequest?.unsubscribe();
    this.products = previous.products;
    this.productGroups = previous.groups;
    this.productPage = previous.page;
    this.hasNextProductPage = previous.hasNextPage;
    this.requestedProductPage = previous.requestedPage;
    this.hasLoadError = previous.hasLoadError;
    this.isLoading = false;
    this.selectedProduct = null;
    this.activeProductSearch = '';
    this.productsBeforeSearch = undefined;
    this.updateChart([]);
  }

  searchProducts(): void {
    const name = this.productSearch.trim();
    if (!name || !this.selectedBrand || this.isLoading) return;

    this.productsBeforeSearch ??= {
      products: this.products,
      groups: this.productGroups,
      page: this.productPage,
      hasNextPage: this.hasNextProductPage,
      requestedPage: this.requestedProductPage,
      hasLoadError: this.hasLoadError,
    };
    this.activeProductSearch = name;
    this.productPage = 0;
    this.hasNextProductPage = false;
    this.loadProductMetrics(this.selectedBrand.idBrand, 0);
  }

  private resetProductPagination(): void {
    this.productMetricsRequest?.unsubscribe();
    this.productSearch = '';
    this.activeProductSearch = '';
    this.productsBeforeSearch = undefined;
    this.productPage = 0;
    this.requestedProductPage = 0;
    this.hasNextProductPage = false;
  }

  loadProductMetrics(idBrand: string, page = this.productPage): void {
    this.productMetricsRequest?.unsubscribe();
    this.requestedProductPage = page;
    this.isLoading = true;
    this.hasLoadError = false;
    const brandId = idBrand.trim();

    if (!brandId) {
      this.products = [];
      this.productGroups = [];
      this.hasNextProductPage = false;
      this.updateChart([]);
      this.hasLoadError = true;
      this.isLoading = false;
      return;
    }

    const request = this.activeProductSearch
      ? this.productService.searchProductMetrics(this.activeProductSearch, page)
      : this.productService.metricsProduct(brandId, page);

    this.productMetricsRequest = request.subscribe({
      next: (products) => {
        const items = products ?? [];
        this.isLoading = false;
        // The endpoint returns an array without a total or a fixed page size.
        this.hasNextProductPage = items.length > 0;
        if (page > this.productPage && items.length === 0) {
          this.changeDetectorRef.markForCheck();
          return;
        }
        this.productPage = page;
        this.products = items;
        this.productGroups = this.groupProducts(this.products);
        this.selectedProduct = null;
        this.updateChart([]);
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error(error);
        this.hasLoadError = true;
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  showDistributors(): void {
    this.resetProductPagination();
    this.brandListRequest?.unsubscribe();
    ++this.brandLoadVersion;
    ++this.brandChartLoadVersion;
    this.isLoading = false;
    this.step = 'distributors';
    this.selectedDistributor = null;
    this.selectedBrand = null;
    this.selectedProduct = null;
    this.brands = [];
    this.products = [];
    this.productGroups = [];
    this.hasLoadError = false;
  }

  showBrands(): void {
    this.resetProductPagination();
    this.isLoading = false;
    this.step = 'brands';
    this.selectedBrand = null;
    this.selectedProduct = null;
    this.products = [];
    this.productGroups = [];
    this.hasLoadError = false;
  }

  selectProduct(productGroup: MetricsProductGroup): void {
    this.selectedProduct = productGroup;
    this.step = 'chart';
    this.updateChart(productGroup.versions);
  }

  showProducts(): void {
    this.step = 'products';
    this.selectedProduct = null;
    this.updateChart([]);
  }

  selectChartType(value: string): void {
    if (value !== 'line' && value !== 'column-group-labels') {
      return;
    }

    this.selectedChartType = value;
    this.updateChart(this.selectedProduct?.versions ?? []);
  }

  retry(): void {
    if (this.step === 'distributors') {
      this.loadDistributors(this.requestedDistributorPage, false);
      return;
    }

    if (this.step === 'brands' && this.selectedDistributor) {
      this.loadBrands(this.getDistributorId(this.selectedDistributor), this.requestedBrandPage);
      return;
    }

    if (this.step === 'products' && this.selectedBrand) {
      this.isLoading = true;
      this.hasLoadError = false;
      this.loadProductMetrics(this.selectedBrand.idBrand, this.requestedProductPage);
    }
  }

  getDistributorId(distributor: Distributor): string {
    return String(distributor.id || distributor.idDistributor || '').trim();
  }

  trackDistributor(index: number, distributor: Distributor): string {
    return String(distributor.id || distributor.idDistributor || '').trim() || String(index);
  }

  trackBrand(index: number, brand: Brand): string {
    return String(brand.idBrand || '').trim() || String(index);
  }

  trackProductGroup(index: number, productGroup: MetricsProductGroup): string {
    return productGroup.key || String(index);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value) || 0);
  }

  private updateChart(products: ProductMetrics[]): void {
    const isColumnChart = this.selectedChartType === 'column-group-labels';
    const sortedProducts = [...products].sort(
      (firstProduct, secondProduct) =>
        Number(firstProduct.versionProduct) - Number(secondProduct.versionProduct),
    );
    const categories = sortedProducts.map((product) => this.formatDate(product.dataCreated));
    const groups: { title: string; cols: number }[] = [];

    if (isColumnChart) {
      sortedProducts.forEach((product) => {
        const title = this.formatDate(product.dataCreated);
        const previousGroup = groups[groups.length - 1];

        if (previousGroup?.title === title) {
          previousGroup.cols += 1;
        } else {
          groups.push({ title, cols: 1 });
        }
      });
    }

    const highestPrice = sortedProducts.reduce(
      (maximum, product) =>
        Math.max(maximum, Number(product.priceBuy) || 0, Number(product.priceSell) || 0),
      0,
    );

    this.chart = { ...this.chart, type: isColumnChart ? 'bar' : 'line' };
    this.stroke = {
      ...this.stroke,
      width: isColumnChart ? 0 : [3, 3],
      dashArray: isColumnChart ? 0 : [7, 7],
    };
    this.markers = { ...this.markers, size: isColumnChart ? 0 : 4 };
    this.chartSeries = [
      {
        name: 'Preço de compra',
        data: sortedProducts.map((product) => Number(product.priceBuy) || 0),
      },
      {
        name: 'Preço de venda',
        data: sortedProducts.map((product) => Number(product.priceSell) || 0),
      },
    ];
    this.xaxis = {
      ...this.xaxis,
      type: 'category',
      categories,
      tickPlacement: 'between',
      group: { groups, style: { fontSize: '12px', fontWeight: 600 } },
      title: { text: isColumnChart ? 'Versões por data de criação' : 'Data de criação' },
    };
    this.yaxis = this.createYAxis(highestPrice);
  }

  private groupProducts(products: ProductMetrics[]): MetricsProductGroup[] {
    const groups = new Map<string, MetricsProductGroup>();

    products.forEach((product) => {
      const normalizedName = product.nameProduct.trim().toLocaleLowerCase('pt-BR');
      const key = normalizedName || String(product.idProduct || '').trim();
      const existingGroup = groups.get(key);

      if (existingGroup) {
        existingGroup.versions.push(product);
        return;
      }

      groups.set(key, {
        key,
        product,
        versions: [product],
      });
    });

    return Array.from(groups.values());
  }

  private createYAxis(maximum: number): ApexYAxis {
    return {
      min: 0,
      max: maximum > 0 ? maximum : 1,
      forceNiceScale: false,
      labels: {
        formatter: (value: number) => this.formatCurrency(value),
      },
      title: { text: 'Valor (R$)' },
    };
  }

  private formatDate(value: string | null | undefined): string {
    const rawDate = value?.trim();

    if (!rawDate) {
      return 'Sem data';
    }

    const datePart = rawDate.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return year && month && day ? `${day}/${month}/${year}` : rawDate;
  }
}

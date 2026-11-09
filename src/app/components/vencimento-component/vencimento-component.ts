import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, expand, forkJoin, map, Observable, of, reduce, ReplaySubject, Subscription, switchMap } from 'rxjs';
import { ExpiredResponse } from '../../interfaces/expired-response';
import { ExpiredService } from '../../service/expired-service';
import { Brand } from '../../interfaces/brand';
import { Distributor } from '../../interfaces/distributor';
import { BrandService } from '../../service/brand-service';
import { DistributorService } from '../../service/distributor-service';

type VerificationStatus = 'expired' | 'nearExpiry' | 'regular' | 'unknown';
type ExpirationFilter = 'all' | 'expired' | 'notExpired';

interface VerifiedExpiredResponse extends ExpiredResponse {
  verificationMessage: string;
  verificationStatus: VerificationStatus;
}

@Component({
  selector: 'app-vencimento-component',
  imports: [CommonModule],
  templateUrl: './vencimento-component.html',
  styleUrls: ['./vencimento-component.css', '../list-controls.css'],
})
export class VencimentoComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private products: VerifiedExpiredResponse[] = [];
  private dueProductsSubscription?: Subscription;
  private brandRequest?: Subscription;
  private readonly dueProductListSubject = new ReplaySubject<VerifiedExpiredResponse[]>(1);

  readonly dueProducts$: Observable<VerifiedExpiredResponse[]> =
    this.dueProductListSubject.asObservable();

  hasLoadError = false;
  isLoading = false;
  page = 0;
  hasNextPage = false;
  distributors: Distributor[] = [];
  brands: Brand[] = [];
  selectedDistributorId = '';
  selectedBrandId = '';
  searchTerm = '';
  activeSearch = '';
  selectedExpirationFilter: ExpirationFilter = 'all';
  private listBeforeSearch?: { products: VerifiedExpiredResponse[]; page: number; hasNextPage: boolean };
  isLoadingBrands = false;
  filterError = '';

  constructor(
    private readonly expiredService: ExpiredService,
    private readonly distributorService: DistributorService,
    private readonly brandService: BrandService,
  ) {}

  ngOnInit(): void {
    this.loadDueProducts();
    this.loadDistributors();
  }

  loadDistributors(): void {
    this.filterError = '';
    this.distributorService.getAllDistributor().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (distributors) => {
        this.distributors = distributors ?? [];
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.filterError = 'Não foi possível carregar as distribuidoras.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  getDistributorId(distributor: Distributor): string {
    return distributor.id || distributor.idDistributor || '';
  }

  selectDistributor(id: string): void {
    this.brandRequest?.unsubscribe();
    this.selectedDistributorId = id;
    this.selectedBrandId = '';
    this.brands = [];
    this.filterError = '';
    this.isLoadingBrands = !!id;
    this.applyFilters();
    if (!id) return;

    this.brandRequest = this.brandService.getAllBrand(id, 0).pipe(
      expand((brands, page) => brands.length >= this.brandService.pageSize
        ? this.brandService.getAllBrand(id, page + 1)
        : EMPTY),
      reduce((allBrands, brands) => allBrands.concat(brands), [] as Brand[]),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (brands) => {
        this.brands = brands ?? [];
        this.isLoadingBrands = false;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.filterError = 'Não foi possível carregar as marcas.';
        this.isLoadingBrands = false;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  selectBrand(id: string): void {
    this.selectedBrandId = id;
    this.applyFilters();
  }

  searchProducts(value: string): void {
    this.searchTerm = value;
    if (!value.trim()) this.restoreList();
  }

  submitSearch(): void {
    const name = this.searchTerm.trim();
    if (!name || this.isLoading) return;
    if (this.selectedExpirationFilter === 'all') {
      this.listBeforeSearch ??= {
        products: this.products,
        page: this.page,
        hasNextPage: this.hasNextPage,
      };
    } else {
      this.listBeforeSearch = undefined;
      this.products = [];
      this.hasNextPage = false;
    }
    this.selectedExpirationFilter = 'all';
    this.activeSearch = name;
    this.page = 0;
    this.loadDueProducts(0);
  }

  private restoreList(): void {
    const previous = this.listBeforeSearch;
    if (!previous) {
      if (this.activeSearch) this.selectExpirationFilter('all');
      return;
    }
    this.dueProductsSubscription?.unsubscribe();
    this.products = previous.products;
    this.page = previous.page;
    this.hasNextPage = previous.hasNextPage;
    this.activeSearch = '';
    this.listBeforeSearch = undefined;
    this.isLoading = false;
    this.hasLoadError = false;
    this.applyFilters();
    this.changeDetectorRef.markForCheck();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.restoreList();
    if (this.selectedExpirationFilter !== 'all') this.selectExpirationFilter('all');
    this.selectDistributor('');
  }

  selectExpirationFilter(filter: ExpirationFilter): void {
    this.selectedExpirationFilter = filter;
    this.searchTerm = '';
    this.activeSearch = '';
    this.listBeforeSearch = undefined;
    this.products = [];
    this.page = 0;
    this.hasNextPage = false;
    this.loadDueProducts(0);
  }

  get hasMissingFilterIds(): boolean {
    return this.products.some((product) => !product.idDistributor || !product.idBrand);
  }

  private applyFilters(): void {
    this.dueProductListSubject.next(this.products.filter((product) =>
      (!this.selectedDistributorId || product.idDistributor === this.selectedDistributorId)
      && (!this.selectedBrandId || product.idBrand === this.selectedBrandId),
    ));
  }

  private normalizeText(value: string): string {
    return (value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  changePage(step: -1 | 1): void {
    if (this.isLoading || (step === -1 ? this.page === 0 : !this.hasNextPage)) return;
    this.loadDueProducts(this.page + step);
  }

  loadDueProducts(page = this.page): void {
    this.dueProductsSubscription?.unsubscribe();
    this.hasLoadError = false;
    this.isLoading = true;
    this.dueProductListSubject.next([]);

    const request = this.activeSearch
      ? this.expiredService.search(this.activeSearch, page)
      : this.selectedExpirationFilter === 'all'
        ? this.expiredService.findAll(page)
        : this.expiredService.filter(this.selectedExpirationFilter === 'expired', page);
    this.dueProductsSubscription = request
      .pipe(
        switchMap((products) => products?.length
          ? forkJoin(products.map((product) =>
            this.expiredService.productExpiredVerify(product.idProduct).pipe(
              map((message): VerifiedExpiredResponse => ({
                ...product,
                verificationMessage: message,
                verificationStatus: this.getVerificationStatus(message),
              })),
              catchError(() => of<VerifiedExpiredResponse>({
                ...product,
                verificationMessage: 'Não foi possível verificar a validade deste produto.',
                verificationStatus: 'unknown',
              })),
            ),
          ))
          : of<VerifiedExpiredResponse[]>([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (products) => {
          this.hasNextPage = products.length > 0;
          if (products.length > 0 || page <= this.page) {
            this.page = page;
            this.products = [...products].sort((a, b) =>
              Number(b.verificationStatus === 'expired') - Number(a.verificationStatus === 'expired'),
            );
          }
          this.isLoading = false;
          this.applyFilters();
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.hasLoadError = true;
          this.isLoading = false;
          this.applyFilters();
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  private getVerificationStatus(message: string): VerificationStatus {
    const normalized = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/\s+/g, ' ').trim();

    if (normalized.includes('dentro do prazo de vencimento')) return 'regular';
    if (normalized.includes('perto do prazo de vencimento')
      || /prazo para vencer o produto em \d+ dias?\b/.test(normalized)) return 'nearExpiry';
    if (/\bvencido\b/.test(normalized)) return 'expired';
    return 'unknown';
  }

  formatDate(value: string | null | undefined): string {
    const date = value?.trim();

    if (!date) {
      return 'Não informado';
    }

    const [year, month, day] = date.split('T')[0].split('-');
    return year && month && day ? `${day}/${month}/${year}` : date;
  }

  displayValue(value: unknown): string {
    return value === null || value === undefined || value === ''
      ? 'Não informado'
      : String(value);
  }
}

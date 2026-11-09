import { CommonModule } from '@angular/common';
import { loadViewMode, saveViewMode, ViewMode } from '../view-mode-preference';
import { Component, DestroyRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { Brand, BrandDto, BrandEditDto } from '../../interfaces/brand';
import { BrandService } from '../../service/brand-service';
import { ComponentCommunicationService } from '../../service/component-communication-service';

type BrandEditableField = 'nameBrand' | 'typeBrand';

@Component({
  selector: 'app-brand-component',
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-component.html',
  styleUrls: ['./brand-component.css', '../collapsible-form.css', '../list-controls.css', '../search-controls.css'],
})
export class BrandComponent implements OnInit, OnDestroy {
  @Input({ required: true }) idDistributor!: string;
  @Output() readonly back = new EventEmitter<void>();
  @Output() readonly productSelected = new EventEmitter<string>();

  distributorName = '';

  private readonly brandListSubject = new ReplaySubject<Brand[]>(1);
  private brands: Brand[] = [];
  private pageRequest?: Subscription;
  private readonly destroyRef = inject(DestroyRef);
  page = 0;
  isLoadingPage = false;
  hasNextPage = false;

  arrayBrand$: Observable<Brand[]> = this.brandListSubject.asObservable();
  searchTerm = '';
  activeSearch = '';
  searchEmpty = false;
  requestedPage = 0;
  private listBeforeSearch?: {
    items: Brand[];
    page: number;
    hasNextPage: boolean;
    requestedPage: number;
    hasLoadError: boolean;
    selectedType: string;
  };
  selectedType = '';
  brandTypes: string[] = [];
  viewMode: ViewMode = loadViewMode('brand');
  brandForm: BrandDto = this.createEmptyBrandForm();
  hasLoadError = false;
  hasSaveError = false;
  hasDeleteError = false;
  hasEditError = false;
  isSaving = false;
  isFormExpanded = false;
  isEditing = false;
  isDeletingId = '';
  deleteConfirmationId: string | null = null;
  saveSuccessMessage = '';
  editSuccessMessage = '';
  editSuccessBrandId: string | null = null;
  deleteResponseMessage: string | null = null;
  editingBrandId: string | null = null;
  editingFields = new Set<BrandEditableField>();
  editingNameBrand = '';
  editingTypeBrand = '';

  constructor(
    private readonly brandService: BrandService,
    private readonly componentCommunicationService: ComponentCommunicationService,
  ) {}

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    saveViewMode('brand', mode);
  }

  toggleForm(): void {
    this.isFormExpanded = !this.isFormExpanded;
  }

  ngOnInit(): void {
    this.distributorName = this.componentCommunicationService.getDistributorName();
    this.loadBrands();
  }

  ngOnDestroy(): void {
    this.pageRequest?.unsubscribe();
  }

  changePage(step: -1 | 1): void {
    if (this.isLoadingPage || (step === -1 ? this.page === 0 : !this.hasNextPage)) return;
    this.loadBrands(this.page + step);
  }

  updateSearchTerm(value: string): void {
    this.searchTerm = value;
    if (value.trim()) {
      return;
    }
    this.searchEmpty = false;
    this.restoreList();
  }

  searchBrands(): void {
    const name = this.searchTerm.trim();
    if (!name || this.isLoadingPage) return;
    this.listBeforeSearch ??= {
      items: this.brands,
      page: this.page,
      hasNextPage: this.hasNextPage,
      requestedPage: this.requestedPage,
      hasLoadError: this.hasLoadError,
      selectedType: this.selectedType,
    };
    this.activeSearch = name;
    this.page = 0;
    this.hasNextPage = false;
    this.loadBrands(0);
  }

  private restoreList(): void {
    const previous = this.listBeforeSearch;
    if (!previous) return;
    this.pageRequest?.unsubscribe();
    this.brands = previous.items;
    this.page = previous.page;
    this.hasNextPage = previous.hasNextPage;
    this.requestedPage = previous.requestedPage;
    this.hasLoadError = previous.hasLoadError;
    this.selectedType = previous.selectedType;
    this.isLoadingPage = false;
    this.activeSearch = '';
    this.listBeforeSearch = undefined;
    this.refreshBrands();
  }

  loadBrands(page = this.page): void {
    this.pageRequest?.unsubscribe();
    this.requestedPage = page;
    this.searchEmpty = false;
    const distributorId = this.idDistributor?.trim();
    this.hasLoadError = false;

    if (!distributorId) {
      this.hasLoadError = true;
      this.brands = [];
      this.refreshBrands();
      return;
    }

    this.isLoadingPage = true;
    const request = this.activeSearch
      ? this.brandService.searchBrands(this.activeSearch, page)
      : this.brandService.getAllBrand(distributorId, page);
    this.pageRequest = request.subscribe({
      next: (brands) => {
        this.isLoadingPage = false;
        if (this.activeSearch && page === 0 && brands.length === 0) {
          this.restoreList();
          this.searchEmpty = true;
          this.applyFilters();
          return;
        }
        this.hasNextPage = this.activeSearch
          ? brands.length > 0 : brands.length >= this.brandService.pageSize;
        if (brands.length === 0 && page > 0) {
          if (page <= this.page) {
            this.loadBrands(page - 1);
          } else {
            this.applyFilters();
          }
          return;
        }
        this.page = page;
        this.brands = brands;
        this.refreshBrands();
      },
      error: () => {
        this.isLoadingPage = false;
        this.hasLoadError = true;
        this.applyFilters();
      },
    });
  }

  get totalBrands(): number {
    return this.brands.length;
  }

  applyFilters(): void {
    const type = this.normalizeText(this.selectedType);
    this.brandListSubject.next(this.brands.filter((item) =>
      !type || this.normalizeText(item.typeBrand) === type,
    ));
  }

  clearFilters(): void {
    this.updateSearchTerm('');
    this.selectedType = '';
    this.applyFilters();
  }

  private refreshBrands(): void {
    const types = new Map<string, string>();
    for (const item of this.brands) {
      const label = (item.typeBrand || '').trim();
      const key = this.normalizeText(label);
      if (key && !types.has(key)) {
        types.set(key, label);
      }
    }
    this.brandTypes = [...types.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    this.selectedType = types.get(this.normalizeText(this.selectedType)) || '';
    this.applyFilters();
  }

  private normalizeText(value: string): string {
    return (value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  trackBrand(index: number, brand: Brand): string {
    return String(brand.idBrand || '').trim() || String(index);
  }

  getBrandId(brand: Brand): string {
    return String(brand.idBrand || '').trim();
  }

  openProducts(brand: Brand): void {
    const brandId = this.getBrandId(brand);

    if (brandId) {
      this.componentCommunicationService.setBrandName(brand.nameBrand);
      this.productSelected.emit(brandId);
    }
  }

  saveBrand(): void {
    this.hasSaveError = false;
    this.saveSuccessMessage = '';
    this.isSaving = true;

    const brand: BrandDto = {
      idDistributor: this.idDistributor.trim(),
      nameBrand: this.brandForm.nameBrand.trim(),
      typeBrand: this.brandForm.typeBrand.trim(),
    };

    this.brandService.saveBrand(brand).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (savedBrand) => {
        this.isSaving = false;
        this.saveSuccessMessage = `${savedBrand.nameBrand} cadastrada com sucesso.`;
        this.brandForm = this.createEmptyBrandForm();
        this.loadBrands();
      },
      error: (error) => {
        console.error(error);
        this.isSaving = false;
        this.hasSaveError = true;
      },
    });
  }

  requestDeleteBrand(brand: Brand): void {
    this.hasDeleteError = false;
    this.deleteResponseMessage = null;

    const brandId = this.getBrandId(brand);

    if (!brandId) {
      this.hasDeleteError = true;
      return;
    }

    this.deleteConfirmationId = brandId;
  }

  cancelDelete(): void {
    this.deleteConfirmationId = null;
  }

  deleteBrand(brand: Brand): void {
    this.hasDeleteError = false;
    this.deleteResponseMessage = null;

    const brandId = this.getBrandId(brand);

    if (!brandId) {
      this.hasDeleteError = true;
      return;
    }

    if (this.deleteConfirmationId !== brandId) {
      return;
    }

    this.isDeletingId = brandId;

    this.brandService.deleteBrand(brandId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.loadBrands();
        this.deleteResponseMessage = 'Marca deletada';
        this.isDeletingId = '';
        this.deleteConfirmationId = null;

        if (this.editingBrandId === brandId) {
          this.cancelEditing();
        }
      },
      error: (error) => {
        console.error(error);
        this.hasDeleteError = true;
        this.isDeletingId = '';
        this.deleteConfirmationId = null;
      },
    });
  }

  isBrandDeleting(brand: Brand): boolean {
    const brandId = this.getBrandId(brand);
    return brandId !== '' && this.isDeletingId === brandId;
  }

  startEditing(brand: Brand): void {
    const brandId = this.getBrandId(brand);

    if (!brandId) {
      return;
    }

    if (this.editingBrandId !== brandId) {
      this.editingBrandId = brandId;
      this.editingNameBrand = brand.nameBrand;
      this.editingTypeBrand = brand.typeBrand;
      this.editingFields.clear();
    }

    this.editingFields.add('nameBrand');
    this.editingFields.add('typeBrand');
    this.hasEditError = false;
    this.editSuccessMessage = '';
    this.editSuccessBrandId = null;
  }

  isEditingField(brand: Brand, field: BrandEditableField): boolean {
    return this.editingBrandId === this.getBrandId(brand) && this.editingFields.has(field);
  }

  isEditingBrand(brand: Brand): boolean {
    return this.editingBrandId === this.getBrandId(brand) && this.editingFields.size > 0;
  }

  saveBrandEdit(): void {
    if (!this.editingBrandId || this.editingFields.size === 0) {
      return;
    }

    this.hasEditError = false;
    this.editSuccessMessage = '';
    this.editSuccessBrandId = null;
    this.isEditing = true;

    const brandEditDto: BrandEditDto = {
      idBrand: this.editingBrandId,
      idDistributor: this.idDistributor.trim(),
      nameBrand: this.editingNameBrand.trim(),
      typeBrand: this.editingTypeBrand.trim(),
    };

    this.brandService.editBrand(brandEditDto).subscribe({
      next: (response) => {
        this.brands = this.brands.map((brand) =>
          this.getBrandId(brand) === brandEditDto.idBrand ? { ...brand, ...brandEditDto } : brand,
        );
        this.refreshBrands();
        this.isEditing = false;
        this.editSuccessBrandId = brandEditDto.idBrand;
        this.editSuccessMessage = response;
        this.cancelEditing();
      },
      error: (error) => {
        console.error(error);
        this.isEditing = false;
        this.hasEditError = true;
      },
    });
  }

  cancelEditing(): void {
    this.editingBrandId = null;
    this.editingFields.clear();
    this.editingNameBrand = '';
    this.editingTypeBrand = '';
  }

  goBack(): void {
    this.back.emit();
  }

  private createEmptyBrandForm(): BrandDto {
    return {
      idDistributor: this.idDistributor?.trim() || '',
      nameBrand: '',
      typeBrand: '',
    };
  }
}

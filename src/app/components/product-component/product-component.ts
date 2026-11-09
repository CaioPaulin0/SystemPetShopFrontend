import { CommonModule } from '@angular/common';
import { loadViewMode, saveViewMode, ViewMode } from '../view-mode-preference';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import {
  Product,
  ProductDto,
  ProductEditDto,
  ProductImageAIResponse,
} from '../../interfaces/product';
import { ProductService } from '../../service/product-service';
import { ComponentCommunicationService } from '../../service/component-communication-service';

type ProductFieldKey = keyof ProductEditDto;
type ProductEditableField = Exclude<
  ProductFieldKey,
  'idProduct' | 'idBrand' | 'idDistributor' | 'versionProduct'
>;
type ProductInputType = 'text' | 'date' | 'number';
type ProductEditingMode = 'details' | 'values';

interface ProductField {
  key: ProductFieldKey;
  label: string;
  type: ProductInputType;
  control?: 'input' | 'textarea';
  step?: string;
  editable?: boolean;
}

interface ProductImageSelection {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-product-component',
  imports: [CommonModule, FormsModule],
  templateUrl: './product-component.html',
  styleUrls: ['./product-component.css', '../collapsible-form.css', '../list-controls.css', '../search-controls.css'],
})
export class ProductComponent implements OnDestroy, OnInit {
  private readonly profitPercentageStorageKey = 'product-profit-percentage';
  private readonly productDetailFields: ProductEditableField[] = [
    'typeProduct',
    'descriptionProduct',
  ];
  private readonly productValueFields: ProductEditableField[] = [
    'dataCreatedProduct',
    'dataDueProduct',
    'lotProduct',
    'priceBuy',
    'priceSell',
    'stockProduct',
  ];

  @Input({ required: true }) idBrand!: string;
  @Input({ required: true }) idDistributor!: string;
  @Output() readonly back = new EventEmitter<void>();

  brandName = '';
  distributorName = '';

  readonly productFields: ProductField[] = [
    { key: 'idBrand', label: 'Nome da marca', type: 'text', editable: false },
    { key: 'idDistributor', label: 'Nome da distribuidora', type: 'text', editable: false },
    { key: 'typeProduct', label: 'Tipo', type: 'text' },
    { key: 'descriptionProduct', label: 'Descrição', type: 'text', control: 'textarea' },
    { key: 'dataCreatedProduct', label: 'Data de criação', type: 'date' },
    { key: 'dataDueProduct', label: 'Data de validade', type: 'date' },
    { key: 'lotProduct', label: 'Lote', type: 'text' },
    { key: 'priceBuy', label: 'Preço de compra', type: 'number', step: '0.01' },
    { key: 'priceSell', label: 'Preço de venda', type: 'number', step: '0.01' },
    { key: 'stockProduct', label: 'Estoque', type: 'number', step: '1' },
  ];

  private readonly productListSubject = new ReplaySubject<Product[]>(1);
  private products: Product[] = [];
  private pageRequest?: Subscription;
  page = 0;
  isLoadingPage = false;
  hasNextPage = false;

  arrayProduct$: Observable<Product[]> = this.productListSubject.asObservable();
  searchTerm = '';
  activeSearch = '';
  searchEmpty = false;
  requestedPage = 0;
  private listBeforeSearch?: {
    items: Product[];
    page: number;
    hasNextPage: boolean;
    requestedPage: number;
    hasLoadError: boolean;
    selectedType: string;
  };
  selectedType = '';
  productTypes: string[] = [];
  viewMode: ViewMode = loadViewMode('product');
  productForm: ProductDto = this.createEmptyProductForm();
  profitPercentage = this.loadProfitPercentage();
  selectedImages: ProductImageSelection[] = [];
  hasLoadError = false;
  hasSaveError = false;
  hasImageScanError = false;
  hasDeleteError = false;
  hasEditError = false;
  isSaving = false;
  isFormExpanded = false;
  isScanningImages = false;
  isEditing = false;
  isRegisteringNewVersion = false;
  isDeletingId = '';
  deleteConfirmationId: string | null = null;
  saveSuccessMessage = '';
  imageScanSuccessMessage = '';
  imageScanErrorMessage = '';
  editSuccessMessage = '';
  editSuccessProductId: string | null = null;
  deleteResponseMessage: string | null = null;
  editingProductId: string | null = null;
  editingProduct: ProductEditDto | null = null;
  editingMode: ProductEditingMode | null = null;
  editingFields = new Set<ProductEditableField>();

  constructor(
    private readonly productService: ProductService,
    private readonly componentCommunicationService: ComponentCommunicationService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
  ) {}

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    saveViewMode('product', mode);
  }

  toggleForm(): void {
    this.isFormExpanded = !this.isFormExpanded;
  }

  ngOnInit(): void {
    this.brandName = this.componentCommunicationService.getBrandName();
    this.distributorName = this.componentCommunicationService.getDistributorName();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.pageRequest?.unsubscribe();
    this.selectedImages.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const existingImageKeys = new Set(this.selectedImages.map(({ file }) => this.getImageKey(file)));

    files.forEach((file) => {
      const imageKey = this.getImageKey(file);

      if ((!file.type || !file.type.startsWith('image/')) || existingImageKeys.has(imageKey)) {
        return;
      }

      this.selectedImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
      existingImageKeys.add(imageKey);
    });

    input.value = '';
    this.hasImageScanError = false;
    this.imageScanErrorMessage = '';
    this.imageScanSuccessMessage = '';
  }

  removeSelectedImage(image: ProductImageSelection): void {
    const imageIndex = this.selectedImages.indexOf(image);

    if (imageIndex === -1) {
      return;
    }

    URL.revokeObjectURL(image.previewUrl);
    this.selectedImages.splice(imageIndex, 1);
    this.imageScanSuccessMessage = '';
  }

  scanProductWithImages(): void {
    this.hasImageScanError = false;
    this.imageScanErrorMessage = '';
    this.imageScanSuccessMessage = '';

    if (this.selectedImages.length === 0) {
      this.hasImageScanError = true;
      this.imageScanErrorMessage = 'Selecione pelo menos uma imagem para analisar o produto.';
      return;
    }

    this.isScanningImages = true;

    this.productService.scanProductImages(this.selectedImages.map(({ file }) => file)).subscribe({
      next: (response) => {
        this.applyImageScanResponse(response);
        this.isScanningImages = false;
        this.imageScanSuccessMessage = 'Informações do produto preenchidas automaticamente.';
      },
      error: (error) => {
        console.error(error);
        this.isScanningImages = false;
        this.hasImageScanError = true;
        this.imageScanErrorMessage = 'Não foi possível analisar as imagens do produto.';
      },
    });
  }

  onProfitPercentageChange(value: string | number): void {
    this.profitPercentage = Math.max(0, this.numberOrZero(value));
    this.saveProfitPercentage();
    this.updateSellingPrice(this.productForm);
    if (this.editingMode === 'values' && this.editingProduct) {
      this.updateSellingPrice(this.editingProduct);
    }
  }

  onPriceBuyChange(value: string | number): void {
    this.productForm.priceBuy = this.numberOrZero(value);
    this.updateSellingPrice(this.productForm);
  }

  changePage(step: -1 | 1): void {
    if (this.isLoadingPage || (step === -1 ? this.page === 0 : !this.hasNextPage)) return;
    this.loadProducts(this.page + step);
  }

  updateSearchTerm(value: string): void {
    this.searchTerm = value;
    if (value.trim()) {
      return;
    }
    this.searchEmpty = false;
    this.restoreList();
  }

  searchProducts(): void {
    const name = this.searchTerm.trim();
    if (!name || this.isLoadingPage) return;
    this.listBeforeSearch ??= {
      items: this.products,
      page: this.page,
      hasNextPage: this.hasNextPage,
      requestedPage: this.requestedPage,
      hasLoadError: this.hasLoadError,
      selectedType: this.selectedType,
    };
    this.activeSearch = name;
    this.page = 0;
    this.hasNextPage = false;
    this.loadProducts(0);
  }

  private restoreList(): void {
    const previous = this.listBeforeSearch;
    if (!previous) return;
    this.pageRequest?.unsubscribe();
    this.products = previous.items;
    this.page = previous.page;
    this.hasNextPage = previous.hasNextPage;
    this.requestedPage = previous.requestedPage;
    this.hasLoadError = previous.hasLoadError;
    this.selectedType = previous.selectedType;
    this.isLoadingPage = false;
    this.activeSearch = '';
    this.listBeforeSearch = undefined;
    this.refreshProducts();
  }

  loadProducts(page = this.page): void {
    this.pageRequest?.unsubscribe();
    this.requestedPage = page;
    this.searchEmpty = false;
    const brandId = this.idBrand?.trim();
    this.hasLoadError = false;

    if (!brandId) {
      this.hasLoadError = true;
      this.page = 0;
      this.isLoadingPage = false;
      this.hasNextPage = false;
      this.products = [];
      this.refreshProducts();
      return;
    }

    this.isLoadingPage = true;
    const request = this.activeSearch
      ? this.productService.searchProducts(this.activeSearch, page)
      : this.productService.getAllProduct(brandId, page);
    this.pageRequest = request.subscribe({
      next: (products) => {
        this.isLoadingPage = false;
        if (this.activeSearch && page === 0 && products.length === 0) {
          this.restoreList();
          this.searchEmpty = true;
          this.applyFilters();
          return;
        }
        this.hasNextPage = products.length > 0;
        if (products.length === 0 && page > 0) {
          if (page <= this.page) {
            this.loadProducts(page - 1);
          } else {
            this.changeDetectorRef.markForCheck();
          }
          return;
        }
        this.page = page;
        this.products = products;
        this.refreshProducts();
      },
      error: () => {
        this.isLoadingPage = false;
        this.hasLoadError = true;
        this.applyFilters();
      },
    });
  }

  get totalProducts(): number {
    return this.products.length;
  }

  applyFilters(): void {
    const type = this.normalizeText(this.selectedType);
    this.productListSubject.next(this.products.filter((item) =>
      !type || this.normalizeText(item.typeProduct) === type,
    ));
  }

  clearFilters(): void {
    this.updateSearchTerm('');
    this.selectedType = '';
    this.applyFilters();
  }

  private refreshProducts(): void {
    const types = new Map<string, string>();
    for (const item of this.products) {
      const label = (item.typeProduct || '').trim();
      const key = this.normalizeText(label);
      if (key && !types.has(key)) {
        types.set(key, label);
      }
    }
    this.productTypes = [...types.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    this.selectedType = types.get(this.normalizeText(this.selectedType)) || '';
    this.applyFilters();
  }

  private normalizeText(value: string): string {
    return (value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  trackProduct(index: number, product: Product): string {
    return String(product.idProduct || '').trim() || String(index);
  }

  getProductId(product: Product): string {
    return String(product.idProduct || '').trim();
  }

  getProductValue(product: Product, field: ProductFieldKey): string | number {
    if (field === 'idBrand') {
      return this.brandName;
    }

    if (field === 'idDistributor') {
      return this.distributorName;
    }

    return product[field];
  }

  getEditingValue(field: ProductFieldKey): string | number {
    if (!this.isEditableField(field)) {
      return this.getReadonlyProductValue(field);
    }

    return this.editingProduct?.[field] ?? '';
  }

  displayProductValue(value: string | number | null | undefined): string {
    return value === null || value === undefined || value === ''
      ? 'Não informado'
      : String(value);
  }

  saveProduct(): void {
    this.hasSaveError = false;
    this.saveSuccessMessage = '';
    this.isSaving = true;

    const productDto: ProductDto = {
      ...this.productForm,
      idBrand: this.idBrand.trim(),
      idDistributor: this.idDistributor.trim(),
      nameProduct: this.productForm.nameProduct.trim(),
      typeProduct: this.productForm.typeProduct.trim(),
      descriptionProduct: this.productForm.descriptionProduct.trim(),
      dataCreatedProduct: this.normalizeDate(this.productForm.dataCreatedProduct),
      dataDueProduct: this.normalizeDate(this.productForm.dataDueProduct),
    };

    this.productService.saveProduct(productDto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (savedProduct) => {
        this.isSaving = false;
        this.saveSuccessMessage = `${savedProduct.nameProduct} cadastrado com sucesso.`;
        this.productForm = this.createEmptyProductForm();
        this.loadProducts();
      },
      error: (error) => {
        console.error(error);
        this.isSaving = false;
        this.hasSaveError = true;
      },
    });
  }

  requestDeleteProduct(product: Product): void {
    this.hasDeleteError = false;
    this.deleteResponseMessage = null;

    const productId = this.getProductId(product);

    if (!productId) {
      this.hasDeleteError = true;
      return;
    }

    this.deleteConfirmationId = productId;
  }

  cancelDelete(): void {
    this.deleteConfirmationId = null;
  }

  deleteProduct(product: Product): void {
    this.hasDeleteError = false;
    this.deleteResponseMessage = null;

    const productId = this.getProductId(product);

    if (!productId) {
      this.hasDeleteError = true;
      return;
    }

    if (this.deleteConfirmationId !== productId) {
      return;
    }

    this.isDeletingId = productId;

    this.productService.deleteProduct(productId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.loadProducts();
        this.deleteResponseMessage = "Produto deletado";
        this.isDeletingId = '';
        this.deleteConfirmationId = null;

        if (this.editingProductId === productId) {
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

  isProductDeleting(product: Product): boolean {
    const productId = this.getProductId(product);
    return productId !== '' && this.isDeletingId === productId;
  }

  startEditingProduct(product: Product): void {
    this.startEditing(product, 'details', this.productDetailFields);
  }

  private startEditing(
    product: Product,
    mode: ProductEditingMode,
    fields: ProductEditableField[],
  ): void {
    const productId = this.getProductId(product);

    if (!productId) {
      return;
    }

    if (this.editingProductId !== productId) {
      this.editingProductId = productId;
      this.editingProduct = { ...product };
    }

    this.editingMode = mode;
    this.editingFields = new Set(fields);
    this.hasEditError = false;
    this.editSuccessMessage = '';
    this.editSuccessProductId = null;
  }

  isEditingField(product: Product, field: ProductFieldKey): boolean {
    return (
      this.isEditableField(field) &&
      this.editingProductId === this.getProductId(product) &&
      this.editingFields.has(field)
    );
  }

  isEditingProduct(product: Product): boolean {
    return this.editingProductId === this.getProductId(product) && this.editingFields.size > 0;
  }

  isEditingProductDetails(product: Product): boolean {
    return this.isEditingProduct(product) && this.editingMode === 'details';
  }

  isEditingProductValues(product: Product): boolean {
    return this.isEditingProduct(product) && this.editingMode === 'values';
  }

  hasProductValueChanged(product: Product): boolean {
    return (
      this.isEditingProductValues(product) &&
      this.editingProduct !== null &&
      (this.editingProduct.dataCreatedProduct !== product.dataCreatedProduct ||
        this.editingProduct.dataDueProduct !== product.dataDueProduct ||
        this.editingProduct.lotProduct !== product.lotProduct ||
        this.editingProduct.priceBuy !== product.priceBuy ||
        this.editingProduct.priceSell !== product.priceSell ||
        this.editingProduct.stockProduct !== product.stockProduct)
    );
  }

  setEditingValue(field: ProductFieldKey, value: string | number): void {
    if (!this.editingProduct || !this.isEditableField(field)) {
      return;
    }

    if (this.isNumericField(field)) {
      this.editingProduct[field] = value === '' ? 0 : Number(value);
      if (field === 'priceBuy' && this.editingMode === 'values') {
        this.profitPercentage = this.loadProfitPercentage();
        this.updateSellingPrice(this.editingProduct);
      }
      return;
    }

    this.editingProduct[field] = String(value);
  }

  saveProductEdit(): void {
    if (
      !this.editingProductId ||
      !this.editingProduct ||
      this.editingFields.size === 0 ||
      this.editingMode !== 'details' ||
      this.isRegisteringNewVersion
    ) {
      return;
    }

    this.hasEditError = false;
    this.editSuccessMessage = '';
    this.editSuccessProductId = null;
    this.isEditing = true;
    const productEditDto = this.normalizeProductEdit(this.editingProduct);

    this.productService.editProduct(productEditDto).subscribe({
      next: (response) => {
        this.products = this.products.map((product) =>
          this.getProductId(product) === productEditDto.idProduct
            ? { ...product, ...productEditDto }
            : product,
        );
        this.refreshProducts();
        this.isEditing = false;
        this.editSuccessProductId = productEditDto.idProduct;
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

  registerNewProductValue(product: Product): void {
    if (!this.isEditingProduct(product)) {
      this.profitPercentage = this.loadProfitPercentage();
      this.startEditing(product, 'values', this.productValueFields);
      return;
    }

    if (
      !this.editingProduct ||
      this.editingMode !== 'values' ||
      !this.hasProductValueChanged(product) ||
      this.isEditing ||
      this.isRegisteringNewVersion
    ) {
      return;
    }

    this.hasEditError = false;
    this.editSuccessMessage = '';
    this.editSuccessProductId = null;
    this.isRegisteringNewVersion = true;

    const productWithNewValues: Product = {
      ...product,
      ...this.normalizeProductEdit(this.editingProduct),
    };
    this.productService.newVersion(productWithNewValues).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (savedProduct) => {
        const savedProductId = this.getProductId(savedProduct);
        this.loadProducts();
        this.isRegisteringNewVersion = false;
        this.editSuccessProductId = savedProductId;
        this.editSuccessMessage = 'Novo valor cadastrado com sucesso.';
        this.cancelEditing();
      },
      error: (error) => {
        console.error(error);
        this.isRegisteringNewVersion = false;
        this.hasEditError = true;
      },
    });
  }

  cancelEditing(): void {
    this.editingProductId = null;
    this.editingProduct = null;
    this.editingMode = null;
    this.editingFields.clear();
  }

  goBack(): void {
    this.back.emit();
  }

  private createEmptyProductForm(): ProductDto {
    return {
      idBrand: this.idBrand?.trim() || '',
      idDistributor: this.idDistributor?.trim() || '',
      nameProduct: '',
      typeProduct: '',
      descriptionProduct: '',
      dataCreatedProduct: '',
      dataDueProduct: '',
      versionProduct: 0,
      lotProduct: '',
      priceBuy: 0,
      priceSell: 0,
      stockProduct: 0,
      dataDueProductVerify: false
    };
  }

  private applyImageScanResponse(response: ProductImageAIResponse): void {
    if (response) {
      this.productForm = {
        ...this.productForm,
        nameProduct: this.valueOrZero(response?.nameProduct),
        typeProduct: this.valueOrZero(response?.typeProduct),
        descriptionProduct: this.valueOrZero(response?.descriptionProduct),
        dataCreatedProduct: this.normalizeDate(response?.dataCreatedProduct ?? '') || this.productForm.dataCreatedProduct,
        dataDueProduct: this.normalizeDate(response?.dataDueProduct ?? '') || this.productForm.dataDueProduct,
        lotProduct: response?.lotProduct ?? '',
        priceBuy: this.numberOrZero(this.productForm.priceBuy),
        priceSell: this.numberOrZero(this.productForm.priceSell),
        stockProduct: this.numberOrZero(this.productForm.stockProduct),
        dataDueProductVerify: false,
      };
    }

    this.changeDetectorRef.detectChanges();
  }

  private valueOrZero(value: string | null | undefined): string {
    return value?.trim() || '0';
  }

  private numberOrZero(value: number | string | null | undefined): number {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  private updateSellingPrice(product: Pick<ProductEditDto, 'priceBuy' | 'priceSell'>): void {
    const priceBuy = this.numberOrZero(product.priceBuy);
    const percentage = Math.max(0, this.numberOrZero(this.profitPercentage));

    product.priceSell = Number((priceBuy * (1 + percentage / 100)).toFixed(2));
  }

  private loadProfitPercentage(): number {
    try {
      const storedPercentage = localStorage.getItem(this.profitPercentageStorageKey);
      return Math.max(0, this.numberOrZero(storedPercentage));
    } catch {
      return 0;
    }
  }

  private saveProfitPercentage(): void {
    try {
      localStorage.setItem(this.profitPercentageStorageKey, String(this.profitPercentage));
    } catch {
      // O cadastro continua funcionando mesmo quando o navegador bloqueia o localStorage.
    }
  }

  private getImageKey(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  private normalizeProductEdit(product: ProductEditDto): ProductEditDto {
    return {
      idProduct: product.idProduct.trim(),
      idBrand: this.idBrand.trim(),
      idDistributor: this.idDistributor.trim(),
      typeProduct: product.typeProduct.trim(),
      descriptionProduct: product.descriptionProduct.trim(),
      dataCreatedProduct: this.normalizeDate(product.dataCreatedProduct),
      dataDueProduct: this.normalizeDate(product.dataDueProduct),
      versionProduct: product.versionProduct,
      lotProduct: product.lotProduct,
      priceBuy: product.priceBuy,
      priceSell: product.priceSell,
      stockProduct: product.stockProduct,
    };
  }

  private normalizeDate(value: string): string {
    const dateOnly = value.trim().match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    return dateOnly || '';
  }

  private isNumericField(
    field: ProductEditableField,
  ): field is 'priceBuy' | 'priceSell' | 'stockProduct' {
    return ['priceBuy', 'priceSell', 'stockProduct'].includes(field);
  }

  private isEditableField(field: ProductFieldKey): field is ProductEditableField {
    return (
      field !== 'idProduct' &&
      field !== 'idBrand' &&
      field !== 'idDistributor' &&
      field !== 'versionProduct'
    );
  }

  private getReadonlyProductValue(field: ProductFieldKey): string {
    return field === 'idBrand' ? this.brandName : this.distributorName;
  }
}

import { CommonModule } from '@angular/common';
import { loadViewMode, saveViewMode, ViewMode } from '../view-mode-preference';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DistributorService } from '../../service/distributor-service';
import { ComponentCommunicationService } from '../../service/component-communication-service';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { Distributor, DistributorSaveDto } from '../../interfaces/distributor';

@Component({
  selector: 'app-distributor-component',
  imports: [CommonModule, FormsModule],
  templateUrl: './distributor-component.html',
  styleUrls: ['./distributor-component.css', '../collapsible-form.css', '../search-controls.css'],
})
export class DistributorComponent implements OnInit, OnDestroy {
  @Output() readonly distributorSelected = new EventEmitter<string>();

  private readonly distributorListSubject = new ReplaySubject<Distributor[]>(1);
  private distributors: Distributor[] = [];
  private pageRequest?: Subscription;
  page = 0;
  isLoadingPage = false;
  hasNextPage = false;
  arrayDistributor$: Observable<Distributor[]> = this.distributorListSubject.asObservable();
  searchTerm = '';
  activeSearch = '';
  searchEmpty = false;
  requestedPage = 0;
  private listBeforeSearch?: {
    items: Distributor[];
    page: number;
    hasNextPage: boolean;
    requestedPage: number;
    hasLoadError: boolean;
    selectedType: string;
  };
  selectedType = '';
  distributorTypes: string[] = [];
  viewMode: ViewMode = loadViewMode('distributor');
  hasLoadError = false;
  hasSaveError = false;
  hasDeleteError = false;
  isSaving = false;
  isFormExpanded = false;
  isDeletingId = '';
  deleteConfirmationId: string | null = null;
  saveSuccessMessage = '';
  deleteResponseMessage: string | null = null;
  salespeopleInput = '';
  telephonesInput = '';
  distributorForm: DistributorSaveDto = this.createEmptyDistributorForm();

  constructor(
    private distributorService: DistributorService,
    private readonly componentCommunicationService: ComponentCommunicationService,
  ) {}

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    saveViewMode('distributor', mode);
  }

  toggleForm(): void {
    this.isFormExpanded = !this.isFormExpanded;
  }

  ngOnInit(): void {
    this.loadDistributors();
  }

  ngOnDestroy(): void {
    this.pageRequest?.unsubscribe();
  }

  changePage(step: -1 | 1): void {
    if (this.isLoadingPage || (step === -1 ? this.page === 0 : !this.hasNextPage)) {
      return;
    }
    this.loadDistributors(this.page + step);
  }

  updateSearchTerm(value: string): void {
    this.searchTerm = value;
    if (value.trim()) {
      return;
    }
    this.searchEmpty = false;
    this.restoreList();
  }

  searchDistributors(): void {
    const name = this.searchTerm.trim();
    if (!name || this.isLoadingPage) return;
    this.listBeforeSearch ??= {
      items: this.distributors,
      page: this.page,
      hasNextPage: this.hasNextPage,
      requestedPage: this.requestedPage,
      hasLoadError: this.hasLoadError,
      selectedType: this.selectedType,
    };
    this.activeSearch = name;
    this.page = 0;
    this.hasNextPage = false;
    this.loadDistributors(0);
  }

  private restoreList(): void {
    const previous = this.listBeforeSearch;
    if (!previous) return;
    this.pageRequest?.unsubscribe();
    this.distributors = previous.items;
    this.page = previous.page;
    this.hasNextPage = previous.hasNextPage;
    this.requestedPage = previous.requestedPage;
    this.hasLoadError = previous.hasLoadError;
    this.selectedType = previous.selectedType;
    this.isLoadingPage = false;
    this.activeSearch = '';
    this.listBeforeSearch = undefined;
    this.refreshDistributors();
  }

  loadDistributors(page = this.page): void {
    this.pageRequest?.unsubscribe();
    this.requestedPage = page;
    this.searchEmpty = false;
    this.isLoadingPage = true;
    this.hasLoadError = false;
    const request = this.activeSearch
      ? this.distributorService.searchDistributors(this.activeSearch, page)
      : this.distributorService.getAllDistributor(page);
    this.pageRequest = request.subscribe({
      next: (distributors) => {
        this.isLoadingPage = false;
        if (this.activeSearch && page === 0 && distributors.length === 0) {
          this.restoreList();
          this.searchEmpty = true;
          this.applyFilters();
          return;
        }
        this.hasNextPage = distributors.length > 0;
        if (page > this.page && !this.hasNextPage) {
          this.applyFilters();
          return;
        }
        this.page = page;
        this.distributors = distributors;
        this.refreshDistributors();
      },
      error: (error) => {
        console.error(error);
        this.isLoadingPage = false;
        this.hasLoadError = true;
        this.applyFilters();
      },
    });
  }

  get totalDistributors(): number {
    return this.distributors.length;
  }

  applyFilters(): void {
    const type = this.normalizeText(this.selectedType);

    this.distributorListSubject.next(this.distributors.filter((distributor) => {
      const matchesType = !type || this.normalizeText(distributor.typeDistributor) === type;
      return matchesType;
    }));
  }

  clearFilters(): void {
    this.updateSearchTerm('');
    this.selectedType = '';
    this.applyFilters();
  }

  private refreshDistributors(): void {
    const types = new Map<string, string>();
    for (const distributor of this.distributors) {
      const label = (distributor.typeDistributor || '').trim();
      const key = this.normalizeText(label);
      if (key && !types.has(key)) {
        types.set(key, label);
      }
    }
    this.distributorTypes = [...types.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    this.selectedType = types.get(this.normalizeText(this.selectedType)) || '';
    this.applyFilters();
  }

  private normalizeText(value: string): string {
    return (value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  trackDistributor(_index: number, distributor: Distributor): string {
    const distributorId = String(distributor.id || distributor.idDistributor || '').trim();
    return distributorId || String(_index);
  }

  getDistributorId(distributor: Distributor): string {
    return String(distributor.id || distributor.idDistributor || '').trim();
  }

  openBrands(distributor: Distributor): void {
    const distributorId = this.getDistributorId(distributor);

    if (distributorId) {
      this.componentCommunicationService.setDistributorName(distributor.nameDistributor);
      this.componentCommunicationService.clearBrandName();
      this.distributorSelected.emit(distributorId);
    }
  }

  isDistributorDeleting(distributor: Distributor): boolean {
    const distributorId = this.getDistributorId(distributor);
    return distributorId !== '' && this.isDeletingId === distributorId;
  }

  hasItems(items: unknown[] | null | undefined): boolean {
    return Array.isArray(items) && items.length > 0;
  }

  formatItem(item: unknown): string {
    if (item === null || item === undefined || item === '') {
      return 'Não informado';
    }

    if (Array.isArray(item)) {
      return item.map((value) => this.formatItem(value)).join(' - ');
    }

    if (typeof item === 'object') {
      const values = Object.entries(item as Record<string, unknown>)
        .filter(([key]) => !key.toLowerCase().startsWith('id'))
        .map(([, value]) => this.formatItem(value))
        .filter((value) => value !== 'Não informado');

      return values.length ? values.join(' - ') : 'Não informado';
    }

    return String(item);
  }

  getDistributorCnpj(distributor: Distributor): string {
    return distributor.CNPJ || distributor.cnpj || '';
  }

  saveDistributor(): void {
    this.hasSaveError = false;
    this.saveSuccessMessage = '';
    this.isSaving = true;

    const distributor: DistributorSaveDto = {
      ...this.distributorForm,
      nameDistributor: this.distributorForm.nameDistributor.trim(),
      localizationDistributor: this.distributorForm.localizationDistributor.trim(),
      typeDistributor: this.distributorForm.typeDistributor.trim(),
      CNPJ: this.distributorForm.CNPJ.trim(),
      salespeopleDistributor: this.parseListInput(this.salespeopleInput),
      telephones: this.parseListInput(this.telephonesInput),
    };

    this.distributorService.saveDistributor(distributor).subscribe({
      next: (savedDistributor) => {
        this.isSaving = false;
        this.saveSuccessMessage = `${savedDistributor.nameDistributor} cadastrado com sucesso.`;
        this.distributorForm = this.createEmptyDistributorForm();
        this.salespeopleInput = '';
        this.telephonesInput = '';
        this.loadDistributors();
      },
      error: (error) => {
        console.error(error);
        this.isSaving = false;
        this.hasSaveError = true;
      },
    });
  }

  requestDeleteDistributor(distributor: Distributor): void {
    this.hasDeleteError = false;
    this.deleteResponseMessage = null;

    const distributorId = this.getDistributorId(distributor);

    if (!distributorId) {
      this.hasDeleteError = true;
      return;
    }

    this.deleteConfirmationId = distributorId;
  }

  cancelDelete(): void {
    this.deleteConfirmationId = null;
  }

  deleteDistributor(distributor: Distributor): void {
    this.hasDeleteError = false;
    this.deleteResponseMessage = null;

    const distributorId = this.getDistributorId(distributor);

    if (!distributorId) {
      this.hasDeleteError = true;
      return;
    }

    if (this.deleteConfirmationId !== distributorId) {
      return;
    }

    this.isDeletingId = distributorId;

    this.distributorService.deleteDistributor(distributorId).subscribe({
      next: (response) => {
        this.distributors = this.distributors.filter(
          (item) => this.getDistributorId(item) !== distributorId,
        );
        this.refreshDistributors();
        this.deleteResponseMessage = "Distribuidor deletado";
        this.isDeletingId = '';
        this.deleteConfirmationId = null;
      },
      error: (error) => {
        console.error(error);
        this.hasDeleteError = true;
        this.isDeletingId = '';
        this.deleteConfirmationId = null;
      },
    });
  }

  private createEmptyDistributorForm(): DistributorSaveDto {
    return {
      nameDistributor: '',
      localizationDistributor: '',
      salespeopleDistributor: [],
      typeDistributor: '',
      telephones: [],
      CNPJ: '',
    };
  }

  private parseListInput(value: string): string[] {
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  teste?: String;

  testeString() {
    this.distributorService.teste().subscribe({
      next: (res) => {
        console.log(res);
      },
      error: (error) => {
        console.log(error);
      },
    });
  }
}

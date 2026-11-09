import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Brand } from '../../interfaces/brand';
import { BrandComponent } from './brand-component';

describe('BrandComponent list controls', () => {
  let fixture: ComponentFixture<BrandComponent>;
  let component: BrandComponent;
  let http: HttpTestingController;
  const defaults = { idDistributor: 'distributor-1' };
  const items: Brand[] = [
    { ...defaults, idBrand: '1', nameBrand: 'Rações São José', typeBrand: 'Rações' },
    { ...defaults, idBrand: '2', nameBrand: 'Pet Saúde', typeBrand: 'Medicamentos' },
    { ...defaults, idBrand: '3', nameBrand: 'Pet Alimentos', typeBrand: ' rações ' },
  ];
  const pageUrl = (page: number) => `http://localhost:8080/brand/all?idDistributor=distributor-1&page=${page}`;
  const allUrl = pageUrl(0);
  const visibleNames = () => Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('.brandLink'),
    (element) => element.textContent?.trim(),
  );

  async function search(value: string): Promise<void> {
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function selectType(value: string): Promise<void> {
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.removeItem('brand-view-mode');
    await TestBed.configureTestingModule({
      imports: [BrandComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(BrandComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('idDistributor', 'distributor-1');
    
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(allUrl).flush(items);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('brand-view-mode');
  });

  it('restores the saved list preference when the screen is opened again', async () => {
    const buttons = fixture.nativeElement.querySelectorAll('.viewToggle button') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();
    await fixture.whenStable();
    expect(localStorage.getItem('brand-view-mode')).toBe('list');
    fixture.destroy();

    fixture = TestBed.createComponent(BrandComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('idDistributor', 'distributor-1');

    fixture.detectChanges();
    http.expectOne(allUrl).flush(items);
    await fixture.whenStable();

    expect(component.viewMode).toBe('list');
    expect(fixture.nativeElement.querySelector('.itemListGrid')).toBeNull();
    const restoredButtons = fixture.nativeElement.querySelectorAll('.viewToggle button') as NodeListOf<HTMLButtonElement>;
    expect(restoredButtons[1].getAttribute('aria-pressed')).toBe('true');
    restoredButtons[0].click();
    await fixture.whenStable();
    expect(localStorage.getItem('brand-view-mode')).toBe('grid');
  });

  it('keeps the loaded brands visible while typing a name', async () => {
    await search('  SAO JOSE  ');
    expect(visibleNames()).toEqual(items.map((item) => item.nameBrand));
    http.expectNone((request) => request.url.endsWith('/search'));
  });

  it('searches through the endpoint, paginates, and restores the previous list', async () => {
    const input = fixture.nativeElement.querySelector('#brandSearch') as HTMLInputElement;
    input.value = '  Pet  ';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(visibleNames()).toEqual(items.map((item) => item.nameBrand));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.searchButton') as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/brand/search?name=Pet&page=0').flush([items[1]]);
    await fixture.whenStable();
    expect(visibleNames()).toEqual(['Pet Saúde']);

    (fixture.nativeElement.querySelectorAll('.pagination button')[1] as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/brand/search?name=Pet&page=1').flush([]);
    await fixture.whenStable();
    expect(component.page).toBe(0);
    expect(visibleNames()).toEqual(['Pet Saúde']);

    input.value = '';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(visibleNames()).toEqual(items.map((item) => item.nameBrand));
  });

  it('keeps the previous brands when a search returns an empty array', async () => {
    const input = fixture.nativeElement.querySelector('#brandSearch') as HTMLInputElement;
    input.value = 'Inexistente';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.searchButton') as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/brand/search?name=Inexistente&page=0').flush([]);
    await fixture.whenStable();
    expect(visibleNames()).toEqual(items.map((item) => item.nameBrand));
    expect(component.searchEmpty).toBe(true);
  });

  it('keeps the last full page when the following page is empty and can go back', async () => {
    const fullPage = Array.from({ length: 6 }, (_, i) => ({ ...items[0], idBrand: String(i) }));
    component.loadBrands();
    http.expectOne(allUrl).flush(fullPage);
    await fixture.whenStable();
    const [previous, next] = (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('.pagination button');
    expect(previous.disabled).toBe(true);
    next.click();
    http.expectOne(pageUrl(1)).flush(fullPage);
    await fixture.whenStable();
    next.click();
    http.expectOne(pageUrl(2)).flush([]);
    await fixture.whenStable();
    expect(component.page).toBe(1);
    expect(visibleNames().length).toBe(6);
    expect(next.disabled).toBe(true);
    previous.click();
    http.expectOne(allUrl).flush(items);
    await fixture.whenStable();
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(true);
  });

  it('keeps the type filter while typing and all unique type options', async () => {
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(Array.from(select.options, (option) => option.text)).toEqual(['Todos os tipos', 'Medicamentos', 'Rações']);
    await selectType('Rações');
    expect(visibleNames()).toEqual(['Rações São José', 'Pet Alimentos']);
    await search('pet');
    expect(visibleNames()).toEqual(['Rações São José', 'Pet Alimentos']);
    expect(select.options.length).toBe(3);
  });

  it('keeps type matches while typing and clears both controls', async () => {
    await selectType('Rações');
    await search('inexistente');
    expect(visibleNames()).toEqual(['Rações São José', 'Pet Alimentos']);
    (fixture.nativeElement.querySelector('.clearFilters') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(visibleNames().length).toBe(3);
    expect(component.searchTerm).toBe('');
    expect(component.selectedType).toBe('');
    component.loadBrands();
    http.expectOne(allUrl).flush([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.emptyState').textContent).toContain('Nenhuma marca cadastrada');
  });

  it('switches between two-column grid and list', async () => {
    const buttons = fixture.nativeElement.querySelectorAll('.viewToggle button') as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    buttons[1].click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.itemListGrid')).toBeNull();
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    buttons[0].click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.itemListGrid')).toBeTruthy();
  });

  it('adds new type options after saving without discarding the search', async () => {
    await search('pet');
    component.brandForm = { ...items[0], nameBrand: 'Coleira', typeBrand: 'Acessórios' };
    component.saveBrand();
    const savedBrand = {
      ...items[0], idBrand: '4', nameBrand: 'Coleira', typeBrand: 'Acessórios',
    };
    http.expectOne('http://localhost:8080/brand/save').flush(savedBrand);
    http.expectOne(allUrl).flush([...items, savedBrand]);
    await fixture.whenStable();
    expect(component.brandTypes).toEqual(['Acessórios', 'Medicamentos', 'Rações']);
    expect(component.totalBrands).toBe(4);
    expect(visibleNames()).toEqual(items.concat(savedBrand).map((item) => item.nameBrand));
  });

  it('reapplies the type filter after editing an item', async () => {
    await selectType('Rações');
    component.startEditing(items[0]);
    component.editingTypeBrand = 'Acessórios';
    component.saveBrandEdit();
    http.expectOne('http://localhost:8080/brand/edit').flush('Atualizado');
    await fixture.whenStable();
    expect(component.brandTypes).toEqual(['Acessórios', 'Medicamentos', 'rações']);
    expect(visibleNames()).toEqual(['Pet Alimentos']);
    expect(component.selectedType).toBe('rações');
  });

  it('refreshes types after deletion and retains the search', async () => {
    await search('pet');
    await selectType('Medicamentos');
    component.requestDeleteBrand(items[1]);
    component.deleteBrand(items[1]);
    http.expectOne('http://localhost:8080/brand/delete?id=2').flush('Excluído');
    http.expectOne(allUrl).flush([items[0], items[2]]);
    await fixture.whenStable();
    expect(component.brandTypes).toEqual(['Rações']);
    expect(component.selectedType).toBe('');
    expect(visibleNames()).toEqual(['Rações São José', 'Pet Alimentos']);
  });

});

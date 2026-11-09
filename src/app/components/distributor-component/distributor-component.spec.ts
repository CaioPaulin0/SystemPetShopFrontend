import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Distributor } from '../../interfaces/distributor';

import { DistributorComponent } from './distributor-component';

describe('DistributorComponent', () => {
  let component: DistributorComponent;
  let fixture: ComponentFixture<DistributorComponent>;
  let http: HttpTestingController;
  const distributors: Distributor[] = [
    { id: '1', nameDistributor: 'Rações São José', typeDistributor: 'Rações', CNPJ: '12.345.678/0001-90', localizationDistributor: '', salespeopleDistributor: [], telephones: [] },
    { id: '2', nameDistributor: 'Pet Saúde', typeDistributor: 'Medicamentos', CNPJ: '', cnpj: '98765432000110', localizationDistributor: '', salespeopleDistributor: [], telephones: [] },
    { id: '3', nameDistributor: 'Pet Alimentos', typeDistributor: ' rações ', CNPJ: '11222333000144', localizationDistributor: '', salespeopleDistributor: [], telephones: [] },
  ];

  const visibleNames = () => Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('.distributorName'),
    (element) => element.textContent?.trim(),
  );

  async function search(value: string): Promise<void> {
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.removeItem('distributor-view-mode');
    await TestBed.configureTestingModule({
      imports: [DistributorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(DistributorComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('http://localhost:8080/distributor/all?page=0').flush(distributors);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('distributor-view-mode');
  });

  it('restores the saved list preference when the screen is opened again', async () => {
    const buttons = fixture.nativeElement.querySelectorAll('.viewToggle button') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();
    await fixture.whenStable();
    expect(localStorage.getItem('distributor-view-mode')).toBe('list');
    fixture.destroy();

    fixture = TestBed.createComponent(DistributorComponent);
    component = fixture.componentInstance;


    fixture.detectChanges();
    http.expectOne('http://localhost:8080/distributor/all?page=0').flush(distributors);
    await fixture.whenStable();

    expect(component.viewMode).toBe('list');
    expect(fixture.nativeElement.querySelector('.distributorListGrid')).toBeNull();
    const restoredButtons = fixture.nativeElement.querySelectorAll('.viewToggle button') as NodeListOf<HTMLButtonElement>;
    expect(restoredButtons[1].getAttribute('aria-pressed')).toBe('true');
    restoredButtons[0].click();
    await fixture.whenStable();
    expect(localStorage.getItem('distributor-view-mode')).toBe('grid');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('searches through the endpoint, paginates, and restores the previous list', async () => {
    const input = fixture.nativeElement.querySelector('#distributorSearch') as HTMLInputElement;
    input.value = '  Pet  ';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(visibleNames()).toEqual(distributors.map((item) => item.nameDistributor));
    http.expectNone((request) => request.url.endsWith('/search'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.searchButton') as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/distributor/search?name=Pet&page=0')
      .flush([distributors[1]]);
    await fixture.whenStable();
    expect(visibleNames()).toEqual(['Pet Saúde']);

    (fixture.nativeElement.querySelectorAll('.pagination button')[1] as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/distributor/search?name=Pet&page=1').flush([]);
    await fixture.whenStable();
    expect(component.page).toBe(0);
    expect(visibleNames()).toEqual(['Pet Saúde']);

    input.value = '';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(visibleNames()).toEqual(distributors.map((item) => item.nameDistributor));
  });

  it('keeps the previous distributors when a search returns an empty array', async () => {
    const input = fixture.nativeElement.querySelector('#distributorSearch') as HTMLInputElement;
    input.value = 'Inexistente';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.searchButton') as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/distributor/search?name=Inexistente&page=0').flush([]);
    await fixture.whenStable();
    expect(visibleNames()).toEqual(distributors.map((item) => item.nameDistributor));
    expect(component.searchEmpty).toBe(true);
  });

  it('requests adjacent pages and keeps the last populated page visible', async () => {
    const [previous, next] = (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('.pagination button');
    expect(previous.disabled).toBe(true);

    next.click();
    http.expectOne('http://localhost:8080/distributor/all?page=1').flush([distributors[1]]);
    await fixture.whenStable();
    expect(visibleNames()).toEqual(['Pet Saúde']);

    next.click();
    http.expectOne('http://localhost:8080/distributor/all?page=2').flush([]);
    await fixture.whenStable();
    expect(next.disabled).toBe(true);
    expect(component.page).toBe(1);
    expect(visibleNames()).toEqual(['Pet Saúde']);

    previous.click();
    http.expectOne('http://localhost:8080/distributor/all?page=0').flush(distributors);
    await fixture.whenStable();
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);
  });

  it('does not filter the loaded list while typing a name', async () => {
    await search('  SAO JOSE  ');
    expect(visibleNames()).toEqual(distributors.map((item) => item.nameDistributor));
    http.expectNone((request) => request.url.endsWith('/search'));
  });

  it('does not filter the loaded list while typing a CNPJ', async () => {
    await search('12345678000190');
    expect(visibleNames()).toEqual(distributors.map((item) => item.nameDistributor));
  });

  it('loads unique types and keeps the type filter while typing a name', async () => {
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(Array.from(select.options, (option) => option.text)).toEqual(['Todos os tipos', 'Medicamentos', 'Rações']);
    select.value = 'Rações';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(visibleNames()).toEqual(['Rações São José', 'Pet Alimentos']);
    await search('pet');
    expect(visibleNames()).toEqual(['Rações São José', 'Pet Alimentos']);
    expect(select.options.length).toBe(3);
  });

  it('keeps the list visible while typing and clears the search field', async () => {
    await search('inexistente');
    expect(visibleNames()).toEqual(distributors.map((item) => item.nameDistributor));
    (fixture.nativeElement.querySelector('.clearFilters') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(visibleNames().length).toBe(3);
    expect(fixture.nativeElement.querySelector('input[type="search"]').value).toBe('');
  });

  it('switches between grid and list with accessible pressed states', async () => {
    const buttons = fixture.nativeElement.querySelectorAll('.viewToggle button') as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    buttons[1].click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.distributorListGrid')).toBeNull();
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    buttons[0].click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.distributorListGrid')).toBeTruthy();
  });

  it('refreshes types after deletion while retaining the search text', async () => {
    await search('pet');
    component.selectedType = 'Medicamentos';
    component.applyFilters();
    component.requestDeleteDistributor(distributors[1]);
    component.deleteDistributor(distributors[1]);
    http.expectOne('http://localhost:8080/distributor/delete?id=2').flush('Excluído');
    await fixture.whenStable();
    expect(component.distributorTypes).toEqual(['Rações']);
    expect(component.selectedType).toBe('');
    expect(visibleNames()).toEqual(['Rações São José', 'Pet Alimentos']);
  });

  it('preserves the type filter and refreshes types when distributors reload', async () => {
    await search('pet');
    component.selectedType = 'Medicamentos';
    component.loadDistributors();
    http.expectOne('http://localhost:8080/distributor/all?page=0').flush([
      ...distributors,
      { ...distributors[0], id: '4', typeDistributor: 'Acessórios' },
    ]);
    await fixture.whenStable();
    expect(component.distributorTypes).toEqual(['Acessórios', 'Medicamentos', 'Rações']);
    expect(visibleNames()).toEqual(['Pet Saúde']);
  });
});

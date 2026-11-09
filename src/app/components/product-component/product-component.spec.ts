import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Product } from '../../interfaces/product';
import { ProductComponent } from './product-component';

describe('ProductComponent list controls', () => {
  let fixture: ComponentFixture<ProductComponent>;
  let component: ProductComponent;
  let http: HttpTestingController;
  const defaults = {
    idBrand: 'brand-1', idDistributor: 'distributor-1', descriptionProduct: '',
    dataCreatedProduct: '', dataDueProduct: '', versionProduct: 0, lotProduct: '001-A',
    priceBuy: 10, priceSell: 15, stockProduct: 5, dataDueProductVerify: false,
  };
  const items: Product[] = [
    { ...defaults, idProduct: '1', nameProduct: 'Rações São José', typeProduct: 'Rações' },
    { ...defaults, idProduct: '2', nameProduct: 'Pet Saúde', typeProduct: 'Medicamentos' },
    { ...defaults, idProduct: '3', nameProduct: 'Pet Alimentos', typeProduct: ' rações ' },
  ];
  const pageUrl = (page: number) => `http://localhost:8080/product/all?idBrand=brand-1&page=${page}`;
  const allUrl = pageUrl(0);
  const visibleNames = () => Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('.productCardHeader h3'),
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
    localStorage.removeItem('product-view-mode');
    await TestBed.configureTestingModule({
      imports: [ProductComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('idDistributor', 'distributor-1');
    fixture.componentRef.setInput('idBrand', 'brand-1');
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(allUrl).flush(items);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('product-view-mode');
  });

  it.each(['000123', '001-B'])('preserves lot %s through creation and editing', async (lot) => {
    component.toggleForm();
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input[name="lotProduct"]') as HTMLInputElement;
    expect(input.type).toBe('text');
    input.value = lot;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    component.saveProduct();
    const saveRequest = http.expectOne('http://localhost:8080/product/save');
    expect(saveRequest.request.body.lotProduct).toBe(lot);
    saveRequest.flush({ ...items[0], idProduct: 'new-product', lotProduct: lot });
    http.expectOne(allUrl).flush(items);
    expect(component.productForm.lotProduct).toBe('');

    component.startEditingProduct(items[0]);
    expect(component.isEditingField(items[0], 'lotProduct')).toBe(false);
    component.cancelEditing();
    component.registerNewProductValue(items[0]);
    fixture.detectChanges();
    await fixture.whenStable();
    const lotField = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.productCard .productField'),
    ).find((field) => field.querySelector('.fieldLabel')?.textContent?.trim() === 'Lote');
    const editInput = lotField?.querySelector('input') as HTMLInputElement;
    expect(editInput.type).toBe('text');
    editInput.value = lot;
    editInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(component.hasProductValueChanged(items[0])).toBe(true);
    component.registerNewProductValue(items[0]);
    const editRequest = http.expectOne('http://localhost:8080/product/newVersion');
    expect(editRequest.request.body.lotProduct).toBe(lot);
    editRequest.flush({ ...items[0], lotProduct: lot });
    http.expectOne(allUrl).flush(items);
  });

  it.each(['000123', '001-A', null])('handles scanned lot %s without numeric conversion', (lot) => {
    component.selectedImages = [{
      file: new File(['image'], 'product.png', { type: 'image/png' }),
      previewUrl: '',
    }];
    component.scanProductWithImages();
    const request = http.expectOne('http://localhost:8080/product/scan');
    request.flush({
      nameProduct: null, typeProduct: null, descriptionProduct: null,
      dataCreatedProduct: null, dataDueProduct: null, lotProduct: lot,
    });
    expect(component.productForm.lotProduct).toBe(lot ?? '');
    component.selectedImages = [];
  });

  it('restores the saved list preference when the screen is opened again', async () => {
    const buttons = fixture.nativeElement.querySelectorAll('.viewToggle button') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();
    await fixture.whenStable();
    expect(localStorage.getItem('product-view-mode')).toBe('list');
    fixture.destroy();

    fixture = TestBed.createComponent(ProductComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('idDistributor', 'distributor-1');
    fixture.componentRef.setInput('idBrand', 'brand-1');
    fixture.detectChanges();
    http.expectOne(allUrl).flush(items);
    await fixture.whenStable();

    expect(component.viewMode).toBe('list');
    expect(fixture.nativeElement.querySelector('.itemListGrid')).toBeNull();
    const restoredButtons = fixture.nativeElement.querySelectorAll('.viewToggle button') as NodeListOf<HTMLButtonElement>;
    expect(restoredButtons[1].getAttribute('aria-pressed')).toBe('true');
    restoredButtons[0].click();
    await fixture.whenStable();
    expect(localStorage.getItem('product-view-mode')).toBe('grid');
  });

  it('advances from a partial page and keeps the last products when the next page is empty', async () => {
    const [previous, next] = (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('.pagination button');
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    next.click();
    http.expectOne(pageUrl(1)).flush([items[1]]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.pagination span').textContent).toContain('Página 2');
    next.click();
    http.expectOne(pageUrl(2)).flush([]);
    await fixture.whenStable();
    expect(next.disabled).toBe(true);
    expect(visibleNames()).toEqual([items[1].nameProduct]);
    previous.click();
    http.expectOne(allUrl).flush(items);
    await fixture.whenStable();
    expect(previous.disabled).toBe(true);
  });

  it('keeps the loaded products visible while typing a name', async () => {
    await search('  SAO JOSE  ');
    expect(visibleNames()).toEqual(items.map((item) => item.nameProduct));
    http.expectNone((request) => request.url.endsWith('/search'));
  });

  it('searches through the endpoint, paginates, and restores the previous list', async () => {
    const input = fixture.nativeElement.querySelector('#productSearch') as HTMLInputElement;
    input.value = '  Pet  ';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(visibleNames()).toEqual(items.map((item) => item.nameProduct));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.searchButton') as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/product/search?name=Pet&page=0').flush([items[1]]);
    await fixture.whenStable();
    expect(visibleNames()).toEqual(['Pet Saúde']);

    (fixture.nativeElement.querySelectorAll('.pagination button')[1] as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/product/search?name=Pet&page=1').flush([]);
    await fixture.whenStable();
    expect(component.page).toBe(0);
    expect(visibleNames()).toEqual(['Pet Saúde']);

    input.value = '';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(visibleNames()).toEqual(items.map((item) => item.nameProduct));
  });

  it('keeps the previous products when a search returns an empty array', async () => {
    const input = fixture.nativeElement.querySelector('#productSearch') as HTMLInputElement;
    input.value = 'Inexistente';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.searchButton') as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/product/search?name=Inexistente&page=0').flush([]);
    await fixture.whenStable();
    expect(visibleNames()).toEqual(items.map((item) => item.nameProduct));
    expect(component.searchEmpty).toBe(true);
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
    component.loadProducts();
    http.expectOne(allUrl).flush([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.emptyState').textContent).toContain('Nenhum produto cadastrado');
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
    component.productForm = { ...items[0], nameProduct: 'Coleira', typeProduct: 'Acessórios' };
    component.saveProduct();
    const savedProduct = {
      ...items[0], idProduct: '4', nameProduct: 'Coleira', typeProduct: 'Acessórios',
    };
    http.expectOne('http://localhost:8080/product/save').flush(savedProduct);
    http.expectOne(allUrl).flush([...items, savedProduct]);
    await fixture.whenStable();
    expect(component.productTypes).toEqual(['Acessórios', 'Medicamentos', 'Rações']);
    expect(component.totalProducts).toBe(4);
    expect(visibleNames()).toEqual(items.concat(savedProduct).map((item) => item.nameProduct));
  });

  it('reapplies the type filter after editing an item', async () => {
    await selectType('Rações');
    component.startEditingProduct(items[0]);
    component.setEditingValue('typeProduct', 'Acessórios');
    component.saveProductEdit();
    http.expectOne('http://localhost:8080/product/edit').flush('Atualizado');
    await fixture.whenStable();
    expect(component.productTypes).toEqual(['Acessórios', 'Medicamentos', 'rações']);
    expect(visibleNames()).toEqual(['Pet Alimentos']);
    expect(component.selectedType).toBe('rações');
  });

  it('refreshes types after deletion and retains the search', async () => {
    await search('pet');
    await selectType('Medicamentos');
    component.requestDeleteProduct(items[1]);
    component.deleteProduct(items[1]);
    http.expectOne('http://localhost:8080/product/delete?idProduct=2').flush('Excluído');
    http.expectOne(allUrl).flush([items[0], items[2]]);
    await fixture.whenStable();
    expect(component.productTypes).toEqual(['Rações']);
    expect(component.selectedType).toBe('');
    expect(visibleNames()).toEqual(['Rações São José', 'Pet Alimentos']);
  });

  it('keeps filters active when saving a new product value version', async () => {
    await search('saude');
    await selectType('Medicamentos');
    component.registerNewProductValue(items[1]);
    component.setEditingValue('priceSell', 20);
    component.registerNewProductValue(items[1]);
    const request = http.expectOne('http://localhost:8080/product/newVersion');
    expect(request.request.body.lotProduct).toBe('001-A');
    const newVersion = {
      ...items[1], idProduct: 'new-version', priceSell: 20, versionProduct: 1,
    };
    request.flush(newVersion);
    http.expectOne(allUrl).flush([items[0], newVersion, items[2]]);
    await fixture.whenStable();
    expect(component.totalProducts).toBe(3);
    expect(component.selectedType).toBe('Medicamentos');
    expect(visibleNames()).toEqual(['Pet Saúde']);
    expect(fixture.nativeElement.querySelector('.productCard').textContent).toContain('20');
  });

});

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { DistributorService } from './service/distributor-service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: DistributorService,
          useValue: {
            getAllDistributor: () => of([]),
            teste: () => of(''),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the main component', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-main-component')).toBeTruthy();
  });
});

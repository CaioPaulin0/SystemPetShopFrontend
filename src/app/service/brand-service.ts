import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import {
  Brand,
  BrandDto,
  BrandEditDto,
  BrandFindAllByDistributorDto,
} from '../interfaces/brand';

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  // Os endpoints paginados de marcas retornam até seis marcas por página.
  readonly pageSize = 6;
  private readonly url = `${environment.apiUrl}/brand/`;

  constructor(private http: HttpClient) {}

  saveBrand(brandDto: BrandDto): Observable<Brand> {
    return this.http.post<Brand>(`${this.url}save`, brandDto);
  }

  getAllBrand(
    brandFindAllByDistributorDto: BrandFindAllByDistributorDto | string,
    page = 0,
  ): Observable<Brand[]> {
    const idDistributor = typeof brandFindAllByDistributorDto === 'string'
      ? brandFindAllByDistributorDto
      : brandFindAllByDistributorDto.idDistributor;
    return this.http.get<Brand[]>(`${this.url}all`, {
      params: { idDistributor, page },
    });
  }

  deleteBrand(id: string | null | undefined): Observable<string> {
    const brandId = id?.trim();

    if (!brandId) {
      return throwError(() => new Error('O ID da marca é obrigatório.'));
    }

    return this.http.delete(`${this.url}delete`, {
      params: new HttpParams().set('id', brandId),
      responseType: 'text',
    });
  }

  editBrand(brandEditDto: BrandEditDto): Observable<string> {
    return this.http.put(`${this.url}edit`, brandEditDto, {
      responseType: 'text',
    });
  }

  getAllBrandMetrics(
    brandFindAllByDistributorDto: BrandFindAllByDistributorDto | string,
    page: number = 0,
  ): Observable<Brand[]> {
    const idDistributor = typeof brandFindAllByDistributorDto === 'string'
      ? brandFindAllByDistributorDto
      : brandFindAllByDistributorDto.idDistributor;
    return this.http.get<Brand[]>(`${this.url}metrics`, {
      params: { idDistributor, page },
    });
  }

  searchBrands(name: string, page = 0): Observable<Brand[]> {
    return this.http.get<Brand[]>(`${this.url}search`, {
      params: new HttpParams().set('name', name).set('page', page),
    });
  }

  searchBrandMetrics(name: string, page = 0): Observable<Brand[]> {
    return this.http.get<Brand[]>(`${this.url}metrics/search`, {
      params: new HttpParams().set('name', name).set('page', page),
    });
  }

  getAllBrandMetricsTotal(
    brandFindAllByDistributorDto: BrandFindAllByDistributorDto | string,
  ): Observable<Brand[]> {
    const idDistributor = typeof brandFindAllByDistributorDto === 'string'
      ? brandFindAllByDistributorDto
      : brandFindAllByDistributorDto.idDistributor;
    return this.http.get<Brand[]>(`${this.url}metricsTotal`, {
      params: { idDistributor },
    });
  }

    metricBrand(idBrand: string): Observable<number[]> {
    return this.http.get<number[]>(`${this.url}metricBrand`, {
      params: new HttpParams().set('idBrand', idBrand),
    });
  }
}

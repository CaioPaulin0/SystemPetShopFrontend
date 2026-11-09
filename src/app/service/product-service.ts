import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import {
  Product,
  ProductDto,
  ProductEditDto,
  ProductDueResponse,
  ProductIdFindAllDto,
  ProductImageAIResponse,
} from '../interfaces/product';
import { ProductMetrics } from '../interfaces/product-metrics';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly url = `${environment.apiUrl}/product/`;

  constructor(private readonly http: HttpClient) {}

  saveProduct(productDto: ProductDto): Observable<Product> {
    return this.http.post<Product>(`${this.url}save`, productDto);
  }

  newVersion(product: Product): Observable<Product> {
    return this.http.post<Product>(`${this.url}newVersion`, product);
  }

  scanProductImages(images: File[]): Observable<ProductImageAIResponse> {
    const formData = new FormData();

    images.forEach((image) => {
      formData.append('imgs', image, image.name);
    });

    return this.http.post<ProductImageAIResponse>(`${this.url}scan`, formData);
  }

  getAllProduct(productIdFindAllDto: ProductIdFindAllDto | string, page = 0): Observable<Product[]> {
    const idBrand =
      typeof productIdFindAllDto === 'string'
        ? productIdFindAllDto
        : productIdFindAllDto.idBrand;

    return this.http.get<Product[]>(`${this.url}all`, {
      params: { idBrand, page },
    });
  }

  getAllDueProduct(): Observable<ProductDueResponse[]> {
    return this.http.get<ProductDueResponse[]>(`${this.url}allDueProduct`);
  }

  verifyProductDue(idProduct: string | null | undefined): Observable<string> {
    const productId = idProduct?.trim();

    if (!productId) {
      return throwError(() => new Error('O ID do produto é obrigatório.'));
    }

    return this.http.put(`${this.url}productDueVerify`, null, {
      params: new HttpParams().set('idProduct', productId),
      responseType: 'text',
    });
  }

  deleteProduct(idProduct: string | null | undefined): Observable<string> {
    const productId = idProduct?.trim();

    if (!productId) {
      return throwError(() => new Error('O ID do produto é obrigatório.'));
    }

    return this.http.delete(`${this.url}delete`, {
      params: new HttpParams().set('idProduct', productId),
      responseType: 'text',
    });
  }

  editProduct(productEditDto: ProductEditDto): Observable<string> {
    return this.http.put(`${this.url}edit`, productEditDto, {
      responseType: 'text',
    });
  }

  metricsProduct(idBrand: string, page = 0): Observable<ProductMetrics[]> {
    return this.http.get<ProductMetrics[]>(`${this.url}metricProduct`, {
      params: new HttpParams().set('idBrand', idBrand).set('page', page),
    });
  }

  searchProducts(name: string, page = 0): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.url}search`, {
      params: new HttpParams().set('name', name).set('page', page),
    });
  }

  searchProductMetrics(name: string, page = 0): Observable<ProductMetrics[]> {
    return this.http.get<ProductMetrics[]>(`${this.url}metrics/search`, {
      params: new HttpParams().set('name', name).set('page', page),
    });
  }

}

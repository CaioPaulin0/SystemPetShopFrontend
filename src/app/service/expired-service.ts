import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { ExpiredResponse } from '../interfaces/expired-response';

@Injectable({ providedIn: 'root' })
export class ExpiredService {
  private readonly url = `${environment.apiUrl}/expired/`;

  constructor(private readonly http: HttpClient) {}

  findAll(page = 0): Observable<ExpiredResponse[]> {
    return this.http.get<ExpiredResponse[]>(`${this.url}findAll`, {
      params: new HttpParams().set('page', page),
    });
  }

  filter(dataDueProductVerify: boolean, page = 0): Observable<ExpiredResponse[]> {
    return this.http.get<ExpiredResponse[]>(`${this.url}filter`, {
      params: new HttpParams().set('dataDueProductVerify', dataDueProductVerify).set('page', page),
    });
  }

  search(name: string, page = 0): Observable<ExpiredResponse[]> {
    return this.http.get<ExpiredResponse[]>(`${this.url}search`, {
      params: new HttpParams().set('name', name).set('page', page),
    });
  }

  productExpiredVerify(idProduct: string): Observable<string> {
    const productId = idProduct?.trim();
    if (!productId) {
      return throwError(() => new Error('O ID do produto é obrigatório.'));
    }

    return this.http.put(`${this.url}productExpiredVerify`, null, {
      params: new HttpParams().set('idProduct', productId),
      responseType: 'text',
    });
  }
}

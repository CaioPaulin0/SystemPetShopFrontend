import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { Distributor, DistributorSaveDto } from '../interfaces/distributor';

@Injectable({
  providedIn: 'root',
})
export class DistributorService {
  private url = `${environment.apiUrl}/distributor/`;

  constructor(private http: HttpClient){
  }

  teste(){
    return this.http.get(`${this.url}teste`, {responseType: 'text'})
  }

  getAllDistributor(page: number = 0) {
    return this.http.get<Distributor[]>(`${this.url}all`, { params: { page } });
  }


  saveDistributor(distributor: DistributorSaveDto){
    return this.http.post<Distributor>(`${this.url}save`, distributor)
  }

  deleteDistributor(id: string | null | undefined): Observable<string> {
    const distributorId = id?.trim();

    if (!distributorId) {
      return throwError(() => new Error('O ID do distribuidor é obrigatório.'));
    }

    return this.http.delete(`${this.url}delete`, {
      params: new HttpParams().set('id', distributorId),
      responseType: 'text',
    });
  }

  getAllDistributorMetrics(page = 0) {
    return this.http.get<Distributor[]>(`${this.url}metrics`, { params: { page } });
  }

  getAllDistributorMetricsTotal() {
    return this.http.get<Distributor[]>(`${this.url}metricDistributorTotal`);
  }

  searchDistributors(name: string, page = 0): Observable<Distributor[]> {
    return this.http.get<Distributor[]>(`${this.url}search`, {
      params: new HttpParams().set('name', name).set('page', page),
    });
  }

  searchDistributorMetrics(name: string, page = 0): Observable<Distributor[]> {
    return this.http.get<Distributor[]>(`${this.url}metrics/search`, {
      params: new HttpParams().set('name', name).set('page', page),
    });
  }

   metricDistributor(idDistributor: string): Observable<number[]> {
    return this.http.get<number[]>(`${this.url}metricDistributor`, {
      params: new HttpParams().set('idDistributor', idDistributor),
    });
  }
  
}

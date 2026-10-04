import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  InventoryQueryParams,
  InventoryResponse,
  InventoryAllResponse,
  CreateInventoryPayload,
  InventoryUpdate,
  ItemResponse,
  MutationResponse,
} from '../interfaces/inventory.interface';

// Re-export interfaces for convenient access
export * from '../interfaces/inventory.interface';

@Injectable({
  providedIn: 'root',
})
export class InventoryApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/inventory`;

  /** GET /api/inventory — paginated + filtered */
  getInventory(query: InventoryQueryParams = { page: 1, limit: 50 }): Observable<InventoryResponse> {
    return this.http.get<InventoryResponse>(this.apiUrl, { params: this.toParams(query) });
  }

  /** GET /api/inventory/all — all items (filters only, no pagination) */
  getAllInventory(query: Omit<InventoryQueryParams, 'page' | 'limit'> = {}): Observable<InventoryAllResponse> {
    return this.http.get<InventoryAllResponse>(`${this.apiUrl}/all`, { params: this.toParams(query) });
  }

  /** GET /api/inventory/:id */
  getItemById(id: string): Observable<ItemResponse> {
    return this.http.get<ItemResponse>(`${this.apiUrl}/${id}`);
  }

  /** POST /api/inventory — Accountant & Specialist */
  createItem(item: CreateInventoryPayload): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(this.apiUrl, item);
  }

  /** PUT /api/inventory/:id — the backend enforces which fields each role may change */
  updateItem(id: string, updates: InventoryUpdate): Observable<MutationResponse> {
    return this.http.put<MutationResponse>(`${this.apiUrl}/${id}`, updates);
  }

  /** DELETE /api/inventory/:id — Accountant only */
  deleteItem(id: string): Observable<MutationResponse> {
    return this.http.delete<MutationResponse>(`${this.apiUrl}/${id}`);
  }

  /** Builds HttpParams, skipping undefined/null/empty values */
  private toParams(query: InventoryQueryParams): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}

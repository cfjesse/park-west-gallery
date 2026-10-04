import { TestBed } from '@angular/core/testing';
import { InventoryApi } from './inventory-api';

describe('InventoryApi', () => {
  let service: InventoryApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InventoryApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

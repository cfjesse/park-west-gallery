import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthenticationService } from '../../../services/authentication';
import {
  AccountantInventoryUpdate,
  InventoryApiService,
  InventoryItem,
  InventoryStatus,
  Media,
  SpecialistInventoryUpdate,
  Style,
} from '../../../services/inventory-api';
import { DiscountedPricePipe } from '../../pipes/discounted-price.pipe';

export type InventoryAction = 'view' | 'edit' | 'delete' | 'buy' | 'create';

// Must match VALID_* lists in node-api/src/routes/inventory.js
const MEDIA_OPTIONS: Media[] = ['acrylic', 'oils', 'pastel', 'charcoal', 'pencil', 'mixed_media', 'watercolor', 'gouache', 'ink', 'digital'];
const STYLE_OPTIONS: Style[] = ['abstract', 'realism', 'impressionism', 'surrealism', 'art_deco', 'expressionism', 'cubism', 'minimalism', 'pop_art', 'baroque'];
const STATUS_OPTIONS: InventoryStatus[] = ['ready_for_sale', 'pending', 'sold'];

@Component({
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    TitleCasePipe,
    DiscountedPricePipe,
    NzDividerModule,
    NzTableModule,
    NzButtonModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    NzAlertModule,
    NzDescriptionsModule,
    NzTagModule,
    NzIconModule,
  ],
  selector: 'app-master-details',
  styleUrl: './master-details.scss',
  templateUrl: './master-details.html',
})
export class MasterDetails implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly message = inject(NzMessageService);
  authService = inject(AuthenticationService);
  inventoryService = inject(InventoryApiService);
  userRole = this.authService.currentUser()?.role;

  readonly mediaOptions = MEDIA_OPTIONS;
  readonly styleOptions = STYLE_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;

  inventory = signal<InventoryItem[]>([]);
  pageIndex = signal<number>(1);
  pageSize = signal<number>(10);
  total = signal<number>(0);
  isLoading = signal<boolean>(false);
  isModalVisible = signal(false);
  modalData = signal<InventoryItem | null>(null);
  action = signal<InventoryAction | null>(null);
  isSaving = signal(false);
  errorMessages = signal<string[]>([]);

  /** Accountant: financial fields only */
  readonly accountantForm = this.fb.group({
    price: [0, [Validators.required, Validators.min(1000), Validators.max(20000)]],
    discount_percent: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(30)]),
    status: this.fb.control<InventoryStatus>('ready_for_sale', Validators.required),
  });

  /** Inventory specialist: catalog / artwork details */
  readonly specialistForm = this.fb.group({
    artist_name: ['', [Validators.required, Validators.maxLength(100)]],
    title: ['', [Validators.required, Validators.maxLength(150)]],
    media: this.fb.control<Media>('acrylic', Validators.required),
    style: this.fb.control<Style>('abstract', Validators.required),
    width_in: [1, [Validators.required, Validators.min(1)]],
    height_in: [1, [Validators.required, Validators.min(1)]],
    status: this.fb.control<InventoryStatus>('ready_for_sale', Validators.required),
  });

  readonly createForm = this.fb.group({
    artist_name: ['', [Validators.required, Validators.maxLength(100)]],
    title: ['', [Validators.required, Validators.maxLength(150)]],
    media: this.fb.control<Media>('acrylic', Validators.required),
    style: this.fb.control<Style>('abstract', Validators.required),
    width_in: [1, [Validators.required, Validators.min(1)]],
    height_in: [1, [Validators.required, Validators.min(1)]],
    status: this.fb.control<InventoryStatus>('ready_for_sale', Validators.required),
    price: [1000, [Validators.required, Validators.min(1000), Validators.max(20000)]],
  });

  formatterDollar = (value: number): string => `$ ${value}`;
  parserDollar = (value: string): number => {
    const parsed = parseFloat(value.replace(/[\$\s,]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  readonly modalTitle = computed(() => {
    const item = this.modalData();
    const labels: Record<InventoryAction, string> = {
      view: 'Artwork Details',
      edit: 'Edit Artwork',
      delete: 'Delete Artwork',
      buy: 'Purchase Request',
      create: 'Create Artwork',
    };
    const a = this.action();
    return a ? `${labels[a]}${item ? ' — ' + item.title : ''}` : '';
  });

  /** OK button label per action; null hides the OK button (view mode). */
  readonly okText = computed(() => {
    switch (this.action()) {
      case 'edit': return 'Save';
      case 'create': return 'Create';
      case 'delete': return 'Delete';
      case 'buy': return 'Confirm Purchase';
      default: return null;
    }
  });

  ngOnInit(): void {
    this.loadInventory();
  }

  loadInventory(): void {
    this.isLoading.set(true);
    this.inventoryService.getInventory({ page: this.pageIndex(), limit: this.pageSize() }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.inventory.set(res?.data ?? []);
        this.total.set(res?.pagination?.total ?? 0);

        if (res?.pagination?.total_pages && this.pageIndex() > res.pagination.total_pages) {
          this.pageIndex.set(res.pagination.total_pages);
          this.loadInventory();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.message.error(this.extractErrors(err).join(' '));
      },
    });
  }

  onPageIndexChange(page: number): void {
    this.pageIndex.set(page);
    this.loadInventory();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(1);
    this.loadInventory();
  }

  get activeForm() {
    if (this.action() === 'create') return this.createForm;
    return this.userRole === 'accountant' ? this.accountantForm : this.specialistForm;
  }

  isOkDisabled(): boolean {
    return (this.action() === 'edit' || this.action() === 'create') && this.activeForm.invalid;
  }

  onAction(action: InventoryAction, item: InventoryItem | null) {
    this.errorMessages.set([]);
    this.modalData.set(item);
    this.action.set(action);

    if (action === 'create') {
      this.createForm.reset({
        media: 'acrylic',
        style: 'abstract',
        status: 'ready_for_sale',
        width_in: 1,
        height_in: 1,
        price: 1000
      });
    }

    if (action === 'edit' && item) {
      if (this.userRole === 'accountant') {
        this.accountantForm.reset({
          price: item.price,
          discount_percent: item.discount_percent,
          status: item.status,
        });
      } else if (this.userRole === 'inventory_specialist') {
        this.specialistForm.reset({
          artist_name: item.artist_name,
          title: item.title,
          media: item.media,
          style: item.style,
          width_in: item.width_in,
          height_in: item.height_in,
          status: item.status,
        });
      }
    }

    this.isModalVisible.set(true);
  }

  onModalOk() {
    const item = this.modalData();
    const action = this.action();
    if (!action || action === 'view' || (!item && action !== 'create')) {
      this.closeModal();
      return;
    }

    let request$: Observable<{ message: string; data: InventoryItem }>;

    switch (action) {
      case 'edit': {
        const form = this.activeForm;
        if (form.invalid) {
          form.markAllAsTouched();
          return;
        }
        const payload = this.buildEditPayload();
        request$ = this.inventoryService.updateItem(item!.id, payload);
        break;
      }
      case 'create': {
        const form = this.activeForm;
        if (form.invalid) {
          form.markAllAsTouched();
          return;
        }
        const v = this.createForm.getRawValue();
        const payload = {
          artist_name: v.artist_name.trim(),
          title: v.title.trim(),
          media: v.media,
          style: v.style,
          width_in: v.width_in,
          height_in: v.height_in,
          status: v.status,
          price: v.price,
        };
        request$ = this.inventoryService.createItem(payload);
        break;
      }
      case 'buy':
        request$ = this.inventoryService.updateItem(item!.id, { status: 'pending' });
        break;
      case 'delete':
        request$ = this.inventoryService.deleteItem(item!.id);
        break;
    }

    this.isSaving.set(true);
    this.errorMessages.set([]);

    request$.subscribe({
      next: (res) => {
        this.message.success(res.message ?? 'Saved.');
        this.isSaving.set(false);
        this.closeModal();
        this.loadInventory();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessages.set(this.extractErrors(err));
      },
    });
  }

  onModalCancel() {
    if (this.isSaving()) return;
    this.closeModal();
  }

  private closeModal() {
    this.isModalVisible.set(false);
    this.modalData.set(null);
    this.action.set(null);
    this.errorMessages.set([]);
  }

  private buildEditPayload(): AccountantInventoryUpdate | SpecialistInventoryUpdate {
    if (this.userRole === 'accountant') {
      const v = this.accountantForm.getRawValue();
      return {
        price: v.price,
        // Backend requires an integer or null
        discount_percent: v.discount_percent === null ? null : Math.round(v.discount_percent),
        status: v.status,
      };
    }
    const v = this.specialistForm.getRawValue();
    return {
      artist_name: v.artist_name.trim(),
      title: v.title.trim(),
      media: v.media,
      style: v.style,
      width_in: v.width_in,
      height_in: v.height_in,
      status: v.status,
    };
  }

  /** Normalizes backend error shapes: { error } | { errors: [] } */
  private extractErrors(err: HttpErrorResponse): string[] {
    const body = err?.error;
    if (Array.isArray(body?.errors)) return body.errors;
    if (typeof body?.error === 'string') return [body.error];
    return [err?.message || 'Something went wrong. Please try again.'];
  }

  getStatusColor(status: InventoryStatus): string {
    switch (status) {
      case 'ready_for_sale':
        return 'success';
      case 'pending':
        return 'warning';
      case 'sold':
        return 'error';
      default:
        return 'default';
    }
  }

  getStatusIcon(status: InventoryStatus): string {
    switch (status) {
      case 'ready_for_sale':
        return 'check-circle';
      case 'pending':
        return 'clock-circle';
      case 'sold':
        return 'close-circle';
      default:
        return 'info-circle';
    }
  }

  formatLabel(value: string | null | undefined): string {
    return (value ?? '').replace(/_/g, ' ');
  }
}

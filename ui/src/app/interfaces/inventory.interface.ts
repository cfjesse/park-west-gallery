// Option lists must match the VALID_* lists in node-api/src/routes/inventory.js.
// The union types below are derived from them so the two can never drift apart.
export const MEDIA_OPTIONS = [
  'acrylic',
  'oils',
  'pastel',
  'charcoal',
  'pencil',
  'mixed_media',
  'watercolor',
  'gouache',
  'ink',
  'digital',
] as const;

export const STYLE_OPTIONS = [
  'abstract',
  'realism',
  'impressionism',
  'surrealism',
  'art_deco',
  'expressionism',
  'cubism',
  'minimalism',
  'pop_art',
  'baroque',
];

export const STATUS_OPTIONS = ['ready_for_sale', 'pending', 'sold'];

export type Media = (typeof MEDIA_OPTIONS)[number];
export type Style = (typeof STYLE_OPTIONS)[number];
export type InventoryStatus = (typeof STATUS_OPTIONS)[number];

export interface InventoryItem {
  id: string;
  artist_name: string;
  title: string;
  media: Media;
  style: Style;
  width_in: number;
  height_in: number;
  status: InventoryStatus;
  price: number;
  discount_percent: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryQueryParams {
  page?: number;
  limit?: number;
  status?: InventoryStatus;
  media?: Media;
  style?: Style;
  artist_name?: string;
}

export interface InventoryPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface InventoryResponse {
  data: InventoryItem[];
  pagination: InventoryPagination;
}

export interface InventoryAllResponse {
  total: number;
  data: InventoryItem[];
}

export interface ItemResponse {
  data: InventoryItem;
}

export interface MutationResponse {
  message: string;
  data: InventoryItem;
}

export type InventoryUpdate =
  | Partial<CreateInventoryPayload>
  | AccountantInventoryUpdate
  | SpecialistInventoryUpdate
  | CustomerInventoryUpdate;

/**
 * Accountant update payload: Focuses on pricing, discounts, and financial status.
 */
export interface AccountantInventoryUpdate {
  price?: number;
  discount_percent?: number | null;
  status?: InventoryStatus;
}

/**
 * Inventory specialist update payload: Full control over artwork specifications and catalog details.
 */
export interface SpecialistInventoryUpdate {
  artist_name?: string;
  title?: string;
  media?: Media;
  style?: Style;
  width_in?: number;
  height_in?: number;
  status?: InventoryStatus;
}

/**
 * Customer update payload: Interaction with status (e.g. reservation / purchase request).
 */
export interface CustomerInventoryUpdate {
  status: InventoryStatus;
}

/**
 * Payload for creating a new inventory item.
 */
export interface CreateInventoryPayload {
  artist_name: string;
  title: string;
  media: Media;
  style: Style;
  width_in: number;
  height_in: number;
  status: InventoryStatus;
  price: number;
  discount_percent?: number | null;
}


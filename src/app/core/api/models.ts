/** Tipi che rispecchiano i DTO dei microservizi (record Java *Response / *Request). */

/** Serializzazione di org.springframework.data.web.PagedModel. */
export interface Page<T> {
  content: T[];
  page: PageMeta;
}

export interface PageMeta {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface PageQuery {
  page?: number;
  size?: number;
  sort?: string;
}

// ---------------------------------------------------------------- catalog-service

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  createdAt: string;
}

export interface ProductRequest {
  name: string;
  description: string;
  price: number;
}

/** Proposta generata con Claude (POST /catalog/products/{id}/description-suggestion): non è ancora salvata. */
export interface DescriptionSuggestion {
  productId: number;
  currentDescription: string;
  suggestedDescription: string;
}

// ---------------------------------------------------------------- assistant-service

export interface AssistantChatRequest {
  message: string;
  /** Assente alla prima domanda; poi quello ricevuto nella risposta precedente. */
  conversationId?: string;
}

export interface AssistantChatResponse {
  conversationId: string;
  reply: string;
  toolsUsed: string[];
}

// ---------------------------------------------------------------- order-service

export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export const ORDER_STATUSES: OrderStatus[] = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export interface Address {
  recipientName: string;
  addressLine: string;
  city: string;
  postalCode: string;
  countryCode: string;
}

export interface OrderItem {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingAddress: Address;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
}

export interface CreateOrderRequest {
  items: { productId: number; quantity: number }[];
  shippingAddress: Address;
}

// ---------------------------------------------------------------- user-service

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  defaultShippingAddress: Address | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  /** null rimuove l'indirizzo predefinito. */
  defaultShippingAddress: Address | null;
}

// ---------------------------------------------------------------- payment-service

export type PaymentStatus = 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
export const PAYMENT_STATUSES: PaymentStatus[] = ['COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'];

export interface Payment {
  id: number;
  orderId: number;
  customerId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionReference: string | null;
  refundReference: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
  refundedAt: string | null;
}

// ---------------------------------------------------------------- shipping-service

export type ShipmentStatus = 'CREATED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export const SHIPMENT_STATUSES: ShipmentStatus[] = ['CREATED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export interface Shipment {
  id: number;
  orderId: number;
  customerId: string;
  status: ShipmentStatus;
  carrier: string | null;
  trackingCode: string | null;
  recipientName: string;
  addressLine: string;
  city: string;
  postalCode: string;
  countryCode: string;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

export type Role = "cliente";
export type ServiceType = "Sitio Web" | "Aplicación Web" | "Software Personalizado/Automatización" | string;
export type DeliveryStatus =
  | "Cotizado"
  | "En desarrollo"
  | "En revisión"
  | "Entregado"
  | "En mantenimiento"
  | "Pausado/Cancelado"
  | string;
export type PaymentStatus =
  | "Pendiente"
  | "Pago inicial recibido"
  | "Pagado parcial"
  | "Pagado completo"
  | "Mantenimiento al día"
  | "Mantenimiento atrasado"
  | string;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  photoURL?: string;
  active: boolean;
  createdAt?: string;
}

export interface Project {
  id: string;
  organizationId: string;
  clientId: string;
  name: string;
  client: string;
  serviceType: ServiceType;
  deliveryStatus: DeliveryStatus;
  paymentStatus: PaymentStatus;
  currency: "MXN" | "USD" | string;
  amount: number;
  initialPayment: number;
  monthlyMaintenance: number;
  startDate: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  nextMaintenanceDate?: string;
  responsibleIds: string[];
  notes: string;
  repoUrl?: string;
  productionUrl?: string;
  proposalUrl?: string;
  milestones?: ProjectMilestone[];
  documents?: ProjectDocument[];
  updatedAt?: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  status: "Pendiente" | "En progreso" | "Completado" | string;
  dueDate?: string;
  sortOrder?: number;
}

export interface ProjectDocument {
  id: string;
  title: string;
  url: string;
  type: "Propuesta" | "Contrato" | "Factura" | "Entrega" | "Otro" | string;
  createdAt?: string;
}

export interface PaymentRecord {
  id: string;
  projectId?: string;
  amount: number;
  currency: "MXN" | "USD" | string;
  status: "pending" | "paid" | "failed" | "refunded" | string;
  description: string;
  checkoutUrl?: string;
  createdAt?: string;
  paidAt?: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt?: string;
}
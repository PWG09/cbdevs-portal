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
  currency: "MXN" | "USD" | "CAD" | string;
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
  currency: "MXN" | "USD" | "CAD" | string;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled" | string;
  description: string;
  reference?: string;
  createdAt?: string;
  paidAt?: string;
}

export interface PaymentLink {
  id: string;
  projectId?: string;
  amount: number;
  currency: string;
  url: string;
  status: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  mine: boolean;
  text: string;
  createdAt?: string;
}

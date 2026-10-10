export type Role = "admin" | "empleado" | "cliente";
export type ServiceType = "Sitio Web" | "Aplicación Web" | "Software Personalizado/Automatización";
export type DeliveryStatus =
  | "Cotizado"
  | "En desarrollo"
  | "En revisión"
  | "Entregado"
  | "En mantenimiento"
  | "Pausado/Cancelado";
export type PaymentStatus =
  | "Pendiente"
  | "Pago inicial recibido"
  | "Pagado parcial"
  | "Pagado completo"
  | "Mantenimiento al día"
  | "Mantenimiento atrasado";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  photoURL?: string;
  active: boolean;
  createdAt?: unknown;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  serviceType: ServiceType;
  deliveryStatus: DeliveryStatus;
  paymentStatus: PaymentStatus;
  currency: "MXN" | "USD";
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
  clientUid?: string;
  clientEmail?: string;
  milestones?: ProjectMilestone[];
  documents?: ProjectDocument[];
  updatedAt?: unknown;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  status: "Pendiente" | "En progreso" | "Completado";
  dueDate?: string;
}

export interface ProjectDocument {
  id: string;
  title: string;
  url: string;
  type: "Propuesta" | "Contrato" | "Factura" | "Entrega" | "Otro";
  createdAt?: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: "MXN" | "USD";
  status: "pending" | "paid" | "failed" | "refunded";
  description: string;
  checkoutUrl?: string;
  createdAt?: {
    toDate?: () => Date;
  } | Date;
  paidAt?: {
    toDate?: () => Date;
  } | Date;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  text: string;
  createdAt?: {
  toDate?: () => Date;
} | Date;
}

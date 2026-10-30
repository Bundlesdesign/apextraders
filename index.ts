export interface Instrument {
  symbol: string;
  name: string;
  type: 'STOCK' | 'ETF' | 'CRYPTO';
  exchange: string;
  base: number; // in cents
  currentPrice: number; // in cents
  prevClose: number; // in cents
  change: number; // in cents
  changePercent: number;
  high: number;
  low: number;
  volume: string;
  marketCap: string;
}

export interface JournalLine {
  acct: string;
  dr: number; // debited minor cents
  cr: number; // credited minor cents
}

export interface JournalEntry {
  id: string;
  uid: string;
  type: 'deposit' | 'withdrawal' | 'withdrawal_hold' | 'order_reserve' | 'order_release' | 'trade_fill' | 'admin_adjustment' | 'reversal';
  memo: string;
  lines: JournalLine[];
  totalMinor: number;
  ref?: string;
  orderId?: string;
  symbol?: string;
  adjustmentId?: string;
  createdAt: number;
}

export interface Position {
  uid: string;
  symbol: string;
  qty: number;
  held: number; // shares committed to open sell orders
  costBasisMinor: number; // total cost basis in cents
  updatedAt: number;
}

export interface Order {
  id: string;
  uid: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  qty: number;
  filledQty: number;
  limitMinor: number | null;
  status: 'open' | 'partially_filled' | 'filled' | 'canceled' | 'rejected';
  reservedMinor: number;
  avgFillMinor: number;
  createdAt: number;
  updatedAt: number;
}

export interface Execution {
  id: string;
  uid: string;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  priceMinor: number;
  grossMinor: number;
  feeMinor: number;
  realizedPnlMinor: number;
  createdAt: number;
}

export type KycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'resubmission_required';

export interface KycSubmission {
  uid: string;
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  country: string;
  residentialAddress: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  idType: 'passport' | 'drivers_license' | 'national_id';
  idNumber: string;
  idFrontImage?: string; // base64 or secure data URI
  idBackImage?: string;
  selfieImage?: string;
  status: KycStatus;
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectionReason?: string;
  resubmissionInstructions?: string;
}

export interface WithdrawalPasscodeSession {
  code: string;
  expiresAt: number;
  attemptsRemaining: number;
  amountMinor: number;
  destinationBank: string;
  accountNumber: string;
  routingNumber: string;
  accountType: string;
  createdAt: number;
}

export interface Account {
  uid: string;
  accountId: string;
  status: 'approved' | 'restricted' | 'suspended';
  currency: 'USD';
  cash: number; // in cents
  reserved: number; // in cents (locked for buy orders)
  hold: number; // in cents (pending withdrawal review)
  realizedPnlMinor: number;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  accountId: string;
  emailVerified: boolean;
  isAdmin: boolean;
  status: 'approved' | 'restricted' | 'suspended';
  kycStatus: KycStatus;
  kycSubmission?: KycSubmission;
  createdAt: number;
}

export interface FundingRecord {
  id: string;
  uid: string;
  reference: string;
  type: 'deposit' | 'withdrawal';
  amountMinor: number;
  currency: 'USD';
  status: 'completed' | 'under_review' | 'rejected' | 'canceled';
  history: { status: string; at: number }[];
  createdAt: number;
}

export type DepositStatus = 'not_submitted' | 'pending' | 'under_review' | 'approved' | 'rejected';

export interface DepositRequest {
  id: string;
  uid: string;
  accountId: string;
  userEmail: string;
  userName: string;
  amountMinor: number;
  currency: 'USD';
  paymentMethod: string; // Wire Transfer, SWIFT, Fedwire, SEPA
  paymentReference: string; // Bank IMAD/OMAD, wire transaction reference
  paymentDate: string; // YYYY-MM-DD
  evidenceNotes?: string;
  evidenceFileName?: string;
  evidenceFileUrl?: string;
  status: DepositStatus;
  ticketId?: string;
  createdAt: number;
  updatedAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
  rejectionReason?: string;
  adminAdjustmentId?: string;
}

export interface PriceAlert {
  id: string;
  uid: string;
  symbol: string;
  direction: 'above' | 'below';
  priceMinor: number;
  active: boolean;
  createdAt: number;
  triggeredAt?: number;
}

export interface NotificationItem {
  id: string;
  uid: string;
  title: string;
  body: string;
  read: boolean;
  type?: 'trade' | 'funding' | 'alert' | 'system';
  createdAt: number;
}

export interface TicketMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderRole: 'client' | 'admin' | 'support';
  message: string;
  createdAt: number;
  isInstruction?: boolean;
}

export interface SupportTicket {
  id: string;
  uid: string;
  userEmail?: string;
  userName?: string;
  category?: 'deposit' | 'withdrawal' | 'kyc' | 'general';
  subject: string;
  message: string;
  messages?: TicketMessage[];
  status: 'open' | 'in_progress' | 'closed';
  createdAt: number;
  updatedAt?: number;
  reply?: string;
}

export interface AdminAdjustment {
  id: string;
  uid: string;
  customerEmail: string;
  accountId: string;
  direction: 'credit' | 'debit';
  amountMinor: number;
  currency: 'USD';
  reason: string;
  reference: string;
  note: string;
  requestedBy: string;
  approvedBy?: string;
  reviewedBy?: string;
  status: 'pending_approval' | 'posted' | 'rejected';
  createdAt: number;
  postedAt?: number;
}

export interface AuditLog {
  id: string;
  at: number;
  actorUid: string;
  actorEmail: string;
  action: string;
  outcome: 'success' | 'failed';
  target?: string;
  message?: string;
  details?: Record<string, any>;
}

export interface ReconciliationReport {
  at: number;
  ok: boolean;
  journals: number;
  accounts: number;
  totalDebits: number;
  totalCredits: number;
  exceptions: Array<{
    uid: string;
    accountId: string;
    expectedCash: number;
    actualCash: number;
    driftMinor: number;
  }>;
}

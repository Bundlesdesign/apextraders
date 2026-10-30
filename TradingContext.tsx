import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Account,
  Position,
  Order,
  JournalEntry,
  Execution,
  UserProfile,
  FundingRecord,
  PriceAlert,
  NotificationItem,
  SupportTicket,
  TicketMessage,
  AdminAdjustment,
  AuditLog,
  Instrument,
  ReconciliationReport,
  KycStatus,
  KycSubmission,
  WithdrawalPasscodeSession,
  DepositRequest,
} from '../types';
import {
  getAllInstruments,
  priceAt,
  formatCurrency,
} from '../services/marketData';
import {
  createJournal,
  applyJournal,
  placeOrder as enginePlaceOrder,
  cancelOrder as engineCancelOrder,
  fillOrder,
  reconcileLedger,
  toMinor,
  A,
  EngineError,
} from '../services/financialEngine';
import { auth, db } from '../services/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

interface TradingContextType {
  user: UserProfile | null;
  account: Account | null;
  authLoading: boolean;
  isAuthenticated: boolean;
  positions: Position[];
  orders: Order[];
  journals: JournalEntry[];
  executions: Execution[];
  fundingHistory: FundingRecord[];
  watchlist: string[];
  priceAlerts: PriceAlert[];
  notifications: NotificationItem[];
  tickets: SupportTicket[];
  depositRequests: DepositRequest[];
  allDepositRequests: DepositRequest[];
  instruments: Instrument[];
  allUsers: UserProfile[];
  allAccounts: Account[];
  allWithdrawals: FundingRecord[];
  adminAdjustments: AdminAdjustment[];
  auditLogs: AuditLog[];
  lastReconciliation: ReconciliationReport | null;
  activeView: string;
  setActiveView: (view: string) => void;
  selectedSymbol: string;
  setSelectedSymbol: (sym: string) => void;

  // Real Authentication
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;

  // KYC Verification
  kycModalOpen: boolean;
  setKycModalOpen: (open: boolean) => void;
  submitKyc: (data: Omit<KycSubmission, 'status' | 'submittedAt' | 'uid'>) => Promise<void>;
  approveKyc: (targetUid: string) => Promise<void>;
  rejectKyc: (targetUid: string, reason: string) => Promise<void>;
  requestKycResubmission: (targetUid: string, instructions: string) => Promise<void>;

  // Passkey Protected Withdrawals
  activePasscodeSession: WithdrawalPasscodeSession | null;
  requestWithdrawalPasscode: (
    amountStr: string,
    destination: { bankName: string; routingNumber: string; accountNumber: string; accountType: string }
  ) => Promise<{ success: boolean; expiresAt: number; directPasscodeHint?: string }>;
  confirmWithdrawalWithPasscode: (code: string) => Promise<FundingRecord>;
  cancelWithdrawalPasscode: () => void;

  // Verified Institutional Deposit Process
  submitDepositRequest: (params: {
    amountStr: string;
    paymentMethod: string;
    paymentReference: string;
    paymentDate: string;
    evidenceNotes?: string;
    evidenceFileName?: string;
  }) => Promise<DepositRequest>;
  initiateDepositCoordination: (params: {
    amountStr: string;
    bankOrigin?: string;
    notes?: string;
  }) => Promise<{ depositRequest: DepositRequest; ticket: SupportTicket }>;
  submitDepositEvidence: (params: {
    requestId: string;
    evidenceRef: string;
    bankOrigin: string;
    notes?: string;
  }) => Promise<void>;
  approveDepositRequest: (requestId: string, adminNote?: string) => Promise<void>;
  rejectDepositRequest: (requestId: string, reason: string) => Promise<void>;
  addTicketMessage: (ticketId: string, message: string, isInstruction?: boolean) => Promise<void>;

  // Customer Actions
  placeOrder: (params: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    qty: number;
    limitPrice?: string;
  }) => Promise<{ order: Order; status: string }>;
  cancelOrder: (orderId: string) => Promise<void>;
  withdraw: (amountStr: string) => Promise<FundingRecord>;
  addToWatchlist: (sym: string) => void;
  removeFromWatchlist: (sym: string) => void;
  addPriceAlert: (symbol: string, direction: 'above' | 'below', targetPriceStr: string) => void;
  removePriceAlert: (id: string) => void;
  markNotificationRead: (id: string) => void;
  createSupportTicket: (subject: string, message: string, category?: SupportTicket['category']) => void;
  updateProfile: (displayName: string, phone: string) => Promise<void>;

  // Admin Actions
  adminCreditDebit: (params: {
    targetUid: string;
    direction: 'credit' | 'debit';
    amountStr: string;
    reference: string;
    description: string;
    note?: string;
  }) => Promise<AdminAdjustment>;
  postAdminAdjustment: (params: {
    targetUid: string;
    direction: 'credit' | 'debit';
    amountStr: string;
    reason: string;
    reference: string;
    note: string;
  }) => Promise<AdminAdjustment>;
  approveAdjustment: (adjId: string) => Promise<void>;
  rejectAdjustment: (adjId: string) => Promise<void>;
  reviewWithdrawal: (id: string, decision: 'approve' | 'reject') => Promise<void>;
  setUserStatus: (targetUid: string, status: 'approved' | 'restricted' | 'suspended', reason: string) => Promise<void>;
  runReconciliation: () => ReconciliationReport;
  reverseJournal: (journalId: string, reason: string) => Promise<void>;
  closeSupportTicket: (id: string, reply?: string) => void;
}

const STORAGE_STATE_KEY = 'xfunds_brokerage_ledger_state_v4';
const ADMIN_EMAIL = 'xfundsadmin@gov.com';

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Brokerage datasets (synced per user & stored in state)
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STATE_KEY);
      if (saved) return JSON.parse(saved).users || [];
    } catch {}
    return [];
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STATE_KEY);
      if (saved) return JSON.parse(saved).accounts || [];
    } catch {}
    return [];
  });

  const [positions, setPositions] = useState<Position[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STATE_KEY);
      if (saved) return JSON.parse(saved).positions || [];
    } catch {}
    return [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STATE_KEY);
      if (saved) return JSON.parse(saved).orders || [];
    } catch {}
    return [];
  });

  const [journals, setJournals] = useState<JournalEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STATE_KEY);
      if (saved) return JSON.parse(saved).journals || [];
    } catch {}
    return [];
  });

  const [executions, setExecutions] = useState<Execution[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STATE_KEY);
      if (saved) return JSON.parse(saved).executions || [];
    } catch {}
    return [];
  });

  const [fundingHistory, setFundingHistory] = useState<FundingRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STATE_KEY);
      if (saved) return JSON.parse(saved).fundingHistory || [];
    } catch {}
    return [];
  });

  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STATE_KEY);
      if (saved) return JSON.parse(saved).depositRequests || [];
    } catch {}
    return [];
  });

  const [watchlist, setWatchlist] = useState<string[]>(['AAPL', 'NVDA', 'MSFT', 'SPY', 'TSLA']);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STATE_KEY);
      if (saved) return JSON.parse(saved).tickets || [];
    } catch {}
    return [];
  });
  const [adminAdjustments, setAdminAdjustments] = useState<AdminAdjustment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [lastReconciliation, setLastReconciliation] = useState<ReconciliationReport | null>(null);

  const [activeView, setActiveView] = useState<string>('auth');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NVDA');
  const [instruments, setInstruments] = useState<Instrument[]>(() => getAllInstruments());

  const [kycModalOpen, setKycModalOpen] = useState<boolean>(false);
  const [activePasscodeSession, setActivePasscodeSession] = useState<WithdrawalPasscodeSession | null>(null);

  // Save changes to persistent storage
  useEffect(() => {
    try {
      const dataToSave = {
        users,
        accounts,
        positions,
        orders,
        journals,
        executions,
        fundingHistory,
        depositRequests,
        tickets,
        adminAdjustments,
        auditLogs,
      };
      localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn('Persistent storage sync warning:', e);
    }
  }, [
    users,
    accounts,
    positions,
    orders,
    journals,
    executions,
    fundingHistory,
    depositRequests,
    tickets,
    adminAdjustments,
    auditLogs,
  ]);

  // Real Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      setAuthLoading(true);
      if (!fbUser) {
        setCurrentUser(null);
        setCurrentAccount(null);
        setIsAuthenticated(false);
        setActiveView('auth');
        setAuthLoading(false);
        return;
      }

      try {
        // Derive verified server custom claim AND email check
        const tokenResult = await fbUser.getIdTokenResult(true);
        const emailLower = (fbUser.email || '').toLowerCase();
        const isAdminClaim = tokenResult.claims.admin === true;
        const isAdmin = isAdminClaim || emailLower === ADMIN_EMAIL;

        const uid = fbUser.uid;
        const accountId = 'XF-' + uid.slice(0, 8).toUpperCase();

        // Check if user profile exists
        let profile = users.find(u => u.uid === uid);
        let userAcct = accounts.find(a => a.uid === uid);

        if (!profile) {
          profile = {
            uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || emailLower.split('@')[0],
            phone: '',
            accountId,
            emailVerified: fbUser.emailVerified,
            isAdmin,
            status: 'approved',
            kycStatus: isAdmin ? 'approved' : 'not_submitted',
            createdAt: Date.now(),
          };
          setUsers(prev => [profile!, ...prev.filter(u => u.uid !== uid)]);
        } else {
          profile = {
            ...profile,
            emailVerified: fbUser.emailVerified,
            isAdmin,
            kycStatus: profile.kycStatus || (isAdmin ? 'approved' : 'not_submitted'),
          };
        }

        if (!userAcct) {
          // Initialize customer brokerage account with $0.00 cash (or treasury for admin)
          userAcct = {
            uid,
            accountId,
            status: 'approved',
            currency: 'USD',
            cash: isAdmin ? 100000000 : 0, // Clients start strictly at $0.00. No unearned credit.
            reserved: 0,
            hold: 0,
            realizedPnlMinor: 0,
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          if (isAdmin) {
            const initialJournal = createJournal(
              uid,
              'deposit',
              `Treasury Node Allocation ${accountId}`,
              [
                { acct: A.FUND, dr: userAcct.cash, cr: 0 },
                { acct: A.cash(uid), dr: 0, cr: userAcct.cash },
              ],
              { ref: `TREASURY-${accountId}` }
            );
            setJournals(prev => [initialJournal, ...prev]);
          }

          setAccounts(prev => [userAcct!, ...prev.filter(a => a.uid !== uid)]);
        }

        setCurrentUser(profile);
        setCurrentAccount(userAcct);
        setIsAuthenticated(true);
        setActiveView(isAdmin ? 'admin' : 'dashboard');
      } catch (err) {
        console.error('Error during user session setup:', err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [accounts, users]);

  // Derived user-scoped data
  const currentUid = currentUser?.uid || '';
  const userPositions = positions.filter(p => p.uid === currentUid && p.qty > 0);
  const userOrders = orders.filter(o => o.uid === currentUid);
  const userJournals = journals.filter(j => j.uid === currentUid);
  const userExecutions = executions.filter(e => e.uid === currentUid);
  const userFunding = fundingHistory.filter(f => f.uid === currentUid);
  const userNotifications = notifications.filter(n => n.uid === currentUid);
  const userTickets = tickets.filter(t => t.uid === currentUid);
  const userDepositRequests = depositRequests.filter(d => (currentUser?.isAdmin ? true : d.uid === currentUid));

  // Live market price updates & order sweeper
  useEffect(() => {
    const interval = setInterval(() => {
      const updated = getAllInstruments();
      setInstruments(updated);

      // Evaluate price alerts
      setPriceAlerts(prevAlerts => {
        let changed = false;
        const newAlerts = prevAlerts.map(alert => {
          if (!alert.active) return alert;
          const inst = updated.find(i => i.symbol === alert.symbol);
          if (!inst) return alert;

          const triggered =
            alert.direction === 'above'
              ? inst.currentPrice >= alert.priceMinor
              : inst.currentPrice <= alert.priceMinor;

          if (triggered) {
            changed = true;
            const newNotif: NotificationItem = {
              id: `NOT-ALT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              uid: alert.uid,
              title: `Price Alert Triggered: ${alert.symbol}`,
              body: `${alert.symbol} is now ${alert.direction} target price ${formatCurrency(alert.priceMinor)} (current: ${formatCurrency(inst.currentPrice)})`,
              read: false,
              type: 'alert',
              createdAt: Date.now(),
            };
            setNotifications(n => [newNotif, ...n]);
            return { ...alert, active: false, triggeredAt: Date.now() };
          }
          return alert;
        });
        return changed ? newAlerts : prevAlerts;
      });

      // Sweep resting limit orders
      setOrders(currentOrders => {
        let orderChanged = false;
        const newOrders = [...currentOrders];

        for (let i = 0; i < newOrders.length; i++) {
          const ord = newOrders[i];
          if (ord.status !== 'open' && ord.status !== 'partially_filled') continue;
          if (ord.type !== 'limit' || !ord.limitMinor) continue;

          const currPx = priceAt(ord.symbol);
          const shouldFill =
            ord.side === 'buy' ? currPx <= ord.limitMinor : currPx >= ord.limitMinor;

          if (shouldFill) {
            orderChanged = true;
            const remaining = ord.qty - ord.filledQty;
            const fillQty = Math.min(remaining, 50);

            setAccounts(accs => {
              const acc = accs.find(a => a.uid === ord.uid);
              if (!acc) return accs;

              setPositions(poss => {
                const pos =
                  poss.find(p => p.uid === ord.uid && p.symbol === ord.symbol) || {
                    uid: ord.uid,
                    symbol: ord.symbol,
                    qty: 0,
                    held: 0,
                    costBasisMinor: 0,
                    updatedAt: Date.now(),
                  };

                try {
                  const fillRes = fillOrder(acc, pos, ord, fillQty, currPx);
                  newOrders[i] = fillRes.order;

                  setJournals(j => [fillRes.journal, ...j]);
                  setExecutions(e => [fillRes.execution, ...e]);

                  const notif: NotificationItem = {
                    id: `NOT-SWP-${Date.now()}`,
                    uid: ord.uid,
                    title: `Limit Order ${fillRes.order.status.toUpperCase()}: ${ord.symbol}`,
                    body: `Filled ${fillQty} shares of ${ord.side.toUpperCase()} ${ord.symbol} at ${formatCurrency(currPx)}.`,
                    read: false,
                    type: 'trade',
                    createdAt: Date.now(),
                  };
                  setNotifications(n => [notif, ...n]);

                  const updatedPosList = poss.filter(
                    p => !(p.uid === ord.uid && p.symbol === ord.symbol)
                  );
                  updatedPosList.push(fillRes.position);
                  return updatedPosList;
                } catch (e) {
                  console.error('Sweep execution error', e);
                  return poss;
                }
              });

              return accs;
            });
          }
        }

        return orderChanged ? newOrders : currentOrders;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Real Authentication Methods
  const login = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const tokenResult = await cred.user.getIdTokenResult(true);
    const emailLower = (cred.user.email || '').toLowerCase();
    const isAdmin = tokenResult.claims.admin === true || emailLower === ADMIN_EMAIL;
    setActiveView(isAdmin ? 'admin' : 'dashboard');
  }, []);

  const register = useCallback(async (displayName: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await firebaseUpdateProfile(cred.user, { displayName: displayName.trim() });

    const uid = cred.user.uid;
    const accountId = 'XF-' + uid.slice(0, 8).toUpperCase();
    const isAdmin = (cred.user.email || '').toLowerCase() === ADMIN_EMAIL;

    const newProfile: UserProfile = {
      uid,
      email: cred.user.email || email.trim(),
      displayName: displayName.trim(),
      phone: '',
      accountId,
      emailVerified: cred.user.emailVerified,
      isAdmin,
      status: 'approved',
      kycStatus: isAdmin ? 'approved' : 'not_submitted',
      createdAt: Date.now(),
    };

    const newAcct: Account = {
      uid,
      accountId,
      status: 'approved',
      currency: 'USD',
      cash: 0, // Strictly $0.00 initial balance. No automatic capital or credit.
      reserved: 0,
      hold: 0,
      realizedPnlMinor: 0,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setUsers(prev => [newProfile, ...prev.filter(u => u.uid !== uid)]);
    setAccounts(prev => [newAcct, ...prev.filter(a => a.uid !== uid)]);

    setCurrentUser(newProfile);
    setCurrentAccount(newAcct);
    setIsAuthenticated(true);
    setActiveView(isAdmin ? 'admin' : 'dashboard');
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setCurrentUser(null);
    setCurrentAccount(null);
    setIsAuthenticated(false);
    setActiveView('auth');
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  // Customer Trading Actions
  const placeOrder = useCallback(
    async (params: {
      symbol: string;
      side: 'buy' | 'sell';
      type: 'market' | 'limit';
      qty: number;
      limitPrice?: string;
    }) => {
      if (!currentUser || !currentAccount) throw new Error('Unauthenticated');
      const sym = params.symbol.toUpperCase();
      const currentPrice = priceAt(sym);
      const limitMinor = params.limitPrice ? toMinor(params.limitPrice) : null;
      const pos = positions.find(p => p.uid === currentUid && p.symbol === sym) || null;

      const result = enginePlaceOrder(
        currentAccount,
        pos,
        {
          uid: currentUid,
          symbol: sym,
          side: params.side,
          type: params.type,
          qty: params.qty,
          limitMinor,
        },
        currentPrice
      );

      setCurrentAccount(result.account);
      setAccounts(prev => prev.map(a => (a.uid === currentUid ? result.account : a)));

      setPositions(prev => {
        const filtered = prev.filter(p => !(p.uid === currentUid && p.symbol === sym));
        return [...filtered, result.position];
      });

      setOrders(prev => [result.order, ...prev]);

      if (result.journals.length > 0) {
        setJournals(prev => [...result.journals, ...prev]);
      }
      if (result.executions.length > 0) {
        setExecutions(prev => [...result.executions, ...prev]);
      }

      const notif: NotificationItem = {
        id: `NOT-${Date.now()}`,
        uid: currentUid,
        title: `Order Submitted: ${result.order.side.toUpperCase()} ${result.order.qty} ${result.order.symbol}`,
        body:
          result.order.status === 'filled'
            ? `Filled immediately at average price ${formatCurrency(result.order.avgFillMinor)}.`
            : `Open in order book at limit ${formatCurrency(result.order.limitMinor || 0)}.`,
        read: false,
        type: 'trade',
        createdAt: Date.now(),
      };
      setNotifications(prev => [notif, ...prev]);

      return { order: result.order, status: result.order.status };
    },
    [currentAccount, currentUid, currentUser, positions]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      if (!currentUser || !currentAccount) throw new Error('Unauthenticated');
      const ord = orders.find(o => o.id === orderId && o.uid === currentUid);
      if (!ord) throw new Error('Order not found');

      const pos = positions.find(p => p.uid === currentUid && p.symbol === ord.symbol) || {
        uid: currentUid,
        symbol: ord.symbol,
        qty: 0,
        held: 0,
        costBasisMinor: 0,
        updatedAt: Date.now(),
      };

      const result = engineCancelOrder(currentAccount, pos, ord);

      setCurrentAccount(result.account);
      setAccounts(prev => prev.map(a => (a.uid === currentUid ? result.account : a)));
      setPositions(prev => {
        const filtered = prev.filter(p => !(p.uid === currentUid && p.symbol === ord.symbol));
        return [...filtered, result.position];
      });
      setOrders(prev => prev.map(o => (o.id === orderId ? result.order : o)));

      if (result.journal) {
        setJournals(prev => [result.journal!, ...prev]);
      }

      const notif: NotificationItem = {
        id: `NOT-CANC-${Date.now()}`,
        uid: currentUid,
        title: `Order Canceled: ${ord.symbol}`,
        body: `Order canceled. Any reserved buying power has been released.`,
        read: false,
        type: 'trade',
        createdAt: Date.now(),
      };
      setNotifications(prev => [notif, ...prev]);
    },
    [currentAccount, currentUid, currentUser, orders, positions]
  );

  // KYC Submission & Review Handlers
  const submitKyc = useCallback(
    async (data: Omit<KycSubmission, 'status' | 'submittedAt' | 'uid'>) => {
      if (!currentUser || !currentUid) throw new Error('Unauthenticated');
      const submission: KycSubmission = {
        ...data,
        uid: currentUid,
        status: 'pending',
        submittedAt: Date.now(),
      };

      const updatedUser: UserProfile = {
        ...currentUser,
        kycStatus: 'pending',
        kycSubmission: submission,
      };

      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => (u.uid === currentUid ? updatedUser : u)));

      const auditItem: AuditLog = {
        id: `AUD-${Date.now()}`,
        at: Date.now(),
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: 'kyc_submitted',
        outcome: 'success',
        target: `${data.legalFirstName} ${data.legalLastName}`,
        details: { idType: data.idType, country: data.country },
      };
      setAuditLogs(prev => [auditItem, ...prev]);

      const notif: NotificationItem = {
        id: `NOT-KYC-${Date.now()}`,
        uid: currentUid,
        title: 'Identity Verification Under Review',
        body: 'Your identity documents have been submitted to the compliance desk for institutional verification.',
        read: false,
        type: 'system',
        createdAt: Date.now(),
      };
      setNotifications(prev => [notif, ...prev]);
    },
    [currentUid, currentUser]
  );

  const approveKyc = useCallback(
    async (targetUid: string) => {
      if (!currentUser?.isAdmin) throw new Error('Unauthorized: Administrator privilege required.');
      const target = users.find(u => u.uid === targetUid);
      if (!target) throw new Error('Client not found');

      const updatedSubmission: KycSubmission | undefined = target.kycSubmission
        ? {
            ...target.kycSubmission,
            status: 'approved',
            reviewedAt: Date.now(),
            reviewedBy: currentUser.email,
          }
        : undefined;

      const updatedUser: UserProfile = {
        ...target,
        kycStatus: 'approved',
        kycSubmission: updatedSubmission,
      };

      setUsers(prev => prev.map(u => (u.uid === targetUid ? updatedUser : u)));
      if (currentUid === targetUid) {
        setCurrentUser(updatedUser);
      }

      const auditItem: AuditLog = {
        id: `AUD-${Date.now()}`,
        at: Date.now(),
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: 'kyc_approved',
        outcome: 'success',
        target: target.email,
        details: { reviewer: currentUser.email },
      };
      setAuditLogs(prev => [auditItem, ...prev]);

      const notif: NotificationItem = {
        id: `NOT-KYC-APP-${Date.now()}`,
        uid: targetUid,
        title: 'Identity Verification Approved',
        body: 'Your Tier-2 Institutional Identity Verification has been approved by compliance. Wire disbursements and full clearing privileges are active.',
        read: false,
        type: 'system',
        createdAt: Date.now(),
      };
      setNotifications(prev => [notif, ...prev]);
    },
    [currentUid, currentUser, users]
  );

  const rejectKyc = useCallback(
    async (targetUid: string, reason: string) => {
      if (!currentUser?.isAdmin) throw new Error('Unauthorized: Administrator privilege required.');
      const target = users.find(u => u.uid === targetUid);
      if (!target) throw new Error('Client not found');

      const updatedSubmission: KycSubmission | undefined = target.kycSubmission
        ? {
            ...target.kycSubmission,
            status: 'rejected',
            reviewedAt: Date.now(),
            reviewedBy: currentUser.email,
            rejectionReason: reason,
          }
        : undefined;

      const updatedUser: UserProfile = {
        ...target,
        kycStatus: 'rejected',
        kycSubmission: updatedSubmission,
      };

      setUsers(prev => prev.map(u => (u.uid === targetUid ? updatedUser : u)));
      if (currentUid === targetUid) {
        setCurrentUser(updatedUser);
      }

      const auditItem: AuditLog = {
        id: `AUD-${Date.now()}`,
        at: Date.now(),
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: 'kyc_rejected',
        outcome: 'success',
        target: target.email,
        details: { reviewer: currentUser.email, reason },
      };
      setAuditLogs(prev => [auditItem, ...prev]);

      const notif: NotificationItem = {
        id: `NOT-KYC-REJ-${Date.now()}`,
        uid: targetUid,
        title: 'Identity Verification Declined',
        body: `Your identity verification was declined by compliance. Reason: ${reason}. Please update your credentials.`,
        read: false,
        type: 'system',
        createdAt: Date.now(),
      };
      setNotifications(prev => [notif, ...prev]);
    },
    [currentUid, currentUser, users]
  );

  const requestKycResubmission = useCallback(
    async (targetUid: string, instructions: string) => {
      if (!currentUser?.isAdmin) throw new Error('Unauthorized: Administrator privilege required.');
      const target = users.find(u => u.uid === targetUid);
      if (!target) throw new Error('Client not found');

      const updatedSubmission: KycSubmission | undefined = target.kycSubmission
        ? {
            ...target.kycSubmission,
            status: 'resubmission_required',
            reviewedAt: Date.now(),
            reviewedBy: currentUser.email,
            resubmissionInstructions: instructions,
          }
        : undefined;

      const updatedUser: UserProfile = {
        ...target,
        kycStatus: 'resubmission_required',
        kycSubmission: updatedSubmission,
      };

      setUsers(prev => prev.map(u => (u.uid === targetUid ? updatedUser : u)));
      if (currentUid === targetUid) {
        setCurrentUser(updatedUser);
      }

      const auditItem: AuditLog = {
        id: `AUD-${Date.now()}`,
        at: Date.now(),
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: 'kyc_resubmission_requested',
        outcome: 'success',
        target: target.email,
        details: { reviewer: currentUser.email, instructions },
      };
      setAuditLogs(prev => [auditItem, ...prev]);

      const notif: NotificationItem = {
        id: `NOT-KYC-RES-${Date.now()}`,
        uid: targetUid,
        title: 'Compliance Action: Resubmission Required',
        body: `Compliance requested resubmission of identity documentation: ${instructions}.`,
        read: false,
        type: 'system',
        createdAt: Date.now(),
      };
      setNotifications(prev => [notif, ...prev]);
    },
    [currentUid, currentUser, users]
  );

  // Passkey Security for Withdrawals
  const requestWithdrawalPasscode = useCallback(
    async (
      amountStr: string,
      destination: { bankName: string; routingNumber: string; accountNumber: string; accountType: string }
    ) => {
      if (!currentUser || !currentAccount) throw new Error('Unauthenticated');
      if (currentUser.kycStatus !== 'approved') {
        throw new EngineError(
          'kyc_required',
          'Withdrawals require Approved KYC Identity Verification. Your current verification status is ' +
            (currentUser.kycStatus === 'pending'
              ? 'Under Review'
              : currentUser.kycStatus === 'not_submitted'
              ? 'Not Submitted'
              : currentUser.kycStatus === 'rejected'
              ? 'Rejected'
              : 'Resubmission Required') +
            '. Please complete verification before initiating funds disbursement.'
        );
      }

      const amtMinor = toMinor(amountStr);
      if (amtMinor <= 0) throw new Error('Please enter a valid disbursement amount.');
      if (currentAccount.cash < amtMinor) {
        throw new EngineError(
          'insufficient_funds',
          `Insufficient available cash. Available: ${formatCurrency(currentAccount.cash)}`
        );
      }

      // Generate 6-digit numeric passkey
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minute expiration window

      const session: WithdrawalPasscodeSession = {
        code,
        expiresAt,
        attemptsRemaining: 3,
        amountMinor: amtMinor,
        destinationBank: destination.bankName,
        accountNumber: destination.accountNumber,
        routingNumber: destination.routingNumber,
        accountType: destination.accountType,
        createdAt: Date.now(),
      };

      setActivePasscodeSession(session);

      const notif: NotificationItem = {
        id: `NOT-SEC-${Date.now()}`,
        uid: currentUid,
        title: 'Confidential Withdrawal Passkey',
        body: `Your time-limited 6-digit disbursement authorization code is ${code}. Valid for 5 minutes. Do not share this passkey.`,
        read: false,
        type: 'system',
        createdAt: Date.now(),
      };
      setNotifications(prev => [notif, ...prev]);

      return {
        success: true,
        expiresAt,
        directPasscodeHint: code,
      };
    },
    [currentAccount, currentUid, currentUser]
  );

  const confirmWithdrawalWithPasscode = useCallback(
    async (enteredCode: string) => {
      if (!currentUser || !currentAccount) throw new Error('Unauthenticated');
      if (!activePasscodeSession) {
        throw new Error('No active withdrawal verification session found. Please initiate a new request.');
      }

      if (Date.now() > activePasscodeSession.expiresAt) {
        setActivePasscodeSession(null);
        throw new Error('Verification code has expired. Please request a new passkey.');
      }

      if (activePasscodeSession.attemptsRemaining <= 0) {
        setActivePasscodeSession(null);
        throw new Error('Maximum verification attempts exceeded. For security, please initiate a new request.');
      }

      if (enteredCode.trim() !== activePasscodeSession.code) {
        const remaining = activePasscodeSession.attemptsRemaining - 1;
        setActivePasscodeSession(prev => (prev ? { ...prev, attemptsRemaining: remaining } : null));
        if (remaining <= 0) {
          throw new Error('Incorrect passkey. Verification attempts exhausted. Please start a new request.');
        }
        throw new Error(`Incorrect verification passkey. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
      }

      // Valid passkey! Execute withdrawal
      const amtMinor = activePasscodeSession.amountMinor;
      const ref = `WDR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const fndId = `FND-${Date.now()}`;
      const needsReview = amtMinor >= 1000000; // >= $10,000 threshold

      let journal: JournalEntry;
      if (needsReview) {
        journal = createJournal(
          currentUid,
          'withdrawal_hold',
          `Escrow hold for compliance review ${ref} (${activePasscodeSession.destinationBank})`,
          [
            { acct: A.cash(currentUid), dr: amtMinor, cr: 0 },
            { acct: A.hold(currentUid), dr: 0, cr: amtMinor },
          ],
          { ref }
        );
      } else {
        journal = createJournal(
          currentUid,
          'withdrawal',
          `Wire Disbursement ${ref} to ${activePasscodeSession.destinationBank} ****${activePasscodeSession.accountNumber.slice(-4)}`,
          [
            { acct: A.cash(currentUid), dr: amtMinor, cr: 0 },
            { acct: A.FUND, dr: 0, cr: amtMinor },
          ],
          { ref }
        );
      }

      const nextAccount = applyJournal(currentAccount, currentUid, journal);

      const fundingRecord: FundingRecord = {
        id: fndId,
        uid: currentUid,
        reference: ref,
        type: 'withdrawal',
        amountMinor: amtMinor,
        currency: 'USD',
        status: needsReview ? 'under_review' : 'completed',
        history: [{ status: needsReview ? 'under_review' : 'completed', at: Date.now() }],
        createdAt: Date.now(),
      };

      setCurrentAccount(nextAccount);
      setAccounts(prev => prev.map(a => (a.uid === currentUid ? nextAccount : a)));
      setJournals(prev => [journal, ...prev]);
      setFundingHistory(prev => [fundingRecord, ...prev]);
      setActivePasscodeSession(null);

      // Audit log
      const auditItem: AuditLog = {
        id: `AUD-${Date.now()}`,
        at: Date.now(),
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: 'withdrawal_passkey_verified',
        outcome: 'success',
        target: ref,
        details: {
          amount: formatCurrency(amtMinor),
          bank: activePasscodeSession.destinationBank,
          status: fundingRecord.status,
        },
      };
      setAuditLogs(prev => [auditItem, ...prev]);

      const notif: NotificationItem = {
        id: `NOT-WDR-${Date.now()}`,
        uid: currentUid,
        title: needsReview ? 'Withdrawal Pending Compliance Review' : 'Withdrawal Dispatched',
        body: `Disbursement ${ref} of ${formatCurrency(amtMinor)} to ${activePasscodeSession.destinationBank} authorized via secure passkey.`,
        read: false,
        type: 'funding',
        createdAt: Date.now(),
      };
      setNotifications(prev => [notif, ...prev]);

      return fundingRecord;
    },
    [activePasscodeSession, currentAccount, currentUid, currentUser]
  );

  const cancelWithdrawalPasscode = useCallback(() => {
    setActivePasscodeSession(null);
  }, []);

  const withdraw = useCallback(
    async (amountStr: string) => {
      if (!currentUser || !currentAccount) throw new Error('Unauthenticated');
      if (currentUser.kycStatus !== 'approved') {
        throw new EngineError(
          'kyc_required',
          'Withdrawals require Approved KYC Identity Verification. Your current verification status is ' +
            (currentUser.kycStatus === 'pending'
              ? 'Under Review'
              : currentUser.kycStatus === 'not_submitted'
              ? 'Not Submitted'
              : currentUser.kycStatus === 'rejected'
              ? 'Rejected'
              : 'Resubmission Required') +
            '. Please complete verification before requesting funds disbursement.'
        );
      }

      const amtMinor = toMinor(amountStr);
      if (currentAccount.cash < amtMinor) {
        throw new EngineError('insufficient_funds', 'Insufficient withdrawable cash.');
      }

      const ref = `WDR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const fndId = `FND-${Date.now()}`;
      const needsReview = amtMinor >= 1000000; // >= $10,000 threshold

      let journal: JournalEntry;
      if (needsReview) {
        journal = createJournal(
          currentUid,
          'withdrawal_hold',
          `Escrow hold for compliance review ${ref}`,
          [
            { acct: A.cash(currentUid), dr: amtMinor, cr: 0 },
            { acct: A.hold(currentUid), dr: 0, cr: amtMinor },
          ],
          { ref }
        );
      } else {
        journal = createJournal(
          currentUid,
          'withdrawal',
          `Wire Disbursement ${ref}`,
          [
            { acct: A.cash(currentUid), dr: amtMinor, cr: 0 },
            { acct: A.FUND, dr: 0, cr: amtMinor },
          ],
          { ref }
        );
      }

      const nextAccount = applyJournal(currentAccount, currentUid, journal);

      const fundingRecord: FundingRecord = {
        id: fndId,
        uid: currentUid,
        reference: ref,
        type: 'withdrawal',
        amountMinor: amtMinor,
        currency: 'USD',
        status: needsReview ? 'under_review' : 'completed',
        history: [{ status: needsReview ? 'under_review' : 'completed', at: Date.now() }],
        createdAt: Date.now(),
      };

      setCurrentAccount(nextAccount);
      setAccounts(prev => prev.map(a => (a.uid === currentUid ? nextAccount : a)));
      setJournals(prev => [journal, ...prev]);
      setFundingHistory(prev => [fundingRecord, ...prev]);

      const notif: NotificationItem = {
        id: `NOT-WDR-${Date.now()}`,
        uid: currentUid,
        title: needsReview
          ? `Withdrawal Queued for Review: ${formatCurrency(amtMinor)}`
          : `Disbursement Sent: ${formatCurrency(amtMinor)}`,
        body: needsReview
          ? `Disbursement ${ref} exceeds $10,000.00 and is routed to compliance.`
          : `Disbursement ${ref} sent to your depository account.`,
        read: false,
        type: 'funding',
        createdAt: Date.now(),
      };
      setNotifications(prev => [notif, ...prev]);

      return fundingRecord;
    },
    [currentAccount, currentUid, currentUser]
  );

  const addToWatchlist = useCallback((sym: string) => {
    setWatchlist(prev => (prev.includes(sym) ? prev : [...prev, sym]));
  }, []);

  const removeFromWatchlist = useCallback((sym: string) => {
    setWatchlist(prev => prev.filter(s => s !== sym));
  }, []);

  const addPriceAlert = useCallback(
    (symbol: string, direction: 'above' | 'below', targetPriceStr: string) => {
      if (!currentUid) return;
      const priceMinor = toMinor(targetPriceStr);
      const alert: PriceAlert = {
        id: `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        uid: currentUid,
        symbol: symbol.toUpperCase(),
        direction,
        priceMinor,
        active: true,
        createdAt: Date.now(),
      };
      setPriceAlerts(prev => [alert, ...prev]);
    },
    [currentUid]
  );

  const removePriceAlert = useCallback((id: string) => {
    setPriceAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const createSupportTicket = useCallback(
    (subject: string, message: string, category: SupportTicket['category'] = 'general') => {
      if (!currentUid || !currentUser) return;
      const now = Date.now();
      const ticket: SupportTicket = {
        id: `TCK-${now.toString().slice(-6)}`,
        uid: currentUid,
        userEmail: currentUser.email,
        userName: currentUser.displayName,
        category,
        subject,
        message,
        messages: [
          {
            id: `MSG-${now}-1`,
            senderUid: currentUid,
            senderName: currentUser.displayName,
            senderRole: 'client',
            message,
            createdAt: now,
          },
        ],
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };
      setTickets(prev => [ticket, ...prev]);

      const notif: NotificationItem = {
        id: `NOT-TCK-${now}`,
        uid: currentUid,
        title: `Support Ticket Dispatched · ${ticket.id}`,
        body: `Your official support enquiry regarding "${subject}" has been queued with institutional support.`,
        read: false,
        type: 'system',
        createdAt: now,
      };
      setNotifications(prev => [notif, ...prev]);
    },
    [currentUid, currentUser]
  );

  // New Verified Institutional Deposit Submission
  const submitDepositRequest = useCallback(
    async (params: {
      amountStr: string;
      paymentMethod: string;
      paymentReference: string;
      paymentDate: string;
      evidenceNotes?: string;
      evidenceFileName?: string;
    }) => {
      if (!currentUid || !currentUser || !currentAccount) throw new Error('Unauthenticated');
      const amtMinor = toMinor(params.amountStr);
      if (amtMinor <= 0) {
        throw new EngineError('bad_amount', 'Deposit amount must be greater than $0.00.');
      }
      if (!params.paymentReference.trim()) {
        throw new Error('A payment reference number or wire transaction ID is required.');
      }

      const normRef = params.paymentReference.trim().toUpperCase();
      const duplicate = depositRequests.some(
        r => r.status !== 'rejected' && r.paymentReference.trim().toUpperCase() === normRef
      );
      if (duplicate) {
        throw new Error('A deposit request with this payment reference already exists. Contact official support if this is a mistake.');
      }

      const depId = `DEP-${Date.now().toString().slice(-6)}`;
      const ticketId = `TCK-${Date.now().toString().slice(-6)}`;
      const now = Date.now();

      const ticketMessages: TicketMessage[] = [
        {
          id: `MSG-${now}-1`,
          senderUid: currentUid,
          senderName: currentUser.displayName,
          senderRole: 'client',
          message: `Official Deposit Verification Request Submitted:\n• Amount: ${formatCurrency(amtMinor)}\n• Method: ${params.paymentMethod}\n• Reference / Wire ID: ${params.paymentReference}\n• Date of Payment: ${params.paymentDate}\n• Evidence Details: ${params.evidenceNotes || 'Payment executed as instructed. Awaiting ledger clearance.'}`,
          createdAt: now,
        },
        {
          id: `MSG-${now}-2`,
          senderUid: 'official-support',
          senderName: 'Official support',
          senderRole: 'support',
          message: `Dear ${currentUser.displayName},\n\nYour deposit verification request ${depId} has been queued for custodial matching. Our clearing administration will verify the incoming funds against banking records before crediting your account balance.\n\nDeposit Status: Pending Verification.`,
          createdAt: now + 400,
          isInstruction: true,
        },
      ];

      const newTicket: SupportTicket = {
        id: ticketId,
        uid: currentUid,
        userEmail: currentUser.email,
        userName: currentUser.displayName,
        category: 'deposit',
        subject: `Deposit Verification · ${depId} (${formatCurrency(amtMinor)})`,
        message: `Verification request for ${formatCurrency(amtMinor)} via ${params.paymentMethod}`,
        messages: ticketMessages,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };

      const newRequest: DepositRequest = {
        id: depId,
        uid: currentUid,
        accountId: currentAccount.accountId,
        userEmail: currentUser.email,
        userName: currentUser.displayName,
        amountMinor: amtMinor,
        currency: 'USD',
        paymentMethod: params.paymentMethod,
        paymentReference: params.paymentReference,
        paymentDate: params.paymentDate,
        evidenceNotes: params.evidenceNotes,
        evidenceFileName: params.evidenceFileName,
        status: 'pending',
        ticketId,
        createdAt: now,
        updatedAt: now,
      };

      setDepositRequests(prev => [newRequest, ...prev]);
      setTickets(prev => [newTicket, ...prev]);

      const notif: NotificationItem = {
        id: `NOT-DEP-${now}`,
        uid: currentUid,
        title: `Deposit Submitted for Verification · ${depId}`,
        body: `Your deposit request for ${formatCurrency(amtMinor)} has been logged. Account balance will update once approved by an administrator.`,
        read: false,
        type: 'funding',
        createdAt: now,
      };
      setNotifications(prev => [notif, ...prev]);

      const auditItem: AuditLog = {
        id: `AUD-${now}`,
        at: now,
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: 'deposit_request_submitted',
        outcome: 'success',
        target: depId,
        details: {
          reference: params.paymentReference,
          method: params.paymentMethod,
          amount: formatCurrency(amtMinor),
        },
      };
      setAuditLogs(prev => [auditItem, ...prev]);

      return newRequest;
    },
    [currentAccount, currentUid, currentUser, depositRequests]
  );

  // Backward compatible adapter
  const initiateDepositCoordination = useCallback(
    async (params: { amountStr: string; bankOrigin?: string; notes?: string }) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const req = await submitDepositRequest({
        amountStr: params.amountStr,
        paymentMethod: 'Bank Wire / SWIFT',
        paymentReference: `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        paymentDate: todayStr,
        evidenceNotes: params.notes,
      });
      const tck = tickets.find(t => t.id === req.ticketId) || {
        id: req.ticketId || `TCK-${Date.now()}`,
        uid: req.uid,
        subject: `Deposit Dossier ${req.id}`,
        message: 'Deposit dossier',
        status: 'open' as const,
        createdAt: Date.now(),
      };
      return { depositRequest: req, ticket: tck };
    },
    [submitDepositRequest, tickets]
  );

  const submitDepositEvidence = useCallback(
    async (params: { requestId: string; evidenceRef: string; bankOrigin: string; notes?: string }) => {
      if (!currentUid || !currentUser) throw new Error('Unauthenticated');
      const req = depositRequests.find(r => r.id === params.requestId);
      if (!req) throw new Error('Deposit request not found.');

      const now = Date.now();
      const updatedReq: DepositRequest = {
        ...req,
        status: 'under_review',
        paymentReference: params.evidenceRef,
        evidenceNotes: params.notes,
        updatedAt: now,
      };

      setDepositRequests(prev => prev.map(r => (r.id === params.requestId ? updatedReq : r)));

      if (req.ticketId) {
        const clientMsg: TicketMessage = {
          id: `MSG-${now}`,
          senderUid: currentUid,
          senderName: currentUser.displayName,
          senderRole: 'client',
          message: `Deposit Evidence Updated:\nReference ID: ${params.evidenceRef}\nOrigin: ${params.bankOrigin}\nDetails: ${params.notes || 'Details logged. Awaiting administrator review.'}`,
          createdAt: now,
        };

        setTickets(prev =>
          prev.map(t =>
            t.id === req.ticketId
              ? {
                  ...t,
                  messages: [...(t.messages || []), clientMsg],
                  updatedAt: now,
                }
              : t
          )
        );
      }

      const notif: NotificationItem = {
        id: `NOT-EVI-${now}`,
        uid: currentUid,
        title: `Deposit Evidence Logged · ${params.requestId}`,
        body: `Payment reference ${params.evidenceRef} updated. Clearing administration is reviewing.`,
        read: false,
        type: 'funding',
        createdAt: now,
      };
      setNotifications(prev => [notif, ...prev]);
    },
    [currentUid, currentUser, depositRequests]
  );

  const approveDepositRequest = useCallback(
    async (requestId: string, adminNote?: string) => {
      if (!currentUser?.isAdmin) throw new Error('Unauthorized: Only administrators can approve deposits.');
      const req = depositRequests.find(r => r.id === requestId);
      if (!req) throw new Error('Deposit request not found.');
      if (req.status !== 'pending' && req.status !== 'under_review') {
        throw new Error('Only deposits awaiting verification can be approved.');
      }
      if (journals.some(j => j.ref === `DEP-CLR-${req.id}`)) {
        throw new Error('This deposit has already been posted to the ledger.');
      }

      const targetAccount = accounts.find(a => a.uid === req.uid);
      if (!targetAccount) throw new Error('Target account not found.');

      const now = Date.now();
      const journalRef = `DEP-CLR-${req.id}`;

      // Execute double-entry ledger credit: DR cash_operating, CR customer_cash
      const journal = createJournal(
        req.uid,
        'deposit',
        `Custodial Deposit Verified (${req.id}) - Ref: ${req.paymentReference}`,
        [
          { acct: A.FUND, dr: req.amountMinor, cr: 0 },
          { acct: A.cash(req.uid), dr: 0, cr: req.amountMinor },
        ],
        { ref: journalRef }
      );

      const nextAccount = applyJournal(targetAccount, req.uid, journal);

      const fundingRecord: FundingRecord = {
        id: `FND-${now}`,
        uid: req.uid,
        reference: req.id,
        type: 'deposit',
        amountMinor: req.amountMinor,
        currency: 'USD',
        status: 'completed',
        history: [{ status: 'completed', at: now }],
        createdAt: now,
      };

      const updatedReq: DepositRequest = {
        ...req,
        status: 'approved',
        reviewedBy: currentUid,
        reviewedAt: now,
        updatedAt: now,
      };

      setAccounts(prev => prev.map(a => (a.uid === req.uid ? nextAccount : a)));
      if (currentAccount && currentAccount.uid === req.uid) {
        setCurrentAccount(nextAccount);
      }
      setJournals(prev => [journal, ...prev]);
      setFundingHistory(prev => [fundingRecord, ...prev]);
      setDepositRequests(prev => prev.map(r => (r.id === requestId ? updatedReq : r)));

      if (req.ticketId) {
        const approvalMsg: TicketMessage = {
          id: `MSG-${now}-CLR`,
          senderUid: currentUid,
          senderName: 'Official support',
          senderRole: 'admin',
          message: `DEPOSIT CONFIRMED & POSTED\n\nAmount: ${formatCurrency(req.amountMinor)}\nJournal Entry: ${journal.id}\nStatus: Approved and credited to your cash balance.\n${adminNote ? `Admin Note: ${adminNote}` : ''}`,
          createdAt: now,
          isInstruction: true,
        };
        setTickets(prev =>
          prev.map(t =>
            t.id === req.ticketId
              ? {
                  ...t,
                  status: 'closed',
                  messages: [...(t.messages || []), approvalMsg],
                  updatedAt: now,
                }
              : t
          )
        );
      }

      const notif: NotificationItem = {
        id: `NOT-APP-${now}`,
        uid: req.uid,
        title: `Deposit Approved: ${formatCurrency(req.amountMinor)}`,
        body: `Deposit ${req.id} has been verified and settled. Funds are now available in your cash balance.`,
        read: false,
        type: 'funding',
        createdAt: now,
      };
      setNotifications(prev => [notif, ...prev]);

      const auditItem: AuditLog = {
        id: `AUD-${now}`,
        at: now,
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: 'deposit_request_approved',
        outcome: 'success',
        target: req.id,
        details: {
          client: req.userEmail,
          amount: formatCurrency(req.amountMinor),
          journalId: journal.id,
          adminNote: adminNote || 'Approved by clearing desk',
        },
      };
      setAuditLogs(prev => [auditItem, ...prev]);
    },
    [accounts, currentAccount, currentUid, currentUser, depositRequests, journals]
  );

  const rejectDepositRequest = useCallback(
    async (requestId: string, reason: string) => {
      if (!currentUser?.isAdmin) throw new Error('Unauthorized: Only administrators can reject deposits.');
      const req = depositRequests.find(r => r.id === requestId);
      if (!req) throw new Error('Deposit request not found.');
      if (req.status !== 'pending' && req.status !== 'under_review') {
        throw new Error('Only deposits awaiting verification can be rejected.');
      }
      if (!reason.trim()) throw new Error('A rejection explanation is required.');

      const now = Date.now();
      const updatedReq: DepositRequest = {
        ...req,
        status: 'rejected',
        rejectionReason: reason,
        reviewedBy: currentUid,
        reviewedAt: now,
        updatedAt: now,
      };

      setDepositRequests(prev => prev.map(r => (r.id === requestId ? updatedReq : r)));

      if (req.ticketId) {
        const rejMsg: TicketMessage = {
          id: `MSG-${now}-REJ`,
          senderUid: currentUid,
          senderName: 'Official support',
          senderRole: 'admin',
          message: `DEPOSIT REJECTED\n\nExplanation: ${reason}\nPlease contact official customer support if you believe this is an error.`,
          createdAt: now,
        };
        setTickets(prev =>
          prev.map(t =>
            t.id === req.ticketId
              ? {
                  ...t,
                  messages: [...(t.messages || []), rejMsg],
                  updatedAt: now,
                }
              : t
          )
        );
      }

      const notif: NotificationItem = {
        id: `NOT-REJ-${now}`,
        uid: req.uid,
        title: `Deposit Request Rejected · ${req.id}`,
        body: `Reason: ${reason}`,
        read: false,
        type: 'funding',
        createdAt: now,
      };
      setNotifications(prev => [notif, ...prev]);

      const auditItem: AuditLog = {
        id: `AUD-${now}`,
        at: now,
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: 'deposit_request_rejected',
        outcome: 'success',
        target: req.id,
        details: {
          client: req.userEmail,
          reason,
        },
      };
      setAuditLogs(prev => [auditItem, ...prev]);
    },
    [currentUid, currentUser, depositRequests]
  );

  const addTicketMessage = useCallback(
    async (ticketId: string, message: string, isInstruction?: boolean) => {
      if (!currentUid || !currentUser) throw new Error('Unauthenticated');
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found.');

      const now = Date.now();
      const newMsg: TicketMessage = {
        id: `MSG-${now}-${Math.random().toString(36).slice(2, 6)}`,
        senderUid: currentUid,
        senderName: currentUser.isAdmin ? 'Official support' : currentUser.displayName,
        senderRole: currentUser.isAdmin ? 'admin' : 'client',
        message,
        createdAt: now,
        isInstruction,
      };

      setTickets(prev =>
        prev.map(t =>
          t.id === ticketId
            ? {
                ...t,
                messages: [...(t.messages || []), newMsg],
                updatedAt: now,
              }
            : t
        )
      );
    },
    [currentUid, currentUser, tickets]
  );

  const updateProfile = useCallback(
    async (displayName: string, phone: string) => {
      if (!currentUid || !auth.currentUser) return;
      await firebaseUpdateProfile(auth.currentUser, { displayName });
      setCurrentUser(prev => (prev ? { ...prev, displayName, phone } : null));
      setUsers(prev => prev.map(u => (u.uid === currentUid ? { ...u, displayName, phone } : u)));
    },
    [currentUid]
  );

  // Admin Actions
  const postAdminAdjustment = useCallback(
    async (params: {
      targetUid: string;
      direction: 'credit' | 'debit';
      amountStr: string;
      reason: string;
      reference: string;
      note: string;
    }) => {
      if (!currentUser?.isAdmin) throw new Error('Unauthorized');
      const amtMinor = toMinor(params.amountStr);
      const targetUser = users.find(u => u.uid === params.targetUid);
      if (!targetUser) throw new Error('Client not found');

      const targetAccount = accounts.find(a => a.uid === params.targetUid);
      if (!targetAccount) throw new Error('Client account not found');

      if (params.targetUid === currentUid) {
        throw new EngineError('self_adjustment', 'Administrators cannot adjust their own balance.');
      }

      const refCode = params.reference || `ADJ-${Date.now().toString().slice(-6)}`;
      const adjId = `ADJ-${Date.now()}`;
      const THRESHOLD = 5000000; // $50,000 threshold

      if (amtMinor >= THRESHOLD) {
        const pendingAdj: AdminAdjustment = {
          id: adjId,
          uid: params.targetUid,
          customerEmail: targetUser.email,
          accountId: targetAccount.accountId,
          direction: params.direction,
          amountMinor: amtMinor,
          currency: 'USD',
          reason: params.reason,
          reference: refCode,
          note: params.note,
          requestedBy: currentUid,
          status: 'pending_approval',
          createdAt: Date.now(),
        };

        setAdminAdjustments(prev => [pendingAdj, ...prev]);

        const auditItem: AuditLog = {
          id: `AUD-${Date.now()}`,
          at: Date.now(),
          actorUid: currentUid,
          actorEmail: currentUser.email,
          action: 'admin_adjustment_dual_auth_pending',
          outcome: 'success',
          target: targetUser.email,
          details: { amount: formatCurrency(amtMinor), reason: params.reason },
        };
        setAuditLogs(prev => [auditItem, ...prev]);

        return pendingAdj;
      }

      const lines =
        params.direction === 'credit'
          ? [
              { acct: A.FUND, dr: amtMinor, cr: 0 },
              { acct: A.cash(params.targetUid), dr: 0, cr: amtMinor },
            ]
          : [
              { acct: A.cash(params.targetUid), dr: amtMinor, cr: 0 },
              { acct: A.FUND, dr: 0, cr: amtMinor },
            ];

      const journal = createJournal(
        params.targetUid,
        'admin_adjustment',
        `Admin ${params.direction.toUpperCase()} (${params.reason}): ${refCode}`,
        lines,
        { ref: refCode, adjustmentId: adjId }
      );

      const nextAccount = applyJournal(targetAccount, params.targetUid, journal);

      const adjustment: AdminAdjustment = {
        id: adjId,
        uid: params.targetUid,
        customerEmail: targetUser.email,
        accountId: targetAccount.accountId,
        direction: params.direction,
        amountMinor: amtMinor,
        currency: 'USD',
        reason: params.reason,
        reference: refCode,
        note: params.note,
        requestedBy: currentUid,
        status: 'posted',
        createdAt: Date.now(),
        postedAt: Date.now(),
      };

      setAccounts(prev => prev.map(a => (a.uid === params.targetUid ? nextAccount : a)));
      setJournals(prev => [journal, ...prev]);
      setAdminAdjustments(prev => [adjustment, ...prev]);

      const auditItem: AuditLog = {
        id: `AUD-${Date.now()}`,
        at: Date.now(),
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: 'admin_adjustment_posted',
        outcome: 'success',
        target: targetUser.email,
        details: { amount: formatCurrency(amtMinor), direction: params.direction },
      };
      setAuditLogs(prev => [auditItem, ...prev]);

      return adjustment;
    },
    [accounts, currentUid, currentUser, users]
  );

  const approveAdjustment = useCallback(
    async (adjId: string) => {
      if (!currentUser?.isAdmin) throw new Error('Unauthorized');
      const adj = adminAdjustments.find(a => a.id === adjId && a.status === 'pending_approval');
      if (!adj) throw new Error('Adjustment not found');

      if (adj.requestedBy === currentUid) {
        throw new EngineError('dual_authorization', 'Dual-authorization rule: A different administrator must sign off.');
      }

      const targetAccount = accounts.find(a => a.uid === adj.uid);
      if (!targetAccount) throw new Error('Account not found');

      const lines =
        adj.direction === 'credit'
          ? [
              { acct: A.FUND, dr: adj.amountMinor, cr: 0 },
              { acct: A.cash(adj.uid), dr: 0, cr: adj.amountMinor },
            ]
          : [
              { acct: A.cash(adj.uid), dr: adj.amountMinor, cr: 0 },
              { acct: A.FUND, dr: 0, cr: adj.amountMinor },
            ];

      const journal = createJournal(
        adj.uid,
        'admin_adjustment',
        `Admin Dual-Approved ${adj.direction.toUpperCase()}: ${adj.reference}`,
        lines,
        { ref: adj.reference, adjustmentId: adj.id }
      );

      const nextAccount = applyJournal(targetAccount, adj.uid, journal);

      setAccounts(prev => prev.map(a => (a.uid === adj.uid ? nextAccount : a)));
      setJournals(prev => [journal, ...prev]);
      setAdminAdjustments(prev =>
        prev.map(a => (a.id === adjId ? { ...a, status: 'posted', approvedBy: currentUid, postedAt: Date.now() } : a))
      );

      const auditItem: AuditLog = {
        id: `AUD-${Date.now()}`,
        at: Date.now(),
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: 'admin_dual_authorization_posted',
        outcome: 'success',
        target: adj.customerEmail,
        details: { amount: formatCurrency(adj.amountMinor) },
      };
      setAuditLogs(prev => [auditItem, ...prev]);
    },
    [accounts, adminAdjustments, currentUid, currentUser]
  );

  const rejectAdjustment = useCallback(
    async (adjId: string) => {
      if (!currentUser?.isAdmin) throw new Error('Unauthorized');
      setAdminAdjustments(prev =>
        prev.map(a => (a.id === adjId ? { ...a, status: 'rejected', reviewedBy: currentUid } : a))
      );

      const auditItem: AuditLog = {
        id: `AUD-${Date.now()}`,
        at: Date.now(),
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: 'admin_adjustment_rejected',
        outcome: 'success',
        details: { adjId },
      };
      setAuditLogs(prev => [auditItem, ...prev]);
    },
    [currentUid, currentUser]
  );

  const reviewWithdrawal = useCallback(
    async (id: string, decision: 'approve' | 'reject') => {
      if (!currentUser?.isAdmin) throw new Error('Unauthorized');
      const record = fundingHistory.find(f => f.id === id);
      if (!record || record.status !== 'under_review') throw new Error('Withdrawal record not found or not under review');

      const userAcc = accounts.find(a => a.uid === record.uid);
      if (!userAcc) throw new Error('Account not found');

      let nextAccount: Account;
      let journal: JournalEntry;

      if (decision === 'approve') {
        journal = createJournal(
          record.uid,
          'withdrawal',
          `Approved Wire Disbursement ${record.reference}`,
          [
            { acct: A.hold(record.uid), dr: record.amountMinor, cr: 0 },
            { acct: A.FUND, dr: 0, cr: record.amountMinor },
          ],
          { ref: record.reference }
        );
        nextAccount = applyJournal(userAcc, record.uid, journal);
      } else {
        journal = createJournal(
          record.uid,
          'reversal',
          `Rejected Withdrawal Returned to Cash ${record.reference}`,
          [
            { acct: A.hold(record.uid), dr: record.amountMinor, cr: 0 },
            { acct: A.cash(record.uid), dr: 0, cr: record.amountMinor },
          ],
          { ref: record.reference }
        );
        nextAccount = applyJournal(userAcc, record.uid, journal);
      }

      setAccounts(prev => prev.map(a => (a.uid === record.uid ? nextAccount : a)));
      setJournals(prev => [journal, ...prev]);
      setFundingHistory(prev =>
        prev.map(f =>
          f.id === id
            ? {
                ...f,
                status: decision === 'approve' ? 'completed' : 'rejected',
                history: [...f.history, { status: decision === 'approve' ? 'completed' : 'rejected', at: Date.now() }],
              }
            : f
        )
      );

      const auditItem: AuditLog = {
        id: `AUD-${Date.now()}`,
        at: Date.now(),
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: `admin_withdrawal_${decision}`,
        outcome: 'success',
        target: record.reference,
        details: { amount: formatCurrency(record.amountMinor) },
      };
      setAuditLogs(prev => [auditItem, ...prev]);
    },
    [accounts, currentUid, currentUser, fundingHistory]
  );

  const setUserStatus = useCallback(
    async (targetUid: string, status: 'approved' | 'restricted' | 'suspended', reason: string) => {
      if (!currentUser?.isAdmin) throw new Error('Unauthorized');
      setUsers(prev => prev.map(u => (u.uid === targetUid ? { ...u, status } : u)));
      setAccounts(prev => prev.map(a => (a.uid === targetUid ? { ...a, status } : a)));

      const auditItem: AuditLog = {
        id: `AUD-${Date.now()}`,
        at: Date.now(),
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: 'admin_set_user_status',
        outcome: 'success',
        target: targetUid,
        details: { status, reason },
      };
      setAuditLogs(prev => [auditItem, ...prev]);
    },
    [currentUid, currentUser]
  );

  const runReconciliation = useCallback(() => {
    if (!currentUser?.isAdmin) throw new Error('Unauthorized');
    const report = reconcileLedger(accounts, journals);
    setLastReconciliation(report);

    const auditItem: AuditLog = {
      id: `AUD-${Date.now()}`,
      at: Date.now(),
      actorUid: currentUid,
      actorEmail: currentUser.email,
      action: 'admin_reconciliation_audit',
      outcome: report.ok ? 'success' : 'failed',
      details: {
        balanced: report.ok,
        journals: report.journals,
        accounts: report.accounts,
        exceptions: report.exceptions.length,
      },
    };
    setAuditLogs(prev => [auditItem, ...prev]);

    return report;
  }, [accounts, currentUid, currentUser, journals]);

  const reverseJournal = useCallback(
    async (journalId: string, reason: string) => {
      if (!currentUser?.isAdmin) throw new Error('Unauthorized');
      const orig = journals.find(j => j.id === journalId);
      if (!orig) throw new Error('Journal not found');

      const targetAccount = accounts.find(a => a.uid === orig.uid);
      if (!targetAccount) throw new Error('Account not found');

      const revLines = orig.lines.map(l => ({
        acct: l.acct,
        dr: l.cr,
        cr: l.dr,
      }));

      const reversalJournal = createJournal(
        orig.uid,
        'reversal',
        `Reversal of ${orig.memo}: ${reason}`,
        revLines,
        { ref: `REV-${orig.id}` }
      );

      const nextAccount = applyJournal(targetAccount, orig.uid, reversalJournal);

      setAccounts(prev => prev.map(a => (a.uid === orig.uid ? nextAccount : a)));
      setJournals(prev => [reversalJournal, ...prev]);

      const auditItem: AuditLog = {
        id: `AUD-${Date.now()}`,
        at: Date.now(),
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: 'admin_reversal_posted',
        outcome: 'success',
        target: orig.id,
        details: { reason, total: formatCurrency(orig.totalMinor) },
      };
      setAuditLogs(prev => [auditItem, ...prev]);
    },
    [accounts, currentUid, currentUser, journals]
  );

  const closeSupportTicket = useCallback((id: string, reply?: string) => {
    if (!currentUser?.isAdmin) throw new Error('Unauthorized');
    setTickets(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, status: 'closed', reply: reply || 'Resolved by compliance desk.' }
          : t
      )
    );
  }, [currentUser]);

  const adminCreditDebit = useCallback(
    async (params: {
      targetUid: string;
      direction: 'credit' | 'debit';
      amountStr: string;
      reference: string;
      description: string;
      note?: string;
    }) => {
      if (!currentUser?.isAdmin) throw new Error('Unauthorized: Administrator privileges required.');
      const amtMinor = toMinor(params.amountStr);
      if (amtMinor <= 0) throw new Error('Adjustment amount must be greater than zero.');

      const targetUser = users.find(u => u.uid === params.targetUid);
      if (!targetUser) throw new Error('Target client not found.');

      const targetAccount = accounts.find(a => a.uid === params.targetUid);
      if (!targetAccount) throw new Error('Target client account not found.');

      if (params.direction === 'debit' && targetAccount.cash < amtMinor) {
        throw new Error(
          `Insufficient funds: Client account has ${formatCurrency(targetAccount.cash)} available for debit.`
        );
      }

      const refCode =
        params.reference.trim() || `BAL-${params.direction.toUpperCase()}-${Date.now().toString().slice(-6)}`;
      const adjId = `ADJ-${Date.now()}`;
      const now = Date.now();

      const lines =
        params.direction === 'credit'
          ? [
              { acct: A.FUND, dr: amtMinor, cr: 0 },
              { acct: A.cash(params.targetUid), dr: 0, cr: amtMinor },
            ]
          : [
              { acct: A.cash(params.targetUid), dr: amtMinor, cr: 0 },
              { acct: A.FUND, dr: 0, cr: amtMinor },
            ];

      const journal = createJournal(
        params.targetUid,
        'admin_adjustment',
        `Admin ${params.direction.toUpperCase()}: ${params.description} (Ref: ${refCode})`,
        lines,
        { ref: refCode, adjustmentId: adjId }
      );

      const nextAccount = applyJournal(targetAccount, params.targetUid, journal);

      const adjustment: AdminAdjustment = {
        id: adjId,
        uid: params.targetUid,
        customerEmail: targetUser.email,
        accountId: targetAccount.accountId,
        direction: params.direction,
        amountMinor: amtMinor,
        currency: 'USD',
        reason: params.description,
        reference: refCode,
        note: params.note || '',
        requestedBy: currentUser.email,
        approvedBy: currentUser.email,
        status: 'posted',
        createdAt: now,
        postedAt: now,
      };

      setAccounts(prev => prev.map(a => (a.uid === params.targetUid ? nextAccount : a)));
      if (currentUid === params.targetUid) {
        setCurrentAccount(nextAccount);
      }
      setJournals(prev => [journal, ...prev]);
      setAdminAdjustments(prev => [adjustment, ...prev]);

      const auditItem: AuditLog = {
        id: `AUD-${Date.now()}`,
        at: now,
        actorUid: currentUid,
        actorEmail: currentUser.email,
        action: `admin_balance_${params.direction}`,
        outcome: 'success',
        target: `${targetUser.email} (${targetAccount.accountId})`,
        details: {
          direction: params.direction,
          amount: formatCurrency(amtMinor),
          reference: refCode,
          description: params.description,
          administrator: currentUser.email,
          previousCash: formatCurrency(targetAccount.cash),
          newCash: formatCurrency(nextAccount.cash),
        },
      };
      setAuditLogs(prev => [auditItem, ...prev]);

      const notif: NotificationItem = {
        id: `NOT-BAL-${Date.now()}`,
        uid: params.targetUid,
        title: `Account Balance ${params.direction === 'credit' ? 'Credited' : 'Debited'}: ${formatCurrency(amtMinor)}`,
        body: `An authorized administrator (${currentUser.email}) has ${params.direction === 'credit' ? 'allocated' : 'debited'} ${formatCurrency(amtMinor)} to your account. Reference: ${refCode}. Description: ${params.description}.`,
        read: false,
        type: 'funding',
        createdAt: now,
      };
      setNotifications(prev => [notif, ...prev]);

      return adjustment;
    },
    [accounts, currentUid, currentUser, users]
  );

  return (
    <TradingContext.Provider
      value={{
        user: currentUser,
        account: currentAccount,
        authLoading,
        isAuthenticated,
        positions: userPositions,
        orders: userOrders,
        journals: userJournals,
        executions: userExecutions,
        fundingHistory: userFunding,
        watchlist,
        priceAlerts,
        notifications: userNotifications,
        tickets: userTickets,
        depositRequests: userDepositRequests,
        allDepositRequests: depositRequests,
        instruments,
        allUsers: users,
        allAccounts: accounts,
        allWithdrawals: fundingHistory.filter(f => f.type === 'withdrawal'),
        adminAdjustments,
        auditLogs,
        lastReconciliation,
        activeView,
        setActiveView,
        selectedSymbol,
        setSelectedSymbol,
        login,
        register,
        logout,
        sendPasswordReset,
        kycModalOpen,
        setKycModalOpen,
        submitKyc,
        approveKyc,
        rejectKyc,
        requestKycResubmission,
        activePasscodeSession,
        requestWithdrawalPasscode,
        confirmWithdrawalWithPasscode,
        cancelWithdrawalPasscode,
        submitDepositRequest,
        initiateDepositCoordination,
        submitDepositEvidence,
        approveDepositRequest,
        rejectDepositRequest,
        addTicketMessage,
        placeOrder,
        cancelOrder,
        withdraw,
        addToWatchlist,
        removeFromWatchlist,
        addPriceAlert,
        removePriceAlert,
        markNotificationRead,
        createSupportTicket,
        updateProfile,
        adminCreditDebit,
        postAdminAdjustment,
        approveAdjustment,
        rejectAdjustment,
        reviewWithdrawal,
        setUserStatus,
        runReconciliation,
        reverseJournal,
        closeSupportTicket,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};

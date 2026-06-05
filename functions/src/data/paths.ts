/**
 * PURPOSE
 *   THE single source of Firestore paths for the backend. Every repository and
 *   trigger builds paths from here — never inline string concatenation.
 *
 * EXPLANATION
 *   Mirrors the collection tree in firestore-architecture.md §3. Keeping all
 *   paths in one module means a structural change is one edit and stays in sync
 *   with the client's tenant-scoped service pattern (providers/{providerId}/...).
 *   Sprint 1: definitions only; no reads/writes performed here.
 *
 * DEPLOYMENT
 *   Compiled as part of `npm run build`. Not independently deployable.
 */

const provider = (pid: string) => `providers/${pid}`;

export const paths = {
  // Global
  userIndex: (uid: string) => `userIndex/${uid}`,
  providerDirectory: (pid: string) => `providerDirectory/${pid}`,

  // Tenant root
  provider,

  // Identity
  users: (pid: string) => `${provider(pid)}/users`,
  user: (pid: string, uid: string) => `${provider(pid)}/users/${uid}`,

  // Menu
  menuCategories: (pid: string) => `${provider(pid)}/menuCategories`,
  menu: (pid: string) => `${provider(pid)}/menu`,
  menuItem: (pid: string, id: string) => `${provider(pid)}/menu/${id}`,
  modifierGroups: (pid: string, menuItemId: string) =>
    `${provider(pid)}/menu/${menuItemId}/modifierGroups`,

  // Recipes & ingredients
  recipes: (pid: string) => `${provider(pid)}/recipes`,
  rawIngredients: (pid: string) => `${provider(pid)}/rawIngredients`,
  preparedIngredients: (pid: string) => `${provider(pid)}/preparedIngredients`,

  // Inventory ledger
  inventory: (pid: string) => `${provider(pid)}/inventory`,
  inventoryItem: (pid: string, itemId: string) =>
    `${provider(pid)}/inventory/${itemId}`,
  stockMovements: (pid: string, itemId: string) =>
    `${provider(pid)}/inventory/${itemId}/stockMovements`,

  // Vendors & purchasing
  vendors: (pid: string) => `${provider(pid)}/vendors`,
  vendorPriceList: (pid: string, vendorId: string) =>
    `${provider(pid)}/vendors/${vendorId}/priceList`,
  purchaseOrders: (pid: string) => `${provider(pid)}/purchaseOrders`,

  // Prep
  prepLines: (pid: string) => `${provider(pid)}/prepLines`,
  prepTasks: (pid: string) => `${provider(pid)}/prepTasks`,

  // Dine-in
  tables: (pid: string) => `${provider(pid)}/tables`,
  tableSessions: (pid: string, tableId: string) =>
    `${provider(pid)}/tables/${tableId}/sessions`,
  qrCodes: (pid: string) => `${provider(pid)}/qrCodes`,

  // Orders
  ordersActive: (pid: string) => `${provider(pid)}/orders_active`,
  orderActive: (pid: string, id: string) =>
    `${provider(pid)}/orders_active/${id}`,
  ordersHistory: (pid: string) => `${provider(pid)}/orders_history`,
  orderHistory: (pid: string, id: string) =>
    `${provider(pid)}/orders_history/${id}`,

  // Loyalty
  loyaltyAccounts: (pid: string) => `${provider(pid)}/loyaltyAccounts`,
  loyaltyAccount: (pid: string, uid: string) =>
    `${provider(pid)}/loyaltyAccounts/${uid}`,
  loyaltyTransactions: (pid: string, uid: string) =>
    `${provider(pid)}/loyaltyAccounts/${uid}/transactions`,
  rewardCatalog: (pid: string) => `${provider(pid)}/rewardCatalog`,

  // Infra
  counters: (pid: string) => `${provider(pid)}/counters`,
  analytics: (pid: string) => `${provider(pid)}/analytics`,
} as const;

export type ProviderId = string;

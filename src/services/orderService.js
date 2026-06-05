import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import { DEFAULT_PROVIDER_ID } from "../config/providerConfig";

/**
 * =========================
 * ORDER STATUS CONSTANTS
 * =========================
 */
export const ORDER_STATUS = {
  PLACED: "placed",
  ACCEPTED: "accepted",
  PREPARING: "preparing",
  READY: "ready",
  COMPLETED: "completed",
};

/**
 * =========================
 * STATE MACHINE (STRICT FLOW)
 * =========================
 */
export const ORDER_FLOW = [
  ORDER_STATUS.PLACED,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
  ORDER_STATUS.COMPLETED,
];

/**
 * =========================
 * TIMELINE FIELD MAP
 * =========================
 */
export const TIMELINE_FIELDS = {
  [ORDER_STATUS.ACCEPTED]: "acceptedAt",
  [ORDER_STATUS.PREPARING]: "startedPreparingAt",
  [ORDER_STATUS.READY]: "readyAt",
  [ORDER_STATUS.COMPLETED]: "completedAt",
};

/**
 * =========================
 * VALIDATE TRANSITION
 * =========================
 */
export const canTransitionTo = (currentStatus, nextStatus) => {
  const currentIndex = ORDER_FLOW.indexOf(currentStatus);
  const nextIndex = ORDER_FLOW.indexOf(nextStatus);

  if (currentIndex === -1 || nextIndex === -1) return false;

  return nextIndex === currentIndex + 1;
};

/**
 * =========================
 * CREATE ORDER
 * =========================
 */
export const createOrder = async (
  cartItems,
  cartTotal,
  customerId,
  providerId = DEFAULT_PROVIDER_ID
) => {
  if (!customerId) {
    throw new Error("User not authenticated");
  }

  const formattedItems = cartItems.map((item) => ({
    menuItemId: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    subtotal: item.price * item.quantity,
  }));

  const now = Date.now();

  const orderData = {
    providerId,
    customerId,

    items: formattedItems,

    pricing: {
      subtotal: cartTotal,
      tax: 0,
      discount: 0,
      total: cartTotal,
    },

    status: ORDER_STATUS.PLACED,

    timeline: {
      placedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },

    events: [
      {
        type: "ORDER_PLACED",
        timestamp: now,
        by: "customer",
      },
    ],
  };

  const ref = collection(
    db,
    "providers",
    providerId,
    "orders_active"
  );

  const docRef = await addDoc(ref, orderData);

  return docRef.id;
};

/**
 * =========================
 * GET USER ACTIVE ORDERS
 * =========================
 */
export const getUserOrders = async (
  userId,
  providerId = DEFAULT_PROVIDER_ID
) => {
  if (!userId) return [];

  const q = query(
    collection(
      db,
      "providers",
      providerId,
      "orders_active"
    ),
    where("customerId", "==", userId),
    orderBy("timeline.placedAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * =========================
 * GET USER ORDER HISTORY
 * =========================
 */
export const getUserOrderHistory = async (
  userId,
  providerId = DEFAULT_PROVIDER_ID
) => {
  if (!userId) return [];

  const q = query(
    collection(
      db,
      "providers",
      providerId,
      "orders_history"
    ),
    where("customerId", "==", userId),
    orderBy("timeline.placedAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * =========================
 * GET ALL ORDER HISTORY
 * =========================
 */
export const getAllOrderHistory = async (
  providerId = DEFAULT_PROVIDER_ID
) => {
  const q = query(
    collection(
      db,
      "providers",
      providerId,
      "orders_history"
    ),
    orderBy("timeline.placedAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * =========================
 * REALTIME USER ORDERS
 * =========================
 */
export const subscribeToUserOrders = (
  userId,
  callback,
  providerId = DEFAULT_PROVIDER_ID
) => {
  if (!userId) return () => {};

  const q = query(
    collection(
      db,
      "providers",
      providerId,
      "orders_active"
    ),
    where("customerId", "==", userId),
    orderBy("timeline.placedAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    callback(orders);
  });
};

/**
 * =========================
 * GET ACTIVE ORDERS
 * =========================
 */
export const getOrders = async (
  providerId = DEFAULT_PROVIDER_ID
) => {
  const q = query(
    collection(
      db,
      "providers",
      providerId,
      "orders_active"
    ),
    orderBy("timeline.placedAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * =========================
 * REALTIME KITCHEN ORDERS
 * =========================
 */
export const subscribeToOrders = (
  callback,
  providerId = DEFAULT_PROVIDER_ID
) => {
  const q = query(
    collection(
      db,
      "providers",
      providerId,
      "orders_active"
    ),
    orderBy("timeline.placedAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    callback(orders);
  });
};

/**
 * =========================
 * CORE STATUS TRANSITION ENGINE
 * =========================
 */
export const transitionOrderStatus = async (
  orderId,
  nextStatus,
  providerId = DEFAULT_PROVIDER_ID,
  actor = "system"
) => {
  if (!orderId || !nextStatus) return;

  const activeRef = doc(
    db,
    "providers",
    providerId,
    "orders_active",
    orderId
  );

  const historyRef = doc(
    db,
    "providers",
    providerId,
    "orders_history",
    orderId
  );

  const snap = await getDoc(activeRef);

  if (!snap.exists()) return;

  const order = snap.data();

  /**
   * STATE MACHINE CHECK
   */
  if (!canTransitionTo(order.status, nextStatus)) {
    console.warn(
      `Blocked invalid transition: ${order.status} → ${nextStatus}`
    );
    return;
  }

  const now = Date.now();

  const updatePayload = {
    status: nextStatus,

    ...(TIMELINE_FIELDS[nextStatus]
      ? {
          [`timeline.${TIMELINE_FIELDS[nextStatus]}`]:
            serverTimestamp(),
        }
      : {}),

    "timeline.updatedAt": serverTimestamp(),

    events: arrayUnion({
      type: `ORDER_${nextStatus.toUpperCase()}`,
      timestamp: now,
      by: actor,
    }),
  };

  /**
   * NORMAL STATUS UPDATE
   */
  if (nextStatus !== ORDER_STATUS.COMPLETED) {
    await updateDoc(activeRef, updatePayload);
    return;
  }

  /**
   * COMPLETED → MOVE TO HISTORY
   */
  await setDoc(historyRef, {
    ...order,

    status: nextStatus,

    timeline: {
      ...order.timeline,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },

    events: [
      ...(order.events || []),
      {
        type: "ORDER_COMPLETED",
        timestamp: now,
        by: actor,
      },
    ],

    movedToHistoryAt: serverTimestamp(),
  });

  await deleteDoc(activeRef);
};

/**
 * =========================
 * BACKWARD COMPATIBILITY
 * =========================
 */
export const updateOrderStatus = transitionOrderStatus;
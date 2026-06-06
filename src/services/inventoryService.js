import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import { DEFAULT_PROVIDER_ID } from "../config/providerConfig";

/**
 * GET INVENTORY
 * Returns all inventory items, or only those of a given type
 * ("raw" | "prepared") when `type` is provided.
 */
export const getInventory = async (
  type,
  providerId = DEFAULT_PROVIDER_ID
) => {
  const ref = collection(
    db,
    "providers",
    providerId,
    "inventory"
  );

  const q = type ? query(ref, where("type", "==", type)) : ref;

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * GET RAW INGREDIENTS
 */
export const getRawIngredients = async (
  providerId = DEFAULT_PROVIDER_ID
) => {
  return getInventory("raw", providerId);
};

/**
 * GET PREPARED INGREDIENTS
 */
export const getPreparedIngredients = async (
  providerId = DEFAULT_PROVIDER_ID
) => {
  return getInventory("prepared", providerId);
};

/**
 * CREATE INVENTORY ITEM
 * `data` carries the document shape, including `type` and any embedded
 * assignment array (e.g. `ingredients` for prepared items).
 */
export const createInventoryItem = async (
  data,
  providerId = DEFAULT_PROVIDER_ID
) => {
  const docRef = await addDoc(
    collection(
      db,
      "providers",
      providerId,
      "inventory"
    ),
    {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return docRef.id;
};

/**
 * UPDATE INVENTORY ITEM
 */
export const updateInventoryItem = async (
  itemId,
  data,
  providerId = DEFAULT_PROVIDER_ID
) => {
  await updateDoc(
    doc(
      db,
      "providers",
      providerId,
      "inventory",
      itemId
    ),
    {
      ...data,
      updatedAt: serverTimestamp(),
    }
  );
};

/**
 * DELETE INVENTORY ITEM
 */
export const deleteInventoryItem = async (
  itemId,
  providerId = DEFAULT_PROVIDER_ID
) => {
  await deleteDoc(
    doc(
      db,
      "providers",
      providerId,
      "inventory",
      itemId
    )
  );
};

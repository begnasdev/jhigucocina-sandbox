import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { db, storage } from "../firebase/firebase";
import { DEFAULT_PROVIDER_ID } from "../config/providerConfig";

/**
 * UPLOAD MENU IMAGE
 * Stores ONE image in Firebase Storage and returns its download URL.
 * Firestore only ever stores the resulting URL string — never image data.
 */
export const uploadMenuImage = async (
  file,
  providerId = DEFAULT_PROVIDER_ID
) => {
  if (!file) throw new Error("No file provided");

  const safeName = `${Date.now()}-${(file.name || "image").replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  )}`;

  const storageRef = ref(
    storage,
    `providers/${providerId}/menu/${safeName}`
  );

  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

/**
 * GET MENU ITEMS
 */
export const getMenuItems = async (
  providerId = DEFAULT_PROVIDER_ID
) => {
  const snapshot = await getDocs(
    collection(
      db,
      "providers",
      providerId,
      "menu"
    )
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * CREATE MENU ITEM
 */
export const createMenuItem = async (
  item,
  providerId = DEFAULT_PROVIDER_ID
) => {
  await addDoc(
    collection(
      db,
      "providers",
      providerId,
      "menu"
    ),
    {
      ...item,
      available: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );
};

/**
 * UPDATE MENU ITEM
 */
export const updateMenuItem = async (
  itemId,
  updates,
  providerId = DEFAULT_PROVIDER_ID
) => {
  await updateDoc(
    doc(
      db,
      "providers",
      providerId,
      "menu",
      itemId
    ),
    {
      ...updates,
      updatedAt: serverTimestamp(),
    }
  );
};

/**
 * DELETE MENU ITEM
 */
export const deleteMenuItem = async (
  itemId,
  providerId = DEFAULT_PROVIDER_ID
) => {
  await deleteDoc(
    doc(
      db,
      "providers",
      providerId,
      "menu",
      itemId
    )
  );
};

/**
 * TOGGLE AVAILABILITY
 */
export const toggleMenuAvailability = async (
  itemId,
  currentValue,
  providerId = DEFAULT_PROVIDER_ID
) => {
  await updateDoc(
    doc(
      db,
      "providers",
      providerId,
      "menu",
      itemId
    ),
    {
      available: !currentValue,
      updatedAt: serverTimestamp(),
    }
  );
};
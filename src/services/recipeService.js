import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import { DEFAULT_PROVIDER_ID } from "../config/providerConfig";

/**
 * GET RECIPES
 */
export const getRecipes = async (
  providerId = DEFAULT_PROVIDER_ID
) => {
  const snapshot = await getDocs(
    collection(
      db,
      "providers",
      providerId,
      "recipes"
    )
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * GET RECIPE
 */
export const getRecipe = async (
  recipeId,
  providerId = DEFAULT_PROVIDER_ID
) => {
  const snap = await getDoc(
    doc(
      db,
      "providers",
      providerId,
      "recipes",
      recipeId
    )
  );

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
};

/**
 * CREATE RECIPE
 * `data` carries the document shape, including the embedded assignment
 * arrays `prepared` and `raw`.
 */
export const createRecipe = async (
  data,
  providerId = DEFAULT_PROVIDER_ID
) => {
  const docRef = await addDoc(
    collection(
      db,
      "providers",
      providerId,
      "recipes"
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
 * UPDATE RECIPE
 */
export const updateRecipe = async (
  recipeId,
  data,
  providerId = DEFAULT_PROVIDER_ID
) => {
  await updateDoc(
    doc(
      db,
      "providers",
      providerId,
      "recipes",
      recipeId
    ),
    {
      ...data,
      updatedAt: serverTimestamp(),
    }
  );
};

/**
 * DELETE RECIPE
 */
export const deleteRecipe = async (
  recipeId,
  providerId = DEFAULT_PROVIDER_ID
) => {
  await deleteDoc(
    doc(
      db,
      "providers",
      providerId,
      "recipes",
      recipeId
    )
  );
};

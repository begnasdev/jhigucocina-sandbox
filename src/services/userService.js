import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import { DEFAULT_PROVIDER_ID } from "../config/providerConfig";

export const getUsers = async (
  providerId = DEFAULT_PROVIDER_ID
) => {
  const snapshot = await getDocs(
    collection(
      db,
      "providers",
      providerId,
      "users"
    )
  );

  const users = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return users;
};

export const updateUserRole = async (
  userId,
  role,
  providerId = DEFAULT_PROVIDER_ID
) => {
  const ref = doc(
    db,
    "providers",
    providerId,
    "users",
    userId
  );

  await updateDoc(ref, {
    role,
  });
};
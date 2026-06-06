import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import { DEFAULT_PROVIDER_ID } from "../config/providerConfig";

/**
 * GET ROOMS
 */
export const getRooms = async (
  providerId = DEFAULT_PROVIDER_ID
) => {
  const snapshot = await getDocs(
    collection(
      db,
      "providers",
      providerId,
      "rooms"
    )
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * CREATE ROOM
 */
export const createRoom = async (
  room,
  providerId = DEFAULT_PROVIDER_ID
) => {
  const docRef = await addDoc(
    collection(
      db,
      "providers",
      providerId,
      "rooms"
    ),
    {
      ...room,
      active: room.active ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return docRef.id;
};

/**
 * UPDATE ROOM
 */
export const updateRoom = async (
  roomId,
  updates,
  providerId = DEFAULT_PROVIDER_ID
) => {
  await updateDoc(
    doc(
      db,
      "providers",
      providerId,
      "rooms",
      roomId
    ),
    {
      ...updates,
      updatedAt: serverTimestamp(),
    }
  );
};

/**
 * DELETE ROOM
 */
export const deleteRoom = async (
  roomId,
  providerId = DEFAULT_PROVIDER_ID
) => {
  await deleteDoc(
    doc(
      db,
      "providers",
      providerId,
      "rooms",
      roomId
    )
  );
};

/**
 * TOGGLE ACTIVE
 */
export const toggleRoomActive = async (
  roomId,
  currentValue,
  providerId = DEFAULT_PROVIDER_ID
) => {
  await updateDoc(
    doc(
      db,
      "providers",
      providerId,
      "rooms",
      roomId
    ),
    {
      active: !currentValue,
      updatedAt: serverTimestamp(),
    }
  );
};

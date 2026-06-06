import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";

// EMAIL LOGIN
export const loginUser = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// SIGNUP
export const registerUser = async (
  email,
  password
) => {
  const result =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  const user = result.user;

  await setDoc(
    doc(
      db,
      "providers",
      "jhigucocina",
      "users",
      user.uid
    ),
    {
  uid: user.uid,
  email: user.email,
  displayName: user.displayName || "",
  role: "customer",
  active: true,
  providerId: "jhigucocina",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
}
  );

  return user;
};

// GOOGLE LOGIN
export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account",
  });

  const result = await signInWithPopup(
    auth,
    provider
  );

  const user = result.user;

  const userRef = doc(
    db,
    "providers",
    "jhigucocina",
    "users",
    user.uid
  );

  const existingUser = await getDoc(userRef);

  if (!existingUser.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "",
      role: "customer",
      active: true,
      providerId: "jhigucocina",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return user;
};
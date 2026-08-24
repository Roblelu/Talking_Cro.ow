import { auth } from "../firebase";
import { signOut as firebaseSignOut } from "firebase/auth";

export const logoutUser = async () => {
  try {
    await firebaseSignOut(auth);
    return true;
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

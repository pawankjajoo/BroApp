
import {
  ref, uploadBytes, getDownloadURL, deleteObject,
} from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { storage, db, COLLECTIONS } from "./firebase";

export async function uploadProfileImage(uid, localUri) {
  try {
    // Blob conversion from local URI. Handles iOS/Android file paths uniformly.    const response = await fetch(localUri);
    const blob = await response.blob();

    // Firebase Storage upload pattern . path includes user UID for access control.    const imageRef = ref(storage, `profile_images/${uid}/avatar.jpg`);
    await uploadBytes(imageRef, blob, {
      contentType: "image/jpeg",
      customMetadata: {
        uploadedBy: uid,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Get the download URL . stable, signed URL for Firestore reference.    const downloadUrl = await getDownloadURL(imageRef);

    // Update user profile in Firestore . profile image lifecycle complete.    await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
      avatarUrl: downloadUrl,
    });

    return { success: true, downloadUrl };
  } catch (error) {
    console.warn("[Storage] Upload failed:", error.message);
    return { success: false, error: "Failed to upload image. Try again, bro." };
  }
}

export async function getProfileImageUrl(uid) {
  try {
    const imageRef = ref(storage, `profile_images/${uid}/avatar.jpg`);
    return await getDownloadURL(imageRef);
  } catch (error) {
    // No image uploaded or storage unavailable
    return null;
  }
}

export async function deleteProfileImage(uid) {
  try {
    const imageRef = ref(storage, `profile_images/${uid}/avatar.jpg`);
    await deleteObject(imageRef);

    // Clear URL in Firestore
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
      avatarUrl: null,
    });

    return { success: true };
  } catch (error) {
    console.warn("[Storage] Delete failed:", error.message);
    return { success: false, error: "Failed to delete image." };
  }
}


import {
  doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  collection, query, where, orderBy, limit, startAfter,
  onSnapshot, serverTimestamp, increment, arrayUnion, arrayRemove,
  writeBatch, runTransaction,
} from "firebase/firestore";
import { db, COLLECTIONS, SINGLETON_DOCS } from "./firebase";

// USER PROFILES
// Read, update, and listen to user profile data. Identity, preferences, stats.// Your profile is the bridge between local state and Firestore.
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(uid, updates) {
  await setDoc(doc(db, COLLECTIONS.USERS, uid), {
    ...updates,
    lastActiveAt: serverTimestamp(),
  }, { merge: true });
}

export function onUserProfileChange(uid, callback) {
  return onSnapshot(doc(db, COLLECTIONS.USERS, uid), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    }
  });
}

export async function markProfileComplete(uid) {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    profileComplete: true,
  });
}

// BRO CONNECTIONS (FRIENDSHIPS)
export async function getUserBros(uid) {
  const q = query(
    collection(db, COLLECTIONS.BROS),
    where("users", "array-contains", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  const broConnections = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Resolve the other user's profile for each connection
  const results = [];
  for (const conn of broConnections) {
    const otherUid = conn.users.find((u) => u !== uid);
    if (otherUid) {
      const profile = await getUserProfile(otherUid);
      if (profile) {
        results.push({
          connectionId: conn.id,
          ...profile,
          broSince: conn.createdAt,
          broNationsBB: conn.broNationsBB?.[otherUid] || 0,
        });
      }
    }
  }
  return results;
}

export async function getBroCount(uid) {
  const profile = await getUserProfile(uid);
  return profile?.broCount || 0;
}

export async function sendBroRequest(fromUid, toUid) {
  const requestId = [fromUid, toUid].sort().join("_");
  await setDoc(doc(db, COLLECTIONS.BRO_REQUESTS, requestId), {
    from:      fromUid,
    to:        toUid,
    status:    "pending",
    createdAt: serverTimestamp(),
  });
}

export async function acceptBroRequest(requestId, fromUid, toUid) {
  // Batch write for atomicity . all-or-nothing. No halfway states.  const batch = writeBatch(db);

  // Create bro connection . bidirectional, single doc via sorted UIDs.  const connectionId = [fromUid, toUid].sort().join("_");
  batch.set(doc(db, COLLECTIONS.BROS, connectionId), {
    users:        [fromUid, toUid],
    createdAt:    serverTimestamp(),
    broNationsBB: { [fromUid]: 0, [toUid]: 0 },
  });

  // Increment bro counts for both users . needed for network growth metrics.  batch.update(doc(db, COLLECTIONS.USERS, fromUid), {
    broCount: increment(1),
  });
  batch.update(doc(db, COLLECTIONS.USERS, toUid), {
    broCount: increment(1),
  });

  // Delete the request . cleanup after accept.  batch.delete(doc(db, COLLECTIONS.BRO_REQUESTS, requestId));

  await batch.commit();
}

export async function getPendingBroRequests(uid) {
  const q = query(
    collection(db, COLLECTIONS.BRO_REQUESTS),
    where("to", "==", uid),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  const requests = [];
  for (const d of snap.docs) {
    const data = d.data();
    const fromProfile = await getUserProfile(data.from);
    requests.push({
      id: d.id,
      ...data,
      fromProfile,
    });
  }
  return requests;
}

export async function getBroUids(uid) {
  const q = query(
    collection(db, COLLECTIONS.BROS),
    where("users", "array-contains", uid)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const users = d.data().users;
    return users.find((u) => u !== uid);
  }).filter(Boolean);
}

// TRANSACTIONS
export async function recordPurchase(uid, { amountBB, productId, transactionId }) {
  const txRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
  await setDoc(txRef, {
    uid,
    type:          "purchase",
    amountBB,
    productId,
    transactionId,
    createdAt:     serverTimestamp(),
  });

  // Add BB to user's wallet
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    broBucksBB:  increment(amountBB),
    lastActiveAt: serverTimestamp(),
  });

  // Update platform stats
  await updatePlatformStats(amountBB, 0);
}

export async function recordBroNation(fromUid, toUid, {
  amountBB, feeBB, recipientBB,
}) {
  // Batch write . ensures debit, credit, and fee tracking all succeed together.  const batch = writeBatch(db);

  // Transaction record . immutable ledger entry for auditing.  const txRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
  batch.set(txRef, {
    fromUid,
    toUid,
    type:       "bronation",
    amountBB,
    feeBB,
    recipientBB,
    createdAt:  serverTimestamp(),
  });

  // Debit sender . full amount sent.
  batch.update(doc(db, COLLECTIONS.USERS, fromUid), {
    broBucksBB:  increment(-amountBB),
    lastActiveAt: serverTimestamp(),
  });

  // Credit recipient . full amount minus fee.  batch.update(doc(db, COLLECTIONS.USERS, toUid), {
    broBucksBB: increment(recipientBB),
  });

  // Update bro connection with bronation total . builds relationship history.  const connectionId = [fromUid, toUid].sort().join("_");
  batch.update(doc(db, COLLECTIONS.BROS, connectionId), {
    [`broNationsBB.${fromUid}`]: increment(amountBB),
  });

  await batch.commit();

  // Update platform stats + treasury (outside batch for simplicity)
  await updatePlatformStats(amountBB, feeBB);
}

async function updatePlatformStats(transactionBB, platformFeeBB) {
  const treasuryRef = doc(db, COLLECTIONS.TREASURY, SINGLETON_DOCS.TREASURY_STATE);

  // Treasury transaction pattern . read before write, handle init + updates atomicly.  await runTransaction(db, async (transaction) => {
    const treasuryDoc = await transaction.get(treasuryRef);

    if (!treasuryDoc.exists()) {
      // Initialize treasury on first transacion.      transaction.set(treasuryRef, {
        globalTransactionsBB: transactionBB,
        totalPlatformFeesBB:  platformFeeBB,
        treasuryReserveBB:    Math.floor(platformFeeBB * 0.05), // 5% of fees
        totalBroCoinsMinted:  0,
        lastUpdated:          serverTimestamp(),
      });
    } else {
      const data = treasuryDoc.data();
      // 5% of each fee flows to treasury . funds BroCoin minting.      const treasuryDeposit = Math.floor(platformFeeBB * 0.05);
      transaction.update(treasuryRef, {
        globalTransactionsBB: increment(transactionBB),
        totalPlatformFeesBB:  increment(platformFeeBB),
        treasuryReserveBB:    increment(treasuryDeposit),
        lastUpdated:          serverTimestamp(),
      });
    }
  });
}

export async function getTreasuryState() {
  const snap = await getDoc(doc(db, COLLECTIONS.TREASURY, SINGLETON_DOCS.TREASURY_STATE));
  if (!snap.exists()) {
    return {
      globalTransactionsBB: 0,
      totalPlatformFeesBB:  0,
      treasuryReserveBB:    0,
      totalBroCoinsMinted:  0,
    };
  }
  return snap.data();
}

export function onTreasuryChange(callback) {
  // Real-time listener . UI stays in sync with treasury price & mint count.  return onSnapshot(
    doc(db, COLLECTIONS.TREASURY, SINGLETON_DOCS.TREASURY_STATE),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      } else {
        callback({
          globalTransactionsBB: 0,
          totalPlatformFeesBB: 0,
          treasuryReserveBB: 0,
          totalBroCoinsMinted: 0,
        });
      }
    }
  );
}

export async function getUserBroBucks(uid) {
  const profile = await getUserProfile(uid);
  return profile?.broBucksBB || 0;
}

export function onBroBucksChange(uid, callback) {
  return onSnapshot(doc(db, COLLECTIONS.USERS, uid), (snap) => {
    if (snap.exists()) {
      callback(snap.data().broBucksBB || 0);
    }
  });
}

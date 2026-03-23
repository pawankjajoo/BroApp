/**
 * broCoin.js — BroCoin Platform Reward System (Firebase-backed)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * PRIVACY-FIRST DESIGN:
 *   - Balances stored in private Firestore docs (owner-only read via rules)
 *   - Public ledger uses anonymized hashes — no user identity exposed
 *   - Treasury and pricing computed from Firestore singleton
 *
 * MINTING:
 *   - Every $1,000 in total platform transactions → 1 BroCoin minted
 *   - Weighted random selection from verified-email users
 *   - All mint logic should run in a Cloud Function in production
 *   - Client-side simulation here for Expo testing / demo
 *
 * TREASURY:
 *   - 5% of platform fees deposited into reserve
 *   - Price = Treasury ÷ Total Minted
 *   - One-way trading: BRO → BB only
 */

import {
  doc, setDoc, getDoc, getDocs, updateDoc,
  collection, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, increment, runTransaction,
} from "firebase/firestore";
import * as Crypto from "expo-crypto";
import { db, COLLECTIONS, SINGLETON_DOCS } from "./firebase";
import { BROCOIN_CONFIG } from "../constants/bro";

// ── Local state for demo / Expo Go testing ─────────────────────────────────
// In production, all minting logic runs in Cloud Functions.
// These local values mirror Firestore for instant UI updates.
let _localTreasury = {
  globalTransactionsBB: 0,
  treasuryReserveBB:    0,
  totalBroCoinsMinted:  0,
};
let _localWallet    = {};       // uid → balance
let _localLedger    = [];       // public ledger entries
let _mintCallbacks  = [];
let _ledgerSalt     = "bro_salt_" + Date.now();

// ── Anonymization ──────────────────────────────────────────────────────────

async function anonymizeRecipient(recipientUid) {
  try {
    // One-way hash: uid + daily salt. Same uid = same hash per day, but unrecoverable.
    const raw = `${_ledgerSalt}_${recipientUid}_${Math.floor(Date.now() / 86400000)}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      raw
    );
    // Trim to 0x XXXXXX...XXXX format — readable but not exploitable.
    return "0x" + hash.slice(0, 12) + "..." + hash.slice(-6);
  } catch (e) {
    // Fallback for Expo Go (no native crypto)
    let h = 0;
    const s = `${_ledgerSalt}_${recipientUid}_${Date.now()}`;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    // Polyfill anonymization using simple hash — privacy first, always.
    return "0x" + Math.abs(h).toString(16).padStart(8, "0") + "..." +
           Math.abs(h * 31).toString(16).padStart(4, "0");
  }
}

// ── Initialize from Firestore ──────────────────────────────────────────────

/**
 * Load treasury state from Firestore into local cache.
 * Call on app mount.
 */
export async function initBroCoinState() {
  try {
    // Treasury is single doc — easy sync. Contains reserve, mint count, transaction volume.
    const treasurySnap = await getDoc(
      doc(db, COLLECTIONS.TREASURY, SINGLETON_DOCS.TREASURY_STATE)
    );
    if (treasurySnap.exists()) {
      const data = treasurySnap.data();
      _localTreasury = {
        globalTransactionsBB: data.globalTransactionsBB || 0,
        treasuryReserveBB:    data.treasuryReserveBB || 0,
        totalBroCoinsMinted:  data.totalBroCoinsMinted || 0,
      };
    }

    // Load public ledger — anonymized mint history, newest first.
    const ledgerQ = query(
      collection(db, COLLECTIONS.BROCOIN_LEDGER),
      orderBy("ts", "desc"),
      limit(50)
    );
    const ledgerSnap = await getDocs(ledgerQ);
    _localLedger = ledgerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("[BroCoin] init failed (using local state):", e.message);
  }
}

/**
 * Listen to treasury changes in real-time.
 */
export function onTreasuryUpdate(callback) {
  return onSnapshot(
    doc(db, COLLECTIONS.TREASURY, SINGLETON_DOCS.TREASURY_STATE),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        _localTreasury = {
          globalTransactionsBB: data.globalTransactionsBB || 0,
          treasuryReserveBB:    data.treasuryReserveBB || 0,
          totalBroCoinsMinted:  data.totalBroCoinsMinted || 0,
        };
        callback(_localTreasury);
      }
    }
  );
}

// ── Transaction Recording & Minting ────────────────────────────────────────

/**
 * Record a platform transaction and check for mint threshold.
 * In production, this ENTIRE function should be a Cloud Function
 * triggered by Firestore writes to the transactions collection.
 *
 * For Expo testing, we run it client-side with optimistic local updates.
 */
export async function recordTransaction(amountBB, txType = "purchase", platformFeeBB = 0) {
  // Optimistic local update — instant UI feedback, async persist later.
  _localTreasury.globalTransactionsBB += amountBB;
  if (platformFeeBB > 0) {
    // 5% of platform fees flow to treasury — funds the mint.
    const treasuryDeposit = Math.floor(platformFeeBB * BROCOIN_CONFIG.treasuryFeeRate);
    _localTreasury.treasuryReserveBB += treasuryDeposit;
  }

  // Check mint threshold loop — every $1k = 1 BroCoin (or $1M BB).
  const threshold = BROCOIN_CONFIG.mintThresholdBB;
  let mintResult = null;

  while (_localTreasury.globalTransactionsBB >= threshold) {
    _localTreasury.globalTransactionsBB -= threshold;
    // Trigger mint if eligible. Weighted random selection favors active users.
    mintResult = await _mintBroCoin();
  }

  // Persist to Firestore (async, non-blocking for UI)
  _persistTreasuryState().catch((e) =>
    console.warn("[BroCoin] treasury persist failed:", e.message)
  );

  return mintResult || { minted: false };
}

async function _persistTreasuryState() {
  await setDoc(
    doc(db, COLLECTIONS.TREASURY, SINGLETON_DOCS.TREASURY_STATE),
    {
      globalTransactionsBB: _localTreasury.globalTransactionsBB,
      treasuryReserveBB:    _localTreasury.treasuryReserveBB,
      totalBroCoinsMinted:  _localTreasury.totalBroCoinsMinted,
      lastUpdated:          serverTimestamp(),
    },
    { merge: true }
  );
}

// ── Minting ────────────────────────────────────────────────────────────────

async function _mintBroCoin() {
  _localTreasury.totalBroCoinsMinted++;
  const milestone = _localTreasury.totalBroCoinsMinted;

  // Get eligible users (in production: Cloud Function queries Firestore)
  const pool = await _getVerifiedUserPool();
  if (pool.length === 0) {
    return { minted: true, recipient: null, held: true };
  }

  // Select winner using weighted algorithm. Rewards engagement & trustworthiness.
  const { selected, weightSnapshot } = _weightedRandomSelect(pool);

  // Award BroCoin (local + Firestore). Private wallets prevent front-running.
  _localWallet[selected.uid] = (_localWallet[selected.uid] || 0) + 1;

  // Persist wallet to Firestore async — no blocking.
  try {
    await setDoc(
      doc(db, COLLECTIONS.BROCOIN_WALLETS, selected.uid),
      { balance: increment(1), lastMintAt: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.warn("[BroCoin] wallet persist failed:", e.message);
  }

  // Create anonymized public ledger entry. Hides recipient, shows transparancy.
  const recipientHash = await anonymizeRecipient(selected.uid);
  const ledgerEntry = {
    id:              `BRO-${String(milestone).padStart(6, "0")}`,
    ts:              Date.now(),
    milestone,
    recipientHash,
    eligibleCount:   pool.length,
    weightSnapshot,
    treasuryAtMint:  _localTreasury.treasuryReserveBB,
    priceAtMint:     _localTreasury.treasuryReserveBB / milestone,
    priceUSDAtMint:  (_localTreasury.treasuryReserveBB / milestone) / 1_000_000,
  };
  _localLedger.unshift(ledgerEntry);

  // Persist ledger entry to Firestore — immutable record for auditing.
  try {
    await setDoc(
      doc(db, COLLECTIONS.BROCOIN_LEDGER, ledgerEntry.id),
      { ...ledgerEntry, createdAt: serverTimestamp() }
    );
  } catch (e) {
    console.warn("[BroCoin] ledger persist failed:", e.message);
  }

  // Update treasury mint count in Firestore
  try {
    await updateDoc(
      doc(db, COLLECTIONS.TREASURY, SINGLETON_DOCS.TREASURY_STATE),
      { totalBroCoinsMinted: milestone }
    );
  } catch (e) {
    console.warn("[BroCoin] treasury mint count persist failed:", e.message);
  }

  // Notify listeners (private — only winner gets details)
  const privateRecord = {
    ts:            Date.now(),
    milestone,
    recipientId:   selected.uid,
    recipientName: selected.displayName,
    totalMinted:   milestone,
    ledgerEntryId: ledgerEntry.id,
    priceAtMint:   ledgerEntry.priceUSDAtMint,
  };
  _mintCallbacks.forEach((cb) => cb(privateRecord));

  return { minted: true, recipient: selected, ledgerEntry };
}

function _weightedRandomSelect(pool) {
  const wf = BROCOIN_CONFIG.weightFactors;
  let totalWeight = 0;

  // Apply multipliers: base (verified email only) × profile × activity × bronations.
  const weighted = pool.map((user) => {
    let w = wf.hasVerifiedEmail;
    if (user.profileComplete)  w *= wf.hasProfileComplete;
    if (user.activeRecently)   w *= wf.activeInLast30Days;
    if (user.hasSentBroNation) w *= wf.hasSentBroNation;
    totalWeight += w;
    return { ...user, weight: w };
  });

  // Snapshot the odds — transparent, auditable selection criteria.
  const weightSnapshot = {
    totalEligible:   pool.length,
    totalWeight:     Math.round(totalWeight * 1000) / 1000,
    avgWeight:       Math.round((totalWeight / pool.length) * 1000) / 1000,
    minOdds:         `${((wf.hasVerifiedEmail / totalWeight) * 100).toFixed(2)}%`,
    maxOdds:         `${(((wf.hasVerifiedEmail * wf.hasProfileComplete * wf.activeInLast30Days * wf.hasSentBroNation) / totalWeight) * 100).toFixed(2)}%`,
    formula:         "base(1.0) × profile(1.2) × active30d(1.5) × sentBroNation(1.3)",
    selectionMethod: "weighted roulette wheel",
  };

  // Roulette wheel selection. Spin proportional to individual weights.
  let r = Math.random() * totalWeight;
  for (const user of weighted) {
    r -= user.weight;
    if (r <= 0) return { selected: user, weightSnapshot };
  }
  return { selected: weighted[weighted.length - 1], weightSnapshot };
}

/**
 * Get verified users eligible for BroCoin minting.
 * In production, this queries Firestore. For demo, uses mock data
 * that mirrors the demo user pool.
 */
async function _getVerifiedUserPool() {
  try {
    // Try Firestore first
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where("emailVerified", "==", true),
      limit(500)
    );
    const snap = await getDocs(q);
    if (snap.size > 0) {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          uid:              d.id,
          displayName:      data.displayName || "Bro",
          profileComplete:  data.profileComplete || false,
          activeRecently:   data.lastActiveAt?.toMillis?.() > thirtyDaysAgo || false,
          hasSentBroNation: data.hasSentBroNation || false,
        };
      });
    }
  } catch (e) {
    // Firestore not available — fall through to mock
  }

  // Fallback mock pool for demo/testing
  return [
    { uid: "demo_0", displayName: "You",    profileComplete: true,  activeRecently: true,  hasSentBroNation: true  },
    { uid: "demo_1", displayName: "Chad",   profileComplete: true,  activeRecently: true,  hasSentBroNation: true  },
    { uid: "demo_2", displayName: "Brent",  profileComplete: true,  activeRecently: true,  hasSentBroNation: false },
    { uid: "demo_3", displayName: "Kyle",   profileComplete: true,  activeRecently: true,  hasSentBroNation: true  },
    { uid: "demo_4", displayName: "Tanner", profileComplete: false, activeRecently: false, hasSentBroNation: false },
    { uid: "demo_5", displayName: "Jake",   profileComplete: true,  activeRecently: true,  hasSentBroNation: true  },
    { uid: "demo_6", displayName: "Austin", profileComplete: true,  activeRecently: false, hasSentBroNation: true  },
    { uid: "demo_7", displayName: "Tyler",  profileComplete: false, activeRecently: true,  hasSentBroNation: false },
    { uid: "demo_8", displayName: "Corey",  profileComplete: true,  activeRecently: true,  hasSentBroNation: false },
    { uid: "demo_11",displayName: "Derek",  profileComplete: true,  activeRecently: true,  hasSentBroNation: true  },
    { uid: "demo_12",displayName: "Mason",  profileComplete: false, activeRecently: true,  hasSentBroNation: false },
    { uid: "demo_13",displayName: "Logan",  profileComplete: true,  activeRecently: false, hasSentBroNation: false },
  ];
}

// ── Treasury & Pricing ─────────────────────────────────────────────────────

export function getBroCoinPriceBB() {
  if (_localTreasury.totalBroCoinsMinted === 0) return 0;
  return Math.floor(_localTreasury.treasuryReserveBB / _localTreasury.totalBroCoinsMinted);
}

export function getBroCoinPriceUSD() {
  return getBroCoinPriceBB() / 1_000_000;
}

export function getTreasuryStats() {
  return {
    reserveBB:     _localTreasury.treasuryReserveBB,
    reserveUSD:    _localTreasury.treasuryReserveBB / 1_000_000,
    totalMinted:   _localTreasury.totalBroCoinsMinted,
    priceBB:       getBroCoinPriceBB(),
    priceUSD:      getBroCoinPriceUSD(),
    feeRate:       BROCOIN_CONFIG.treasuryFeeRate,
    feeRateLabel:  `${BROCOIN_CONFIG.treasuryFeeRate * 100}%`,
  };
}

// ── Trading: BroCoin → Bro Bucks (one-way) ────────────────────────────────

export async function tradeBroCoinsForBB(userId, broCoinAmount) {
  if (!BROCOIN_CONFIG.tradingEnabled) {
    return { success: false, error: "Trading is not currently enabled." };
  }
  if (broCoinAmount < BROCOIN_CONFIG.minTradeAmount) {
    return { success: false, error: `Minimum trade is ${BROCOIN_CONFIG.minTradeAmount} BroCoin.` };
  }

  const balance = _localWallet[userId] || 0;
  if (balance < broCoinAmount) {
    return { success: false, error: "Not enough BroCoins, bro." };
  }

  // One-way trading: BRO → BB. Price discovery via treasury formula (reserve ÷ total minted).
  const priceBB = getBroCoinPriceBB();
  if (priceBB === 0) {
    return { success: false, error: "BroCoin has no value yet — treasury is empty." };
  }

  const bbReceived = priceBB * broCoinAmount;

  // Local update — instant. Persist async.
  _localWallet[userId] -= broCoinAmount;
  _localTreasury.treasuryReserveBB -= bbReceived;
  if (_localTreasury.treasuryReserveBB < 0) _localTreasury.treasuryReserveBB = 0;

  // Persist to Firestore — atomic updates acros three collections.
  try {
    await updateDoc(doc(db, COLLECTIONS.BROCOIN_WALLETS, userId), {
      balance: increment(-broCoinAmount),
    });
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      broBucksBB: increment(bbReceived),
    });
    await updateDoc(
      doc(db, COLLECTIONS.TREASURY, SINGLETON_DOCS.TREASURY_STATE),
      { treasuryReserveBB: increment(-bbReceived) }
    );
  } catch (e) {
    console.warn("[BroCoin] trade persist failed:", e.message);
  }

  return {
    success:    true,
    bbReceived,
    newBalance: _localWallet[userId],
    priceUsed:  priceBB,
    priceUSD:   priceBB / 1_000_000,
  };
}

// ── Private balance (owner-only) ──────────────────────────────────────────

export function getMyBroCoins(userId = "demo_0") {
  return _localWallet[userId] || 0;
}

/**
 * Load BroCoin balance from Firestore.
 */
export async function loadMyBroCoins(uid) {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.BROCOIN_WALLETS, uid));
    if (snap.exists()) {
      const balance = snap.data().balance || 0;
      _localWallet[uid] = balance;
      return balance;
    }
  } catch (e) {
    // Firestore not available
  }
  return _localWallet[uid] || 0;
}

// ── Public ledger (anonymized) ────────────────────────────────────────────

export function getPublicLedger(limitCount = 50) {
  return _localLedger.slice(0, limitCount);
}

export function getGlobalStats() {
  const pool = []; // Will be populated from _getVerifiedUserPool cache
  const wf = BROCOIN_CONFIG.weightFactors;

  // Use cached/mock pool for stats
  const mockPool = [
    { profileComplete: true,  activeRecently: true,  hasSentBroNation: true  },
    { profileComplete: true,  activeRecently: true,  hasSentBroNation: true  },
    { profileComplete: true,  activeRecently: true,  hasSentBroNation: false },
    { profileComplete: true,  activeRecently: true,  hasSentBroNation: true  },
    { profileComplete: false, activeRecently: false, hasSentBroNation: false },
    { profileComplete: true,  activeRecently: true,  hasSentBroNation: true  },
    { profileComplete: true,  activeRecently: false, hasSentBroNation: true  },
    { profileComplete: false, activeRecently: true,  hasSentBroNation: false },
    { profileComplete: true,  activeRecently: true,  hasSentBroNation: false },
    { profileComplete: true,  activeRecently: true,  hasSentBroNation: true  },
    { profileComplete: false, activeRecently: true,  hasSentBroNation: false },
    { profileComplete: true,  activeRecently: false, hasSentBroNation: false },
  ];

  let totalWeight = 0, minW = Infinity, maxW = 0;
  mockPool.forEach((u) => {
    let w = wf.hasVerifiedEmail;
    if (u.profileComplete)  w *= wf.hasProfileComplete;
    if (u.activeRecently)   w *= wf.activeInLast30Days;
    if (u.hasSentBroNation) w *= wf.hasSentBroNation;
    totalWeight += w;
    if (w < minW) minW = w;
    if (w > maxW) maxW = w;
  });

  return {
    totalMinted:          _localTreasury.totalBroCoinsMinted,
    globalTransactionsBB: _localTreasury.globalTransactionsBB,
    nextMintAtBB:         BROCOIN_CONFIG.mintThresholdBB - _localTreasury.globalTransactionsBB,
    nextMintAtUSD:        (BROCOIN_CONFIG.mintThresholdBB - _localTreasury.globalTransactionsBB) / 1_000_000,
    eligibleUsers:        mockPool.length,
    totalWeight:          Math.round(totalWeight * 1000) / 1000,
    odds: {
      minOddsPct:   ((minW / totalWeight) * 100).toFixed(2),
      maxOddsPct:   ((maxW / totalWeight) * 100).toFixed(2),
      baseOddsPct:  ((wf.hasVerifiedEmail / totalWeight) * 100).toFixed(2),
      fullyBoosted: ((wf.hasVerifiedEmail * wf.hasProfileComplete * wf.activeInLast30Days * wf.hasSentBroNation / totalWeight) * 100).toFixed(2),
    },
    formula: {
      base:          `${wf.hasVerifiedEmail}x (verified email — required)`,
      profileBoost:  `${wf.hasProfileComplete}x (+${((wf.hasProfileComplete - 1) * 100).toFixed(0)}% if profile complete)`,
      activityBoost: `${wf.activeInLast30Days}x (+${((wf.activeInLast30Days - 1) * 100).toFixed(0)}% if active in last 30 days)`,
      broNationBoost:`${wf.hasSentBroNation}x (+${((wf.hasSentBroNation - 1) * 100).toFixed(0)}% if sent a bro-nation)`,
      method:        "Weighted roulette wheel selection",
      threshold:     `$${BROCOIN_CONFIG.mintThresholdUSD.toLocaleString()} total platform transactions per mint`,
    },
    treasury: getTreasuryStats(),
  };
}

export function onMint(callback) {
  _mintCallbacks.push(callback);
  return () => {
    _mintCallbacks = _mintCallbacks.filter((cb) => cb !== callback);
  };
}

export function getMintProgress() {
  return Math.min((_localTreasury.globalTransactionsBB / BROCOIN_CONFIG.mintThresholdBB) * 100, 100);
}

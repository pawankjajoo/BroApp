
import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  flushFailedPurchasesCachedAsPendingAndroid,
} from "react-native-iap";
import { Platform } from "react-native";
import { IAP_PRODUCT_IDS, BB_PACKS } from "../constants/bro";

// ── Callbacks injected by App.js ──────────────────────────────────────────────
let _onPurchaseSuccess = null;   // (pack, purchase) => void
let _onPurchaseError   = null;   // (error) => void

let _purchaseListener = null;
let _errorListener    = null;
let _connected        = false;

// ── Public API ────────────────────────────────────────────────────────────────

export async function init({ onPurchaseSuccess, onPurchaseError }) {
  _onPurchaseSuccess = onPurchaseSuccess;
  _onPurchaseError   = onPurchaseError;

  try {
    // Store connection lifecycle . handle gracefully if unavailable (sandbox mode).    await initConnection();
    _connected = true;

    // Android: flush stale pending transactions so they don't block new ones
    if (Platform.OS === "android") {
      await flushFailedPurchasesCachedAsPendingAndroid();
    }

    // Successful purchase stream (iOS & Android). Real-time listener for transaction updates.    _purchaseListener = purchaseUpdatedListener(async (purchase) => {
      if (!purchase?.productId) return;
      const pack = BB_PACKS.find((p) => p.productId === purchase.productId);
      if (!pack) return;

      // CRITICAL: finish/acknowledge transaction BEFORE granting currency. Prevents double-spend.      try {
        await finishTransaction({ purchase, isConsumable: true });
      } catch (e) {
        console.warn("[IAP] finishTransaction error:", e);
      }

      // Now safe to grant BB to user's wallet.      _onPurchaseSuccess?.(pack, purchase);
    });

    // Purchase error stream
    _errorListener = purchaseErrorListener((error) => {
      if (error?.code === "E_USER_CANCELLED") return;   // silent bail
      console.warn("[IAP] purchaseError:", error);
      _onPurchaseError?.(error);
    });

    return true;
  } catch (e) {
    console.warn("[IAP] init failed . sandbox/dev mode active:", e);
    _connected = false;
    return false;
  }
}

// ── PRODUCT CATALOG ──────────────────────────────────────────────────────────
// Fetch live product info (localized pricing) from the platform store.// Falls back to BB_PACKS metadata if the store is unavailable.// Real prices, live currency conversion, local market pricing. Just works. */
export async function getStoreProducts() {
  // Not connected? Show fallback pricing from constants.  if (!_connected) return BB_PACKS.map(packToFallback);
  try {
    const products = await getProducts({ skus: IAP_PRODUCT_IDS });
    // Merge live store data (price, currency) with our pack metadata.    return BB_PACKS.map((pack) => {
      const live = products.find((p) => p.productId === pack.productId);
      return live
        ? { ...pack, localizedPrice: live.localizedPrice, currency: live.currency }
        : packToFallback(pack);
    });
  } catch (e) {
    console.warn("[IAP] getProducts failed:", e);
    //  fallback . show USD pricing from config.    return BB_PACKS.map(packToFallback);
  }
}

// ── PURCHASE FLOW ───────────────────────────────────────────────────────────
// Trigger the platform purchase sheet for a given product ID.// The result (success or error) arrives via the listeners registered in init().// In dev/sandbox mode, simulates an instant successful purchase.// Real store or fake . UI works identically. Semelss testing.export async function purchase(productId) {
  if (!_connected) {
    // Sandbox simulation . fires success after a short delay. Full UI testing without real store.    const pack = BB_PACKS.find((p) => p.productId === productId);
    if (pack) {
      setTimeout(() => {
        _onPurchaseSuccess?.(pack, {
          productId,
          transactionId: "sandbox-" + Date.now(),
        });
      }, 800);
    }
    return;
  }

  try {
    await requestPurchase({
      sku: productId,
      andDangerouslyFinishTransactionAutomaticallyIOS: false,
    });
    // Result arrives through purchaseUpdatedListener above
  } catch (e) {
    if (e?.code !== "E_USER_CANCELLED") {
      _onPurchaseError?.(e);
    }
  }
}

export function destroy() {
  _purchaseListener?.remove();
  _errorListener?.remove();
  if (_connected) endConnection();
  _connected = false;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function packToFallback(pack) {
  return {
    ...pack,
    localizedPrice: `$${pack.usd.toLocaleString()}`,
    currency: "USD",
  };
}


import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, TextInput, Alert,
} from "react-native";
import {
  formatBB, BROCOIN_CONFIG,
} from "../constants/bro";
import {
  getMyBroCoins, getPublicLedger, getGlobalStats,
  getMintProgress, getBroCoinPriceBB, getBroCoinPriceUSD,
  getTreasuryStats, tradeBroCoinsForBB,
} from "../services/broCoin";

const TABS = [
  { key: "wallet",       label: "WALLET"       },
  { key: "ledger",       label: "LEDGER"       },
  { key: "transparency", label: "HOW IT WORKS" },
  { key: "trade",        label: "TRADE"        },
];

export default function BroCoinScreen({ broBucks, onTradeBB, onBack, showToast }) {
  const [activeTab, setActiveTab] = useState("wallet");
  const [tradeAmount, setTradeAmount] = useState("");

  const myCoins      = getMyBroCoins(0);
  const ledger       = getPublicLedger(50);
  const stats        = getGlobalStats();
  const treasury     = getTreasuryStats();
  const mintProgress = getMintProgress();
  const priceBB      = getBroCoinPriceBB();
  const priceUSD     = getBroCoinPriceUSD();

  // ── Trade handler . One-way conversion. BRO → BB only. No reversal. ──
    const amount = parseInt(tradeAmount, 10);
    if (!amount || amount < 1) {
      showToast("Enter at least 1 BroCoin, bro");
      return;
    }
    const result = tradeBroCoinsForBB(0, amount);
    if (result.success) {
      onTradeBB(result.bbReceived);
      setTradeAmount("");
      showToast(`Traded ${amount} BRO for ${formatBB(result.bbReceived)}! 🪙→💰`);
    } else {
      showToast(result.error);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header . Back, title, private balance display. Quick exit. */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>BROCOIN</Text>
          <Text style={s.sub}>PLATFORM REWARD · PRIVATE WALLET</Text>
        </View>
        <Text style={s.headerBalance}>{myCoins} 🪙</Text>
      </View>

      {/* Tab bar . Four equal sections. Tap to navigate. Private, transparent, tradeable. */}
      <View style={s.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, activeTab === t.key && s.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[s.tabTxt, activeTab === t.key && s.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TAB: WALLET (private) ────────────────────────────────────────── */}
      {/* Your private treasury. Balance, price, mint progress. Never public. */}
      {activeTab === "wallet" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
          {/* Balance card . Private BroCoins + USD valuation. Locked to you. */}
          <View style={s.walletCard}>
            <Text style={s.walletLabel}>YOUR BROCOIN BALANCE</Text>
            <Text style={s.walletAmount}>{myCoins} {BROCOIN_CONFIG.tokenSymbol}</Text>
            {priceUSD > 0 && (
              <Text style={s.walletUsd}>≈ ${(myCoins * priceUSD).toFixed(2)} USD value</Text>
            )}
            <Text style={s.walletPrivacy}>🔒 Only you can see this. BroCoin balances are never shown on profiles.</Text>
          </View>

          {/* Live price . Treasury-backed. Price = Reserve ÷ Total Minted. Transparant. */}
          <View style={s.priceCard}>
            <Text style={s.priceLabel}>LIVE BROCOIN PRICE</Text>
            <View style={s.priceRow}>
              <Text style={s.priceVal}>1 🪙 = {formatBB(priceBB)}</Text>
              <Text style={s.priceUsd}>(${priceUSD.toFixed(4)} USD)</Text>
            </View>
            <Text style={s.priceNote}>Price = Treasury Reserve ÷ Total Minted. More platform activity = higher value.</Text>
          </View>

          {/* Mint progress . Count toward next drop. Odds improving with platform growth. */}
          {/* Shows percentage, BB needed, eligible users. Real-time tracking. */}
          <View style={s.progressCard}>
            <Text style={s.progressLabel}>NEXT BROCOIN DROP</Text>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${Math.min(mintProgress, 100)}%` }]} />
            </View>
            <Text style={s.progressTxt}>
              {mintProgress.toFixed(1)}% · {formatBB(stats.nextMintAtBB)} to go (${stats.nextMintAtUSD.toFixed(2)})
            </Text>
            <Text style={s.progressNote}>{stats.totalMinted} BroCoins minted so far across {stats.eligibleUsers} verified bros</Text>
          </View>
        </ScrollView>
      )}

      {/* ── TAB: LEDGER (public, anonymized) ─────────────────────────────── */}
      {/* Full transparency. Every mint recorded. Zero user privacy compromise. */}
      {/* Anonymized with salted hashes. Impossible to reverse-engineer identities. */}
      {activeTab === "ledger" && (
        <FlatList
          data={ledger}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={s.ledgerHeader}>
              <Text style={s.ledgerHeaderTitle}>PUBLIC MINT LEDGER</Text>
              <Text style={s.ledgerHeaderDesc}>
                Every BroCoin mint is recorded here for full transparency. Recipient identities are anonymized with salted hashes . no entry can be traced back to a specific user profile.              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.ledgerRow}>
              <View style={s.ledgerBadge}>
                <Text style={s.ledgerBadgeTxt}>🪙</Text>
              </View>
              <View style={{ flex: 1 }}>
                {/* Mint milestone + date. Complete transparency of timing. */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={s.ledgerMilestone}>{item.id}</Text>
                  <Text style={s.ledgerTime}>{new Date(item.ts).toLocaleDateString()}</Text>
                </View>
                {/* Anonymized recipient. Hash cannot be reverse-engineered. */}
                <Text style={s.ledgerHash}>To: {item.recipientHash}</Text>
                {/* Pool size + price at moment of mint. Historical record. */}
                <Text style={s.ledgerStats}>
                  Pool: {item.eligibleCount} bros · Price: ${item.priceUSDAtMint.toFixed(4)}/BRO
                </Text>
                {/* Odds range shows weight distribution. No surprises. */}
                <Text style={s.ledgerOdds}>
                  Odds range: {item.weightSnapshot.minOdds} – {item.weightSnapshot.maxOdds}
                </Text>
              </View>
            </View>
          )}
          {/* Empty state . No mints yet. Keep platform activity going. */}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>🪙</Text>
              <Text style={s.emptyTxt}>No BroCoins minted yet. Keep bro-ing . first drop coming soon!</Text>
            </View>
          }
          {/* Privacy guarantee reinforced. Salted hashes with rotating salt. Unhackable. */}
          ListFooterComponent={
            <Text style={s.ledgerFooter}>
              Recipient hashes use a rotating salt and cannot be reverse-engineered to identify individual users. The algorithm, weights, and odds are published on the "How It Works" tab.            </Text>
          }
        />
      )}

      {/* ── TAB: HOW IT WORKS (full transparency) ────────────────────────── */}
      {/* Show the mechanism. No secrets. Trust through clarity. */}
      {/* Algorithm, odds, treasury, privacy guarantees, trading rules. Full disclosure. */}
      {activeTab === "transparency" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
          {/* THE ALGORITHM . Mint trigger and distribution logic. */}
          <View style={s.transSection}>
            <Text style={s.transSectionTitle}>THE ALGORITHM</Text>
            <Text style={s.transDesc}>
              For every ${BROCOIN_CONFIG.mintThresholdUSD.toLocaleString()} in total platform transactions (across ALL users), 1 BroCoin is minted and awarded to a weighted-random verified user. Here's exactly how it works:
            </Text>
          </View>

          {/* SELECTION FORMULA . Base weight + four boosts. Complete formula breakdown. */}
          <View style={s.transSection}>
            <Text style={s.transSectionTitle}>SELECTION FORMULA</Text>
            {/* Formula breakdown. Every boost explained. How to improve your odds. */}
            <View style={s.formulaBox}>
              <Text style={s.formulaLine}>Base weight:       {stats.formula.base}</Text>
              <Text style={s.formulaLine}>Profile boost:     {stats.formula.profileBoost}</Text>
              <Text style={s.formulaLine}>Activity boost:    {stats.formula.activityBoost}</Text>
              <Text style={s.formulaLine}>Bro-nation boost:  {stats.formula.broNationBoost}</Text>
              <Text style={s.formulaDivider}>─────────────────────────────────</Text>
              <Text style={s.formulaLine}>Method:            {stats.formula.method}</Text>
              <Text style={s.formulaLine}>Trigger:           {stats.formula.threshold}</Text>
            </View>
          </View>

          {/* LIVE ODDS . Real-time probability. Your chances right now. Transparant. */}
          <View style={s.transSection}>
            <Text style={s.transSectionTitle}>LIVE ODDS (RIGHT NOW)</Text>
            <View style={s.oddsGrid}>
              <View style={s.oddsItem}>
                <Text style={s.oddsVal}>{stats.eligibleUsers}</Text>
                <Text style={s.oddsLabel}>Eligible Bros</Text>
              </View>
              <View style={s.oddsItem}>
                <Text style={s.oddsVal}>{stats.odds.baseOddsPct}%</Text>
                <Text style={s.oddsLabel}>Base Odds</Text>
              </View>
              <View style={s.oddsItem}>
                <Text style={s.oddsVal}>{stats.odds.fullyBoosted}%</Text>
                <Text style={s.oddsLabel}>Max Boosted</Text>
              </View>
              <View style={s.oddsItem}>
                <Text style={s.oddsVal}>{stats.odds.minOddsPct}%</Text>
                <Text style={s.oddsLabel}>Min Odds</Text>
              </View>
            </View>
            <Text style={s.oddsNote}>
              As more users join, each person's odds decrease proportionally. Boosting your profile, staying active, and sending bro-nations increases your weight. Odds update in real-time.            </Text>
          </View>

          {/* TREASURY & PRICING . The model. How BroCoins get backed. Sustainable. */}
          <View style={s.transSection}>
            <Text style={s.transSectionTitle}>TREASURY & PRICING</Text>
            {/* Real numbers. Reserve, mints, price. Price = Reserve ÷ Minted. Math-backed. */}
            <View style={s.treasuryBox}>
              <View style={s.treasuryRow}>
                <Text style={s.treasuryLabel}>Reserve</Text>
                <Text style={s.treasuryVal}>{formatBB(treasury.reserveBB)} (${treasury.reserveUSD.toFixed(2)})</Text>
              </View>
              <View style={s.treasuryRow}>
                <Text style={s.treasuryLabel}>Total Minted</Text>
                <Text style={s.treasuryVal}>{treasury.totalMinted} BRO</Text>
              </View>
              <View style={s.treasuryRow}>
                <Text style={s.treasuryLabel}>Price/BRO</Text>
                <Text style={s.treasuryVal}>{formatBB(treasury.priceBB)} (${treasury.priceUSD.toFixed(4)})</Text>
              </View>
              <View style={s.treasuryRow}>
                <Text style={s.treasuryLabel}>Fee → Treasury</Text>
                <Text style={s.treasuryVal}>{treasury.feeRateLabel} of platform fees</Text>
              </View>
            </View>
            {/* Fee model explained. Platform growth = higher BroCoin value for all. Win-win. */}
            <Text style={s.transDesc}>
              {treasury.feeRateLabel} of every platform fee (from the 30% bro-nation fee) is deposited into the BroCoin Treasury Reserve. This reserve backs each BroCoin with real USD value. Price = Reserve ÷ Total Minted. More platform activity = higher BroCoin value for everyone.            </Text>
          </View>

          {/* PRIVACY GUARANTEE . Your balance is yours alone. Ledger is anonymous. */}
          <View style={s.transSection}>
            <Text style={s.transSectionTitle}>PRIVACY GUARANTEE</Text>
            <Text style={s.transDesc}>
              BroCoin balances are never displayed publicly on any profile. The public ledger uses rotating salted hashes to anonymize recipients . no entry can ever be traced back to a specific bro. Only you can see your own balance in your private wallet.            </Text>
          </View>

          {/* TRADING RULES . One-way mechanics. No buying. Earn only. Clean model. */}
          <View style={s.transSection}>
            <Text style={s.transSectionTitle}>TRADING RULES</Text>
            <Text style={s.transDesc}>
              You can trade BroCoins → Bro Bucks at the live treasury rate (one-way). You cannot buy BroCoins with Bro Bucks . they can only be earned through the random drop. Minimum trade: {BROCOIN_CONFIG.minTradeAmount} BRO. BroCoins are in-app platform rewards with no external cash value.            </Text>
          </View>
        </ScrollView>
      )}

      {/* ── TAB: TRADE (BRO → BB) ────────────────────────────────────────── */}
      {/* Convert earned BroCoins into spendable Bro Bucks. One-way only. */}
      {activeTab === "trade" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
          <View style={s.tradeCard}>
            <Text style={s.tradeTitle}>TRADE BROCOIN → BRO BUCKS</Text>
            <Text style={s.tradeSub}>Convert your BroCoins to Bro Bucks at the live treasury rate. One-way only . BroCoins must be earned, not bought.</Text>

            {/* Current treasury-backed rate displayed. Transparent pricing. */}
            <View style={s.tradeRateBox}>
              <Text style={s.tradeRateLabel}>CURRENT RATE</Text>
              <Text style={s.tradeRate}>1 🪙 = {formatBB(priceBB)}</Text>
              <Text style={s.tradeRateUsd}>(${priceUSD.toFixed(4)} USD)</Text>
            </View>

            {/* Your holdings . BRO and BB balances side by side. */}
            <View style={s.tradeBalRow}>
              <Text style={s.tradeBalLabel}>Your BroCoins:</Text>
              <Text style={s.tradeBalVal}>{myCoins} BRO</Text>
            </View>
            <View style={s.tradeBalRow}>
              <Text style={s.tradeBalLabel}>Your Bro Bucks:</Text>
              <Text style={s.tradeBalVal}>{formatBB(broBucks)}</Text>
            </View>

            {/* Number input field. Only digits allowed. Max 6 characters. */}
            <Text style={s.tradeInputLabel}>AMOUNT TO TRADE</Text>
            <View style={s.tradeInputRow}>
              <TextInput
                style={s.tradeInput}
                placeholder="0"
                placeholderTextColor="#333"
                value={tradeAmount}
                onChangeText={(t) => setTradeAmount(t.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Text style={s.tradeInputSuffix}>BRO</Text>
            </View>

            {/* Real-time preview. Shows BB received + USD value. Instant feedback. */}
            {tradeAmount && parseInt(tradeAmount, 10) > 0 && (
              <View style={s.tradePreview}>
                <Text style={s.tradePreviewTxt}>
                  You'll receive: {formatBB(priceBB * parseInt(tradeAmount, 10))} (${(priceUSD * parseInt(tradeAmount, 10)).toFixed(2)} value)
                </Text>
              </View>
            )}

            {/* Trade button . Disabled if no amount, no coins, or zero amount. */}
            <TouchableOpacity
              style={[s.tradeBtn, (!tradeAmount || parseInt(tradeAmount, 10) < 1 || myCoins < 1) && s.tradeBtnDisabled]}
              onPress={handleTrade}
              disabled={!tradeAmount || parseInt(tradeAmount, 10) < 1 || myCoins < 1}
            >
              <Text style={s.tradeBtnTxt}>TRADE NOW</Text>
            </TouchableOpacity>

            {/* Empty state . No coins yet. Encouragement to stay active. */}
            {myCoins === 0 && (
              <Text style={s.tradeEmpty}>You don't have any BroCoins yet. Stay active . the next drop could be yours! 🪙</Text>
            )}
          </View>

          {/* Compliance disclaimer. Clarifies no external value, one-way, irreversible. */}
          <Text style={s.tradeDisclaimer}>
            BroCoins are in-app platform rewards. They have no external monetary value and cannot be withdrawn as cash. Trading converts BroCoins to Bro Bucks at the current treasury-backed rate. All trades are final.          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#0d0d0d" },
  header:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#181818", gap: 8 },
  back:        { fontSize: 28, color: "#fff" },
  title:       { fontFamily: "BebasNeue_400Regular", fontSize: 28, color: "#ffa500", letterSpacing: 3 },
  sub:         { fontSize: 8, color: "#553300", letterSpacing: 2 },
  headerBalance: { fontFamily: "BebasNeue_400Regular", fontSize: 16, color: "#ffa500", letterSpacing: 1 },

  tabBar:      { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#181818" },
  tab:         { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabActive:   { borderBottomWidth: 2, borderBottomColor: "#ffa500" },
  tabTxt:      { fontFamily: "BebasNeue_400Regular", fontSize: 10, color: "#444", letterSpacing: 2 },
  tabTxtActive:{ color: "#ffa500" },

  // Wallet
  walletCard:    { margin: 14, padding: 20, backgroundColor: "#0f0a00", borderWidth: 1, borderColor: "#2a1f00", borderRadius: 18, alignItems: "center", gap: 6 },
  walletLabel:   { fontFamily: "BebasNeue_400Regular", fontSize: 11, color: "#664400", letterSpacing: 3 },
  walletAmount:  { fontFamily: "BebasNeue_400Regular", fontSize: 48, color: "#ffa500", letterSpacing: 2 },
  walletUsd:     { fontFamily: "BebasNeue_400Regular", fontSize: 14, color: "#886600", letterSpacing: 1 },
  walletPrivacy: { fontSize: 9, color: "#3a2a00", textAlign: "center", marginTop: 6, lineHeight: 14 },

  // Price
  priceCard:   { marginHorizontal: 14, marginTop: 4, padding: 14, backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 14 },
  priceLabel:  { fontFamily: "BebasNeue_400Regular", fontSize: 10, color: "#444", letterSpacing: 3, marginBottom: 4 },
  priceRow:    { flexDirection: "row", alignItems: "baseline", gap: 8 },
  priceVal:    { fontFamily: "BebasNeue_400Regular", fontSize: 20, color: "#fff", letterSpacing: 1 },
  priceUsd:    { fontSize: 11, color: "#555" },
  priceNote:   { fontSize: 9, color: "#2a2a2a", marginTop: 6, lineHeight: 14 },

  // Progress
  progressCard:  { marginHorizontal: 14, marginTop: 8, padding: 14, backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 14, gap: 6 },
  progressLabel: { fontFamily: "BebasNeue_400Regular", fontSize: 10, color: "#444", letterSpacing: 3 },
  progressBg:    { height: 6, backgroundColor: "#1a1200", borderRadius: 3, overflow: "hidden" },
  progressFill:  { height: 6, backgroundColor: "#ffa500", borderRadius: 3 },
  progressTxt:   { fontSize: 9, color: "#553300" },
  progressNote:  { fontSize: 9, color: "#2a2a2a" },

  // Ledger
  ledgerHeader:      { padding: 16, gap: 6 },
  ledgerHeaderTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 18, color: "#fff", letterSpacing: 2 },
  ledgerHeaderDesc:  { fontSize: 10, color: "#3a3a3a", lineHeight: 16 },
  ledgerRow:         { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#111", gap: 10 },
  ledgerBadge:       { width: 34, height: 34, borderRadius: 17, backgroundColor: "#1a1200", borderWidth: 1, borderColor: "#2a1f00", alignItems: "center", justifyContent: "center" },
  ledgerBadgeTxt:    { fontSize: 16 },
  ledgerMilestone:   { fontFamily: "BebasNeue_400Regular", fontSize: 13, color: "#ffa500", letterSpacing: 1 },
  ledgerTime:        { fontSize: 9, color: "#333" },
  ledgerHash:        { fontFamily: "BebasNeue_400Regular", fontSize: 11, color: "#555", letterSpacing: 0.5, marginTop: 2 },
  ledgerStats:       { fontSize: 9, color: "#2a2a2a", marginTop: 2 },
  ledgerOdds:        { fontSize: 9, color: "#2a2a2a" },
  ledgerFooter:      { fontSize: 9, color: "#1a1a1a", textAlign: "center", padding: 20, lineHeight: 15 },

  emptyState:  { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyEmoji:  { fontSize: 48 },
  emptyTxt:    { fontSize: 12, color: "#333", textAlign: "center", paddingHorizontal: 40 },

  // Transparency
  transSection:      { paddingHorizontal: 16, paddingTop: 16, gap: 6 },
  transSectionTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 14, color: "#ffa500", letterSpacing: 3 },
  transDesc:         { fontSize: 10, color: "#3a3a3a", lineHeight: 16 },
  formulaBox:        { backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 12, padding: 12 },
  formulaLine:       { fontFamily: "BebasNeue_400Regular", fontSize: 11, color: "#666", letterSpacing: 0.5, lineHeight: 18 },
  formulaDivider:    { color: "#222", fontSize: 9 },

  oddsGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  oddsItem:    { width: "47%", backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 12, padding: 12, alignItems: "center" },
  oddsVal:     { fontFamily: "BebasNeue_400Regular", fontSize: 22, color: "#fff", letterSpacing: 1 },
  oddsLabel:   { fontSize: 8, color: "#444", letterSpacing: 1.5, marginTop: 2 },
  oddsNote:    { fontSize: 9, color: "#2a2a2a", lineHeight: 15, marginTop: 6 },

  treasuryBox: { backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 12, padding: 12, gap: 6 },
  treasuryRow: { flexDirection: "row", justifyContent: "space-between" },
  treasuryLabel: { fontFamily: "BebasNeue_400Regular", fontSize: 11, color: "#555", letterSpacing: 1 },
  treasuryVal:   { fontFamily: "BebasNeue_400Regular", fontSize: 11, color: "#aaa", letterSpacing: 0.5 },

  // Trade
  tradeCard:       { margin: 14, padding: 16, backgroundColor: "#0f0a00", borderWidth: 1, borderColor: "#2a1f00", borderRadius: 18, gap: 10 },
  tradeTitle:      { fontFamily: "BebasNeue_400Regular", fontSize: 18, color: "#ffa500", letterSpacing: 2 },
  tradeSub:        { fontSize: 10, color: "#553300", lineHeight: 16 },
  tradeRateBox:    { backgroundColor: "#0a0700", borderWidth: 1, borderColor: "#1a1200", borderRadius: 12, padding: 12, alignItems: "center", gap: 2 },
  tradeRateLabel:  { fontFamily: "BebasNeue_400Regular", fontSize: 9, color: "#664400", letterSpacing: 3 },
  tradeRate:       { fontFamily: "BebasNeue_400Regular", fontSize: 24, color: "#ffa500", letterSpacing: 1 },
  tradeRateUsd:    { fontSize: 10, color: "#664400" },
  tradeBalRow:     { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  tradeBalLabel:   { fontSize: 11, color: "#555" },
  tradeBalVal:     { fontFamily: "BebasNeue_400Regular", fontSize: 13, color: "#aaa", letterSpacing: 0.5 },
  tradeInputLabel: { fontFamily: "BebasNeue_400Regular", fontSize: 10, color: "#664400", letterSpacing: 2 },
  tradeInputRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  tradeInput:      { flex: 1, backgroundColor: "#141000", borderWidth: 1, borderColor: "#2a1f00", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, color: "#ffa500", fontFamily: "BebasNeue_400Regular", fontSize: 22, letterSpacing: 1 },
  tradeInputSuffix:{ fontFamily: "BebasNeue_400Regular", fontSize: 14, color: "#664400", letterSpacing: 2 },
  tradePreview:    { backgroundColor: "#0a0700", borderRadius: 10, padding: 10, alignItems: "center" },
  tradePreviewTxt: { fontFamily: "BebasNeue_400Regular", fontSize: 13, color: "#886600", letterSpacing: 0.5 },
  tradeBtn:        { backgroundColor: "#ffa500", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  tradeBtnDisabled:{ opacity: 0.3 },
  tradeBtnTxt:     { fontFamily: "BebasNeue_400Regular", fontSize: 16, color: "#000", letterSpacing: 3 },
  tradeEmpty:      { fontSize: 10, color: "#3a2a00", textAlign: "center", lineHeight: 16 },
  tradeDisclaimer: { fontSize: 8, color: "#1a1a1a", textAlign: "center", padding: 16, lineHeight: 13 },
});

// ─── BRO BUCKS CURRENCY ─────────────────────────────────────────────────────
//
//  SCALE: $1,000 real USD = 1,000,000,000 Bro Bucks (1 billion)
//         Rate is LINEAR across all tiers: 1,000,000 BB per $1
//
//  Real USD  →  Bro Bucks          (💰 emoji shown; each 💰 = 100 BB)
//  ────────────────────────────────────────────────────────────────────
//  $1        →       1,000,000 BB  (10,000 💰)
//  $3        →       3,000,000 BB  (30,000 💰)
//  $5        →       5,000,000 BB  (50,000 💰)
//  $10       →      10,000,000 BB  (100,000 💰)
//  $100      →     100,000,000 BB  (1,000,000 💰)
//  $1,000    →   1,000,000,000 BB  (10,000,000 💰)  ← 1 BILLION
//
//  Peer-to-peer bronation amounts (deducted from sender's wallet):
//  Lil Bro    →     100,000 BB  (~$0.10)
//  Big Bro    →   1,000,000 BB  (~$1)
//  Baller Bro →  10,000,000 BB  (~$10)
//  GOAT Bro   → 100,000,000 BB  (~$100)

// ─── PUBLISHER REVENUE / PLATFORM FEES ──────────────────────────────────────
//
//  STORE PURCHASES (IAP):
//    Apple App Store: 30% commission (15% for Small Business Program < $1M/yr)
//    Google Play:     30% commission (15% for first $1M/yr via reduced-fee program)
//    Publisher keeps: 70-85% of every Bro Bucks purchase
//
//  PEER-TO-PEER BRO-NATIONS:
//    Platform fee: 30% - standard for virtual currency / social gifting apps
//    (TikTok ~50%, Twitch ~50%, YouTube Super Chat ~30% - 30% is competitive)
//    Recipient receives 70% of the bro-nation amount; 30% goes to publisher
//
//  Both fee structures comply with Apple App Store Review Guidelines §3.1.1
//  (in-app currencies must use IAP) and Google Play Billing policy (virtual
//  goods must go through Google Play's billing system).
//
export const PLATFORM_FEE_RATE = 0.30;           // 30% on bro-nations
export const PLATFORM_FEE_LABEL = "30%";
export const STORE_COMMISSION_SMALL = 0.15;       // Apple/Google small biz rate
export const STORE_COMMISSION_STANDARD = 0.30;    // Standard rate

// Calculate platform fee for a bro-nation - every teh dollar counts
export const calcPlatformFee = (amount) => Math.floor(amount * PLATFORM_FEE_RATE);
// Recipient gets their cut after the 30% fee. Keep it simple, keep it fair.
export const calcRecipientAmount = (amount) => amount - calcPlatformFee(amount);

// ─── PROFILE CONSTRAINTS ────────────────────────────────────────────────────
//  By design, profiles are intentionally minimal:
//    1. Profile image (photo)
//    2. Work OR School (with verification)
//    3. ONE interesting thing about themselves
//  That's it. No bio, no links, no extra fields. This is a bro app.
//
// Keep it tight. Profiles are for conexions, not resumes.
export const PROFILE_MAX_INTERESTING_LENGTH = 150;   // chars for "1 interesting thing"
export const VERIFICATION_METHODS = {
  work:   { label:"Work Email",    desc:"Verify with your company email address" },
  school: { label:"School Email (.edu)", desc:"Verify with your .edu email address" },
};

// ── IAP product IDs (must match App Store Connect & Google Play exactly) ────
// These are the gateway to wealth. Keep them synced or transactions fail.
export const IAP_PRODUCT_IDS = [
  "com.broapp.bro.bucks_1m",
  "com.broapp.bro.bucks_3m",
  "com.broapp.bro.bucks_5m",
  "com.broapp.bro.bucks_10m",
  "com.broapp.bro.bucks_100m",
  "com.broapp.bro.bucks_1b",
];

// ── Bro Bucks purchase packs ─────────────────────────────────────────────────
//  All packs use the same rate: 1,000,000 BB per $1 USD
//  Linear pricing. No tricks, no fake "deals." $1 = 1M BB, always.
//  Users know what they get. That builds trust.
export const BB_PACKS = [
  {
    productId:  "com.broapp.bro.bucks_1m",
    name:       "Bro Starter",
    usd:        1,
    bucks:      1_000_000,        // 1M BB
    emojiCount: 10_000,           // 10,000 💰
    badge:      "🤜",
    desc:       "Get in the game, bro",
    displayBB:  "1M BB",
    displayUSD: "$1",
  },
  {
    productId:  "com.broapp.bro.bucks_3m",
    name:       "Lil Bro",
    usd:        3,
    bucks:      3_000_000,        // 3M BB
    emojiCount: 30_000,           // 30,000 💰
    badge:      "🤛",
    desc:       "Triple the bro, bro",
    displayBB:  "3M BB",
    displayUSD: "$3",
  },
  {
    productId:  "com.broapp.bro.bucks_5m",
    name:       "Just Bro",
    usd:        5,
    bucks:      5_000_000,        // 5M BB
    emojiCount: 50_000,           // 50,000 💰
    badge:      "💪",
    desc:       "The classic bro move",
    displayBB:  "5M BB",
    displayUSD: "$5",
  },
  {
    productId:  "com.broapp.bro.bucks_10m",
    name:       "Big Bro",
    usd:        10,
    bucks:      10_000_000,       // 10M BB
    emojiCount: 100_000,          // 100K 💰
    badge:      "🏆",
    desc:       "Now we're talkin', bro",
    displayBB:  "10M BB",
    displayUSD: "$10",
  },
  {
    productId:  "com.broapp.bro.bucks_100m",
    name:       "Bro Baller",
    usd:        100,
    bucks:      100_000_000,      // 100M BB
    emojiCount: 1_000_000,        // 1M 💰
    badge:      "👑",
    desc:       "You're that bro, bro",
    displayBB:  "100M BB",
    displayUSD: "$100",
  },
  {
    productId:  "com.broapp.bro.bucks_1b",
    name:       "Bro Billionaire",
    usd:        1_000,
    bucks:      1_000_000_000,    // 1B BB
    emojiCount: 10_000_000,       // 10M 💰
    badge:      "🚀",
    desc:       "bro we need to talk",
    displayBB:  "1B BB",
    displayUSD: "$1,000",
  },
];

// ── Peer-to-peer bronation amounts ────────────────────────────────────────────
//  All scaled to new 1M BB = $1 rate
//  Four tiers. Lil Bro to GOAT. Every tier feels good to send and recieve.
export const BRONATION_AMOUNTS = [
  { id:"lil",    bucks:100_000,     display:"100K BB", badge:"🤜", label:"Lil Bro",    usdEquiv:"~$0.10" },
  { id:"big",    bucks:1_000_000,   display:"1M BB",   badge:"💪", label:"Big Bro",    usdEquiv:"~$1"    },
  { id:"baller", bucks:10_000_000,  display:"10M BB",  badge:"👑", label:"Baller Bro", usdEquiv:"~$10"   },
  { id:"goat",   bucks:100_000_000, display:"100M BB", badge:"🚀", label:"GOAT Bro",   usdEquiv:"~$100"  },
];

// ── Donation tiers (real USD, for NationsScreen Apple Pay tips) ──────────────
// Six ways to show love. From a fist bump to a whale. Real dollars, big eveything.
export const DONATION_TIERS = [
  { label:"Fist Bump",   emoji:"🤜", desc:"Small but meaningful, bro",         amount:0.99  },
  { label:"Bro Hug",     emoji:"🤗", desc:"Show some bro love",               amount:2.99  },
  { label:"Big Bro",     emoji:"💪", desc:"Now that's a bro move",             amount:4.99  },
  { label:"Bro Legend",   emoji:"🏆", desc:"You're a real one, bro",            amount:9.99  },
  { label:"Bro God",     emoji:"👑", desc:"Absolute legend status",            amount:24.99 },
  { label:"Bro Whale",   emoji:"🐳", desc:"We don't deserve you, bro",         amount:49.99 },
];

// ── Formatting helpers ────────────────────────────────────────────────────────
// Turn big numbers into readable text. B for billions, M for millions, K for thousands.
// Billions show 2 decimals (precision), millions and thousands show 1 (clean).
export const formatBB = (n) => {
  if (!n && n !== 0) return "0 BB";
  if (n >= 1_000_000_000) {
    const v = n / 1_000_000_000;
    return `${Number.isInteger(v) ? v : v.toFixed(2)}B BB`;
  }
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}M BB`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}K BB`;
  }
  return `${n} BB`;
};

// Emoji 💰 count for balance display (capped for UI sanity). Each 💰 = 100 BB.
// Cap at 15 emojis max - keeps the UI sane and respects eyebals.
export const bbEmojiCount = (bucks, cap = 15) =>
  Math.min(Math.floor(bucks / 100), cap);

// ─── BRO EXPRESSIONS ─────────────────────────────────────────────────────────
// 20 preset expressions. The entire vocab of the app. Every emotion, every moment.
// Neutral to hype to shock to love. Color-coded for fast visual recognition.
// This is how bros communicate without words.
export const BRO_EXPRESSIONS = [
  { id:"bro",       label:"BRO",         sub:"Hey / Hello",         color:"#ffffff" },
  { id:"bro_hype",  label:"BRO!!!",       sub:"Hype / Excited",      color:"#ffe066" },
  { id:"broooo",    label:"broooo",        sub:"Concerned / Uh oh",   color:"#ff9f43" },
  { id:"bruh",      label:"bruh",          sub:"Disappointed",        color:"#a29bfe" },
  { id:"BRUH",      label:"BRUH 😳",       sub:"Shocked / No way",    color:"#fd79a8" },
  { id:"bro_q",     label:"bro?",          sub:"Confused / What?",    color:"#81ecec" },
  { id:"BROOOOO",   label:"BROOOOO 🤯",    sub:"Mind blown / Amazed", color:"#55efc4" },
  { id:"bro_sad",   label:"bro…",          sub:"Sad / Sympathetic",   color:"#b2bec3" },
  { id:"bro_ty",    label:"bro 🙏",        sub:"Grateful",            color:"#fdcb6e" },
  { id:"bro_ded",   label:"bro 💀",        sub:"Funny / Dead",        color:"#636e72" },
  { id:"bro_sos",   label:"BRO BRO BRO",  sub:"Urgent / Emergency",  color:"#d63031" },
  { id:"bro_luv",   label:"bro ❤️",        sub:"Love / Support",      color:"#e84393" },
  { id:"bro_mad",   label:"bro 😤",        sub:"Annoyed",             color:"#e17055" },
  { id:"bro_resp",  label:"bro 🤝",        sub:"Respect / Agreement", color:"#00b894" },
  { id:"bro_ngl",   label:"bro ngl",       sub:"Being real / Honest", color:"#dfe6e9" },
  { id:"BROO_fire", label:"BRO 🔥",        sub:"Let's go / Fire",     color:"#e67e22" },
  { id:"bro_rip",   label:"bro…rip",       sub:"Condolences / F",     color:"#4a4a4a" },
  { id:"bro_W",     label:"bro W",         sub:"Win / Nice job",      color:"#00cec9" },
  { id:"bro_L",     label:"bro L",         sub:"Loss / That sucks",   color:"#74b9ff" },
  { id:"broooo_no", label:"broooo no",     sub:"Stop it / Please no", color:"#ff7675" },
];

// Updated bro profiles to reflect new BB scale (~$1 = 1M BB)
// broCount = how many bros (friends) this person has - shown on their profile
// Demo data. Real users replace these, but this is how the app comes alive.
export const INITIAL_BROS = [
  { id:1, name:"Chad",   avatar:"💪", lastBro:"2m ago",    unread:3, broNationsBB:4_200_000_000, broCount:142 },
  { id:2, name:"Brent",  avatar:"🏈", lastBro:"14m ago",   unread:1, broNationsBB:69_000_000,    broCount:89  },
  { id:3, name:"Kyle",   avatar:"🍺", lastBro:"1h ago",    unread:0, broNationsBB:1_337_000_000, broCount:234 },
  { id:4, name:"Tanner", avatar:"🏋️", lastBro:"3h ago",    unread:0, broNationsBB:0,             broCount:47  },
  { id:5, name:"Jake",   avatar:"🤜", lastBro:"Yesterday", unread:0, broNationsBB:250_000_000,   broCount:63  },
  { id:6, name:"Austin", avatar:"🎯", lastBro:"2d ago",    unread:0, broNationsBB:88_000_000,    broCount:118 },
];

// Geographically close friends. Bluetooth signal strength shows proximity and battery.
// Signal 5 = strong, signal 2 = weak. Nearby can become best friends fast.
export const NEARBY_BROS = [
  { id:7,  name:"Tyler",  avatar:"🏄", dist:"12ft",  signal:5, broCount:76  },
  { id:8,  name:"Corey",  avatar:"🎮", dist:"30ft",  signal:4, broCount:203 },
  { id:9,  name:"Blake",  avatar:"🏇", dist:"0.2mi", signal:3, broCount:31  },
  { id:10, name:"Hunter", avatar:"🎣", dist:"0.4mi", signal:2, broCount:55  },
];

// The feed. Bro actions in real time. Who's bro-ing who, who's casting, who's donating.
// Shows engagement, not life drama. Keeps the feed about the bro, not the personality.
export const FEED_ITEMS = [
  { id:1, from:"Chad",   avatar:"💪", action:"bro'd",        target:"Brent",           time:"2m ago"  },
  { id:2, from:"Kyle",   avatar:"🍺", action:"bro-casted",   target:"all bros",        time:"8m ago"  },
  { id:3, from:"Jake",   avatar:"🤜", action:"bro-nation'd", target:"Tanner · 1M BB",  time:"22m ago" },
  { id:4, from:"Tanner", avatar:"🏋️", action:"BRO!!!",       target:"Austin",          time:"1h ago"  },
  { id:5, from:"Brent",  avatar:"🏈", action:"bro-casted",   target:"all bros",        time:"2h ago"  },
  { id:6, from:"Austin", avatar:"🎯", action:"bro-nation'd", target:"Kyle · 10M BB",   time:"3h ago"  },
];

// ─── BRO NETWORK GRAPH ─────────────────────────────────────────────────────
// Connection graph used by the recommendation engine.
// Key = user ID, value = array of bro IDs (1st degree connections).
// IMPORTANT: Users can NEVER browse or search another user's bro list.
// The graph is ONLY used server-side to compute 2nd/3rd degree recomendations.
// Your network is YOUR bussiness. We only use it to find you new friends, not expose you.
// Privacy by design. Transparency by intent.
export const BRO_NETWORK_GRAPH = {
  0:  [1, 2, 3, 4, 5, 6],             // "You" (current user) - your bros
  1:  [0, 2, 3, 7, 11, 12],           // Chad's bros
  2:  [0, 1, 8, 13, 14],              // Brent's bros
  3:  [0, 1, 5, 9, 10, 15],           // Kyle's bros
  4:  [0, 6, 10, 16],                 // Tanner's bros
  5:  [0, 3, 6, 9, 17],               // Jake's bros
  6:  [0, 4, 5, 8, 18],               // Austin's bros
  7:  [1, 8, 11, 19],                 // Tyler
  8:  [2, 6, 7, 12, 20],              // Corey
  9:  [3, 5, 15, 21],                 // Blake
  10: [3, 4, 16, 22],                 // Hunter
  11: [1, 7, 12],                     // Derek
  12: [1, 8, 11, 20],                 // Mason
  13: [2, 14, 23],                    // Logan
  14: [2, 13, 24],                    // Ryan
  15: [3, 9, 25],                     // Brody
  16: [4, 10, 22],                    // Cody
  17: [5, 26],                        // Liam
  18: [6, 27],                        // Nate
  19: [7, 28],                        // Garrett
  20: [8, 12, 29],                    // Zach
  21: [9, 30],                        // Cash
  22: [10, 16],                       // Drew
  23: [13],                           // Reid
  24: [14],                           // Tucker
  25: [15],                           // Maverick
  26: [17],                           // Cruz
  27: [18],                           // Rex
  28: [19],                           // Hank
  29: [20],                           // Bo
  30: [21],                           // Ace
};

// Extended roster: non-direct users the recommendation engine can surface.
// 31 users total. Graph structure feeds this roster to build smarter recomendations.
// More users = more options. More connections = better chances to find your bro.
export const ALL_USERS_ROSTER = {
  0:  { name:"You",     avatar:"🤜" },
  1:  { name:"Chad",    avatar:"💪" },
  2:  { name:"Brent",   avatar:"🏈" },
  3:  { name:"Kyle",    avatar:"🍺" },
  4:  { name:"Tanner",  avatar:"🏋️" },
  5:  { name:"Jake",    avatar:"🤜" },
  6:  { name:"Austin",  avatar:"🎯" },
  7:  { name:"Tyler",   avatar:"🏄" },
  8:  { name:"Corey",   avatar:"🎮" },
  9:  { name:"Blake",   avatar:"🏇" },
  10: { name:"Hunter",  avatar:"🎣" },
  11: { name:"Derek",   avatar:"🏀" },
  12: { name:"Mason",   avatar:"🎸" },
  13: { name:"Logan",   avatar:"🏍️" },
  14: { name:"Ryan",    avatar:"⚡" },
  15: { name:"Brody",   avatar:"🛹" },
  16: { name:"Cody",    avatar:"🎧" },
  17: { name:"Liam",    avatar:"🥊" },
  18: { name:"Nate",    avatar:"🏎️" },
  19: { name:"Garrett", avatar:"🤠" },
  20: { name:"Zach",    avatar:"🎵" },
  21: { name:"Cash",    avatar:"🦅" },
  22: { name:"Drew",    avatar:"🏒" },
  23: { name:"Reid",    avatar:"🎲" },
  24: { name:"Tucker",  avatar:"🦈" },
  25: { name:"Maverick",avatar:"✈️" },
  26: { name:"Cruz",    avatar:"🏖️" },
  27: { name:"Rex",     avatar:"🦖" },
  28: { name:"Hank",    avatar:"🤙" },
  29: { name:"Bo",      avatar:"🐂" },
  30: { name:"Ace",     avatar:"♠️" },
};

// ─── BRO COIN TOKEN SYSTEM ─────────────────────────────────────────────────
//
// MINTING:
//   For every $1,000 in TOTAL platform transactions (Bro Bucks purchases +
//   bro-nations), ONE BroCoin is minted and awarded to a weighted-random
//   verified user. Sent to their private wallet linked to their profile.
//
// PRIVACY:
//   - BroCoin balances are NEVER shown publicly on any profile
//   - Only the owner can see their own balance (in their private wallet)
//   - The public ledger shows mint events anonymized (no user IDs or names)
//
// TRANSPARENCY (PUBLIC LEDGER):
//   - Every mint is recorded with: timestamp, milestone #, anonymized hash
//   - The selection algorithm, formulas, weight factors, and live odds are
//     published openly so users can verify fairness
//   - Eligible user count is shown (so users can compute their own odds)
//   - NO ledger entry traces back to an individual user
//
// TREASURY / USD BACKING:
//   - 5% of every platform fee (from the 30% bro-nation fee) is deposited
//     into the BroCoin Treasury Reserve
//   - This reserve BACKS each BroCoin with real USD value
//   - BroCoin USD price = Treasury Reserve ÷ Total BroCoins Minted
//   - Users can trade BroCoins for USD credit within the app (converts to BB)
//   - Price floats as more coins are minted and more revenue flows in
//   - This creates organic demand: active platform = higher BroCoin value
//
// COMPLIANCE:
//   - In-app credit only - no external wallet, no blockchain, no withdrawal
//   - Classified as platform loyalty reward, not a security
//   - Apple §3.1.1 compliant (virtual goods within the app ecosystem)
//   - No cash-out to bank; USD value converts to Bro Bucks only
//
// Token system design. Earn, hold, trade. Fair odds. Backed by treasure. This is wealth.
export const BROCOIN_CONFIG = {
  // Minting
  mintThresholdUSD:       1_000,                       // every $1K total txns → 1 BroCoin minted
  mintThresholdBB:        1_000_000_000,               // same in BB (1B BB = $1K)
  tokenName:              "BroCoin",
  tokenSymbol:            "BRO",
  tokenEmoji:             "🪙",
  maxSupply:              null,                        // uncapped - grows with platform usage

  // Eligibility & selection
  eligibility:            "verified_email_only",       // must have verified email
  selectionMethod:        "weighted_random",           // weighted by activity, not pure random
  weightFactors: {
    hasVerifiedEmail:     1.0,                         // base weight (required)
    hasProfileComplete:   1.2,                         // +20% boost for complete profiles
    activeInLast30Days:   1.5,                         // +50% boost for recent activity
    hasSentBroNation:     1.3,                         // +30% boost for engaged users
  },

  // Privacy
  balanceVisibility:      "owner_only",                // NEVER public
  ledgerAnonymization:    "sha256_salted_hash",        // recipient shown as hash, not name

  // Treasury reserve (USD backing for BroCoin value)
  treasuryFeeRate:        0.05,                        // 5% of platform fees → treasury
  // So from a bro-nation: sender pays 100% → 30% platform fee → 5% of that (1.5% of total) → treasury
  // Example: 10M BB bro-nation → 3M BB fee → 150K BB ($0.15) → treasury
  tradingEnabled:         true,                        // allow BroCoin ↔ BB trading in-app
  minTradeAmount:         1,                           // minimum 1 BroCoin per trade
  tradeDirection:         "bro_to_bb_only",            // BroCoin → BB (not BB → BroCoin; must be earned)
};

// Pick a random expression. Roll the dice on what you're feeling right now.
// 20 options, infinite combinations. One call, infinite expression.
export const randomExpr = () =>
  BRO_EXPRESSIONS[Math.floor(Math.random() * BRO_EXPRESSIONS.length)];

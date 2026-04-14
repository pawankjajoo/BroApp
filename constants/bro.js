// Currency constants
export const PLATFORM_FEE_RATE = 0.30;
export const PLATFORM_FEE_LABEL = "30%";
export const STORE_COMMISSION_SMALL = 0.15;
export const STORE_COMMISSION_STANDARD = 0.30;
export const PROFILE_MAX_INTERESTING_LENGTH = 150;

// BroCoin configuration
export const BROCOIN_CONFIG = {
  // Minting thresholds
  mintThresholdBB: 1_000_000_000,  // 1 billion BB = 1 BroCoin mint
  mintThresholdUSD: 1_000,          // $1,000 in platform transactions

  // Fee allocation
  treasuryFeeRate: 0.05,            // 5% of platform fees go to treasury

  // Trading
  tradingEnabled: true,
  minTradeAmount: 1,                // Minimum 1 BroCoin to trade

  // Weight factors for BroCoin selection (lottery odds)
  weightFactors: {
    hasVerifiedEmail:     1.0,      // Base weight: verified email required
    hasProfileComplete:   1.2,      // +20% if profile is complete
    activeInLast30Days:   1.5,      // +50% if active in last 30 days
    hasSentBroNation:     1.3,      // +30% if user has sent a bro-nation
  },
};

export const calcPlatformFee = (amount) => Math.floor(amount * PLATFORM_FEE_RATE);
export const calcRecipientAmount = (amount) => amount - calcPlatformFee(amount);

export const VERIFICATION_METHODS = {
  work:   { label: "Work Email", desc: "Verify with company email" },
  school: { label: "School Email (.edu)", desc: "Verify with .edu email" },
};

export const IAP_PRODUCT_IDS = [
  "com.broapp.bro.bucks_1m",
  "com.broapp.bro.bucks_3m",
  "com.broapp.bro.bucks_5m",
  "com.broapp.bro.bucks_10m",
  "com.broapp.bro.bucks_100m",
  "com.broapp.bro.bucks_1b",
];

export const BB_PACKS = [
  {
    productId: "com.broapp.bro.bucks_1m",
    name: "Bro Starter",
    usd: 1,
    bucks: 1_000_000,
    emojiCount: 10_000,
    badge: "🤜",
    desc: "Get in the game",
    displayBB: "1M BB",
    displayUSD: "$1",
  },
  {
    productId: "com.broapp.bro.bucks_3m",
    name: "Lil Bro",
    usd: 3,
    bucks: 3_000_000,
    emojiCount: 30_000,
    badge: "🤛",
    desc: "Triple the bro",
    displayBB: "3M BB",
    displayUSD: "$3",
  },
  {
    productId: "com.broapp.bro.bucks_5m",
    name: "Just Bro",
    usd: 5,
    bucks: 5_000_000,
    emojiCount: 50_000,
    badge: "💪",
    desc: "Classic move",
    displayBB: "5M BB",
    displayUSD: "$5",
  },
  {
    productId: "com.broapp.bro.bucks_10m",
    name: "Big Bro",
    usd: 10,
    bucks: 10_000_000,
    emojiCount: 100_000,
    badge: "💎",
    desc: "Now you're a big bro",
    displayBB: "10M BB",
    displayUSD: "$10",
  },
  {
    productId: "com.broapp.bro.bucks_100m",
    name: "Baller Bro",
    usd: 100,
    bucks: 100_000_000,
    emojiCount: 1_000_000,
    badge: "👑",
    desc: "Elite status unlocked",
    displayBB: "100M BB",
    displayUSD: "$100",
  },
  {
    productId: "com.broapp.bro.bucks_1b",
    name: "GOAT Bro",
    usd: 1_000,
    bucks: 1_000_000_000,
    emojiCount: 10_000_000,
    badge: "🏆",
    desc: "The legend",
    displayBB: "1B BB",
    displayUSD: "$1,000",
  },
];

export const INITIAL_BROS = [
  {
    id: 1,
    name: "Tyler",
    avatar: "🤵",
    broCount: 234,
    broNationsBB: 5_000_000,
    unread: 2,
    lastBro: "2 min ago",
  },
  {
    id: 2,
    name: "Marcus",
    avatar: "🧔",
    broCount: 189,
    broNationsBB: 3_200_000,
    unread: 0,
    lastBro: "1 hour ago",
  },
  {
    id: 3,
    name: "Jamal",
    avatar: "🕺",
    broCount: 312,
    broNationsBB: 12_000_000,
    unread: 5,
    lastBro: "Just now",
  },
  {
    id: 4,
    name: "Kevin",
    avatar: "👨",
    broCount: 156,
    broNationsBB: 1_500_000,
    unread: 0,
    lastBro: "3 days ago",
  },
  {
    id: 5,
    name: "Alex",
    avatar: "🧑",
    broCount: 203,
    broNationsBB: 4_100_000,
    unread: 1,
    lastBro: "5 hours ago",
  },
  {
    id: 6,
    name: "Jordan",
    avatar: "👨‍🦱",
    broCount: 267,
    broNationsBB: 7_800_000,
    unread: 0,
    lastBro: "1 day ago",
  },
];

export const BRO_EXPRESSIONS = [
  { id: 1, label: "Love", emoji: "💪" },
  { id: 2, label: "Hype", emoji: "🔥" },
  { id: 3, label: "Respect", emoji: "🫡" },
  { id: 4, label: "Laugh", emoji: "😂" },
  { id: 5, label: "Sad", emoji: "😢" },
  { id: 6, label: "Rage", emoji: "😤" },
];

export const randomExpr = () => {
  return BRO_EXPRESSIONS[Math.floor(Math.random() * BRO_EXPRESSIONS.length)];
};

export const formatBB = (amount) => {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + "B";
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + "M";
  if (amount >= 1_000) return (amount / 1_000).toFixed(1) + "K";
  return amount.toString();
};

export const bbEmojiCount = (amount, maxEmojis = 20) => {
  // Convert BB to emoji count, capped at maxEmojis for UI display
  // 100k BB = 1 emoji for visual representation
  const emojiCount = Math.floor(amount / 100_000);
  return Math.min(emojiCount, maxEmojis);
};

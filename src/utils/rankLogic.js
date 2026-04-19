// // 🚨 THE MASTER RANK CONFIGURATION
// export const RANKS_CONFIG = [
//   { name: "Novice", minXP: 0, maxXP: 1000, color: "#22C55E", tier: "Beginner" },
//   { name: "Apprentice", minXP: 1000, maxXP: 3000, color: "#22C55E", tier: "Beginner" },
//   { name: "Student", minXP: 3000, maxXP: 5000, color: "#22C55E", tier: "Beginner" },
//   { name: "Warrior", minXP: 5000, maxXP: 10000, color: "#3B82F6", tier: "Intermediate" },
//   { name: "Ronin", minXP: 10000, maxXP: 15000, color: "#3B82F6", tier: "Intermediate" },
//   { name: "Ninja", minXP: 15000, maxXP: 20000, color: "#3B82F6", tier: "Intermediate" },
//   { name: "Samurai", minXP: 20000, maxXP: 30000, color: "#8B5CF6", tier: "Advanced" },
//   { name: "Elite Samurai", minXP: 30000, maxXP: 40000, color: "#8B5CF6", tier: "Advanced" },
//   { name: "Shogun", minXP: 40000, maxXP: 50000, color: "#8B5CF6", tier: "Advanced" },
//   { name: "Daimyo", minXP: 50000, maxXP: 65000, color: "#EF4444", tier: "Master" },
//   { name: "Legend", minXP: 65000, maxXP: 80000, color: "#EF4444", tier: "Master" },
//   { name: "Grandmaster", minXP: 80000, maxXP: 90000, color: "#EF4444", tier: "Master" },
//   { name: "Sensei", minXP: 90000, maxXP: 100000, color: "#FACC15", tier: "Final" },
// ];

// export const calculateRank = (xp) => {
//   const currentXP = Number(xp) || 0;
  
//   // 1. Find the current rank object
//   const rank = RANKS_CONFIG.find(r => currentXP >= r.minXP && currentXP < r.maxXP) 
//                || RANKS_CONFIG[RANKS_CONFIG.length - 1]; // Fallback to Sensei if > 100k

//   // 2. Calculate Level (L1 to L5) within that rank
//   const range = rank.maxXP - rank.minXP;
//   const relativeXP = currentXP - rank.minXP;
//   const levelProgress = relativeXP / range; // 0.0 to 1.0
  
//   const level = Math.min(Math.floor(levelProgress * 5) + 1, 5);
  
//   // 3. Calculate percentage for the progress bar (to next level)
//   const barPercentage = (levelProgress * 100);

//   return {
//     ...rank,
//     level: `L${level}`,
//     percentage: barPercentage,
//     xpRemaining: rank.maxXP - currentXP
//   };
// };


// THE 20-RANK MASTER CONFIGURATION: "EARLY EVOLUTION" CURVE
export const RANKS_CONFIG = [
  // 🟢 TIER 1: AWAKENING (Green) | Hyper-fast (20-100 XP per sub-level)
  { name: "Mugaku", kanji: "無学", minXP: 0, maxXP: 100, color: "#22C55E", gradient: "from-emerald-300 to-green-500", tier: "Awakening", glow: "shadow-emerald-500/20" },
  { name: "Kōhai", kanji: "後輩", minXP: 100, maxXP: 250, color: "#22C55E", gradient: "from-emerald-400 to-green-500", tier: "Awakening", glow: "shadow-emerald-500/20" },
  { name: "Shoshinsha", kanji: "初心者", minXP: 250, maxXP: 500, color: "#10B981", gradient: "from-emerald-400 to-teal-500", tier: "Awakening", glow: "shadow-emerald-500/20" },
  { name: "Minarai", kanji: "見習い", minXP: 500, maxXP: 1000, color: "#10B981", gradient: "from-emerald-500 to-teal-600", tier: "Awakening", glow: "shadow-emerald-500/30" },

  // 🌊 TIER 2: JOURNEYMAN (Teal) | The Habit Builder (200-400 XP per sub-level)
  { name: "Gakusei", kanji: "学生", minXP: 1000, maxXP: 2000, color: "#06B6D4", gradient: "from-cyan-400 to-teal-500", tier: "Journeyman", glow: "shadow-cyan-500/20" },
  { name: "Deshi", kanji: "弟子", minXP: 2000, maxXP: 3500, color: "#06B6D4", gradient: "from-cyan-500 to-blue-500", tier: "Journeyman", glow: "shadow-cyan-500/20" },
  { name: "Ashigaru", kanji: "足軽", minXP: 3500, maxXP: 5500, color: "#0EA5E9", gradient: "from-sky-400 to-blue-600", tier: "Journeyman", glow: "shadow-sky-500/20" },

  // 🔵 TIER 3: WARRIOR (Blue) | Consistent Learner (500-800 XP per sub-level)
  { name: "Rōnin", kanji: "浪人", minXP: 5500, maxXP: 8000, color: "#3B82F6", gradient: "from-blue-400 to-indigo-500", tier: "Warrior", glow: "shadow-blue-500/20" },
  { name: "Bushi", kanji: "武士", minXP: 8000, maxXP: 11000, color: "#3B82F6", gradient: "from-blue-500 to-indigo-600", tier: "Warrior", glow: "shadow-blue-500/30" },
  { name: "Shinobi", kanji: "忍", minXP: 11000, maxXP: 15000, color: "#6366F1", gradient: "from-indigo-400 to-violet-500", tier: "Warrior", glow: "shadow-indigo-500/30" },

  // 🟣 TIER 4: SHADOW (Purple) | The Grind Begins (1,000-1,600 XP per sub-level)
  { name: "Samurai", kanji: "侍", minXP: 15000, maxXP: 20000, color: "#8B5CF6", gradient: "from-violet-400 to-purple-500", tier: "Shadow", glow: "shadow-violet-500/30" },
  { name: "Hatamoto", kanji: "旗本", minXP: 20000, maxXP: 27000, color: "#9333EA", gradient: "from-purple-400 to-fuchsia-500", tier: "Shadow", glow: "shadow-purple-500/30" },
  { name: "Kashindan", kanji: "家臣団", minXP: 27000, maxXP: 35000, color: "#A855F7", gradient: "from-purple-500 to-pink-500", tier: "Shadow", glow: "shadow-purple-500/40" },

  // 🔴 TIER 5: COMMANDER (Pink/Red) | Prestige Status (2,000-3,400 XP per sub-level)
  { name: "Taishō", kanji: "大将", minXP: 35000, maxXP: 45000, color: "#EC4899", gradient: "from-pink-500 to-rose-500", tier: "Commander", glow: "shadow-pink-500/30" },
  { name: "Daimyō", kanji: "大名", minXP: 45000, maxXP: 58000, color: "#E11D48", gradient: "from-rose-500 to-red-500", tier: "Commander", glow: "shadow-rose-500/40" },
  { name: "Shōgun", kanji: "将軍", minXP: 58000, maxXP: 75000, color: "#EF4444", gradient: "from-red-500 to-orange-600", tier: "Commander", glow: "shadow-red-500/40" },

  // 👑 TIER 6: MYTHIC (Orange/Gold) | Elite Grinders (4,000-6,000 XP per sub-level)
  { name: "Kensei", kanji: "剣聖", minXP: 75000, maxXP: 95000, color: "#F97316", gradient: "from-orange-400 to-amber-500", tier: "Mythic", glow: "shadow-orange-500/40" },
  { name: "Meijin", kanji: "名人", minXP: 95000, maxXP: 120000, color: "#F59E0B", gradient: "from-amber-400 to-yellow-500", tier: "Mythic", glow: "shadow-amber-500/50" },
  { name: "Sōke", kanji: "宗家", minXP: 120000, maxXP: 150000, color: "#FACC15", gradient: "from-yellow-300 to-amber-500", tier: "Mythic", glow: "shadow-yellow-500/50" },
  
  // 🐉 TIER 7: ASCENDED
  { name: "Sensei", kanji: "先生", minXP: 150000, maxXP: 200000, color: "#EAB308", gradient: "from-yellow-400 via-amber-400 to-yellow-600", tier: "Ascended", glow: "shadow-yellow-500/60" },
];

export const calculateRank = (xp) => {
  const currentXP = Number(xp) || 0;
  
  let rankIndex = RANKS_CONFIG.findIndex(r => currentXP >= r.minXP && currentXP < r.maxXP);
  
  // Lock them at Sensei if they exceed 200,000 XP
  if (rankIndex === -1 && currentXP >= 200000) rankIndex = RANKS_CONFIG.length - 1;
  if (rankIndex === -1) rankIndex = 0; 

  const rank = RANKS_CONFIG[rankIndex];
  
  const cappedXP = Math.min(currentXP, rank.maxXP);
  const range = rank.maxXP - rank.minXP;
  const relativeXP = cappedXP - rank.minXP;
  
  // Sub-Levels (L1 to L5)
  let levelProgress = relativeXP / range;
  if (levelProgress >= 1) levelProgress = 0.9999; 
  const levelNumber = Math.min(Math.floor(levelProgress * 5) + 1, 5);
  
  const segmentSize = 1 / 5;
  const currentSegmentStart = (levelNumber - 1) * segmentSize;
  const percentageInLevel = ((levelProgress - currentSegmentStart) / segmentSize) * 100;

  return {
    ...rank,
    rankIndex,
    level: `L${levelNumber}`,
    percentage: Math.max(0, Math.min(100, percentageInLevel)), 
    xpRemaining: Math.max(0, rank.maxXP - currentXP), 
    currentXP
  };
};
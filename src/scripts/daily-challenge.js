// js/daily-challenge.js - Daily challenge + streak system
console.log("📅 DailyChallenge loading...");

(function() {
  const DAILY_CHALLENGE_KEY = "mathmaster_daily_challenge_v1";
  const STREAK_KEY = "mathmaster_streak_v1";
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Deterministic seed from date for consistent daily challenge
  function dateSeed(date = new Date()) {
    return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  }

  // Get today's date string (YYYY-MM-DD)
  function todayStr(date = new Date()) {
    return date.toISOString().split("T")[0];
  }

  // Check if a date is "yesterday" relative to today
  function isYesterday(dateStr, today = todayStr()) {
    const d1 = new Date(dateStr);
    const d2 = new Date(today);
    const diff = Math.floor((d2 - d1) / MS_PER_DAY);
    return diff === 1;
  }

  // Get today's challenge problem
  function getTodaysChallenge() {
    const today = todayStr();
    try {
      const stored = localStorage.getItem(DAILY_CHALLENGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) {
          return parsed.challenge;
        }
      }
    } catch (e) {
      console.warn("⚠️ Failed to read daily challenge:", e);
    }

    // Generate new daily challenge
    const seed = dateSeed();
    const challenge = generateChallenge(seed, today);
    try {
      localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify({ date: today, challenge }));
    } catch (e) {
      console.warn("⚠️ Failed to write daily challenge:", e);
    }
    return challenge;
  }

  function generateChallenge(seed, dateStr) {
    // Use seed to deterministically pick level, problem, and bonus
    const rand = mulberry32(seed);
    const levels = ["beginner", "warrior", "master"];
    const level = levels[Math.floor(rand() * levels.length)];

    // Pick a problem template and generate values
    const problemTemplates = {
      beginner: [
        { template: "A + B - X = C", ops: ["+", "-"] },
        { template: "A - X = B", ops: ["-"] },
        { template: "X + A = B", ops: ["+"] },
      ],
      warrior: [
        { template: "A × B - X = C", ops: ["×", "-"] },
        { template: "A × X = B", ops: ["×"] },
        { template: "A × B + X = C", ops: ["×", "+"] },
        { template: "X × A = B", ops: ["×"] },
      ],
      master: [
        { template: "A ÷ B = X", ops: ["÷"] },
        { template: "A ÷ X = B", ops: ["÷"] },
        { template: "X ÷ A = B", ops: ["÷"] },
        { template: "A × B ÷ X = C", ops: ["×", "÷"] },
      ],
    };

    const templates = problemTemplates[level];
    const tmpl = templates[Math.floor(rand() * templates.length)];

    // Generate numbers based on level difficulty
    let A, B, C, X;
    if (level === "beginner") {
      A = Math.floor(rand() * 9) + 1; // 1-9
      B = Math.floor(rand() * 9) + 1;
      X = Math.floor(rand() * 9) + 1;
      if (tmpl.template === "A + B - X = C") {
        C = A + B - X;
      } else if (tmpl.template === "A - X = B") {
        A = X + Math.floor(rand() * 9) + 1;
        B = A - X;
        C = B;
      } else if (tmpl.template === "X + A = B") {
        B = X + A;
        C = B;
      }
    } else if (level === "warrior") {
      A = Math.floor(rand() * 12) + 2; // 2-13
      B = Math.floor(rand() * 12) + 2;
      X = Math.floor(rand() * 12) + 2;
      if (tmpl.template === "A × B - X = C") {
        C = A * B - X;
      } else if (tmpl.template === "A × X = B") {
        B = A * X;
        C = B;
      } else if (tmpl.template === "A × B + X = C") {
        C = A * B + X;
      } else if (tmpl.template === "X × A = B") {
        B = X * A;
        C = B;
      }
    } else { // master
      // For division, ensure clean division
      X = Math.floor(rand() * 12) + 2;
      B = Math.floor(rand() * 12) + 2;
      if (tmpl.template === "A ÷ B = X") {
        A = X * B;
        C = X;
      } else if (tmpl.template === "A ÷ X = B") {
        A = X * B;
        C = B;
      } else if (tmpl.template === "X ÷ A = B") {
        A = Math.floor(rand() * 12) + 2;
        X = A * B;
        C = B;
      } else if (tmpl.template === "A × B ÷ X = C") {
        B = Math.floor(rand() * 12) + 2;
        C = Math.floor(rand() * 12) + 2;
        X = B;
        A = C;
      }
    }

    const bonusMultiplier = [2, 2.5, 3][Math.floor(rand() * 3)];

    return {
      level,
      template: tmpl.template,
      values: { A, B, C, X },
      bonusMultiplier,
      maxScore: Math.floor(10000 * bonusMultiplier),
      date: dateStr,
    };
  }

  // Mulberry32 PRNG for deterministic generation
  function mulberry32(a) {
    return function() {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Streak management
  function getStreak() {
    const stored = localStorage.getItem(STREAK_KEY);
    if (!stored) return { count: 0, lastPlayed: null };
    return JSON.parse(stored);
  }

  function recordPlay() {
    const today = todayStr();
    const streak = getStreak();
    let newCount = 1;

    if (streak.lastPlayed) {
      if (streak.lastPlayed === today) {
        // Already played today, don't increment
        return streak.count;
      } else if (isYesterday(streak.lastPlayed, today)) {
        // Played yesterday, increment streak
        newCount = streak.count + 1;
      } else {
        // Streak broken
        newCount = 1;
      }
    }

    const newStreak = { count: newCount, lastPlayed: today };
    localStorage.setItem(STREAK_KEY, JSON.stringify(newStreak));
    return newCount;
  }

  function getStreakCount() {
    return getStreak().count;
  }

  // Check if daily challenge was completed today
  function isDailyCompleted() {
    const stored = localStorage.getItem(DAILY_CHALLENGE_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return parsed.completed === true && parsed.date === todayStr();
  }

  function markDailyCompleted(score) {
    const stored = localStorage.getItem(DAILY_CHALLENGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.completed = true;
      parsed.completedScore = score;
      parsed.completedAt = Date.now();
      localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(parsed));
    }
  }

  // Export
  window.DailyChallenge = {
    getTodaysChallenge,
    getStreakCount,
    recordPlay,
    isDailyCompleted,
    markDailyCompleted,
    todayStr,
    dateSeed,
  };

  console.log("✅ DailyChallenge loaded");
})();
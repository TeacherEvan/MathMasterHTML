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

  // Get today's local calendar date string (YYYY-MM-DD), aligned with dateSeed()
  function todayStr(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDateKeyToUtcMs(dateKey) {
    if (typeof dateKey !== "string") return NaN;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
    if (!match) return NaN;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  // Check if a date is "yesterday" relative to today
  function isYesterday(dateStr, today = todayStr()) {
    const d1 = parseDateKeyToUtcMs(dateStr);
    const d2 = parseDateKeyToUtcMs(today);
    if (!Number.isFinite(d1) || !Number.isFinite(d2)) return false;
    const diff = Math.round((d2 - d1) / MS_PER_DAY);
    return diff === 1;
  }

  // Get today's challenge problem
  function getTodaysChallenge() {
    const today = todayStr();
    try {
      const stored = localStorage.getItem(DAILY_CHALLENGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.date === today && parsed.challenge) {
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
      localStorage.setItem(
        DAILY_CHALLENGE_KEY,
        JSON.stringify({ date: today, challenge }),
      );
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
    } else {
      // master: ensure exact integer division
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
        A = Math.floor(rand() * 9) + 2; // 2-10
        const multiplier = Math.floor(rand() * 5) + 2; // 2-6
        B = X * multiplier;
        C = (A * B) / X;
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
    try {
      const stored = localStorage.getItem(STREAK_KEY);
      if (!stored) return { count: 0, lastPlayed: null };
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== "object") {
        return { count: 0, lastPlayed: null };
      }
      return {
        count: Math.max(0, Number(parsed.count) || 0),
        lastPlayed: typeof parsed.lastPlayed === "string" ? parsed.lastPlayed : null,
      };
    } catch (e) {
      console.warn("⚠️ Failed to read streak from storage:", e);
      return { count: 0, lastPlayed: null };
    }
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
    try {
      localStorage.setItem(STREAK_KEY, JSON.stringify(newStreak));
    } catch (e) {
      console.warn("⚠️ Failed to write streak to storage:", e);
    }
    return newCount;
  }

  function getStreakCount() {
    return getStreak().count;
  }

  // Check if daily challenge was completed today
  function isDailyCompleted() {
    try {
      const stored = localStorage.getItem(DAILY_CHALLENGE_KEY);
      if (!stored) return false;
      const parsed = JSON.parse(stored);
      return Boolean(parsed && parsed.completed === true && parsed.date === todayStr());
    } catch (e) {
      console.warn("⚠️ Failed to check daily challenge status:", e);
      return false;
    }
  }

  function markDailyCompleted(score) {
    try {
      const today = todayStr();
      const stored = localStorage.getItem(DAILY_CHALLENGE_KEY);
      const parsed = stored ? JSON.parse(stored) : { date: today, challenge: getTodaysChallenge() };
      if (parsed && typeof parsed === "object") {
        parsed.date = parsed.date || today;
        parsed.completed = true;
        parsed.completedScore = Math.max(0, Number(score) || 0);
        parsed.completedAt = Date.now();
        localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(parsed));
      }
      window.PlayerStorage?.setDailyChallengeCompleted?.(score);
    } catch (e) {
      console.warn("⚠️ Failed to mark daily challenge completed:", e);
    }
  }

  // Export
  window.DailyChallenge = {
    getTodaysChallenge,
    generateChallenge,
    getStreak,
    getStreakCount,
    recordPlay,
    isDailyCompleted,
    markDailyCompleted,
    todayStr,
    isYesterday,
    dateSeed,
  };

  console.log("✅ DailyChallenge loaded");
})();
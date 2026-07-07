"use client";

import { useEffect, useRef } from "react";
import { usePrefs } from "@/lib/prefs-store";
import {
  useQuests,
  registerQuestRewardCallback,
} from "@/lib/quests-store";
import { useLeague } from "@/lib/league-system";
import { useSeasons } from "@/lib/seasons";

/**
 * GamificationBridge — invisible component mounted once at the app root.
 *
 * Responsibilities:
 *   1. Register a quest-reward callback that wires claimed-quest rewards
 *      (XP + QuizCoins) into the prefs store.
 *   2. Refresh the quests store on mount (so day/week rollovers are detected
 *      immediately when the user opens the app).
 *   3. Sync special-quest progress with the prefs state (distinct banks,
 *      total sessions completed).
 *   4. Refresh the league store on mount + whenever the user's weekly
 *      activity changes (so promotion/relegation is evaluated at week
 *      rollover).
 *   5. Refresh the seasons store on mount + whenever total XP changes (so
 *      monthly trophies are awarded at month rollover).
 *   6. Keep the quests weekly-streak counter in sync with the prefs streak.
 *
 * Renders nothing — purely a side-effect hub.
 */
export function GamificationBridge() {
  const addXp = usePrefs((s) => s.addXp);
  const addCoins = usePrefs((s) => s.addCoins);
  const addNotification = usePrefs((s) => s.addNotification);
  const streak = usePrefs((s) => s.streak);
  const totalXp = usePrefs((s) => s.xp);
  const distinctBanks = usePrefs((s) => s.distinctBanks);
  const sessionsCompleted = usePrefs((s) => s.sessionsCompleted);
  const weekActivity = usePrefs((s) => s.weekActivity);

  const questsRefresh = useQuests((s) => s.refresh);
  const questsSyncSpecial = useQuests((s) => s.syncSpecialQuests);
  const questsSetWeeklyStreak = useQuests((s) => s.setWeeklyStreak);
  const leagueRefresh = useLeague((s) => s.refresh);
  const seasonsRefresh = useSeasons((s) => s.refresh);

  // Register the quest-reward callback once on mount. The callback closes
  // over the latest addXp/addCoins via refs so we don't re-register on every
  // state change.
  const addXpRef = useRef(addXp);
  const addCoinsRef = useRef(addCoins);
  const addNotifRef = useRef(addNotification);
  useEffect(() => {
    addXpRef.current = addXp;
    addCoinsRef.current = addCoins;
    addNotifRef.current = addNotification;
  }, [addXp, addCoins, addNotification]);

  useEffect(() => {
    const unsub = registerQuestRewardCallback((xp, coins, title) => {
      addXpRef.current(xp);
      addCoinsRef.current(coins);
      addNotifRef.current({
        type: "badge",
        title: "Quête complétée !",
        message: `« ${title} » — +${xp} XP, +${coins} QuizCoins`,
      });
    });
    return unsub;
  }, []);

  // Refresh quests on mount + every 5 minutes (covers long-running sessions
  // that span midnight).
  useEffect(() => {
    questsRefresh();
    const t = window.setInterval(() => questsRefresh(), 5 * 60 * 1000);
    return () => window.clearInterval(t);
  }, [questsRefresh]);

  // Keep special-quest progress in sync with prefs.
  useEffect(() => {
    questsSyncSpecial({
      distinctBanksCount: distinctBanks.length,
      sessionsCompleted,
    });
  }, [questsSyncSpecial, distinctBanks, sessionsCompleted]);

  // Keep the weekly streak counter in sync.
  useEffect(() => {
    questsSetWeeklyStreak(streak);
  }, [questsSetWeeklyStreak, streak]);

  // Refresh the league store whenever the user's weekly activity changes.
  // The league store evaluates promotion/relegation at week rollover.
  useEffect(() => {
    // Approximate weekly XP from the weekActivity log: each answered
    // question is worth ~10 XP + a 25-XP bonus per session.
    const q = weekActivity.reduce((sum, e) => sum + e.count, 0);
    const weeklyXp = q * 10 + sessionsCompleted * 25;
    leagueRefresh(weeklyXp);
  }, [weekActivity, sessionsCompleted, leagueRefresh]);

  // Refresh the seasons store whenever total XP changes.
  useEffect(() => {
    seasonsRefresh(totalXp);
  }, [totalXp, seasonsRefresh]);

  return null;
}

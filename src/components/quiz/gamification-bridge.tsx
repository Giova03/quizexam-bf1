"use client";

import { useEffect, useRef } from "react";
import { usePrefs } from "@/lib/prefs-store";
import {
  useQuests,
  registerQuestRewardCallback,
} from "@/lib/quests-store";
import { useLeague } from "@/lib/league-system";
import { useSeasons } from "@/lib/seasons";

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

  useEffect(() => {
    questsRefresh();
    const t = window.setInterval(() => questsRefresh(), 5 * 60 * 1000);
    return () => window.clearInterval(t);
  }, [questsRefresh]);

  useEffect(() => {
    const sync = () => {
      try {
        questsSyncSpecial({
          distinctBanksCount: distinctBanks?.length ?? 0,
          sessionsCompleted: sessionsCompleted ?? 0,
        });
        questsSetWeeklyStreak(streak ?? 0);
        const q = (weekActivity ?? []).reduce((sum: number, e: any) => sum + (e?.count ?? 0), 0);
        const weeklyXp = q * 10 + (sessionsCompleted ?? 0) * 25;
        leagueRefresh(weeklyXp);
        seasonsRefresh(totalXp ?? 0);
      } catch (e) {
        // Silent fail
      }
    };
    sync();
    const t = window.setInterval(sync, 60 * 1000);
    return () => window.clearInterval(t);
  }, [questsSyncSpecial, questsSetWeeklyStreak, leagueRefresh, seasonsRefresh, distinctBanks, sessionsCompleted, weekActivity, totalXp, streak]);

  return null;
}

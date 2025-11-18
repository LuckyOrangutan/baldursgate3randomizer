"use client";

import { useEffect, useMemo, useState } from "react";
import { acts, gearItems } from "@/data/gear";
import { tasksByAct } from "@/data/tasks";
import {
  CharacterOptionCard,
  GearBoard,
  LootOverlay,
  SectionLabel,
  SelectedBuildPanel,
  TaskBoard,
} from "@/app/home/components";
import {
  getAvailableSlotsForAct,
  getDefaultSlotId,
  maxPlayerCount,
  minPlayerCount,
  slotCardGroups,
  slotNameIndex,
  storageKey,
} from "@/app/home/constants";
import {
  generateRun,
  indexGearItems,
  normalizeGearStates,
  buildArchetypeName,
} from "@/app/home/logic";
import type {
  LootOverlayCard,
  LootOverlayData,
  PersistedState,
  PlayerActiveSlots,
  PlayerGearStates,
  PlayerNames,
  PlayerSelections,
} from "@/app/home/types";
import type { ActId } from "@/types/gear";
import type { RunResult } from "@/types/run";
import type { Task } from "@/types/tasks";
import { pickOne, randomInt } from "@/lib/random";

/**
 * Honor Run Forge page: orchestrates state, persistence, and renders the feature modules.
 */
export default function Home() {
  const [playerCount, setPlayerCount] = useState(2);
  const [currentRun, setCurrentRun] = useState<RunResult>(() => generateRun(2));
  const [activePlayerNumber, setActivePlayerNumber] = useState<number>(
    () => currentRun.players[0]?.playerNumber ?? 1,
  );
  const [playerSelections, setPlayerSelections] = useState<PlayerSelections>({});
  const [playerGearStates, setPlayerGearStates] = useState<PlayerGearStates>({});
  const [playerActiveSlots, setPlayerActiveSlots] = useState<PlayerActiveSlots>({});
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [activeActId, setActiveActId] = useState<ActId>(acts[0]?.id ?? "act1");
  const [lootOverlay, setLootOverlay] = useState<LootOverlayData | null>(null);
  const [playerNames, setPlayerNames] = useState<PlayerNames>({});
  const [hydrated, setHydrated] = useState(false);
  const playersDimmed = Boolean(lootOverlay);

  const gearIndex = useMemo(() => indexGearItems(gearItems), []);
  const activeAct = acts.find((act) => act.id === activeActId) ?? acts[0];
  const currentTasks = tasksByAct[activeActId] ?? [];

  const playerCountLabel = useMemo(
    () => `${playerCount} player${playerCount > 1 ? "s" : ""}`,
    [playerCount],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PersistedState>;
        if (
          typeof parsed.playerCount === "number" &&
          parsed.playerCount >= minPlayerCount &&
          parsed.playerCount <= maxPlayerCount
        ) {
          setPlayerCount(parsed.playerCount);
        }
        if (parsed.currentRun) {
          setCurrentRun(parsed.currentRun);
        }
        if (parsed.playerSelections) {
          setPlayerSelections(parsed.playerSelections);
        }
        if (parsed.playerGearStates) {
          setPlayerGearStates(normalizeGearStates(parsed.playerGearStates));
        }
        if (parsed.playerActiveSlots) {
          setPlayerActiveSlots(parsed.playerActiveSlots);
        }
        if (parsed.completedTasks) {
          setCompletedTasks(parsed.completedTasks);
        }
        if (parsed.playerNames) {
          setPlayerNames(parsed.playerNames);
        }
        if (parsed.activeActId && acts.some((act) => act.id === parsed.activeActId)) {
          setActiveActId(parsed.activeActId);
        }
      }
    } catch (error) {
      console.warn("Failed to hydrate saved run", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const payload: PersistedState = {
      playerCount,
      currentRun,
      playerSelections,
      playerGearStates,
      playerActiveSlots,
      completedTasks,
      activeActId,
      playerNames,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [
    hydrated,
    playerCount,
    currentRun,
    playerSelections,
    playerGearStates,
    playerActiveSlots,
    completedTasks,
    activeActId,
    playerNames,
  ]);

  const handleGenerateRun = () => {
    const nextRun = generateRun(playerCount);
    setCurrentRun(nextRun);
    setActivePlayerNumber(nextRun.players[0]?.playerNumber ?? 1);
    setPlayerSelections({});
    setPlayerGearStates({});
    setPlayerActiveSlots({});
    setCompletedTasks({});
  };

  const handlePlayerNameChange = (playerNumber: number, name: string) => {
    const safeValue = name.slice(0, 40);
    setPlayerNames((prev) => ({ ...prev, [playerNumber]: safeValue }));
  };

  const getPlayerDisplayName = (playerNumber: number) => {
    const stored = playerNames[playerNumber];
    return stored && stored.trim().length ? stored.trim() : `Player ${playerNumber}`;
  };

  const handleSelectOption = (playerNumber: number, optionId: string) => {
    setPlayerSelections((prev) => ({ ...prev, [playerNumber]: optionId }));
    setPlayerActiveSlots((prev) => ({
      ...prev,
      [playerNumber]: getDefaultSlotId(activeActId),
    }));
  };

  const handleResetSelection = (playerNumber: number) => {
    setPlayerSelections((prev) => {
      const next = { ...prev };
      delete next[playerNumber];
      return next;
    });
    setPlayerActiveSlots((prev) => {
      const next = { ...prev };
      delete next[playerNumber];
      return next;
    });
  };

  const handleSelectSlot = (playerNumber: number, slotId: string) => {
    setPlayerActiveSlots((prev) => ({
      ...prev,
      [playerNumber]: slotId,
    }));
  };

  const handleTaskToggle = (task: Task, completed: boolean) => {
    setCompletedTasks((prev) => {
      if (completed) {
        if (prev[task.id]) return prev;
        return { ...prev, [task.id]: true };
      }
      if (!prev[task.id]) return prev;
      const next = { ...prev };
      delete next[task.id];
      return next;
    });
    if (completed && !completedTasks[task.id]) {
      openLootChest(task);
    }
  };

  const handleRemoveUnlockedItem = (
    playerNumber: number,
    slotId: string,
    actId: ActId,
    itemId: string,
  ) => {
    setPlayerGearStates((prev) => {
      const playerState = prev[playerNumber];
      if (!playerState) return prev;
      const actState = playerState[actId];
      if (!actState) return prev;
      const slotState = actState[slotId];
      if (!slotState) return prev;
      const unlockedItemIds = slotState.unlockedItemIds?.filter(
        (entry) => entry !== itemId,
      );
      if (!unlockedItemIds || unlockedItemIds.length === slotState.unlockedItemIds.length) {
        return prev;
      }
      return {
        ...prev,
        [playerNumber]: {
          ...playerState,
          [actId]: {
            ...actState,
            [slotId]: {
              currentItemId: slotState.currentItemId,
              unlockedItemIds,
            },
          },
        },
      };
    });
  };

  const handleSelectLootCard = (
    playerNumber: number,
    card: LootOverlayCard,
    actId: ActId,
  ) => {
    if (!card.item || !card.slotId) return;
    const item = card.item;
    const slotId = card.slotId;
    setPlayerGearStates((prev) => {
      const playerState = prev[playerNumber] ?? {};
      const actState = playerState[actId] ?? {};
      const existingUnlocked = actState[slotId]?.unlockedItemIds ?? [];
      const unlockedItemIds = existingUnlocked.includes(item.id)
        ? existingUnlocked
        : [...existingUnlocked, item.id];
      return {
        ...prev,
        [playerNumber]: {
          ...playerState,
          [actId]: {
            ...actState,
            [slotId]: {
              currentItemId: item.id,
              unlockedItemIds,
            },
          },
        },
      };
    });
  };

  const openLootChest = (task: Task) => {
    const overlayCards: LootOverlayCard[] = [];
    const availableSlots = getAvailableSlotsForAct(task.actId);
    const availableSlotIds = new Set(availableSlots.map((slot) => slot.id));
    const poolByAct = gearIndex.byAct[task.actId] ?? {};
    currentRun.players.forEach((player) => {
      if (!playerSelections[player.playerNumber]) return;
      const playerState = playerGearStates[player.playerNumber] ?? {};
      const actState = playerState[task.actId] ?? {};
      slotCardGroups.forEach((group) => {
        const availableItems = group.slotIds.flatMap((slotId) => {
          if (!availableSlotIds.has(slotId)) return [];
          const unlocked = actState[slotId]?.unlockedItemIds ?? [];
          return (poolByAct[slotId] ?? []).filter((item) => !unlocked.includes(item.id));
        });
        if (!availableItems.length) {
          overlayCards.push({
            id: `${player.playerNumber}-${group.id}-${randomInt(0, 100000)}`,
            playerNumber: player.playerNumber,
            groupId: group.id,
            groupName: group.name,
            slotId: null,
            slotName: "No eligible slot",
            item: null,
          });
          return;
        }
        const rolled = pickOne(availableItems);
        overlayCards.push({
          id: `${player.playerNumber}-${group.id}-${rolled.id}-${randomInt(0, 100000)}`,
          playerNumber: player.playerNumber,
          groupId: group.id,
          groupName: group.name,
          slotId: rolled.slotId,
          slotName: slotNameIndex[rolled.slotId]?.name ?? rolled.slotId,
          item: rolled,
        });
      });
    });
    if (overlayCards.length) {
      const playerLabels: Record<number, string> = {};
      overlayCards.forEach((card) => {
        if (!playerLabels[card.playerNumber]) {
          playerLabels[card.playerNumber] = getPlayerDisplayName(card.playerNumber);
        }
      });
      setLootOverlay({
        taskName: task.name,
        actId: task.actId,
        cards: overlayCards,
        playerLabels,
      });
    }
  };

  useEffect(() => {
    const availablePlayerNumbers = currentRun.players.map((player) => player.playerNumber);
    if (!availablePlayerNumbers.length) return;
    if (!availablePlayerNumbers.includes(activePlayerNumber)) {
      setActivePlayerNumber(availablePlayerNumbers[0] ?? 1);
    }
  }, [currentRun, activePlayerNumber]);

  const activePlayer =
    currentRun.players.find((player) => player.playerNumber === activePlayerNumber) ??
    currentRun.players[0];
  const activeSelectedId =
    activePlayer && playerSelections ? playerSelections[activePlayer.playerNumber] : null;
  const activeSelectedOption = activePlayer
    ? activePlayer.options.find((option) => option.id === activeSelectedId)
    : undefined;
  const activePlayerNameInput =
    (activePlayer && playerNames[activePlayer.playerNumber]) ?? "";
  const activePlayerDisplayName = activePlayer
    ? getPlayerDisplayName(activePlayer.playerNumber)
    : "";
  const activePlayerGearState =
    (activePlayer && playerGearStates[activePlayer.playerNumber]) ?? {};
  const activeSelectedSlotId =
    activePlayer !== undefined
      ? playerActiveSlots[activePlayer.playerNumber] ?? getDefaultSlotId(activeActId)
      : getDefaultSlotId(activeActId);

  return (
    <div className="relative min-h-screen bg-[#080406] text-amber-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,141,0.18),_transparent_55%)]" />
      <main className="relative mx-auto w-full px-4 py-12 sm:px-8 lg:px-12 xl:px-16 2xl:px-24">
        <div className="grid items-start gap-10 2xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
          <div className="flex flex-col gap-8">
            <header className="space-y-6 rounded-3xl border border-amber-200/20 bg-gradient-to-br from-[#1d1012]/90 via-[#261b20]/95 to-[#0c0608]/90 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.55)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.6em] text-amber-200/70">
                    Baldur&apos;s Gate 3
                  </p>
                  <h1 className="font-display text-4xl text-amber-50 sm:text-5xl">
                    Honor Run Forge
                  </h1>
                  <p className="max-w-2xl text-base text-amber-50/80">
                    Draft three wildly different multiclass spreads per player, lock in a
                    build, and let the loot board dictate what you&apos;re allowed to wield in
                    each act. Level-ups or completed tasks trigger fresh rerolls for every
                    slot.
                  </p>
                </div>
                <div className="flex flex-col gap-4 rounded-2xl border border-amber-200/30 bg-black/30 p-4">
                  <label htmlFor="player-count" className="text-sm font-semibold">
                    Player Seats: {playerCountLabel}
                  </label>
                  <input
                    id="player-count"
                    type="range"
                    min={minPlayerCount}
                    max={maxPlayerCount}
                    step={1}
                    value={playerCount}
                    onChange={(event) =>
                      setPlayerCount(Number(event.target.value))
                    }
                    className="accent-amber-300"
                  />
                  <button
                    type="button"
                    className="relative overflow-hidden rounded-full border border-amber-200/40 bg-black/40 px-6 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-amber-50 shadow-[0_14px_30px_rgba(0,0,0,0.5)] transition hover:border-amber-200/70 hover:bg-amber-200/10 hover:shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
                    onClick={handleGenerateRun}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-amber-400/15 via-rose-400/10 to-amber-300/15 blur-3xl" aria-hidden />
                    <span className="relative">Cast New Fate</span>
                  </button>
                </div>
              </div>
            </header>

            <section
              className={`space-y-8 transition duration-300 ${
                playersDimmed ? "opacity-25 pointer-events-none" : ""
              }`}
            >
              <div className="space-y-3">
                <SectionLabel>Players</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {currentRun.players.map((player) => {
                    const selectedId = playerSelections[player.playerNumber];
                    const selectedOption = player.options.find(
                      (option) => option.id === selectedId,
                    );
                    const isActive = player.playerNumber === activePlayerNumber;
                    const playerDisplayName = getPlayerDisplayName(player.playerNumber);
                    const buildLabel = selectedOption
                      ? buildArchetypeName(selectedOption.classSpread)
                      : "Choose a build to start unlocking loot";
                    return (
                      <button
                        key={player.playerNumber}
                        type="button"
                        onClick={() => setActivePlayerNumber(player.playerNumber)}
                        className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none ${
                          isActive
                            ? "border-amber-200/80 bg-amber-100/5 shadow-[0_12px_30px_rgba(0,0,0,0.4)]"
                            : "border-amber-100/15 bg-black/30 hover:border-amber-200/50 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] uppercase tracking-[0.4em] text-amber-200/70">
                            Seat {player.playerNumber}
                          </p>
                        </div>
                        <p className="font-display text-lg text-amber-50">
                          {playerDisplayName}
                        </p>
                        <p className="text-xs text-amber-100/70">{buildLabel}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activePlayer ? (
                <div className="space-y-5 rounded-3xl bg-black/20 p-6 shadow-[inset_0_0_20px_rgba(0,0,0,0.25)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs uppercase tracking-[0.6em] text-amber-200/70">
                        Seat {activePlayer.playerNumber}
                      </p>
                      <h2 className="font-display text-3xl text-amber-50">
                        {activePlayerDisplayName}
                      </h2>
                      <p className="text-sm text-amber-50/70">
                        {activeSelectedOption
                          ? ""
                          : "Name your hero and lock one of the three multiclass spreads to start rolling loot."}
                      </p>
                      <span className="text-[11px] uppercase tracking-[0.35em] text-amber-200/70">
                        {activeSelectedOption ? "Slot progression" : "Choose your build"}
                      </span>
                    </div>
                    <label className="flex w-full flex-col gap-2 text-sm text-amber-50/80 sm:max-w-xs">
                      <span className="text-[11px] uppercase tracking-[0.35em] text-amber-200/70">
                        Player name
                      </span>
                      <input
                        type="text"
                        maxLength={40}
                        value={activePlayerNameInput}
                        placeholder={`Player ${activePlayer.playerNumber}`}
                        onChange={(event) =>
                          handlePlayerNameChange(activePlayer.playerNumber, event.target.value)
                        }
                        className="rounded-full border border-amber-100/20 bg-black/50 px-4 py-2 text-base text-amber-50 placeholder:text-amber-100/50 shadow-inner outline-none ring-0 transition focus:border-amber-200 focus:bg-black/70"
                      />
                    </label>
                  </div>
                  {!activeSelectedOption ? (
                    <div className="grid gap-6 md:grid-cols-3">
                      {activePlayer.options.map((option, index) => (
                        <CharacterOptionCard
                          key={option.id}
                          option={option}
                          optionIndex={index}
                          onSelect={() =>
                            handleSelectOption(activePlayer.playerNumber, option.id)
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <SelectedBuildPanel
                      option={activeSelectedOption}
                      onReset={() => handleResetSelection(activePlayer.playerNumber)}
                    >
                      <GearBoard
                        selectedSlotId={activeSelectedSlotId}
                        onSelectSlot={(slotId) =>
                          handleSelectSlot(activePlayer.playerNumber, slotId)
                        }
                        playerGearState={activePlayerGearState}
                        activeActId={activeActId}
                        onRemoveUnlocked={(slotId, actId, itemId) =>
                          handleRemoveUnlockedItem(
                            activePlayer.playerNumber,
                            slotId,
                            actId,
                            itemId,
                          )
                        }
                        gearIndex={gearIndex}
                        activeAct={activeAct}
                      />
                    </SelectedBuildPanel>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-100/20 bg-black/30 p-6 text-sm text-amber-100/70">
                  No players available. Generate a run to begin.
                </div>
              )}
            </section>

          </div>

          <TaskBoard
            className="order-first w-full xl:order-none"
            tasks={currentTasks}
            completed={completedTasks}
            onToggle={handleTaskToggle}
            activeAct={activeAct}
            activeActId={activeActId}
            onChangeAct={setActiveActId}
          />
        </div>
      </main>
      {lootOverlay ? (
        <LootOverlay
          data={lootOverlay}
          onClose={() => setLootOverlay(null)}
          onSelectCard={handleSelectLootCard}
        />
      ) : null}
    </div>
  );
}

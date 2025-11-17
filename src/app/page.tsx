"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { acts, gearItems, gearSlots } from "@/data/gear";
import { tasksByAct } from "@/data/tasks";
import { runOptions } from "@/data/runOptions";
import type {
  CharacterOption,
  ClassOption,
  ClassSpread,
  NamedOption,
  RunResult,
} from "@/types/run";
import type { ActId, GearItem, GearSlot } from "@/types/gear";
import type { Task } from "@/types/tasks";
import {
  pickMany,
  pickOne,
  randomComposition,
  randomInt,
} from "@/lib/random";

const minPlayerCount = 1;
const maxPlayerCount = 4;
const optionsPerPlayer = 3;
const totalLevels = 12;
const storageKey = "bg3-honor-run-v3";
const getAvailableSlotsForAct = (actId: ActId) => {
  void actId; // act-aware slot filtering can return later; keep signature for callers
  return gearSlots;
};
const getDefaultSlotId = (actId?: ActId) => {
  const targetAct = actId ?? acts[0]?.id;
  if (targetAct) {
    const slots = getAvailableSlotsForAct(targetAct);
    if (slots.length) {
      return slots[0]?.id ?? null;
    }
  }
  return gearSlots[0]?.id ?? null;
};

const slotCardGroups = [
  {
    id: "wardrobe",
    name: "Wardrobe Card",
    slotIds: ["head", "armor", "gloves", "boots"],
    icon: "🛡️",
    description: "Head, armor, glove, and boot slots—defensive wardrobe.",
  },
  {
    id: "adornments",
    name: "Adornment Card",
    slotIds: ["amulet", "ring", "cloak"],
    icon: "💍",
    description: "Jewelry and capes for accessory power spikes.",
  },
  {
    id: "arsenal",
    name: "Arsenal Card",
    slotIds: ["main-hand", "off-hand", "ranged"],
    icon: "⚔️",
    description: "Weapon-focused picks covering main, off, and ranged hands.",
  },
] as const;

const slotNameIndex = gearSlots.reduce<Record<string, GearSlot>>((acc, slot) => {
  acc[slot.id] = slot;
  return acc;
}, {});

const slotGroupIndex = slotCardGroups.reduce<Record<string, SlotCardGroup>>((acc, group) => {
  acc[group.id] = group;
  return acc;
}, {});

const fallbackGender: NamedOption = { name: "Undefined Presence" };
const fallbackClass: ClassOption = {
  name: "Adventurer",
  description: "Improvises techniques from every discipline.",
  subclasses: [{ name: "Generalist" }],
};
const fallbackSubclass = fallbackClass.subclasses[0];

type PlayerSelections = Record<number, string | null>;
type PlayerNames = Record<number, string>;

type SlotRollState = {
  currentItemId: string | null;
  unlockedItemIds: string[];
};

type PlayerGearState = Partial<Record<ActId, Record<string, SlotRollState>>>;

type PlayerGearStates = Record<number, PlayerGearState>;

type PlayerActiveSlots = Record<number, string | null>;

type PersistedState = {
  playerCount: number;
  currentRun: RunResult;
  playerSelections: PlayerSelections;
  playerGearStates: PlayerGearStates;
  playerActiveSlots: PlayerActiveSlots;
  completedTasks: Record<string, boolean>;
  activeActId: ActId;
  playerNames: PlayerNames;
};

type GearIndex = {
  byAct: Partial<Record<ActId, Record<string, GearItem[]>>>;
  byId: Record<string, GearItem>;
};

type SlotCardGroup = (typeof slotCardGroups)[number];

type LootOverlayCard = {
  id: string;
  playerNumber: number;
  groupId: SlotCardGroup["id"];
  groupName: string;
  slotId: GearSlot["id"] | null;
  slotName: string;
  item: GearItem | null;
};

type LootOverlayData = {
  taskName: string;
  actId: ActId;
  cards: LootOverlayCard[];
};

type RarityTheme = {
  border: string;
  glow: string;
  tileBg: string;
  accentText: string;
  mutedText: string;
};

const rarityThemes: Record<string, RarityTheme> = {
  common: {
    border: "#7a7166",
    glow: "rgba(122,113,102,0.35)",
    tileBg: "linear-gradient(145deg, rgba(42,38,34,0.95), rgba(20,18,16,0.9))",
    accentText: "#f4e3c1",
    mutedText: "#c6b6a3",
  },
  uncommon: {
    border: "#5bc38d",
    glow: "rgba(91,195,141,0.35)",
    tileBg: "linear-gradient(145deg, rgba(23,38,32,0.95), rgba(11,23,18,0.92))",
    accentText: "#b5ffd6",
    mutedText: "#7dddb1",
  },
  rare: {
    border: "#5aa0ff",
    glow: "rgba(90,160,255,0.45)",
    tileBg: "linear-gradient(145deg, rgba(18,28,45,0.95), rgba(12,16,26,0.92))",
    accentText: "#d1e5ff",
    mutedText: "#93baff",
  },
  "very rare": {
    border: "#c877ff",
    glow: "rgba(200,119,255,0.5)",
    tileBg: "linear-gradient(145deg, rgba(30,14,38,0.95), rgba(13,5,19,0.92))",
    accentText: "#f5d9ff",
    mutedText: "#d7a5ff",
  },
  legendary: {
    border: "#f5a623",
    glow: "rgba(245,166,35,0.5)",
    tileBg: "linear-gradient(145deg, rgba(48,24,7,0.96), rgba(22,11,3,0.92))",
    accentText: "#ffe8c0",
    mutedText: "#f1b676",
  },
  default: {
    border: "#9e8a78",
    glow: "rgba(158,138,120,0.3)",
    tileBg: "linear-gradient(145deg, rgba(35,25,24,0.95), rgba(13,9,9,0.9))",
    accentText: "#f5e6c8",
    mutedText: "#cbbcab",
  },
};

const getRarityTheme = (rarity?: string): RarityTheme => {
  const key = rarity?.toLowerCase() ?? "default";
  return rarityThemes[key] ?? rarityThemes.default;
};

const normalizeSlotState = (state: unknown): SlotRollState | undefined => {
  if (!state || typeof state !== "object") return undefined;
  const slot = state as {
    currentItemId?: unknown;
    unlockedItemIds?: unknown;
    itemId?: unknown;
    status?: unknown;
  };
  if ("currentItemId" in slot || "unlockedItemIds" in slot) {
    return {
      currentItemId:
        typeof slot.currentItemId === "string" ? slot.currentItemId : null,
      unlockedItemIds: Array.isArray(slot.unlockedItemIds)
        ? slot.unlockedItemIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  }
  if ("itemId" in slot) {
    return {
      currentItemId: typeof slot.itemId === "string" ? slot.itemId : null,
      unlockedItemIds:
        slot.status === "unlocked" && typeof slot.itemId === "string"
          ? [slot.itemId]
          : [],
    };
  }
  return undefined;
};

const normalizeGearStates = (input: unknown): PlayerGearStates => {
  if (!input || typeof input !== "object") {
    return {};
  }
  const result: PlayerGearStates = {};
  Object.entries(input as Record<string, unknown>).forEach(([playerKey, playerState]) => {
    if (!playerState || typeof playerState !== "object") {
      return;
    }
    const normalizedActs: PlayerGearState = {};
    Object.entries(playerState as Record<string, unknown>).forEach(([actId, actState]) => {
      if (!actState || typeof actState !== "object") {
        return;
      }
      const normalizedSlots: Record<string, SlotRollState> = {};
      Object.entries(actState as Record<string, unknown>).forEach(([slotId, slotState]) => {
        const normalized = normalizeSlotState(slotState);
        if (normalized) {
          normalizedSlots[slotId] = normalized;
        }
      });
      if (Object.keys(normalizedSlots).length) {
        normalizedActs[actId as ActId] = normalizedSlots;
      }
    });
    if (Object.keys(normalizedActs).length) {
      result[Number(playerKey)] = normalizedActs;
    }
  });
  return result;
};

const rollClassCount = () => {
  const roll = Math.random();
  if (roll < 0.2) return 1;
  if (roll < 0.55) return 2;
  return 3;
};

const buildClassSpread = (): ClassSpread[] => {
  const classPool = runOptions.classes.length
    ? runOptions.classes
    : [fallbackClass];
  const desiredCount = rollClassCount();
  const classCount = Math.min(
    Math.max(desiredCount, 1),
    Math.max(classPool.length, 1),
  );
  const selectedClasses = pickMany(classPool, classCount);
  const levelSplit = randomComposition(totalLevels, classCount);

  return selectedClasses.map((klass, index) => ({
    klass,
    subclass: klass.subclasses.length ? pickOne(klass.subclasses) : fallbackSubclass,
    levels: levelSplit[index],
  }));
};

const normalizeArchetypePart = (name: string) => {
  const trimmed = name.trim();
  const stripped = trimmed.replace(/^(Circle|College|School) of\s+/i, "");
  return stripped || trimmed || "Adventurer";
};

const buildArchetypeName = (classSpread: ClassSpread[]): string => {
  if (!classSpread.length) return "Adventurer";
  const sorted = [...classSpread].sort((a, b) => {
    if (b.levels !== a.levels) return b.levels - a.levels;
    return a.klass.name.localeCompare(b.klass.name);
  });
  const parts = sorted.map((entry) => normalizeArchetypePart(entry.subclass.name || entry.klass.name));
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return `${parts[0]} ${parts[1]}`;
  const [first, second, ...rest] = parts;
  const tail = rest.join(" & ");
  return `${first} ${second} of ${tail}`;
};

const buildOption = (
  playerIndex: number,
  optionIndex: number,
): CharacterOption => ({
  id: `P${playerIndex + 1}-O${optionIndex + 1}-${randomInt(0, 100000)}`,
  gender: fallbackGender,
  classSpread: buildClassSpread(),
});

const generateRun = (playerCount: number): RunResult => ({
  players: Array.from({ length: playerCount }, (_, playerIndex) => ({
    playerNumber: playerIndex + 1,
    options: Array.from({ length: optionsPerPlayer }, (_, optionIndex) =>
      buildOption(playerIndex, optionIndex),
    ),
  })),
});

const indexGearItems = (items: GearItem[]): GearIndex => {
  const byAct: GearIndex["byAct"] = {};
  const byId: GearIndex["byId"] = {};

  items.forEach((item) => {
    byId[item.id] = item;
    item.acts.forEach((actId) => {
      if (!byAct[actId]) {
        byAct[actId] = {};
      }
      const actEntry = byAct[actId]!;
      if (!actEntry[item.slotId]) {
        actEntry[item.slotId] = [];
      }
      actEntry[item.slotId].push(item);
    });
  });

  return { byAct, byId };
};

export default function Home() {
  const [playerCount, setPlayerCount] = useState(2);
  const [currentRun, setCurrentRun] = useState<RunResult>(() => generateRun(2));
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
        const eligibleSlots = group.slotIds.filter((slotId) => {
          if (!availableSlotIds.has(slotId)) return false;
          const unlocked = actState[slotId]?.unlockedItemIds ?? [];
          const pool = (poolByAct[slotId] ?? []).filter((item) => !unlocked.includes(item.id));
          return Boolean(pool.length);
        });
        if (!eligibleSlots.length) {
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
        const selectedSlotId = pickOne(eligibleSlots);
        const unlocked = actState[selectedSlotId]?.unlockedItemIds ?? [];
        const filteredPool = (poolByAct[selectedSlotId] ?? []).filter(
          (item) => !unlocked.includes(item.id),
        );
        if (!filteredPool.length) {
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
        const rolled = pickOne(filteredPool);
        overlayCards.push({
          id: `${player.playerNumber}-${group.id}-${rolled.id}-${randomInt(0, 100000)}`,
          playerNumber: player.playerNumber,
          groupId: group.id,
          groupName: group.name,
          slotId: selectedSlotId,
          slotName: slotNameIndex[selectedSlotId]?.name ?? selectedSlotId,
          item: rolled,
        });
      });
    });
    if (overlayCards.length) {
      setLootOverlay({
        taskName: task.name,
        actId: task.actId,
        cards: overlayCards,
      });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#080406] text-amber-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,141,0.18),_transparent_55%)]" />
      <main className="relative mx-auto w-full px-4 py-12 sm:px-8 lg:px-12 xl:px-16 2xl:px-24">
        <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)] 2xl:grid-cols-[minmax(0,3.5fr)_minmax(360px,1fr)]">
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
                    className="rounded-full bg-gradient-to-r from-amber-400 to-rose-500 px-6 py-2 text-sm font-semibold uppercase tracking-widest text-black shadow-lg transition hover:scale-105"
                    onClick={handleGenerateRun}
                  >
                    Cast New Fate
                  </button>
                </div>
              </div>
            </header>

            <section className="rounded-3xl border border-amber-200/10 bg-black/40 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <SectionLabel>Current Act</SectionLabel>
                  <h2 className="font-display text-2xl text-amber-50">
                    {activeAct?.name ?? "Unknown Act"}
                  </h2>
                  <p className="text-sm text-amber-50/70">
                    Rerolls pull from loot pools available in this act. Switch tabs when
                    the party progresses or backtracks.
                  </p>
                </div>
                <ActTabs
                  activeActId={activeActId}
                  onChange={(actId) => setActiveActId(actId)}
                />
              </div>
            </section>

            <section
              className={`space-y-12 transition duration-300 ${
                playersDimmed ? "opacity-25 pointer-events-none" : ""
              }`}
            >
              {currentRun.players.map((player) => {
                const selectedId = playerSelections[player.playerNumber];
                const selectedOption = player.options.find(
                  (option) => option.id === selectedId,
                );
                const playerNameInput = playerNames[player.playerNumber] ?? "";
                const playerDisplayName = getPlayerDisplayName(player.playerNumber);
                const playerGearState = playerGearStates[player.playerNumber] ?? {};
                const selectedSlotId =
                  playerActiveSlots[player.playerNumber] ?? getDefaultSlotId(activeActId);
                return (
                  <div key={player.playerNumber} className="space-y-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div className="flex flex-col gap-2">
                        <p className="text-xs uppercase tracking-[0.6em] text-amber-200/70">
                          Seat {player.playerNumber}
                        </p>
                        <h2 className="font-display text-3xl text-amber-50">
                          {playerDisplayName}
                        </h2>
                        <p className="text-sm text-amber-50/70">
                          {selectedOption
                            ? "Click a slot to roll loot whenever you finish a task or level up, then unlock the pick once you claim it in-game."
                            : "Name your hero and lock one of the three multiclass spreads to start rolling loot."}
                        </p>
                        <span className="text-[11px] uppercase tracking-[0.35em] text-amber-200/70">
                          {selectedOption ? "Slot progression" : "Choose your build"}
                        </span>
                      </div>
                      <label className="flex w-full flex-col gap-2 text-sm text-amber-50/80 sm:max-w-xs">
                        <span className="text-[11px] uppercase tracking-[0.35em] text-amber-200/70">
                          Player name
                        </span>
                        <input
                          type="text"
                          maxLength={40}
                          value={playerNameInput}
                          placeholder={`Player ${player.playerNumber}`}
                          onChange={(event) =>
                            handlePlayerNameChange(player.playerNumber, event.target.value)
                          }
                          className="rounded-full border border-amber-100/20 bg-black/50 px-4 py-2 text-base text-amber-50 placeholder:text-amber-100/50 shadow-inner outline-none ring-0 transition focus:border-amber-200 focus:bg-black/70"
                        />
                      </label>
                    </div>
                    {!selectedOption ? (
                      <div className="grid gap-6 md:grid-cols-3">
                        {player.options.map((option, index) => (
                          <CharacterOptionCard
                            key={option.id}
                            option={option}
                            optionIndex={index}
                            onSelect={() =>
                              handleSelectOption(player.playerNumber, option.id)
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <SelectedBuildPanel
                        option={selectedOption}
                        onReset={() => handleResetSelection(player.playerNumber)}
                      >
                        <GearBoard
                          selectedSlotId={selectedSlotId}
                          onSelectSlot={(slotId) =>
                            handleSelectSlot(player.playerNumber, slotId)
                          }
                          playerGearState={playerGearState}
                          activeActId={activeActId}
                          onRemoveUnlocked={(slotId, actId, itemId) =>
                            handleRemoveUnlockedItem(player.playerNumber, slotId, actId, itemId)
                          }
                          gearIndex={gearIndex}
                          activeAct={activeAct}
                        />
                      </SelectedBuildPanel>
                    )}
                  </div>
                );
              })}
            </section>

            <section className="rounded-2xl border border-amber-200/10 bg-black/30 p-5 text-sm text-amber-100/70">
              <p>
                Task decks, loot tables, and slot definitions all live inside
                <code className="mx-1 text-amber-200">src/data</code>. Once you drop in the CSV-driven
                data, reroll logic, per-act pools, and browser persistence are already wired
                up for Vercel.
              </p>
            </section>
          </div>

          <TaskBoard
            className="order-first w-full xl:order-none"
            tasks={currentTasks}
            completed={completedTasks}
            onToggle={handleTaskToggle}
            activeAct={activeAct}
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

type CharacterOptionCardProps = {
  option: CharacterOption;
  optionIndex: number;
  onSelect: () => void;
};

const optionLabels = ["I", "II", "III"];

const CharacterOptionCard = ({ option, optionIndex, onSelect }: CharacterOptionCardProps) => {
  const buildName = buildArchetypeName(option.classSpread);
  return (
    <article
      className={`flex flex-col gap-4 rounded-3xl border bg-gradient-to-br from-[#1d1510]/90 to-[#0c0704]/90 p-5 shadow-[inset_0_0_25px_rgba(0,0,0,0.45)] transition ${
        "border-amber-200/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.4em] text-amber-200/70">
          Option {optionLabels[optionIndex] ?? optionIndex + 1}
        </p>
        <span className="rounded-full border border-amber-100/40 px-3 py-1 text-xs font-semibold text-amber-100">
          {buildName}
        </span>
      </div>
      <div>
        <h3 className="font-display text-2xl text-amber-50">{buildName}</h3>
        <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">
          Class Spread
        </p>
        <ul className="mt-2 space-y-1 text-sm text-amber-50/80">
          {option.classSpread.map((spread) => (
            <li key={`${spread.klass.name}-${spread.subclass.name}-${spread.levels}`}>
              {spread.levels} {spread.levels === 1 ? "level" : "levels"} {spread.klass.name} ({spread.subclass.name})
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        className={`mt-auto rounded-full border px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-amber-50 transition ${
          "border-amber-100/30 hover:border-amber-200 hover:bg-amber-200/10"
        }`}
        onClick={onSelect}
      >
        Lock build
      </button>
    </article>
  );
};

type SelectedBuildPanelProps = {
  option: CharacterOption;
  onReset: () => void;
  children: ReactNode;
};

const SelectedBuildPanel = ({ option, onReset, children }: SelectedBuildPanelProps) => (
  <div className="space-y-5 rounded-3xl border border-amber-100/20 bg-black/40 p-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <SectionLabel>Chosen Build</SectionLabel>
        <h3 className="font-display text-2xl text-amber-50">
          {buildArchetypeName(option.classSpread)}
        </h3>
        <p className="text-sm text-amber-50/80">
          {option.classSpread
            .map(
              (spread) =>
                `${spread.levels} ${spread.levels === 1 ? "level" : "levels"} ${spread.klass.name} (${spread.subclass.name})`,
            )
            .join(" • ")}
        </p>
      </div>
      <button
        type="button"
        className="rounded-full border border-rose-200/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-rose-200 transition hover:border-rose-200"
        onClick={onReset}
      >
        Re-pick build
      </button>
    </div>
    {children}
  </div>
);

type GearBoardProps = {
  playerGearState: PlayerGearState;
  activeActId: ActId;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  onRemoveUnlocked: (slotId: string, actId: ActId, itemId: string) => void;
  gearIndex: GearIndex;
  activeAct?: (typeof acts)[number];
};

type TaskBoardProps = {
  tasks: Task[];
  completed: Record<string, boolean>;
  onToggle: (task: Task, completed: boolean) => void;
  activeAct?: (typeof acts)[number];
  className?: string;
};

type TaskGroupProps = {
  location: string;
  tasks: Task[];
  open: boolean;
  onToggle: () => void;
  completed: Record<string, boolean>;
  onToggleTask: (task: Task, completed: boolean) => void;
};

const TaskGroup = ({
  location,
  tasks,
  open,
  onToggle,
  completed,
  onToggleTask,
}: TaskGroupProps) => {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [maxHeight, setMaxHeight] = useState<number>(0);

  useEffect(() => {
    const measure = () => {
      const height = contentRef.current?.scrollHeight ?? 0;
      setMaxHeight(height);
    };
    measure();
    const resize = () => measure();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [tasks.length]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const height = contentRef.current?.scrollHeight ?? 0;
      setMaxHeight(height);
    }, 20);
    return () => window.clearTimeout(id);
  }, [open, tasks.length]);

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-100/15 bg-[#120a0d]/70">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/5"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{open ? "▼" : "▶"}</span>
          <div>
            <p className="text-sm font-semibold text-amber-50">{location}</p>
            <p className="text-[11px] uppercase tracking-[0.3em] text-amber-100/60">
              {tasks.length} encounter{tasks.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <span className="text-xs uppercase tracking-[0.3em] text-amber-100/60">Location</span>
      </button>
      <div
        ref={contentRef}
        style={{ maxHeight: open ? maxHeight : 0 }}
        className={`border-t border-amber-100/10 bg-[#0d0608]/80 transition-[max-height,opacity] duration-300 ease-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
      >
        <ul className="space-y-3 p-4">
          {tasks.map((task) => {
            const checked = Boolean(completed[task.id]);
            return (
              <li
                key={task.id}
                className="flex items-start gap-3 rounded-2xl border border-amber-100/15 bg-[#120a0d]/80 p-4"
              >
                <label className="flex flex-1 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-amber-300"
                    checked={checked}
                    onChange={(event) => onToggleTask(task, event.target.checked)}
                  />
                  <span>
                    <span className="text-sm font-semibold text-amber-50">
                      {task.name}
                    </span>
                    {task.description && (
                      <p className="text-xs text-amber-100/70">{task.description}</p>
                    )}
                  </span>
                </label>
                <span className="text-[10px] uppercase tracking-[0.3em] text-amber-100/60">
                  Encounter
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

const TaskBoard = ({ tasks, completed, onToggle, activeAct, className = "" }: TaskBoardProps) => {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const [displayTasks, setDisplayTasks] = useState<Task[]>(tasks);
  const [transitionState, setTransitionState] = useState<"idle" | "out" | "in">("idle");

  const deriveLocation = (task: Task) => {
    if (task.description) {
      return task.description.replace(/ encounter$/i, "").trim();
    }
    return "Unsorted encounters";
  };

  const filteredTasks = useMemo(
    () =>
      displayTasks.filter((task) => {
        if (!normalizedQuery) return true;
        const haystack = `${task.name} ${task.description ?? ""}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      }),
    [displayTasks, normalizedQuery],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasks.forEach((task) => {
      const location = deriveLocation(task) || "Unsorted encounters";
      if (!map.has(location)) {
        map.set(location, []);
      }
      map.get(location)!.push(task);
    });
    return map;
  }, [filteredTasks]);

  const initialOpenState = useMemo(() => {
    const result: Record<string, boolean> = {};
    Array.from(grouped.keys()).forEach((key) => {
      result[key] = Boolean(normalizedQuery); // default collapsed, expand if searching
    });
    return result;
  }, [grouped]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpenState);

  useEffect(() => {
    setOpenGroups((prev) => ({ ...initialOpenState, ...prev }));
  }, [initialOpenState]);

  const sortedGroups = useMemo(() => Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0])), [grouped]);

  useEffect(() => {
    // Smoothly fade between act changes
    setTransitionState("out");
    let inTimer: number | undefined;
    const outTimer = window.setTimeout(() => {
      setDisplayTasks(tasks);
      setTransitionState("in");
      inTimer = window.setTimeout(() => setTransitionState("idle"), 220);
    }, 120);
    return () => {
      window.clearTimeout(outTimer);
      if (inTimer) window.clearTimeout(inTimer);
    };
  }, [tasks]);

  const transitionClass =
    transitionState === "out"
      ? "opacity-0"
      : transitionState === "in"
        ? "opacity-100"
        : "opacity-100";

  return (
    <aside
      className={`space-y-4 rounded-3xl border border-amber-200/10 bg-black/40 p-6 xl:sticky xl:top-8 ${className}`}
    >
      <div className="flex flex-col gap-2">
        <SectionLabel>Encounter Log</SectionLabel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-amber-50">
              {activeAct?.name ?? "Current Act"}
            </h2>
            <p className="text-sm text-amber-100/80">
              Resolve encounters to trigger fresh rerolls for every slot. Each checkmark
              represents a full gear draw opportunity.
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-full border border-amber-200/20 bg-black/30 px-3 py-2 text-sm text-amber-50/80">
          <span className="text-amber-200">🔎</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search encounters..."
            className="w-full bg-transparent text-amber-50 placeholder:text-amber-100/60 outline-none"
          />
        </label>
      </div>
      <div className={`transition-opacity duration-300 ease-out ${transitionClass}`}>
        {sortedGroups.length ? (
          <div className="space-y-3">
            {sortedGroups.map(([location, locationTasks]) => {
              const open = openGroups[location] ?? true;
              return (
                <TaskGroup
                  key={location}
                  location={location}
                  tasks={locationTasks}
                  open={open}
                  onToggle={() =>
                    setOpenGroups((prev) => ({
                      ...prev,
                      [location]: !open,
                    }))
                  }
                  completed={completed}
                  onToggleTask={onToggle}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-amber-100/70">
            {tasks.length
              ? "No encounters match your search."
              : "No encounters entered for this act yet. Update src/data/nuzlocke_rules.md and rerun the parser to refresh this list."}
          </p>
        )}
      </div>
    </aside>
  );
};

type LootOverlayProps = {
  data: LootOverlayData;
  onClose: () => void;
  onSelectCard: (playerNumber: number, card: LootOverlayCard, actId: ActId) => void;
};

const LootOverlay = ({ data, onClose, onSelectCard }: LootOverlayProps) => {
  const grouped = data.cards.reduce<Record<number, LootOverlayCard[]>>((acc, card) => {
    if (!acc[card.playerNumber]) acc[card.playerNumber] = [];
    acc[card.playerNumber]?.push(card);
    return acc;
  }, {});

  const [cardLocks, setCardLocks] = useState<Record<number, string | null>>({});
  const [hoveredCard, setHoveredCard] = useState<LootOverlayCard | null>(null);
  const [cardFaces, setCardFaces] = useState<Record<string, GearItem | null>>({});
  const [cardSpinning, setCardSpinning] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timeoutIds: number[] = [];
    const spinTimeoutIds: number[] = [];
    const perPlayerCardIndex: Record<number, number> = {};

    data.cards.forEach((card) => {
      const playerCardIndex = (() => {
        const current = perPlayerCardIndex[card.playerNumber] ?? 0;
        perPlayerCardIndex[card.playerNumber] = current + 1;
        return current;
      })();

      if (!card.item || !card.slotId) {
        setCardFaces((prev) => ({ ...prev, [card.id]: card.item ?? null }));
        setCardSpinning((prev) => ({ ...prev, [card.id]: false }));
        return;
      }
      const pool = gearItems.filter(
        (item) => item.slotId === card.slotId && item.acts.includes(data.actId),
      );
      if (pool.length <= 1) {
        setCardFaces((prev) => ({ ...prev, [card.id]: card.item }));
        setCardSpinning((prev) => ({ ...prev, [card.id]: false }));
        return;
      }
      setCardSpinning((prev) => ({ ...prev, [card.id]: true }));
      let spinActive = true;
      const runSpin = (delay: number) => {
        if (!spinActive) return;
        const candidate = pickOne(pool);
        setCardFaces((prev) => ({ ...prev, [card.id]: candidate }));
        const nextDelay = Math.min(240, delay + 18);
        const spinId = window.setTimeout(() => runSpin(nextDelay), nextDelay);
        spinTimeoutIds.push(spinId);
      };
      // kick off initial spin quickly
      const initialSpinId = window.setTimeout(() => runSpin(70), 60);
      spinTimeoutIds.push(initialSpinId);

      const settleDelay = 950 + playerCardIndex * 450 + Math.random() * 220;
      const settleId = window.setTimeout(() => {
        spinActive = false;
        setCardFaces((prev) => ({ ...prev, [card.id]: card.item }));
        setCardSpinning((prev) => ({ ...prev, [card.id]: false }));
      }, settleDelay);
      timeoutIds.push(settleId);
    });

    return () => {
      timeoutIds.forEach((id) => window.clearTimeout(id));
      spinTimeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, [data]);

  const playerSelectableMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    Object.entries(grouped).forEach(([key, cards]) => {
      const player = Number(key);
      map[player] = cards.some((card) => card.item && card.slotId);
    });
    return map;
  }, [grouped]);

  const allSatisfied = useMemo(() => {
    const players = Object.keys(grouped).map(Number);
    if (!players.length) return true;
    return players.every((player) => {
      if (!playerSelectableMap[player]) return true;
      return Boolean(cardLocks[player]);
    });
  }, [grouped, cardLocks, playerSelectableMap]);

  const handleCardPick = (playerNumber: number, card: LootOverlayCard) => {
    if (!card.item || !card.slotId) return;
    if (cardSpinning[card.id]) return;
    setCardLocks((prev) => ({ ...prev, [playerNumber]: card.id }));
    onSelectCard(playerNumber, card, data.actId);
  };

  const hoverDetails = hoveredCard ? slotGroupIndex[hoveredCard.groupId] : undefined;
  const hoverIcon = hoverDetails?.icon ?? "🎴";
  const hoverCopy = hoverDetails?.description ?? "Hover an augment to preview which slots it can affect.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[32px] border border-amber-200/30 bg-gradient-to-b from-[#1a0d12] via-[#12070b] to-[#080305] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.85)]">
        <div className="flex flex-col gap-4 text-center">
          <div>
            <SectionLabel>Augment Draw</SectionLabel>
            <h2 className="font-display text-3xl text-amber-50">
              {data.taskName}
            </h2>
            <p className="text-sm text-amber-100/70">
              Each player picks one augment card. You can change your mind until everyone locks in.
            </p>
            {!allSatisfied && (
              <p className="text-xs uppercase tracking-[0.35em] text-rose-200/80">
                Awaiting player selections
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-amber-100/20 bg-black/40 px-4 py-3 text-sm text-amber-100/80">
            <span className="mr-2 text-lg">{hoverIcon}</span>
            {hoverCopy}
          </div>
        </div>

        <div className="mt-8 space-y-8">
          {Object.entries(grouped).map(([playerNumber, cards]) => {
            const numericPlayer = Number(playerNumber);
            const lockedCardId = cardLocks[numericPlayer];
            const selectableCards = cards.filter((card) => card.item && card.slotId);
            return (
              <div key={playerNumber} className="space-y-4 rounded-3xl border border-amber-200/10 bg-[#0b050f]/70 p-5">
                <p className="text-xs uppercase tracking-[0.5em] text-amber-200/70">
                  Player {playerNumber}
                </p>
                <div className="flex flex-col gap-4 lg:flex-row">
                  {cards.map((card) => {
                    const isSelectable = Boolean(card.item && card.slotId);
                    const isChosen = lockedCardId === card.id;
                    const isRolling = cardSpinning[card.id];
                    const faceItem = cardFaces[card.id] ?? card.item;
                    const disabled = !isSelectable || isRolling;
                    const cardTheme = isChosen
                      ? "border-amber-300 bg-gradient-to-b from-amber-100/10 to-amber-300/10"
                      : disabled
                        ? "border-amber-100/10 bg-black/30"
                        : "border-amber-100/40 bg-[#15080c]/80 hover:border-amber-200/70";
                    const groupMeta = slotGroupIndex[card.groupId];
                    const cardIcon = groupMeta?.icon ?? "🎴";
                    return (
                      <button
                        key={card.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleCardPick(numericPlayer, card)}
                        onMouseEnter={() => setHoveredCard(card)}
                        onMouseLeave={() => setHoveredCard((prev) => (prev?.id === card.id ? null : prev))}
                        onFocus={() => setHoveredCard(card)}
                        onBlur={() => setHoveredCard((prev) => (prev?.id === card.id ? null : prev))}
                        className={`flex-1 rounded-[28px] border-2 p-5 text-left transition ${cardTheme}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{cardIcon}</span>
                            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-100">
                              {card.groupName}
                            </p>
                          </div>
                          <span className="text-lg">
                            {isChosen ? "✨" : faceItem ? "🎴" : "⚠️"}
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          <p className="text-xs uppercase tracking-[0.4em] text-amber-200/70">
                            {card.slotName}
                          </p>
                          {faceItem ? (
                            <div className="flex items-center gap-3">
                              <ItemArt
                                itemId={faceItem.id}
                                name={faceItem.name}
                                size={72}
                                className="flex-shrink-0"
                              />
                              <div className="space-y-1">
                                <p className="text-lg font-semibold text-amber-50">
                                  {faceItem.name}
                                </p>
                                {faceItem.properties && (
                                  <p className="text-xs font-semibold text-amber-100/80">
                                    {faceItem.properties}
                                  </p>
                                )}
                                {faceItem.notes && (
                                  <p className="text-[11px] text-amber-100/70">
                                    {faceItem.notes}
                                  </p>
                                )}
                                {!faceItem.properties && !faceItem.notes && (
                                  <p className="text-xs text-amber-100/60">No description available yet.</p>
                                )}
                                {isRolling && (
                                  <p className="text-[11px] uppercase tracking-[0.3em] text-amber-200/70">
                                    Revealing...
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-amber-100/60">
                              No eligible loot for this card in this act.
                            </p>
                          )}
                        </div>
                        <div className="mt-4 text-center text-[11px] uppercase tracking-[0.3em] text-amber-100/80">
                          {isChosen
                            ? "Selected"
                            : faceItem
                              ? isRolling
                                ? "Revealing..."
                                : "Tap to choose"
                              : "Unavailable"}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!selectableCards.length && (
                  <p className="text-xs text-amber-100/60">
                    No loot available for this player in this act. Continue to the next encounter.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="rounded-full border border-amber-200/40 px-6 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-amber-50 transition hover:border-amber-200 disabled:opacity-40"
            onClick={onClose}
            disabled={!allSatisfied}
          >
            {allSatisfied ? "Continue" : "Awaiting players"}
          </button>
        </div>
      </div>
    </div>
  );
};

const GearBoard = ({
  playerGearState,
  activeActId,
  selectedSlotId,
  onSelectSlot,
  onRemoveUnlocked,
  gearIndex,
  activeAct,
}: GearBoardProps) => {
  const actPool = gearIndex.byAct[activeActId] ?? {};
  const actName = activeAct?.name ?? "Act";
  const availableSlots = getAvailableSlotsForAct(activeActId);
  const resolvedSelectedSlotId =
    selectedSlotId && availableSlots.some((slot) => slot.id === selectedSlotId)
      ? selectedSlotId
      : availableSlots[0]?.id ?? null;
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  useEffect(() => {
    if (resolvedSelectedSlotId && resolvedSelectedSlotId !== selectedSlotId) {
      onSelectSlot(resolvedSelectedSlotId);
    }
  }, [resolvedSelectedSlotId, selectedSlotId, onSelectSlot]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(max-width: 767px)");
    const updateView = () => {
      const mobile = query.matches;
      setIsMobileView(mobile);
      if (!mobile) {
        setMobilePanelOpen(true);
      } else {
        setMobilePanelOpen(false);
      }
    };
    updateView();
    query.addEventListener("change", updateView);
    return () => query.removeEventListener("change", updateView);
  }, []);

  const handleSlotTrigger = (slotId: string) => {
    onSelectSlot(slotId);
    if (isMobileView) {
      setMobilePanelOpen(true);
    }
  };

  const closeMobilePanel = () => {
    if (isMobileView) {
      setMobilePanelOpen(false);
    }
  };

  const selectedSlot = availableSlots.find((slot) => slot.id === resolvedSelectedSlotId);
  const slotState = resolvedSelectedSlotId
    ? playerGearState[activeActId]?.[resolvedSelectedSlotId]
    : undefined;
  const slotPool = resolvedSelectedSlotId ? actPool[resolvedSelectedSlotId] ?? [] : [];
  const unlockedItems = slotState?.unlockedItemIds ?? [];
  const unlockedPool = slotPool.filter((item) => unlockedItems.includes(item.id));
  const lockedPool = slotPool.filter((item) => !unlockedItems.includes(item.id));
  const rolledItem =
    slotState?.currentItemId && gearIndex.byId[slotState.currentItemId]
      ? gearIndex.byId[slotState.currentItemId]
      : undefined;
  const detailPanelClasses = [
    "rounded-3xl border border-amber-100/15 bg-[#120a0d]/80 p-5 shadow-[inset_0_0_25px_rgba(0,0,0,0.45)] backdrop-blur",
    "md:flex-1",
  ];

  if (isMobileView) {
    if (mobilePanelOpen) {
      detailPanelClasses.push(
        "fixed inset-4 z-40 block overflow-y-auto md:static md:inset-auto md:z-auto",
      );
    } else {
      detailPanelClasses.push("hidden md:block");
    }
  }

  return (
    <div className="relative">
      {isMobileView && mobilePanelOpen ? (
        <button
          type="button"
          aria-label="Close slot detail"
          className="fixed inset-0 z-30 bg-black/70 md:hidden"
          onClick={closeMobilePanel}
        />
      ) : null}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="space-y-4 rounded-3xl border border-amber-100/10 bg-[#120a0d]/70 p-5 lg:w-[320px]">
          <SectionLabel>Inventory Slots</SectionLabel>
          <p className="text-xs text-amber-50/70">
            Everyone shares the {actName} loot pools. Tap a slot to view what your selected augments have granted.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            {availableSlots.map((slot) => {
              const pool = actPool[slot.id] ?? [];
              const state = playerGearState[activeActId]?.[slot.id];
              const rolledItem =
                state?.currentItemId && gearIndex.byId[state.currentItemId]
                  ? gearIndex.byId[state.currentItemId]
                  : undefined;
              const lastUnlockedId =
                state?.unlockedItemIds && state.unlockedItemIds.length
                  ? state.unlockedItemIds[state.unlockedItemIds.length - 1]
                  : undefined;
              const equippedItem =
                lastUnlockedId && gearIndex.byId[lastUnlockedId]
                  ? gearIndex.byId[lastUnlockedId]
                  : undefined;
              return (
                <SlotGridButton
                  key={`${slot.id}-${activeActId}`}
                  slot={slot}
                  active={slot.id === resolvedSelectedSlotId}
                  unlockedCount={state?.unlockedItemIds?.length ?? 0}
                  hasPool={pool.length > 0}
                  rolledItem={rolledItem}
                  equippedItem={equippedItem}
                  onClick={() => handleSlotTrigger(slot.id)}
                />
              );
            })}
          </div>
        </div>
        <div className={detailPanelClasses.join(" ")}>
          {isMobileView ? (
            <div className="mb-4 flex items-center justify-between md:hidden">
              <SectionLabel>Slot Details</SectionLabel>
              <button
                type="button"
                className="rounded-full border border-amber-200/40 px-3 py-1 text-xs uppercase tracking-[0.3em] text-amber-50"
                onClick={closeMobilePanel}
              >
                Close
              </button>
            </div>
          ) : null}
          {selectedSlot ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <SectionLabel>{selectedSlot.name}</SectionLabel>
                  <p className="text-sm text-amber-50/80">
                    {selectedSlot.description ??
                      "No slot description provided yet."}
                  </p>
                </div>
                <span className="rounded-full border border-amber-100/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-amber-100">
                  {actName}
                </span>
              </div>

              {rolledItem ? (
                <div className="flex flex-col gap-4 rounded-2xl border border-amber-100/15 bg-black/40 p-4 md:flex-row">
                  <ItemArt itemId={rolledItem.id} name={rolledItem.name} />
                  <div className="space-y-2 text-sm text-amber-100/80">
                    <div>
                      <p className="text-lg font-semibold text-amber-50">
                        {rolledItem.name}
                      </p>
                      {rolledItem.rarity && (
                        <span className="text-[11px] uppercase tracking-[0.3em] text-amber-200/80">
                          {rolledItem.rarity}
                        </span>
                      )}
                    </div>
                    {rolledItem.area && (
                      <p>
                        <span className="font-semibold text-amber-200">
                          Area:
                        </span>{" "}
                        {rolledItem.area}
                      </p>
                    )}
                    <p>
                      <span className="font-semibold text-amber-200">
                        Find it:
                      </span>{" "}
                      {rolledItem.location ?? "Add a location in your CSV export."}
                    </p>
                    {rolledItem.properties && (
                      <p>
                        <span className="font-semibold text-amber-200">
                          Properties:
                        </span>{" "}
                        {rolledItem.properties}
                      </p>
                    )}
                    {rolledItem.notes && <p>{rolledItem.notes}</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 rounded-2xl border border-dashed border-amber-100/20 bg-black/20 p-4 text-sm text-amber-50/80">
                  <p>
                    {slotPool.length
                      ? `Awaiting an augment choice that targets ${selectedSlot.name}.`
                      : "No entries for this slot in the selected act yet."}
                  </p>
                </div>
              )}

              {slotPool.length > 0 && (
                <div className="space-y-3 rounded-2xl border border-amber-100/15 bg-black/20 p-4">
                  {unlockedPool.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">
                        Unlocked augments ({unlockedPool.length})
                      </p>
                      <div className="space-y-3">
                        {unlockedPool.map((item) => {
                          const theme = getRarityTheme(item.rarity);
                          return (
                            <div
                              key={item.id}
                              className="flex gap-3 rounded-2xl border p-3 text-left"
                              style={{ borderColor: theme.border, backgroundImage: theme.tileBg }}
                            >
                              <ItemArt
                                itemId={item.id}
                                name={item.name}
                                size={72}
                                className="flex-shrink-0"
                              />
                              <div className="flex flex-1 flex-col gap-1 text-sm" style={{ color: theme.accentText }}>
                                <div>
                                  <p className="text-base font-semibold">{item.name}</p>
                                  <p className="text-[11px] uppercase tracking-[0.3em]" style={{ color: theme.mutedText }}>
                                    {item.rarity ?? item.type ?? "Augment"}
                                  </p>
                                </div>
                                {item.properties && (
                                  <p className="text-[13px] font-semibold">{item.properties}</p>
                                )}
                                {item.notes && (
                                  <p className="text-[12px]" style={{ color: theme.mutedText }}>
                                    {item.notes}
                                  </p>
                                )}
                                {!item.properties && !item.notes && (
                                  <p className="text-[12px]" style={{ color: theme.mutedText }}>
                                    No description available yet.
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                className="self-start rounded-full border border-rose-200/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-rose-200/80 transition hover:border-rose-200 hover:text-rose-200"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (resolvedSelectedSlotId) {
                                    onRemoveUnlocked(resolvedSelectedSlotId, activeActId, item.id);
                                  }
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {lockedPool.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
                        Locked pool ({lockedPool.length})
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {lockedPool.map((item) => {
                          const theme = getRarityTheme(item.rarity);
                          return (
                            <div
                              key={item.id}
                              className="flex flex-col gap-2 rounded-xl border p-3 text-left"
                              style={{ borderColor: theme.border, backgroundImage: theme.tileBg }}
                            >
                              <ItemArt
                                itemId={item.id}
                                name={item.name}
                                size={64}
                                className="mx-auto"
                              />
                              <div className="space-y-1 text-xs" style={{ color: theme.accentText }}>
                                <p className="text-sm font-semibold">{item.name}</p>
                                <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: theme.mutedText }}>
                                  Locked
                                </p>
                                {item.properties && (
                                  <p className="text-[12px] font-semibold">{item.properties}</p>
                                )}
                                {item.notes && (
                                  <p className="text-[11px]" style={{ color: theme.mutedText }}>
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-sm text-amber-50/70">
              <SectionLabel>Slot details</SectionLabel>
              <p>Select a slot from the left to view its rolls and unlock state.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

type SlotGridButtonProps = {
  slot: GearSlot;
  active: boolean;
  unlockedCount: number;
  hasPool: boolean;
  rolledItem?: GearItem;
  equippedItem?: GearItem;
  onClick: () => void;
};

const SlotGridButton = ({
  slot,
  active,
  unlockedCount,
  hasPool,
  rolledItem,
  equippedItem,
  onClick,
}: SlotGridButtonProps) => {
  const badgeLabel = rolledItem
    ? "Rolled"
    : unlockedCount > 0
      ? `${unlockedCount} unlocked`
      : hasPool
        ? "Ready"
        : "Empty";
  const displayItem = rolledItem ?? equippedItem;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`space-y-2 rounded-2xl border px-3 py-3 text-left transition ${
        active
          ? "border-amber-300 bg-amber-50/10 shadow-[0_0_20px_rgba(251,219,137,0.25)]"
          : "border-amber-100/15 bg-black/20 hover:border-amber-200/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.4em] text-amber-200/70">
          {slot.name}
        </p>
        <span className="text-lg">{unlockedCount > 0 ? "🔓" : "🔒"}</span>
      </div>
      <p className="text-sm text-amber-50/80">
        {displayItem
          ? displayItem.name
          : hasPool
            ? "Awaiting roll"
            : "No loot in act"}
      </p>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] ${
          unlockedCount > 0
            ? "border border-emerald-200/40 text-emerald-200"
            : "border border-amber-100/20 text-amber-100/70"
        }`}
      >
        {badgeLabel}
      </span>
    </button>
  );
};

type ItemArtProps = {
  itemId: string;
  name: string;
  size?: number;
  className?: string;
};

const ItemArt = ({ itemId, name, size = 96, className = "" }: ItemArtProps) => {
  const [errored, setErrored] = useState(false);
  const style = {
    width: size,
    height: size,
  };
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-amber-100/20 bg-gradient-to-br from-[#1e1020] to-[#080406] ${className}`}
      style={style}
    >
      {!errored ? (
        <Image
          src={`/items/${itemId}.png`}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
          priority={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.4em] text-amber-200/80">
          {name.slice(0, 2)}
        </div>
      )}
    </div>
  );
};

type ActTabsProps = {
  activeActId: ActId;
  onChange: (actId: ActId, event?: MouseEvent<HTMLButtonElement>) => void;
  variant?: "default" | "inline";
};

const ActTabs = ({ activeActId, onChange, variant = "default" }: ActTabsProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      const container = containerRef.current;
      const active = tabRefs.current[activeActId];
      if (!container || !active) return;
      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const left = activeRect.left - containerRect.left + container.scrollLeft;
      setIndicator({ left, width: activeRect.width });
    };
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeActId]);

  const containerClass =
    variant === "inline"
      ? "relative inline-flex gap-1 rounded-full border border-amber-100/20 bg-black/30 p-1"
      : "relative flex flex-wrap gap-1 rounded-full border border-amber-100/30 bg-black/40 p-1";

  return (
    <div ref={containerRef} className={containerClass}>
      <div
        className="pointer-events-none absolute inset-y-1 rounded-full bg-amber-300/90 shadow-[0_10px_30px_rgba(255,199,122,0.35)] transition-all duration-300 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
      />
      {acts.map((act) => {
        const isActive = act.id === activeActId;
        return (
          <button
            key={act.id}
            type="button"
            ref={(node) => {
              tabRefs.current[act.id] = node;
            }}
            className={`relative z-10 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] transition ${
              isActive
                ? "text-black"
                : "text-amber-50/80 hover:text-amber-50"
            }`}
            onClick={(event) => onChange(act.id, event)}
          >
            {act.name}
          </button>
        );
      })}
    </div>
  );
};

type SectionLabelProps = {
  children: ReactNode;
};

const SectionLabel = ({ children }: SectionLabelProps) => (
  <p className="text-xs uppercase tracking-[0.4em] text-amber-200/70">{children}</p>
);

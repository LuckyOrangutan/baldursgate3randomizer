import { runOptions } from "@/data/runOptions";
import type { ActId, GearItem } from "@/types/gear";
import type {
  CharacterOption,
  ClassOption,
  ClassSpread,
  NamedOption,
} from "@/types/run";
import {
  minPlayerCount,
  maxPlayerCount,
  optionsPerPlayer,
  totalLevels,
} from "@/app/home/constants";
import type {
  GearIndex,
  PlayerGearState,
  PlayerGearStates,
  SlotRollState,
  RarityTheme,
} from "@/app/home/types";
import { pickMany, pickOne, randomComposition, randomInt } from "@/lib/random";

export const fallbackGender: NamedOption = { name: "Undefined Presence" };
export const fallbackClass: ClassOption = {
  name: "Adventurer",
  description: "Improvises techniques from every discipline.",
  subclasses: [{ name: "Generalist" }],
};
export const fallbackSubclass = fallbackClass.subclasses[0];

/**
 * Map rarity names to quick styling tokens used throughout the UI.
 */
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

export const getRarityTheme = (rarity?: string): RarityTheme => {
  const key = rarity?.toLowerCase() ?? "default";
  return rarityThemes[key] ?? rarityThemes.default;
};

/**
 * Normalize a potentially partial slot entry into the persisted shape we expect.
 */
export const normalizeSlotState = (state: unknown): SlotRollState | undefined => {
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

/**
 * Bring persisted gear states back into the expected runtime shape.
 */
export const normalizeGearStates = (input: unknown): PlayerGearStates => {
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

export const buildClassSpread = (): ClassSpread[] => {
  const classPool = runOptions.classes.length ? runOptions.classes : [fallbackClass];
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
  const stripped = trimmed.replace(/^(Circle|College|School) of\\s+/i, "");
  return stripped || trimmed || "Adventurer";
};

export const buildArchetypeName = (classSpread: ClassSpread[]): string => {
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

export const buildOption = (playerIndex: number, optionIndex: number): CharacterOption => ({
  id: `P${playerIndex + 1}-O${optionIndex + 1}-${randomInt(0, 100000)}`,
  gender: fallbackGender,
  classSpread: buildClassSpread(),
});

export const generateRun = (playerCount: number) => ({
  players: Array.from({ length: playerCount }, (_, playerIndex) => ({
    playerNumber: playerIndex + 1,
    options: Array.from({ length: optionsPerPlayer }, (_, optionIndex) =>
      buildOption(playerIndex, optionIndex),
    ),
  })),
});

export const indexGearItems = (items: GearItem[]): GearIndex => {
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

/**
 * Guard player count entry to stay inside supported range.
 */
export const clampPlayerCount = (count: number) =>
  Math.min(Math.max(count, minPlayerCount), Math.max(maxPlayerCount, 1));

import type { ActId, GearItem, GearSlot } from "@/types/gear";
import type { RunResult } from "@/types/run";

/**
 * Shared domain types for the Honor Run generator UI.
 * Centralizing them keeps components and helpers aligned on shape.
 */
export type PlayerSelections = Record<number, string | null>;
export type PlayerNames = Record<number, string>;

export type SlotRollState = {
  currentItemId: string | null;
  unlockedItemIds: string[];
};

export type PlayerGearState = Partial<Record<ActId, Record<string, SlotRollState>>>;
export type PlayerGearStates = Record<number, PlayerGearState>;
export type PlayerActiveSlots = Record<number, string | null>;

export type PersistedState = {
  playerCount: number;
  currentRun: RunResult;
  playerSelections: PlayerSelections;
  playerGearStates: PlayerGearStates;
  playerActiveSlots: PlayerActiveSlots;
  completedTasks: Record<string, boolean>;
  activeActId: ActId;
  playerNames: PlayerNames;
};

export type GearIndex = {
  byAct: Partial<Record<ActId, Record<string, GearItem[]>>>;
  byId: Record<string, GearItem>;
};

export type SlotCardGroupId = "wardrobe" | "adornments" | "arsenal";

export type SlotCardGroup = {
  id: SlotCardGroupId;
  name: string;
  slotIds: GearSlot["id"][];
  icon: string;
  description: string;
};

export type LootOverlayCard = {
  id: string;
  playerNumber: number;
  groupId: SlotCardGroupId;
  groupName: string;
  slotId: GearSlot["id"] | null;
  slotName: string;
  item: GearItem | null;
};

export type LootOverlayData = {
  taskName: string;
  actId: ActId;
  cards: LootOverlayCard[];
};

export type RarityTheme = {
  border: string;
  glow: string;
  tileBg: string;
  accentText: string;
  mutedText: string;
};

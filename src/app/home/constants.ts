import { acts, gearSlots } from "@/data/gear";
import type { ActId, GearSlot } from "@/types/gear";
import type { SlotCardGroup } from "@/app/home/types";

/**
 * Core knobs and static configuration for the Honor Run flow.
 * Keep everything that could be tweaked or tuned in one place.
 */
export const minPlayerCount = 1;
export const maxPlayerCount = 4;
export const optionsPerPlayer = 3;
export const totalLevels = 12;
export const storageKey = "bg3-honor-run-v3";

export const slotCardGroups: SlotCardGroup[] = [
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
];

/**
 * Quick lookup tables for slot metadata and grouped slot cards.
 */
export const slotNameIndex = gearSlots.reduce<Record<string, GearSlot>>((acc, slot) => {
  acc[slot.id] = slot;
  return acc;
}, {});

export const slotGroupIndex = slotCardGroups.reduce<Record<string, SlotCardGroup>>((acc, group) => {
  acc[group.id] = group;
  return acc;
}, {});

export const getAvailableSlotsForAct = (actId: ActId) => {
  void actId; // act-aware slot filtering can return later; keep signature for callers
  return gearSlots;
};

export const getDefaultSlotId = (actId?: ActId) => {
  const targetAct = actId ?? acts[0]?.id;
  if (targetAct) {
    const slots = getAvailableSlotsForAct(targetAct);
    if (slots.length) {
      return slots[0]?.id ?? null;
    }
  }
  return gearSlots[0]?.id ?? null;
};

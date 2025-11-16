export type ActId = "act1" | "act2" | "act3";

export interface ActInfo {
  id: ActId;
  name: string;
  summary?: string;
  levelRange?: string;
}

export interface GearSlot {
  id: string;
  name: string;
  description?: string;
}

export interface GearItem {
  id: string;
  name: string;
  slotId: GearSlot["id"];
  type?: string;
  acts: ActId[];
  rarity?: string;
  area?: string;
  location?: string;
  properties?: string;
  notes?: string;
}

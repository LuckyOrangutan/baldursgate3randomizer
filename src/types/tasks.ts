import type { ActId } from "@/types/gear";

export interface Task {
  id: string;
  actId: ActId;
  name: string;
  description?: string;
  reward?: string;
}

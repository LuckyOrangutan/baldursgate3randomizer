import type { Task } from "@/types/tasks";
import type { ActId } from "@/types/gear";
import { act1Tasks } from "@/data/tasks/act1-tasks";
import { act2Tasks } from "@/data/tasks/act2-tasks";
import { act3Tasks } from "@/data/tasks/act3-tasks";

/**
 * Tasks grouped by act. Each act lives in its own file for readability.
 */
export const tasksByAct: Record<ActId, Task[]> = {
  act1: act1Tasks,
  act2: act2Tasks,
  act3: act3Tasks,
};

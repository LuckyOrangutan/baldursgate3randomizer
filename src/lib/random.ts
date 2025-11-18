export const shuffle = <T>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const pickOne = <T>(items: readonly T[]): T => {
  if (!items.length) {
    throw new Error("Cannot pick from an empty list");
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index];
};

export const pickMany = <T>(items: readonly T[], count: number): T[] => {
  if (count <= 0) return [];
  if (count >= items.length) {
    return shuffle([...items]);
  }
  return shuffle([...items]).slice(0, count);
};

export const randomInt = (min: number, max: number): number => {
  if (max < min) throw new Error("Invalid range for randomInt");
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const randomComposition = (total: number, parts: number): number[] => {
  if (parts <= 1) return [total];
  const cutSet = new Set<number>();
  while (cutSet.size < parts - 1) {
    cutSet.add(randomInt(1, total - 1));
  }
  const cuts = [...cutSet].sort((a, b) => a - b);
  const segments: number[] = [];
  let prev = 0;
  for (const cut of cuts) {
    segments.push(cut - prev);
    prev = cut;
  }
  segments.push(total - prev);
  return segments;
};

type WeightedEntry<T> = {
  item: T;
  weight: number;
};

/**
 * Weighted random pick helper. Ignores zero or negative weights.
 */
export const pickWeighted = <T>(entries: WeightedEntry<T>[]): T => {
  const positiveEntries = entries.filter((entry) => entry.weight > 0);
  if (!positiveEntries.length) {
    throw new Error("Cannot pick from an empty weighted list");
  }

  const totalWeight = positiveEntries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of positiveEntries) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.item;
    }
  }

  return positiveEntries[positiveEntries.length - 1]!.item;
};

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

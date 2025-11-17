"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { acts, gearItems } from "@/data/gear";
import type { ActId, GearItem, GearSlot } from "@/types/gear";
import type { Task } from "@/types/tasks";
import type { CharacterOption } from "@/types/run";
import {
  getAvailableSlotsForAct,
  slotGroupIndex,
} from "@/app/home/constants";
import { buildArchetypeName, getRarityTheme } from "@/app/home/logic";
import type {
  GearIndex,
  LootOverlayCard,
  LootOverlayData,
  PlayerGearState,
} from "@/app/home/types";
import { pickOne } from "@/lib/random";

/**
 * Visual building blocks for the Honor Run experience.
 * Components stay here so page.tsx can focus on orchestration and state.
 */
type CharacterOptionCardProps = {
  option: CharacterOption;
  optionIndex: number;
  onSelect: () => void;
};

const optionLabels = ["I", "II", "III"];

export const CharacterOptionCard = ({ option, optionIndex, onSelect }: CharacterOptionCardProps) => {
  const buildName = buildArchetypeName(option.classSpread);
  return (
    <article
      className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-[#1d1510]/90 to-[#0c0704]/90 p-5 shadow-[inset_0_0_25px_rgba(0,0,0,0.45)] transition hover:shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
    >
      <div className="flex items-center">
        <p className="text-xs uppercase tracking-[0.4em] text-amber-200/70">
          Option {optionLabels[optionIndex] ?? optionIndex + 1}
        </p>
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
        className="mt-auto rounded-full bg-amber-100/10 px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-amber-50 transition hover:bg-amber-200/15"
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

export const SelectedBuildPanel = ({ option, onReset, children }: SelectedBuildPanelProps) => (
  <div className="space-y-5 rounded-3xl bg-black/40 p-6 shadow-[inset_0_0_25px_rgba(0,0,0,0.35)]">
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
        className="rounded-full bg-rose-200/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-rose-200 transition hover:bg-rose-200/25"
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
  activeActId: ActId;
  onChangeAct: (actId: ActId) => void;
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
    <div className="overflow-hidden rounded-2xl bg-[#120a0d]/70 shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-100/10 bg-[#160c0e]/70 px-4 py-3 text-left transition hover:border-amber-200/40 hover:bg-white/5"
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
        className={`bg-[#0d0608]/80 transition-[max-height,opacity] duration-300 ease-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
      >
        <ul className="space-y-3 p-4">
          {tasks.map((task) => {
            const checked = Boolean(completed[task.id]);
            return (
              <li
                key={task.id}
                className="flex items-start gap-3 rounded-2xl bg-[#1a0f12]/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
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

export const TaskBoard = ({
  tasks,
  completed,
  onToggle,
  activeAct,
  activeActId,
  onChangeAct,
  className = "",
}: TaskBoardProps) => {
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

  const locationOrder = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((task, index) => {
      const location = deriveLocation(task) || "Unsorted encounters";
      if (!map.has(location)) {
        map.set(location, index);
      }
    });
    return map;
  }, [tasks]);

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

  const sortedGroups = useMemo(
    () =>
      Array.from(grouped.entries()).sort((a, b) => {
        const orderA = locationOrder.get(a[0]);
        const orderB = locationOrder.get(b[0]);
        if (orderA !== undefined && orderB !== undefined && orderA !== orderB) {
          return orderA - orderB;
        }
        if (orderA !== undefined) return -1;
        if (orderB !== undefined) return 1;
        return a[0].localeCompare(b[0]);
      }),
    [grouped, locationOrder],
  );

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
      className={`space-y-4 rounded-3xl bg-black/40 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] xl:sticky xl:top-8 ${className}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SectionLabel>Encounter Log</SectionLabel>
          <ActTabs activeActId={activeActId} onChange={onChangeAct} variant="inline" />
        </div>
        <div>
          <h2 className="font-display text-2xl text-amber-50">
            {activeAct?.name ?? "Current Act"}
          </h2>
          <p className="text-sm text-amber-100/80">
            Resolve encounters to trigger fresh rerolls for every slot. Each checkmark
            represents a full gear draw opportunity.
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-full border border-dashed border-amber-200/30 bg-black/30 px-3 py-2 text-sm text-amber-50/80 shadow-inner shadow-black/40">
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

export const LootOverlay = ({ data, onClose, onSelectCard }: LootOverlayProps) => {
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
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[32px] bg-gradient-to-b from-[#1a0d12] via-[#12070b] to-[#080305] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.85)]">
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
          <div className="rounded-2xl bg-black/40 px-4 py-3 text-sm text-amber-100/80 shadow-inner shadow-black/40">
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
              <div key={playerNumber} className="space-y-4 rounded-3xl bg-[#0b050f]/70 p-5 shadow-[0_16px_45px_rgba(0,0,0,0.45)]">
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
                      ? "bg-gradient-to-b from-amber-100/10 to-amber-300/15 ring-2 ring-amber-200/60"
                      : disabled
                        ? "bg-black/30 opacity-80"
                        : "bg-[#15080c]/80 hover:bg-[#1c0a0e] hover:ring-2 hover:ring-amber-200/60";
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
                        className={`flex-1 rounded-[28px] p-5 text-left transition shadow-[0_10px_30px_rgba(0,0,0,0.35)] ${cardTheme}`}
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
            className="rounded-full bg-amber-200/15 px-6 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-amber-50 transition hover:bg-amber-200/25 disabled:opacity-40"
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

export const GearBoard = ({
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
    "rounded-3xl bg-[#120a0d]/80 p-5 shadow-[inset_0_0_25px_rgba(0,0,0,0.45)] backdrop-blur",
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
        <div className="space-y-4 rounded-3xl bg-[#120a0d]/70 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.45)] lg:w-[320px]">
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
                className="rounded-full bg-amber-200/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-amber-50"
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
              </div>

              {rolledItem ? (
                <div className="flex flex-col gap-4 rounded-2xl bg-black/40 p-4 shadow-[0_12px_35px_rgba(0,0,0,0.35)] md:flex-row">
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
                <div className="space-y-2 rounded-2xl border border-dashed border-amber-100/20 bg-black/25 p-4 text-sm text-amber-50/80 shadow-inner shadow-black/40">
                  <p>
                    {slotPool.length
                      ? `Awaiting an augment choice that targets ${selectedSlot.name}.`
                      : "No entries for this slot in the selected act yet."}
                  </p>
                </div>
              )}

              {slotPool.length > 0 && (
                <div className="space-y-3 rounded-2xl border border-dashed border-amber-100/20 bg-black/20 p-4 shadow-inner shadow-black/30">
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
                                className="self-start rounded-full bg-rose-200/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-rose-200/80 transition hover:bg-rose-200/20 hover:text-rose-200"
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
          ? "border-amber-300 bg-amber-50/10 ring-2 ring-amber-300 shadow-[0_0_20px_rgba(251,219,137,0.25)]"
          : "border-amber-100/25 bg-black/20 hover:border-amber-200/60 hover:bg-black/30 hover:ring-2 hover:ring-amber-200/50"
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
            ? "bg-emerald-200/10 text-emerald-200"
            : "bg-amber-100/10 text-amber-100/70"
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
      className={`overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e1020] to-[#080406] shadow-[0_10px_30px_rgba(0,0,0,0.35)] ${className}`}
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

export const ActTabs = ({ activeActId, onChange, variant = "default" }: ActTabsProps) => {
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
      ? "relative inline-flex gap-1 rounded-full border border-dashed border-amber-100/25 bg-black/30 p-1 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
      : "relative flex flex-wrap gap-1 rounded-full border border-dashed border-amber-100/25 bg-black/40 p-1 shadow-[0_12px_30px_rgba(0,0,0,0.35)]";

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

export const SectionLabel = ({ children }: SectionLabelProps) => (
  <p className="text-xs uppercase tracking-[0.4em] text-amber-200/70">{children}</p>
);

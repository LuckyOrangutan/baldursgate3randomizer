import { RunOptions } from "@/types/run";

export const runOptions: RunOptions = {
  races: [
    { name: "Human", description: "Adaptive and diplomatic" },
    { name: "Elf", description: "Keen senses and finesse" },
    { name: "Drow", description: "Shadow-touched superiority" },
    { name: "Half-Elf", description: "Versatile and charismatic" },
    { name: "Tiefling", description: "Infernal resilience" },
    { name: "Githyanki", description: "Psionic warrior traditions" },
    { name: "Half-Orc", description: "Relentless endurance" },
    { name: "Dwarf", description: "Stout and battle-tested" },
    { name: "Halfling", description: "Lucky and nimble" },
    { name: "Gnome", description: "Inspired tinkering minds" },
    { name: "Dragonborn", description: "Draconic breath lineage" },
    { name: "Duergar", description: "Stealthy underdark sentinel" },
    { name: "Deep Gnome", description: "Illusion-savvy explorer" },
  ],
  genders: [
    { name: "Feminine" },
    { name: "Masculine" },
    { name: "Androgynous" },
    { name: "Masked/Hidden visage" },
    { name: "Shapeshifted persona" },
  ],
  classes: [
    {
      name: "Barbarian",
      description: "Primal rage and relentless frontline presence",
      subclasses: [
        { name: "Berserker" },
        { name: "Wildheart" },
        { name: "Wild Magic" },
      ],
    },
    {
      name: "Bard",
      description: "Battlefield conductor and buff specialist",
      subclasses: [
        { name: "College of Lore" },
        { name: "College of Valor" },
        { name: "College of Swords" },
      ],
    },
    {
      name: "Cleric",
      description: "Divine conduit with flexible spell lists",
      subclasses: [
        { name: "Life Domain" },
        { name: "Light Domain" },
        { name: "Tempest Domain" },
        { name: "Trickery Domain" },
      ],
    },
    {
      name: "Druid",
      description: "Wildshape, support, and battlefield control",
      subclasses: [
        { name: "Circle of the Moon" },
        { name: "Circle of the Land" },
        { name: "Circle of Spores" },
      ],
    },
    {
      name: "Fighter",
      description: "Weapon master and flexible kit",
      subclasses: [
        { name: "Battle Master" },
        { name: "Eldritch Knight" },
        { name: "Champion" },
      ],
    },
    {
      name: "Monk",
      description: "Mobile striker with ki techniques",
      subclasses: [
        { name: "Way of the Open Hand" },
        { name: "Way of Shadow" },
        { name: "Way of the Four Elements" },
      ],
    },
    {
      name: "Paladin",
      description: "Sacred oath and smite potential",
      subclasses: [
        { name: "Oath of Devotion" },
        { name: "Oath of the Ancients" },
        { name: "Oath of Vengeance" },
        { name: "Oathbreaker" },
      ],
    },
    {
      name: "Ranger",
      description: "Hybrid ranged specialist and scout",
      subclasses: [
        { name: "Hunter" },
        { name: "Beast Master" },
        { name: "Gloom Stalker" },
      ],
    },
    {
      name: "Rogue",
      description: "Stealth and burst damage",
      subclasses: [
        { name: "Thief" },
        { name: "Assassin" },
        { name: "Arcane Trickster" },
      ],
    },
    {
      name: "Sorcerer",
      description: "Innate magic and metamagic twists",
      subclasses: [
        { name: "Draconic Bloodline" },
        { name: "Wild Magic" },
        { name: "Storm Sorcery" },
      ],
    },
    {
      name: "Warlock",
      description: "Pact boons and eldritch invocations",
      subclasses: [
        { name: "The Fiend" },
        { name: "The Great Old One" },
        { name: "The Archfey" },
      ],
    },
    {
      name: "Wizard",
      description: "Prepared caster and bookish specialist",
      subclasses: [
        { name: "Evocation" },
        { name: "Abjuration" },
        { name: "Illusion" },
        { name: "Necromancy" },
      ],
    },
  ],
  collectibleItems: [
    "antique forks",
    "mysterious tomes",
    "silver goblets",
    "ritual daggers",
    "gnomish gadgets",
    "stuffed owlbears",
    "ceremonial masks",
    "clockwork hearts",
    "lava rocks",
    "jeweled mirrors",
    "runic crystals",
  ],
  companions: [
    "Shadowheart",
    "Lae'zel",
    "Karlach",
    "Wyll",
    "Gale",
    "Astarion",
    "Halsin",
    "Jaheira",
    "Minsc",
    "Minthara",
    "The Dark Urge",
  ],
};

import { RunOptions } from "@/types/run";

export const runOptions: RunOptions = {
  classes: [
    {
      name: "Barbarian",
      description: "Primal rage and relentless frontline presence",
      subclasses: [
        { name: "Berserker" },
        { name: "Wildheart" },
        { name: "Wild Magic" },
        { name: "Giant" },
      ],
    },
    {
      name: "Bard",
      description: "Battlefield conductor and buff specialist",
      subclasses: [
        { name: "College of Lore" },
        { name: "College of Valor" },
        { name: "College of Swords" },
        { name: "College of Glamour" },
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
        { name: "Death Domain" },
        { name: "Nature Domain" },
        { name: "War Domain" },
        { name: "Knowledge Domain" },
      ],
    },
    {
      name: "Druid",
      description: "Wildshape, support, and battlefield control",
      subclasses: [
        { name: "Circle of the Moon" },
        { name: "Circle of the Land" },
        { name: "Circle of Spores" },
        { name: "Circle of Stars" },
      ],
    },
    {
      name: "Fighter",
      description: "Weapon master and flexible kit",
      subclasses: [
        { name: "Battle Master" },
        { name: "Eldritch Knight" },
        { name: "Champion" },
        { name: "Arcane Archer" },
      ],
    },
    {
      name: "Monk",
      description: "Mobile striker with ki techniques",
      subclasses: [
        { name: "Way of the Open Hand" },
        { name: "Way of Shadow" },
        { name: "Way of the Four Elements" },
        { name: "Way of the Drunken Master" },
      ],
    },
    {
      name: "Paladin",
      description: "Sacred oath and smite potential",
      subclasses: [
        { name: "Oath of Devotion" },
        { name: "Oath of the Ancients" },
        { name: "Oath of Vengeance" },
        { name: "Oath of the Crown" },
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
        { name: "Swarmkeeper" },
      ],
    },
    {
      name: "Rogue",
      description: "Stealth and burst damage",
      subclasses: [
        { name: "Thief" },
        { name: "Assassin" },
        { name: "Arcane Trickster" },
        { name: "Swashbuckler" },
      ],
    },
    {
      name: "Sorcerer",
      description: "Innate magic and metamagic twists",
      subclasses: [
        { name: "Draconic Bloodline" },
        { name: "Wild Magic" },
        { name: "Storm Sorcery" },
        { name: "Shadow Magic" },
      ],
    },
    {
      name: "Warlock",
      description: "Pact boons and eldritch invocations",
      subclasses: [
        { name: "The Fiend" },
        { name: "The Great Old One" },
        { name: "The Archfey" },
        { name: "The Hexblade" },
      ],
    },
    {
      name: "Wizard",
      description: "Prepared caster and bookish specialist",
      subclasses: [
        { name: "Evocation" },
        { name: "Bladesinging" },
        { name: "Conjuration" },
        { name: "Divination" },
        { name: "Enchantment" },
        { name: "Transmutation" },
        { name: "Abjuration" },
        { name: "Illusion" },
        { name: "Necromancy" },
      ],
    },
  ],
};

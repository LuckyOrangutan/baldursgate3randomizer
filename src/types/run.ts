export interface NamedOption {
  name: string;
  description?: string;
  tags?: string[];
}

export interface ClassOption extends NamedOption {
  subclasses: NamedOption[];
}

export interface RunOptions {
  races: NamedOption[];
  genders: NamedOption[];
  classes: ClassOption[];
  collectibleItems: string[];
  companions: string[];
}

export interface ClassSpread {
  klass: ClassOption;
  subclass: NamedOption;
  levels: number;
}

export interface CharacterOption {
  id: string;
  gender: NamedOption;
  classSpread: ClassSpread[];
}

export interface PlayerOptionSet {
  playerNumber: number;
  options: CharacterOption[];
}

export interface RunResult {
  players: PlayerOptionSet[];
}

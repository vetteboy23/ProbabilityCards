export const PERSON = Object.freeze({
  QUEEN: "queen",
  KING: "king",

  DOPEY: "dopey",
  SNOW_WHITE: "snow_white",
  GRUMPY: "grumpy",
  SNEEZY: "sneezy",
  DOC: "doc",
  HAPPY: "happy",
  BASHFUL: "bashful",
  SLEEPY: "sleepy",

  CHEESE: "cheese",
  OLD_FASHIONED: "old_fashioned",
  BEER: "beer",
  STEAK: "steak",

  LIGHT: "light",
  CUBE: "cube",
  BALL: "ball",
  NET: "net",

  MATERNAL_GRANDMOTHER: "maternal_grandmother",
  MATERNAL_GRANDFATHER: "maternal_grandfather",
  PATERNAL_GRANDMOTHER: "paternal_grandmother",
  KICK: "kick",

  FLY: "fly",
});

function person({
  id,
  displayName,
  generation,
  roles = [],
  publicNickname = displayName,
  nicknameResolved = true,
  selectableAsPlayer = true,
}) {
  return Object.freeze({
    id,
    displayName,
    publicNickname,
    nicknameResolved,
    generation,
    roles: Object.freeze([...roles]),
    selectableAsPlayer,
  });
}

export const people = Object.freeze({
  [PERSON.QUEEN]: person({
    id: PERSON.QUEEN,
    displayName: "Queen",
    generation: "parents",
    roles: ["parent", "mother"],
  }),
  [PERSON.KING]: person({
    id: PERSON.KING,
    displayName: "King",
    generation: "parents",
    roles: ["parent", "father"],
  }),

  [PERSON.DOPEY]: person({
    id: PERSON.DOPEY,
    displayName: "Dopey",
    generation: "siblings",
    roles: ["sibling", "brother"],
  }),
  [PERSON.SNOW_WHITE]: person({
    id: PERSON.SNOW_WHITE,
    displayName: "Snow White",
    generation: "siblings",
    roles: ["sibling", "sister", "wife"],
  }),
  [PERSON.GRUMPY]: person({
    id: PERSON.GRUMPY,
    displayName: "Grumpy",
    generation: "siblings",
    roles: ["sibling", "sister", "wife"],
  }),
  [PERSON.SNEEZY]: person({
    id: PERSON.SNEEZY,
    displayName: "Sneezy",
    generation: "siblings",
    roles: ["sibling", "sister", "wife"],
  }),
  [PERSON.DOC]: person({
    id: PERSON.DOC,
    displayName: "Doc",
    generation: "siblings",
    roles: ["sibling", "brother"],
  }),
  [PERSON.HAPPY]: person({
    id: PERSON.HAPPY,
    displayName: "Happy",
    generation: "siblings",
    roles: ["sibling", "sister", "mother"],
  }),
  [PERSON.BASHFUL]: person({
    id: PERSON.BASHFUL,
    displayName: "Bashful",
    generation: "siblings",
    roles: ["sibling", "brother"],
  }),
  [PERSON.SLEEPY]: person({
    id: PERSON.SLEEPY,
    displayName: "Sleepy",
    generation: "siblings",
    roles: ["sibling", "sister", "wife", "mother"],
  }),

  [PERSON.CHEESE]: person({
    id: PERSON.CHEESE,
    displayName: "Cheese",
    generation: "spouses",
    roles: ["husband"],
  }),
  [PERSON.OLD_FASHIONED]: person({
    id: PERSON.OLD_FASHIONED,
    displayName: "Old Fashioned",
    generation: "spouses",
    roles: ["husband"],
  }),
  [PERSON.BEER]: person({
    id: PERSON.BEER,
    displayName: "Beer",
    generation: "spouses",
    roles: ["husband"],
  }),
  [PERSON.STEAK]: person({
    id: PERSON.STEAK,
    displayName: "Steak",
    generation: "spouses",
    roles: ["husband", "father"],
  }),

  [PERSON.LIGHT]: person({
    id: PERSON.LIGHT,
    displayName: "Light",
    generation: "grandchildren",
    roles: ["grandchild", "child"],
  }),
  [PERSON.CUBE]: person({
    id: PERSON.CUBE,
    displayName: "Cube",
    generation: "grandchildren",
    roles: ["grandchild", "child"],
  }),
  [PERSON.BALL]: person({
    id: PERSON.BALL,
    displayName: "Ball",
    generation: "grandchildren",
    roles: ["grandchild", "child"],
  }),
  [PERSON.NET]: person({
    id: PERSON.NET,
    displayName: "Net",
    generation: "grandchildren",
    roles: ["grandchild", "child"],
  }),

  [PERSON.MATERNAL_GRANDMOTHER]: person({
    id: PERSON.MATERNAL_GRANDMOTHER,
    displayName: "Maternal Grandmother",
    generation: "grandparents",
    roles: ["grandparent", "grandmother"],
    selectableAsPlayer: false,
  }),
  [PERSON.MATERNAL_GRANDFATHER]: person({
    id: PERSON.MATERNAL_GRANDFATHER,
    displayName: "Pipe",
    publicNickname: "Pipe",
    nicknameResolved: true,
    generation: "grandparents",
    roles: ["grandparent", "grandfather", "joker_person"],
    selectableAsPlayer: false,
  }),
  [PERSON.PATERNAL_GRANDMOTHER]: person({
    id: PERSON.PATERNAL_GRANDMOTHER,
    displayName: "Paternal Grandmother",
    generation: "grandparents",
    roles: ["grandparent", "grandmother"],
    selectableAsPlayer: false,
  }),
  [PERSON.KICK]: person({
    id: PERSON.KICK,
    displayName: "Kick",
    generation: "grandparents",
    roles: ["grandparent", "grandfather", "joker_person"],
    selectableAsPlayer: false,
  }),

  [PERSON.FLY]: person({
    id: PERSON.FLY,
    displayName: "Fly",
    generation: "extended_family",
    roles: ["great_uncle"],
    selectableAsPlayer: false,
  }),
});

export const siblingIds = Object.freeze([
  PERSON.DOPEY,
  PERSON.SNOW_WHITE,
  PERSON.GRUMPY,
  PERSON.SNEEZY,
  PERSON.DOC,
  PERSON.HAPPY,
  PERSON.BASHFUL,
  PERSON.SLEEPY,
]);

export const sisterIds = Object.freeze([
  PERSON.SNOW_WHITE,
  PERSON.GRUMPY,
  PERSON.SNEEZY,
  PERSON.HAPPY,
  PERSON.SLEEPY,
]);

export const brotherIds = Object.freeze([
  PERSON.DOPEY,
  PERSON.DOC,
  PERSON.BASHFUL,
]);

export const couples = Object.freeze([
  Object.freeze({
    id: "snow_white_cheese",
    partners: Object.freeze([PERSON.SNOW_WHITE, PERSON.CHEESE]),
    weddingCardId: "3S",
  }),
  Object.freeze({
    id: "grumpy_old_fashioned",
    partners: Object.freeze([PERSON.GRUMPY, PERSON.OLD_FASHIONED]),
    weddingCardId: "4S",
  }),
  Object.freeze({
    id: "sneezy_beer",
    partners: Object.freeze([PERSON.SNEEZY, PERSON.BEER]),
    weddingCardId: "5S",
  }),
  Object.freeze({
    id: "sleepy_steak",
    partners: Object.freeze([PERSON.SLEEPY, PERSON.STEAK]),
    weddingCardId: null,
  }),
]);

export const parentChildRelationships = Object.freeze([
  Object.freeze({
    id: "happy_light",
    parents: Object.freeze([PERSON.HAPPY]),
    children: Object.freeze([PERSON.LIGHT]),
  }),
  Object.freeze({
    id: "sleepy_steak_children",
    parents: Object.freeze([PERSON.SLEEPY, PERSON.STEAK]),
    children: Object.freeze([PERSON.CUBE, PERSON.BALL, PERSON.NET]),
  }),
]);

export const households = Object.freeze([
  Object.freeze({
    id: "happy_household",
    members: Object.freeze([PERSON.HAPPY, PERSON.LIGHT]),
    portraitCardId: "7S",
  }),
  Object.freeze({
    id: "sleepy_household",
    members: Object.freeze([
      PERSON.SLEEPY,
      PERSON.STEAK,
      PERSON.CUBE,
      PERSON.BALL,
      PERSON.NET,
    ]),
    portraitCardId: "10S",
  }),
]);

export const specialRelationships = Object.freeze([
  Object.freeze({
    id: "kick_fly_brothers",
    type: "brothers",
    people: Object.freeze([PERSON.KICK, PERSON.FLY]),
  }),
  Object.freeze({
    id: "steak_ball_jersey",
    type: "matching_basketball_jersey",
    people: Object.freeze([PERSON.STEAK, PERSON.BALL]),
    requiredCardIds: Object.freeze(["JS", "AS"]),
  }),
]);

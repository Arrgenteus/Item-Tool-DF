export type ItemType =
    | 'weapon'
    | 'capeOrWings'
    | 'helm'
    | 'belt'
    | 'necklace'
    | 'ring'
    | 'trinket'
    | 'bracer';

export const PRETTY_TAG_NAMES = {
    da: 'DA',
    dc: 'DC',
    dm: 'DM',
    fs: 'Free Storage',
    rare: 'Rare',
    so: 'Special Offer',
    se: 'Seasonal',
    temp: 'Temporary',
    artifact: 'Artifact',
    default: 'Default',
    ak: 'ArchKnight',
    alexander: 'Alexander',
    cosmetic: 'Cosmetic',
    guardian: 'Guardian',
    none: 'Untagged',
};

export type ItemTag = keyof typeof PRETTY_TAG_NAMES;

export const PRETTY_TO_BASE_TAG_NAME: { [key: string]: ItemTag } = {};
for (const itemType in PRETTY_TAG_NAMES) {
    PRETTY_TO_BASE_TAG_NAME[PRETTY_TAG_NAMES[itemType as ItemTag]] = itemType as ItemTag;
}

export const ALL_ITEM_TYPES: Set<ItemType> = new Set([
    'weapon',
    'capeOrWings',
    'helm',
    'belt',
    'necklace',
    'ring',
    'trinket',
    'bracer',
]);

export const ACCESSORY_TYPES = {
    cape: 1,
    wings: 1,
    helm: 1,
    belt: 1,
    necklace: 1,
    ring: 1,
    trinket: 1,
    bracer: 1,
};

export type AccessoryType = keyof typeof ACCESSORY_TYPES;

export const WEAPON_TYPES = {
    sword: 1,
    axe: 1,
    mace: 1,
    staff: 1,
    wand: 1,
    dagger: 1,
    scythe: 1,
};

export type WeaponType = keyof typeof WEAPON_TYPES;

const BonusTypes = {
    block: 1,
    dodge: 1,
    parry: 1,
    crit: 1,
    'magic def': 1,
    'melee def': 1,
    'pierce def': 1,
    wis: 1,
    end: 1,
    cha: 1,
    luk: 1,
    int: 1,
    dex: 1,
    str: 1,
    bonus: 1,
};

export type BonusType = keyof typeof BonusTypes;

export const PRETTY_ITEM_TYPES: { [key in ItemType]: string } = {
    weapon: 'Weapons',
    belt: 'Belts',
    capeOrWings: 'Capes/Wings',
    ring: 'Rings',
    necklace: 'Necklaces',
    helm: 'Helms',
    bracer: 'Bracers',
    trinket: 'Trinkets',
};

export const PRETTY_TO_BASE_ITEM_TYPE: { [key: string]: ItemType } = {};
for (const itemType in PRETTY_ITEM_TYPES) {
    PRETTY_TO_BASE_ITEM_TYPE[PRETTY_ITEM_TYPES[itemType as ItemType]] = itemType as ItemType;
}

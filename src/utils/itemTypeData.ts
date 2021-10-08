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

const WeaponTypes = {
    sword: 1,
    axe: 1,
    mace: 1,
    staff: 1,
    wand: 1,
    dagger: 1,
    scythe: 1,
};

export type WeaponType = keyof typeof WeaponTypes;

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

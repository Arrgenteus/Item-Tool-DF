export const enum ItemTypes {
    WEAPON = 'weapon',
    ACCESSORY = 'accessory',
    CAPE = 'cape',
    WINGS = 'wings',
    HELM = 'helm',
    BELT = 'belt',
    NECKLACE = 'necklace',
    RING = 'ring',
    TRINKET = 'trinket',
    BRACER = 'bracer',
}

export const allItemTypes: Set<ItemTypes> = new Set([
    ItemTypes.WEAPON,
    ItemTypes.ACCESSORY,
    ItemTypes.CAPE,
    ItemTypes.WINGS,
    ItemTypes.HELM,
    ItemTypes.BELT,
    ItemTypes.RING,
    ItemTypes.NECKLACE,
    ItemTypes.TRINKET,
    ItemTypes.BRACER,
]);

export const WeaponTypes = {
    sword: 1,
    axe: 1,
    mace: 1,
    staff: 1,
    wand: 1,
    dagger: 1,
    scythe: 1,
};

export type WeaponType = keyof typeof WeaponTypes;

export const BonusTypes = {
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

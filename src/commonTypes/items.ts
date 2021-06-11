export const ItemTypes = {
    weapon: 1,
    accessory: 1,
    cape: 1,
    wings: 1,
    helm: 1,
    belt: 1,
    necklace: 1,
    ring: 1,
    trinket: 1,
    bracer: 1,
};

export type ItemType = keyof typeof ItemTypes;

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

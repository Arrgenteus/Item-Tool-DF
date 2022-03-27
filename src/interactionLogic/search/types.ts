import { AccessoryType, WeaponType } from '../../utils/itemTypeData';

export type SearchableItemCategory = AccessoryType | WeaponType | 'weapon' | 'accessory' | 'pet';

export type Location = { name: string; link?: string };

export type Stat = { name: string; value: string | number };

export type PetAttack = { appearance?: string | string[]; description: string };

import { AccessoryType, ItemTag, WeaponType } from '../../utils/itemTypeData';

export const DIFFERENT_SEARCH_RESULT_INTERACTION_ID = 'dsr';
export const MORE_SEARCH_RESULT_IMAGES_INTERACTION_ID = 'msra';

export const MORE_SEARCH_RESULT_IMAGES_LABEL = 'More Images';

export enum ItemCategoryTypes {
    GEAR,
    WEAPON,
    ACCESSORY,
    PET,
}

export type SearchableItemCategory =
    | AccessoryType
    | WeaponType
    | 'weapon'
    | 'accessory'
    | 'pet'
    | 'item';

export type SearchableItemCategoryFilter = { terms: { item_type: SearchableItemCategory[] } };

export type Location = { name: string; link?: string };

export type ItemVariantInfo = { tags: ItemTag[]; locations: Location[] };

export type Stat = { name: string; value: string | number };

export type PetAttack = { appearance?: string | string[]; description: string };

export type SearchableItemCategoryAlias =
    | 'acc'
    | 'helmet'
    | 'wep'
    | 'weap'
    | 'neck'
    | 'wing'
    | 'cloak';

export const categoryAliasMapping: {
    [key in SearchableItemCategoryAlias]: SearchableItemCategory;
} = {
    acc: 'accessory',
    helmet: 'helm',
    wep: 'weapon',
    weap: 'weapon',
    neck: 'necklace',
    wing: 'wings',
    cloak: 'cape',
};

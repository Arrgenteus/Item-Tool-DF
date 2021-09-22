import { ItemTag, ItemTypes } from '../../utils/itemTypeData';

export const enum SortCommandParams {
    SORT_EXPRESSION = 'sort-expr',
    MIN_LEVEL = 'min-level',
    MAX_LEVEL = 'max-level',
    WEAPON_ELEMENT = 'weapon-element',
    ASCENDING = 'asc-order',
    DA_TAG = 'da',
    DC_TAG = 'dc',
    DM_TAG = 'dm',
    FREE_STORAGE_TAG = 'free-storage',
    SEASONAL_TAG = 'seasonal',
    RARE_TAG = 'rare',
    SPECIAL_OFFER_TAG = 'special-offer',
}

export type SortableItemType = Exclude<ItemTypes, ItemTypes.ACCESSORY | ItemTypes.WINGS>;

export interface MongoSortExpression {
    [operator: string]: (number | string | boolean | MongoSortExpression)[];
}

export interface SortExpressionData {
    baseExpression?: string;
    pretty: string;
    compressed: string;
    mongo: MongoSortExpression;
}

export interface ItemTypeMongoFilter {
    category?: string;
    type?: ItemTypes | { $in: ItemTypes[] };
}

export interface SortFilterParams {
    itemType: SortableItemType;
    ascending?: boolean;
    sortExpression: SortExpressionData;
    weaponElement?: string;
    minLevel?: number;
    maxLevel?: number;
    excludeTags?: Set<ItemTag>;
    prevPageValueLimit?: number;
    nextPageValueLimit?: number;
}

export const enum SortItemTagFilterChoices {
    INCLUDE = 1,
    EXCLUDE,
}

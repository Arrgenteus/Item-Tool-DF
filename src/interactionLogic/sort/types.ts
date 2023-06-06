import { ItemTag, ItemType } from '../../utils/itemTypeData';

export const enum SortCommandParams {
    ITEM_TYPE = 'item-type',
    SORT_EXPRESSION = 'sort-expr',
    MIN_LEVEL = 'min-level',
    MAX_LEVEL = 'max-level',
    WEAPON_ELEMENT = 'weapon-element',
    ASCENDING = 'asc-order',
    CHAR_ID = 'char-id',
    DA_TAG = 'da',
    DC_TAG = 'dc',
    DM_TAG = 'dm',
    SEASONAL_TAG = 'seasonal',
    RARE_TAG = 'rare',
    SPECIAL_OFFER_TAG = 'special-offer',
}

export type SortItemTypeOption = ItemType | 'items';

export interface MongoSortExpression {
    [operator: string]: (number | string | boolean | MongoSortExpression)[];
}

export interface SortExpressionData {
    baseExpression?: string;
    pretty: string;
    mongo: MongoSortExpression;
}

type DatabaseItemType = Omit<ItemType, 'capeOrWings'> | 'cape' | 'wings';

export interface ItemTypeMongoFilter {
    category?: string;
    item_type?: DatabaseItemType | { $in: DatabaseItemType[] };
}

export interface SortFilterParams {
    itemType: ItemType;
    ascending?: boolean;
    sortExpression: SortExpressionData;
    weaponElement?: string;
    minLevel?: number;
    maxLevel?: number;
    charID?: string;
    excludeTags?: Set<ItemTag>;
    prevPageValueLimit?: number;
    nextPageValueLimit?: number;
}

export const enum SortItemTagFilterChoices {
    INCLUDE = 1,
    EXCLUDE,
}

export interface CharLevelAndItems {
    level: number;
    items: string[];
}

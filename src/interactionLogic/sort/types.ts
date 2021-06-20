import { ItemTypes } from '../../commonTypes/items';

export const SHORT_RESULT_LIMIT = 7;
export const LONG_RESULT_LIMIT = 15;

export enum SortSubCommand {
    WEAPON = 'weapon',
    CAPE = 'cape',
    HELM = 'helm',
    BELT = 'belt',
    NECKLACE = 'necklace',
    RING = 'ring',
    TRINKET = 'trinket',
    BRACER = 'bracer',
}

export enum SortCommandParams {
    SORT_EXPRESSION = 'sort-expression',
    MIN_LEVEL = 'min-level',
    MAX_LEVEL = 'max-level',
    WEAPON_ELEMENT = 'weapon-element',
    ASCENDING = 'ascending-order',
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
}

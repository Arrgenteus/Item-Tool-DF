import { ItemTag, ItemType } from '../../utils/itemTypeData';
import { SortCommandParams } from './types';

export const QUERY_RESULT_LIMIT = 7;

export const enum SORT_ACTIONS {
    NEXT_PAGE = 'npsr', // Next page sort results
    PREV_PAGE = 'ppsr', // previous page sort results
    SHOW_RESULTS = 'ssr', // show sort results
    TAG_SELECTION = 'sts', // sort tag selection
}

export const ITEM_TAG_FILTER_OPTION_NAMES: {
    optionName: SortCommandParams;
    tag: ItemTag;
}[] = [
    { optionName: SortCommandParams.DA_TAG, tag: 'da' },
    { optionName: SortCommandParams.DC_TAG, tag: 'dc' },
    { optionName: SortCommandParams.DM_TAG, tag: 'dm' },
    { optionName: SortCommandParams.SEASONAL_TAG, tag: 'se' },
    { optionName: SortCommandParams.RARE_TAG, tag: 'rare' },
    { optionName: SortCommandParams.SPECIAL_OFFER_TAG, tag: 'so' },
];

export const SORTABLE_TAGS: ItemTag[] = [
    'da',
    'dc',
    'dm',
    'se',
    'rare',
    'so',
    'fs',
    'guardian',
    'temp',
    'none',
];

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

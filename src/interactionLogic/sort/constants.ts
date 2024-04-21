import { ItemTag, ItemType } from '../../utils/itemTypeData';
import { SortCommandParams } from './types';

export const QUERY_RESULT_LIMIT = 7;
export const QUERY_SHORT_RESULT_LIMIT = 4;

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

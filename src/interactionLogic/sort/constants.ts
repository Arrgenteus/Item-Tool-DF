import { ItemTag } from '../../utils/itemTypeData';
import { SortableItemType, SortCommandParams } from './types';

export const QUERY_RESULT_LIMIT = 7;

export const ITEM_TAG_FILTER_OPTION_NAMES: { optionName: SortCommandParams; tag: ItemTag }[] = [
    { optionName: SortCommandParams.DA_TAG, tag: 'da' },
    { optionName: SortCommandParams.DC_TAG, tag: 'dc' },
    { optionName: SortCommandParams.DM_TAG, tag: 'dm' },
    { optionName: SortCommandParams.FREE_STORAGE_TAG, tag: 'fs' },
    { optionName: SortCommandParams.SEASONAL_TAG, tag: 'se' },
    { optionName: SortCommandParams.RARE_TAG, tag: 'rare' },
    { optionName: SortCommandParams.SPECIAL_OFFER_TAG, tag: 'so' },
    // { optionName: SortCommandParams.TEMPORARY_TAG, tag: 'temp' },
];

export const PRETTY_ITEM_TYPES: { [key in SortableItemType]: string } = {
    weapon: 'Weapons',
    belt: 'Belts',
    cape: 'Capes/Wings',
    ring: 'Rings',
    necklace: 'Necklaces',
    helm: 'Helms',
    bracer: 'Bracers',
    trinket: 'Trinkets',
};

export const PRETTY_TO_BASE_ITEM_TYPE: { [key: string]: SortableItemType } = {};
for (const itemType in PRETTY_ITEM_TYPES) {
    PRETTY_TO_BASE_ITEM_TYPE[PRETTY_ITEM_TYPES[itemType as SortableItemType]] =
        itemType as SortableItemType;
}

import { SearchableItemCategory, SearchableItemCategoryAlias } from './types';

export const searchCommandOptions: (SearchableItemCategory | SearchableItemCategoryAlias)[] = [
    'item',
    'wep',
    'sword',
    'axe',
    'mace',
    'staff',
    'wand',
    'dagger',
    'scythe',
    'acc',
    'cape',
    'helm',
    'belt',
    'necklace',
    'ring',
    'trinket',
    'bracer',
    'cosmetic',
    'pet',
];

export const compareCommandCategoryList: (SearchableItemCategory | SearchableItemCategoryAlias)[] =
    ['weapon', 'belt', 'bracer', 'cape', 'helm', 'necklace', 'ring', 'trinket'];

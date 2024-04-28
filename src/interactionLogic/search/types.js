export const DIFFERENT_SEARCH_RESULT_INTERACTION_ID = 'dsr';
export const MORE_SEARCH_RESULT_IMAGES_INTERACTION_ID = 'msra';
export const MORE_SEARCH_RESULT_IMAGES_LABEL = 'More Images';
export var ItemCategoryTypes;
(function (ItemCategoryTypes) {
    ItemCategoryTypes[ItemCategoryTypes["GEAR"] = 0] = "GEAR";
    ItemCategoryTypes[ItemCategoryTypes["WEAPON"] = 1] = "WEAPON";
    ItemCategoryTypes[ItemCategoryTypes["ACCESSORY"] = 2] = "ACCESSORY";
    ItemCategoryTypes[ItemCategoryTypes["PET"] = 3] = "PET";
})(ItemCategoryTypes || (ItemCategoryTypes = {}));
export const categoryAliasMapping = {
    acc: 'accessory',
    helmet: 'helm',
    wep: 'weapon',
    weap: 'weapon',
    neck: 'necklace',
    wing: 'wings',
    cloak: 'cape',
};

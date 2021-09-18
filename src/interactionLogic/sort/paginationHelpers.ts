import { parseSortExpression } from './sortExpressionParser';
import { SortableItemType, SortExpressionData, SortFilterParams } from './types';

export function getFiltersFromEmbed(
    embedTitle: string,
    embedDesc: string | undefined,
    itemType: SortableItemType
): SortFilterParams {
    const sortExpressionMatch: RegExpMatchArray = embedTitle.match(
        /^Sort (?:[a-zA-Z]+?) by (.+)$/i
    )!;
    const sortExpressionInput: string = sortExpressionMatch[1];
    const sortExpression: SortExpressionData = parseSortExpression(sortExpressionInput);

    if (!embedDesc) return { sortExpression, itemType };

    const [, weaponElement]: RegExpMatchArray | [] =
        embedDesc.match(/\*\*Weapon Element:\*\* ([a-z0-9?]+)/i) || [];
    const [, minLevel]: RegExpMatchArray | [] =
        embedDesc.match(/\*\*Min Level:\*\* ([0-9]+)/i) || [];
    const [, maxLevel]: RegExpMatchArray | [] =
        embedDesc.match(/\*\*Max Level:\*\* ([0-9]+)/i) || [];
    const ascending: boolean = !!embedDesc.match(/\*\*Order:\*\* Ascending/);

    return {
        sortExpression,
        itemType,
        weaponElement: weaponElement ? weaponElement.toLowerCase() : undefined,
        minLevel: minLevel !== undefined ? Number(minLevel) : undefined,
        maxLevel: maxLevel !== undefined ? Number(maxLevel) : undefined,
        ascending,
    };
}

import { MessageButton, Util, } from 'discord.js';
import config from '../../config';
import { INTERACTION_ID_ARG_SEPARATOR } from '../../utils/constants';
import { PRETTY_TAG_NAMES } from '../../utils/itemTypeData';
import { capitalize } from '../../utils/misc';
import { DIFFERENT_SEARCH_RESULT_INTERACTION_ID, MORE_SEARCH_RESULT_IMAGES_INTERACTION_ID, MORE_SEARCH_RESULT_IMAGES_LABEL, } from './types';
import { fetchItemSearchResult } from './search';
import { ValidationError } from '../../errors';
function getFormattedListOfItemTags(searchResultVariantInfo) {
    return ((searchResultVariantInfo || [])
        .map(({ tags }) => '`' +
        (tags.map((tag) => PRETTY_TAG_NAMES[tag]).join(', ') ||
            'Untagged') +
        '`')
        .join(' or ') || '`Untagged`');
}
function getFormattedListOfLocations(searchResultVariantInfo) {
    return ((searchResultVariantInfo || [])
        .map((variantInfo) => variantInfo.locations)
        .flat()
        .map((location) => location.link ? `[${location.name}](${location.link})` : location.name)
        .join(', ') || 'N/A');
}
function getFormattedBonusesOrResists(searchResultStats) {
    return (Object.entries(searchResultStats ?? {})
        .map(([statName, statValue]) => {
        if (typeof statValue === 'string') {
            return `${capitalize(statName)} +[${statValue}]`;
        }
        if (statValue < 0) {
            return `${capitalize(statName)} ${statValue}`;
        }
        return `${capitalize(statName)} +${statValue}`;
    })
        .join(', ') || 'None');
}
function getFormattedDamageRange(searchResult) {
    if (searchResult.scaled_damage === undefined &&
        searchResult.min_damage === undefined &&
        searchResult.max_damage === undefined) {
        return '';
    }
    return ('**Damage:** ' +
        (searchResult.scaled_damage
            ? 'Scaled'
            : `${searchResult.min_damage}-${searchResult.max_damage}`));
}
function getFormattedColorCustomInfo(searchResultColorCustomInfo) {
    if (!searchResultColorCustomInfo?.length)
        return;
    return `This item is color-custom to your ${searchResultColorCustomInfo.join(', ')} color`;
}
function getFormattedItemElements(searchResultElements) {
    return (searchResultElements || []).map(capitalize).join(' / ') || 'N/A';
}
function getFormattedPetAttackList(searchResultPetAttacks) {
    return ((searchResultPetAttacks || [])
        .map((attack, attackIndex) => `${attackIndex + 1}. ${attack.description}`)
        .join('\n') || 'This pet has no attacks.');
}
function getFormattedTrinketSkillInfo(searchResultTrinketSkill) {
    return (`**Effect:** ${Util.escapeMarkdown(searchResultTrinketSkill.effect)}\n` +
        `**Mana Cost:** ${searchResultTrinketSkill.mana_cost}\n` +
        `**Cooldown:** ${searchResultTrinketSkill.cooldown}\n` +
        `**Damage Type:** ${capitalize(searchResultTrinketSkill.damage_type) || 'N/A'}\n` +
        `**Element:** ${(searchResultTrinketSkill.element || []).map(capitalize).join(' / ') || 'N/A'}`);
}
function getEmbedsForFormattedWeaponSpecialInfo(searchResultWeaponSpecials, searchResultOldWeaponSpecials) {
    if (!searchResultWeaponSpecials?.length && !searchResultOldWeaponSpecials?.length)
        return;
    const embedFields = [];
    for (const weaponSpecial of searchResultOldWeaponSpecials ?? []) {
        let weaponSpecialDesc = `**Activation:** ${capitalize(weaponSpecial.activation)}\n` +
            `**Effect:** ${weaponSpecial.effect}`;
        if (weaponSpecial.elements?.length) {
            const prettyElementList = weaponSpecial.elements.map(capitalize).join(' / ');
            weaponSpecialDesc += `\n**Element:** ${prettyElementList}`;
        }
        if (weaponSpecial.activation.toLowerCase() !== 'click weapon') {
            const rateInPercent = Math.round(weaponSpecial.rate * 10 ** 5) / 10 ** 3;
            weaponSpecialDesc += `\n**Rate:** ${rateInPercent}%`;
        }
        embedFields.push({
            name: 'Weapon Special',
            value: weaponSpecialDesc,
            inline: true,
        });
    }
    for (const weaponSpecial of searchResultWeaponSpecials ?? []) {
        let weaponSpecialDesc = `**Effect:** ${weaponSpecial.effect}`;
        if (weaponSpecial.type === 'On-Demand') {
            weaponSpecialDesc += `\n**Charge Time:** ${weaponSpecial.charge_time}`;
            weaponSpecialDesc += `\n**Cooldown:** ${weaponSpecial.cooldown}`;
        }
        embedFields.push({
            name: weaponSpecial.type + ' Weapon Special',
            value: weaponSpecialDesc,
            inline: true,
        });
    }
    return embedFields;
}
export function getButtonListForSimilarResults({ responseBody, itemSearchCategory, userId, maxLevel, minLevel, }) {
    const searchResultTitle = responseBody.hits.hits[0]._source.full_title;
    const searchResultItemType = responseBody.hits.hits[0]._source.item_type;
    const similarResultList = responseBody.aggregations?.similar_results?.filtered?.buckets;
    if (!similarResultList)
        return [];
    const similarResults = similarResultList
        .map(
    // Remove the unneeded nesting from the output
    (bucket) => bucket.items.hits.hits[0]._source)
        .filter(
    // Filter out the original search result
    (similarItem) => similarItem.full_title !== searchResultTitle ||
        similarItem.item_type !== searchResultItemType)
        .map((similarItem) => similarItem.full_title === searchResultTitle
        ? `${similarItem.full_title} (${capitalize(similarItem.item_type)})`
        : similarItem.full_title);
    return similarResults.map((itemName) => ({
        type: 'BUTTON',
        label: itemName,
        customId: [
            DIFFERENT_SEARCH_RESULT_INTERACTION_ID,
            userId,
            itemName,
            itemSearchCategory,
            maxLevel?.toString(),
            minLevel?.toString(),
        ].join(INTERACTION_ID_ARG_SEPARATOR),
        style: 'SECONDARY',
    }));
}
export function getButtonForMoreItemImages({ itemName, itemSearchCategory, maxLevel, minLevel, }) {
    return {
        type: 'BUTTON',
        label: MORE_SEARCH_RESULT_IMAGES_LABEL,
        customId: [
            MORE_SEARCH_RESULT_IMAGES_INTERACTION_ID,
            itemName,
            itemSearchCategory,
            maxLevel?.toString(),
            minLevel?.toString(),
        ].join(INTERACTION_ID_ARG_SEPARATOR),
        style: 'PRIMARY',
    };
}
function getFormattedOtherLevelVariants(responseBody, searchResult) {
    const otherLevelVariantList = (responseBody.aggregations?.other_level_variants?.buckets[0]?.items?.hits?.hits || [])
        .map((searchHit) => searchHit._source)
        .filter(({ full_title: variantFullTitle, level: variantLevel, }) => !(variantFullTitle === searchResult.full_title &&
        variantLevel === searchResult.level));
    const repeatedVariantLevels = new Set();
    for (let index = 1; index < otherLevelVariantList.length; ++index) {
        const currentVariantLevel = otherLevelVariantList[index].level;
        const previousVariantLevel = otherLevelVariantList[index - 1].level;
        if (currentVariantLevel === previousVariantLevel) {
            repeatedVariantLevels.add(currentVariantLevel);
        }
    }
    return otherLevelVariantList
        .map(({ level: variantLevel, full_title: variantFullTitle, title: variantTitle, }) => variantLevel === searchResult.level ||
        repeatedVariantLevels.has(variantLevel) ||
        variantTitle !== searchResult.title
        ? `\`${variantLevel}\` _(${variantFullTitle})_`
        : '`' + variantLevel + '`')
        .join(', ');
}
function formatPetQueryResponse(searchResult) {
    const embedBody = `**Tags:** ${getFormattedListOfItemTags(searchResult.variant_info)}\n` +
        `**Locations:** ${getFormattedListOfLocations(searchResult.variant_info)}\n` +
        `**Level:** ${searchResult.level}\n` +
        `**Damage:** ${Util.escapeMarkdown(searchResult.damage) || '0-0'}\n` +
        `**Element:** ${getFormattedItemElements(searchResult.elements)}\n` +
        `**Bonuses:** ${getFormattedBonusesOrResists(searchResult.bonuses)}`;
    return {
        url: searchResult.link,
        title: searchResult.full_title,
        description: embedBody,
        image: { url: (searchResult.images || [])[0] },
        fields: [{ name: 'Attacks', value: getFormattedPetAttackList(searchResult.attacks) }],
    };
}
function formatAccessoryQueryResponse(searchResult) {
    let embedBody = `**Tags:** ${getFormattedListOfItemTags(searchResult.variant_info)}\n` +
        `**Locations:** ${getFormattedListOfLocations(searchResult.variant_info)}\n` +
        `**Level:** ${searchResult.level}\n` +
        `**Type:** ${capitalize(searchResult.item_type)}`;
    const isCosmetic = searchResult.common_tags.includes('cosmetic');
    if (!isCosmetic) {
        embedBody +=
            `\n**Bonuses:** ${getFormattedBonusesOrResists(searchResult.bonuses)}\n` +
                `**Resists:** ${getFormattedBonusesOrResists(searchResult.resists)}`;
    }
    if (searchResult.artifact_modifiers?.length) {
        embedBody += `\n**Modifies:** ${searchResult.artifact_modifiers.join(', ')}`;
    }
    const embedFields = [];
    if (searchResult.trinket_skill) {
        embedFields.push({
            name: `Trinket Skill`,
            value: getFormattedTrinketSkillInfo(searchResult.trinket_skill),
        });
    }
    return {
        url: searchResult.link,
        title: searchResult.full_title,
        description: embedBody,
        image: { url: (searchResult.images || [])[0] },
        fields: embedFields,
    };
}
function formatWeaponQueryResponse(searchResult) {
    let embedBody = `**Tags:** ${getFormattedListOfItemTags(searchResult.variant_info)}\n` +
        `**Locations:** ${getFormattedListOfLocations(searchResult.variant_info)}\n` +
        `**Level:** ${searchResult.level}\n` +
        `**Type:** ${capitalize(searchResult.item_type)}`;
    const isCosmetic = searchResult.common_tags.includes('cosmetic');
    if (!isCosmetic) {
        embedBody += '\n' + getFormattedDamageRange(searchResult);
    }
    embedBody += `\n**Element:** ${(searchResult.elements || []).map(capitalize).join(' / ') || 'N/A'}`;
    if (!isCosmetic) {
        embedBody +=
            `\n**Bonuses:** ${getFormattedBonusesOrResists(searchResult.bonuses)}` +
                `\n**Resists:** ${getFormattedBonusesOrResists(searchResult.resists)}`;
    }
    if (searchResult.artifact_modifiers?.length) {
        embedBody += `\n**Modifies:** ${searchResult.artifact_modifiers.join(', ')}`;
    }
    return {
        url: searchResult.link,
        title: searchResult.full_title,
        description: embedBody,
        image: { url: (searchResult.images || [])[0] },
        fields: getEmbedsForFormattedWeaponSpecialInfo(searchResult.new_weapon_specials, searchResult.weapon_specials),
    };
}
export function formatQueryResponse(responseBody) {
    const searchResultWithMetadata = responseBody.hits.hits[0];
    const searchResult = searchResultWithMetadata?._source;
    if (!searchResult)
        return;
    const searchResultIndex = searchResultWithMetadata._index;
    let itemQueryResponseEmbed;
    switch (searchResultIndex) {
        case config.PET_INDEX_NAME:
            itemQueryResponseEmbed = formatPetQueryResponse(searchResult);
            break;
        case config.ACCESSORY_INDEX_NAME:
            itemQueryResponseEmbed = formatAccessoryQueryResponse(searchResult);
            break;
        case config.WEAPON_INDEX_NAME:
            itemQueryResponseEmbed = formatWeaponQueryResponse(searchResult);
            break;
        default:
            throw new Error(`Invalid item search index '${searchResultIndex}'`); // Should never happen
    }
    const otherLevelVariants = getFormattedOtherLevelVariants(responseBody, searchResult);
    if (otherLevelVariants) {
        itemQueryResponseEmbed.description += `\n**Other Level Variants:** ${otherLevelVariants}`;
    }
    if (!itemQueryResponseEmbed.fields) {
        itemQueryResponseEmbed.fields = [];
    }
    itemQueryResponseEmbed.footer = {
        text: getFormattedColorCustomInfo(searchResult.color_custom),
    };
    return {
        embeds: [itemQueryResponseEmbed],
        components: [],
    };
}
export function updateMoreImagesButtonInButtonList({ itemName, itemSearchCategory, maxLevel, minLevel, messageComponents, }) {
    const moreImagesButtonOptions = getButtonForMoreItemImages({
        itemName,
        itemSearchCategory,
        maxLevel,
        minLevel,
    });
    const moreImagesButton = new MessageButton(moreImagesButtonOptions);
    if (!messageComponents.length) {
        messageComponents.push({
            type: 'ACTION_ROW',
            components: [moreImagesButton],
        });
        return;
    }
    const firstActionRowItem = messageComponents[0].components[0];
    if (firstActionRowItem && firstActionRowItem.type !== 'BUTTON')
        return;
    if (!firstActionRowItem ||
        firstActionRowItem.label !== MORE_SEARCH_RESULT_IMAGES_LABEL) {
        messageComponents[0].components.unshift(moreImagesButton);
    }
    else {
        messageComponents[0].components[0] = moreImagesButton;
    }
}
export function deleteMoreImagesButtonInButtonList(messageComponents) {
    if (!messageComponents.length)
        return;
    const firstActionRowItem = messageComponents[0].components[0];
    if (firstActionRowItem &&
        firstActionRowItem.type === 'BUTTON' &&
        firstActionRowItem.label === MORE_SEARCH_RESULT_IMAGES_LABEL) {
        messageComponents[0].components.shift();
        if (!messageComponents[0].components.length)
            messageComponents.shift();
    }
}
export function replaceSimilarResultWithCurrentResultInButtonList({ itemNameToReplace, itemNameReplacement, messageComponents, }) {
    if (!messageComponents.length)
        return;
    for (const actionRow of messageComponents) {
        for (const component of actionRow.components) {
            if (component.type !== 'BUTTON')
                continue;
            const buttonComponent = component;
            if (buttonComponent.label === itemNameToReplace) {
                buttonComponent.label = itemNameReplacement;
                const buttonComponentIdArgs = buttonComponent.customId.split(INTERACTION_ID_ARG_SEPARATOR);
                // Arg 0 is the handler name, arg 1 is the user ID, arg 2 is the name of the item
                buttonComponentIdArgs[2] = itemNameReplacement;
                buttonComponent.customId = buttonComponentIdArgs.join(INTERACTION_ID_ARG_SEPARATOR);
                return;
            }
        }
    }
}
function getGreaterLesserAndSameStats(item1Stats, item2Stats) {
    const greaterStats = {};
    const lesserStats = {};
    const equalStats = {};
    for (const statName in item1Stats) {
        const item1Stat = item1Stats[statName];
        const item2Stat = item2Stats[statName] ?? 0;
        if (item1Stat > item2Stat) {
            greaterStats[statName] = item1Stats[statName];
        }
        else if (item1Stat < item2Stat) {
            lesserStats[statName] = item1Stats[statName];
        }
        else {
            equalStats[statName] = item1Stats[statName];
        }
    }
    return [greaterStats, lesserStats, equalStats];
}
// function calculateStatDiffs(item1Stats: ItemStats, item2Stats: ItemStats): [ItemStats, ItemStats] {
//     const item1StatDiff: ItemStats = {};
//     const item2StatDiff: ItemStats = {};
//     for (const bonus in item1Stats) {
//         item1StatDiff[bonus] = statDiff;
//     }
//     for (const bonus in item2Stats) {
//         const statDiff: number = item2Stats[bonus] - (item1Stats[bonus] ?? 0);
//         if (statDiff === 0) continue;
//         item2StatDiff[bonus] = statDiff;
//     }
//     return [item1StatDiff, item2StatDiff];
// }
export async function getCompareResultMessage({ term1, term2, itemSearchCategory, }) {
    const [item1SearchResultResponseBody, item2SearchResultResponseBody] = await Promise.all([
        fetchItemSearchResult({
            term: term1,
            itemSearchCategory: itemSearchCategory,
        }),
        fetchItemSearchResult({
            term: term2,
            itemSearchCategory: itemSearchCategory,
        }),
    ]);
    const item1SearchResult = (item1SearchResultResponseBody.hits?.hits ?? [])[0]?._source;
    if (!item1SearchResult)
        throw new ValidationError(`Search results for ${term1} not found.`);
    const item2SearchResult = (item2SearchResultResponseBody.hits?.hits ?? [])[0]?._source;
    if (!item2SearchResult)
        throw new ValidationError(`Search results for ${term2} not found.`);
    const [item1GreaterBonuses, item1LesserBonuses, equalBonuses] = getGreaterLesserAndSameStats(item1SearchResult.bonuses, item2SearchResult.bonuses);
    const [item2GreaterBonuses, item2LesserBonuses] = getGreaterLesserAndSameStats(item2SearchResult.bonuses, item1SearchResult.bonuses);
    const [item1GreaterResists, item1LesserResists, equalResists] = getGreaterLesserAndSameStats(item1SearchResult.resists, item2SearchResult.resists);
    const [item2GreaterResists, item2LesserResists] = getGreaterLesserAndSameStats(item2SearchResult.resists, item1SearchResult.resists);
    const item1DamageDiff = getFormattedDamageRange(item1SearchResult);
    const item1Diff = `**Tags:** ${getFormattedListOfItemTags(item1SearchResult.variant_info)}\n` +
        (item1DamageDiff ? item1DamageDiff + '\n' : '') +
        `__Greater Stats__\n` +
        `**Bonuses:** ${getFormattedBonusesOrResists(item1GreaterBonuses)}\n` +
        `**Resists:** ${getFormattedBonusesOrResists(item1GreaterResists)}\n` +
        `__Lower Stats__\n` +
        `**Bonuses:** ${getFormattedBonusesOrResists(item1LesserBonuses)}\n` +
        `**Resists:** ${getFormattedBonusesOrResists(item1LesserResists)}\n`;
    const item2DamageDiff = getFormattedDamageRange(item2SearchResult);
    const item2Diff = `**Tags:** ${getFormattedListOfItemTags(item2SearchResult.variant_info)}\n` +
        (item2DamageDiff ? item2DamageDiff + '\n' : '') +
        `__Greater Stats__\n` +
        `**Bonuses:** ${getFormattedBonusesOrResists(item2GreaterBonuses)}\n` +
        `**Resists:** ${getFormattedBonusesOrResists(item2GreaterResists)}\n` +
        `__Lower Stats__\n` +
        `**Bonuses:** ${getFormattedBonusesOrResists(item2LesserBonuses)}\n` +
        `**Resists:** ${getFormattedBonusesOrResists(item2LesserResists)}\n`;
    const sameStatDesc = `**Bonuses:** ${getFormattedBonusesOrResists(equalBonuses)}\n` +
        `**Resists:** ${getFormattedBonusesOrResists(equalResists)}\n`;
    return {
        embeds: [
            {
                title: `Item Comparison`,
                fields: [
                    {
                        name: `__**${item1SearchResult.full_title}**__`,
                        value: item1Diff,
                        inline: true,
                    },
                    {
                        name: `__**${item2SearchResult.full_title}**__`,
                        value: item2Diff,
                        inline: true,
                    },
                    {
                        name: '__Equal stats__',
                        value: sameStatDesc,
                        inline: false,
                    },
                ],
            },
        ],
    };
}

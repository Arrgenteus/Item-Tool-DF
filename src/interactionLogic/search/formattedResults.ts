import {
    BaseMessageComponentOptions,
    EmbedFieldData,
    InteractionButtonOptions,
    MessageActionRowOptions,
    MessageButton,
    MessageButtonOptions,
    MessageEmbedOptions,
    MessageOptions,
    Snowflake,
    Util,
} from 'discord.js';
import config from '../../config';
import { INTERACTION_ID_ARG_SEPARATOR } from '../../utils/constants';
import { ItemTag, PRETTY_TAG_NAMES } from '../../utils/itemTypeData';
import { capitalize } from '../../utils/misc';
import {
    Location,
    ItemVariantInfo,
    Stat,
    PetAttack,
    DIFFERENT_SEARCH_RESULT_INTERACTION_ID,
    SearchableItemCategory,
    MORE_SEARCH_RESULT_IMAGES_INTERACTION_ID,
    MORE_SEARCH_RESULT_IMAGES_LABEL,
} from './types';

function getFormattedListOfItemTags(searchResultVariantInfo?: ItemVariantInfo[]): string {
    return (
        (searchResultVariantInfo || [])
            .map(
                ({ tags }: ItemVariantInfo) =>
                    '`' +
                    (tags.map((tag: ItemTag): string => PRETTY_TAG_NAMES[tag]).join(', ') ||
                        'Untagged') +
                    '`'
            )
            .join(' or ') || '`Untagged`'
    );
}

function getFormattedListOfLocations(searchResultVariantInfo?: ItemVariantInfo[]): string {
    return (
        (searchResultVariantInfo || [])
            .map((variantInfo: { locations: Location[] }) => variantInfo.locations)
            .flat()
            .map((location: Location) =>
                location.link ? `[${location.name}](${location.link})` : location.name
            )
            .join(', ') || 'N/A'
    );
}

function getFormattedBonusesOrResists(searchResultStats?: Stat[]) {
    return (
        (searchResultStats || [])
            .map((stat: Stat) => {
                if (typeof stat.value === 'string') {
                    return `${capitalize(stat.name)} +[${stat.value}]`;
                }
                if (stat.value < 0) {
                    return `${capitalize(stat.name)} ${stat.value}`;
                }
                return `${capitalize(stat.name)} +${stat.value}`;
            })
            .join(', ') || 'None'
    );
}

function getFormattedColorCustomInfo(searchResultColorCustomInfo?: string[]): string | undefined {
    if (!searchResultColorCustomInfo?.length) return;

    return `This item is color-custom to your ${searchResultColorCustomInfo.join(', ')} color`;
}

function getFormattedItemElements(searchResultElements?: string[]): string {
    return (searchResultElements || []).map(capitalize).join(' / ') || 'N/A';
}

function getFormattedPetAttackList(searchResultPetAttacks?: PetAttack[]) {
    return (
        (searchResultPetAttacks || [])
            .map(
                (attack: PetAttack, attackIndex: number) =>
                    `${attackIndex + 1}. ${attack.description}`
            )
            .join('\n') || 'This pet has no attacks.'
    );
}

function getFormattedTrinketSkillInfo(searchResultTrinketSkill: {
    effect: string;
    mana_cost: number;
    cooldown: number;
    damage_type: string;
    element?: string[];
}) {
    return (
        `**Effect:** ${Util.escapeMarkdown(searchResultTrinketSkill.effect)}\n` +
        `**Mana Cost:** ${searchResultTrinketSkill.mana_cost}\n` +
        `**Cooldown:** ${searchResultTrinketSkill.cooldown}\n` +
        `**Damage Type:** ${capitalize(searchResultTrinketSkill.damage_type) || 'N/A'}\n` +
        `**Element:** ${
            (searchResultTrinketSkill.element || []).map(capitalize).join(' / ') || 'N/A'
        }`
    );
}

function getEmbedsForFormattedWeaponSpecialInfo(
    searchResultWeaponSpecials: {
        activation: string;
        effect: string;
        elements?: string[];
        rate: number;
    }[]
): EmbedFieldData[] | undefined {
    if (!searchResultWeaponSpecials?.length) return;

    const embedFields: EmbedFieldData[] = [];
    for (const weaponSpecial of searchResultWeaponSpecials) {
        let weaponSpecialDesc =
            `**Activation:** ${capitalize(weaponSpecial.activation)}\n` +
            `**Effect:** ${weaponSpecial.effect}`;
        if (weaponSpecial.elements?.length) {
            const prettyElementList: string = weaponSpecial.elements.map(capitalize).join(' / ');
            weaponSpecialDesc += `\n**Element:** ${prettyElementList}`;
        }
        if (weaponSpecial.activation.toLowerCase() !== 'click weapon') {
            const rateInPercent: number = Math.round(weaponSpecial.rate * 10 ** 5) / 10 ** 3;
            weaponSpecialDesc += `\n**Rate:** ${rateInPercent}%`;
        }
        embedFields.push({
            name: 'Weapon Special',
            value: weaponSpecialDesc,
            inline: true,
        });
    }
    return embedFields;
}

export function getButtonListForSimilarResults({
    responseBody,
    itemSearchCategory,
    userId,
    maxLevel,
    minLevel,
}: {
    responseBody: any;
    itemSearchCategory: SearchableItemCategory;
    userId: Snowflake;
    maxLevel?: number;
    minLevel?: number;
}): (Required<BaseMessageComponentOptions> & MessageButtonOptions)[] {
    const searchResultTitle: string = responseBody.hits.hits[0]._source.full_title;
    const searchResultItemType: string = responseBody.hits.hits[0]._source.item_type;

    const similarResultList = responseBody.aggregations?.similar_results?.filtered?.buckets;
    if (!similarResultList) return [];

    const similarResults: string[] = similarResultList
        .map(
            // Remove the unneeded nesting from the output
            (bucket: {
                items: {
                    hits: {
                        hits: [
                            {
                                _source: {
                                    full_title: string;
                                    item_type: string;
                                };
                            }
                        ];
                    };
                };
            }): { full_title: string; item_type: string } => bucket.items.hits.hits[0]._source
        )
        .filter(
            // Filter out the original search result
            (similarItem: { full_title: string; item_type: string }) =>
                similarItem.full_title !== searchResultTitle ||
                similarItem.item_type !== searchResultItemType
        )
        .map((similarItem: { full_title: string; item_type: string }): string =>
            similarItem.full_title === searchResultTitle
                ? `${similarItem.full_title} (${capitalize(similarItem.item_type)})`
                : similarItem.full_title
        );

    return similarResults.map((itemName: string) => ({
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

export function getButtonForMoreItemImages({
    itemName,
    itemSearchCategory,
    maxLevel,
    minLevel,
}: {
    itemName: string;
    itemSearchCategory: SearchableItemCategory;
    maxLevel?: number;
    minLevel?: number;
}): Required<BaseMessageComponentOptions> & MessageButtonOptions {
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

function getFormattedOtherLevelVariants(
    responseBody: any,
    searchResult: { [key: string]: any; full_title: string }
): string {
    const otherLevelVariantList: { level: number; full_title: string; title: string }[] = (
        responseBody.aggregations?.other_level_variants?.buckets[0]?.items?.hits?.hits || []
    )
        .map(
            (searchHit: {
                [key: string]: any;
                _source: { level: number; full_title: string; title: string };
            }) => searchHit._source
        )
        .filter(
            ({
                full_title: variantFullTitle,
                level: variantLevel,
            }: {
                level: number;
                full_title: string;
            }) =>
                !(
                    variantFullTitle === searchResult.full_title &&
                    variantLevel === searchResult.level
                )
        );

    const repeatedVariantLevels: Set<number> = new Set();
    for (let index = 1; index < otherLevelVariantList.length; ++index) {
        const currentVariantLevel: number = otherLevelVariantList[index].level;
        const previousVariantLevel: number = otherLevelVariantList[index - 1].level;
        if (currentVariantLevel === previousVariantLevel) {
            repeatedVariantLevels.add(currentVariantLevel);
        }
    }

    return otherLevelVariantList
        .map(
            ({
                level: variantLevel,
                full_title: variantFullTitle,
                title: variantTitle,
            }: {
                level: number;
                full_title: string;
                title: string;
            }) =>
                variantLevel === searchResult.level ||
                repeatedVariantLevels.has(variantLevel) ||
                variantTitle !== searchResult.title
                    ? `\`${variantLevel}\` _(${variantFullTitle})_`
                    : '`' + variantLevel + '`'
        )
        .join(', ');
}

function formatPetQueryResponse(searchResult: any): MessageEmbedOptions {
    const embedBody: string =
        `**Tags:** ${getFormattedListOfItemTags(searchResult.variant_info)}\n` +
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

function formatAccessoryQueryResponse(searchResult: any): MessageEmbedOptions {
    let embedBody =
        `**Tags:** ${getFormattedListOfItemTags(searchResult.variant_info)}\n` +
        `**Locations:** ${getFormattedListOfLocations(searchResult.variant_info)}\n` +
        `**Level:** ${searchResult.level}\n` +
        `**Type:** ${capitalize(searchResult.item_type)}`;

    const isCosmetic: boolean = searchResult.common_tags.includes('cosmetic');
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

function formatWeaponQueryResponse(searchResult: any): MessageEmbedOptions {
    let embedBody =
        `**Tags:** ${getFormattedListOfItemTags(searchResult.variant_info)}\n` +
        `**Locations:** ${getFormattedListOfLocations(searchResult.variant_info)}\n` +
        `**Level:** ${searchResult.level}\n` +
        `**Type:** ${capitalize(searchResult.item_type)}`;

    const isCosmetic: boolean = searchResult.common_tags.includes('cosmetic');
    if (!isCosmetic) {
        embedBody +=
            `\n**Damage:** ` +
            (searchResult.scaled_damage
                ? 'Scaled'
                : `${searchResult.min_damage}-${searchResult.max_damage}`);
    }

    embedBody += `\n**Element:** ${
        (searchResult.elements || []).map(capitalize).join(' / ') || 'N/A'
    }`;

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
        fields: getEmbedsForFormattedWeaponSpecialInfo(searchResult.weapon_specials),
    };
}

export function formatQueryResponse(
    responseBody: any
): Pick<MessageOptions, 'components' | 'embeds'> | undefined {
    const searchResultWithMetadata = responseBody.hits.hits[0];
    const searchResult = searchResultWithMetadata?._source;

    if (!searchResult) return;

    const searchResultIndex: string = searchResultWithMetadata._index;

    let itemQueryResponseEmbed: MessageEmbedOptions;
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

    const otherLevelVariants: string = getFormattedOtherLevelVariants(responseBody, searchResult);
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

export function updateMoreImagesButtonInButtonList({
    itemName,
    itemSearchCategory,
    maxLevel,
    minLevel,
    messageComponents,
}: {
    itemName: string;
    itemSearchCategory: SearchableItemCategory;
    maxLevel?: number;
    minLevel?: number;
    messageComponents: MessageActionRowOptions[];
}): void {
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

    if (firstActionRowItem && firstActionRowItem.type !== 'BUTTON') return;

    if (
        !firstActionRowItem ||
        (firstActionRowItem as InteractionButtonOptions).label !== MORE_SEARCH_RESULT_IMAGES_LABEL
    ) {
        messageComponents[0].components.unshift(moreImagesButton);
    } else {
        messageComponents[0].components[0] = moreImagesButton;
    }
}

export function deleteMoreImagesButtonInButtonList(messageComponents: MessageActionRowOptions[]) {
    if (!messageComponents.length) return;

    const firstActionRowItem = messageComponents[0].components[0];
    if (
        firstActionRowItem &&
        firstActionRowItem.type === 'BUTTON' &&
        (firstActionRowItem as InteractionButtonOptions).label === MORE_SEARCH_RESULT_IMAGES_LABEL
    ) {
        messageComponents[0].components.shift();
        if (!messageComponents[0].components.length) messageComponents.shift();
    }
}

export function replaceSimilarResultWithCurrentResultInButtonList({
    itemNameToReplace,
    itemNameReplacement,
    messageComponents,
}: {
    itemNameToReplace: string;
    itemNameReplacement: string;
    messageComponents: MessageActionRowOptions[];
}): void {
    if (!messageComponents.length) return;

    for (const actionRow of messageComponents) {
        for (const component of actionRow.components) {
            if (component.type !== 'BUTTON') continue;
            const buttonComponent = component as InteractionButtonOptions;
            if (buttonComponent.label === itemNameToReplace) {
                buttonComponent.label = itemNameReplacement;
                const buttonComponentIdArgs = buttonComponent.customId.split(
                    INTERACTION_ID_ARG_SEPARATOR
                );
                // Arg 0 is the handler name, arg 1 is the user ID, arg 2 is the name of the item
                buttonComponentIdArgs[2] = itemNameReplacement;
                buttonComponent.customId = buttonComponentIdArgs.join(INTERACTION_ID_ARG_SEPARATOR);

                return;
            }
        }
    }
}

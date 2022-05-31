import cheerio, { CheerioAPI } from 'cheerio';
import got from 'got';
import { ValidationError } from '../../errors';
import { EphemeralMap } from '../../utils/EphemeralMap';
import { CharLevelAndItems } from './types';

const FETCH_TIMEOUT = 3 * 1000; // 3 seconds
const CHAR_INV_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes

const charLevelAndItems: EphemeralMap<string, { level: number; items: string[] }> =
    new EphemeralMap(CHAR_INV_EXPIRATION_TIME);

export async function getCharPage(charID: string, retries: number = 3): Promise<string> {
    return got('https://account.dragonfable.com/CharPage?id=' + charID, {
        timeout: { request: FETCH_TIMEOUT },
        http2: true,
        responseType: 'text',
        resolveBodyOnly: true,
        retry: {
            calculateDelay: ({ attemptCount }) => (attemptCount <= retries ? 100 : 0),
        },
    });
}

export async function getCharLevelAndItems(
    charID: string
): Promise<{ level: number; items: string[] }> {
    if (charLevelAndItems.has(charID)) {
        return charLevelAndItems.get(charID)!;
    }
    if (!charID.match(/^[\d]{2,12}$/)) {
        throw new ValidationError('Character IDs must be between 2 and 12 digits long.');
    }

    const body: string = await getCharPage(charID);
    const $: CheerioAPI = cheerio.load(body);

    const playerInfoSection = $('.card:nth-child(1) .card-body');
    const levelMatch: RegExpMatchArray | null = playerInfoSection
        .text()
        .match(/Level: ([\d]{1,2})\n/);

    if (!levelMatch) {
        throw new ValidationError(`Character ID \`${charID}\` was not found.`);
    }

    const level: number = Number(levelMatch[1]);
    const inventoryAndBankItems = $('.card:nth-child(2) .card-body, .card:nth-child(3) .card-body');
    const items: string[] = inventoryAndBankItems
        .text()
        .split('\n')
        .map((itemName: string) => itemName.trim())
        // Filter out stackable items
        .filter((item: string) => !!item && !item.match(/\(x[\d]+\)$/));

    const levelAndItems: CharLevelAndItems = { level, items };
    charLevelAndItems.set(charID, levelAndItems);

    return levelAndItems;
}

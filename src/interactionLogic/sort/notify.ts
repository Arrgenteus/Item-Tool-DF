import {
    CommandInteraction,
    MessageComponentInteraction,
    MessageFlags,
    Snowflake,
} from 'discord.js';
import fs from 'fs';
import lockfile from 'proper-lockfile';
import logger from '../../logger.js';
import config from '../../config.js';
import { SortExpressionData } from './types.js';

const SENT_NOTIF_FILE_PATH = 'dataStorage/sent-notifications.json';

const sentNotificationMap: { [userId: Snowflake]: any } = await fs.promises
    .readFile(SENT_NOTIF_FILE_PATH, { encoding: 'utf-8', flag: 'a+' })
    .then((fileContents: string) => (fileContents === '' ? {} : JSON.parse(fileContents)))
    .catch((err: Error) => {
        logger.error({ err, path: SENT_NOTIF_FILE_PATH }, 'Failed to load sent notification map');
        return {};
    });

export async function notifyUserOfUpdatedSortBehavior(
    interaction: CommandInteraction | MessageComponentInteraction,
    parsedSortExpression: SortExpressionData
) {
    if (interaction.user.id in sentNotificationMap) return;

    // Not a perfect check, but should be good enough
    if (
        !parsedSortExpression.pretty.includes('+ All') &&
        !parsedSortExpression.pretty.includes('+ (All') &&
        !parsedSortExpression.pretty.includes('All Res +') &&
        !parsedSortExpression.pretty.includes('* (All Res)') &&
        !parsedSortExpression.pretty.includes('(All Res) *')
    ) {
        return;
    }

    try {
        await interaction.followUp({
            content:
                'Hey, just a heads up:\n' +
                '- You will no longer need to explicitly add `+ All` when sorting by an elemental resistance to include all res. All res will be included automatically.\n' +
                '- This will be the case even while sorting by a combination of resistances. ' +
                'Eg. sorting by `Ice + Metal` will be equivalent to sorting by `Ice + All + Metal + All`.\n' +
                "- If you'd like to disable this behavior and only look for specific resist, add `- All` to your sort expression.\n\n" +
                `You shouldn't see this message again. If you do, blame <@${config.DEV_ID}>`,
            flags: MessageFlags.Ephemeral,
        });
    } catch (err) {
        logger.error(
            { err, interaction },
            'Failed to send sort behavior notification'
        );
        return;
    }

    sentNotificationMap[interaction.user.id] = true;

    try {
        const releaseFileLock: () => Promise<void> = await lockfile.lock(SENT_NOTIF_FILE_PATH);
        await fs.promises.writeFile(SENT_NOTIF_FILE_PATH, JSON.stringify(sentNotificationMap));
        await releaseFileLock();
    } catch (err) {
        logger.error(
            { err, path: SENT_NOTIF_FILE_PATH },
            'Failed to write sent notification map'
        );
    }
}

import { format } from 'util';
import config from './config.js';
import { Client as ElasticClient } from '@elastic/elasticsearch/index';
import { Db, MongoClient } from 'mongodb';

export const dbConnection: Promise<Db> = MongoClient.connect(
    format(
        'mongodb://%s:%s@%s:%s/?authMechanism=%s&authSource=%s',
        config.DB_USER,
        config.DB_PASS,
        config.DB_HOST,
        config.DB_PORT,
        config.DB_AUTH_MECHANISM,
        config.DB_NAME
    )
).then((client) => client.db(config.DB_NAME));

export const elasticClient: ElasticClient = new ElasticClient({
    node: config.ELASTIC_URL,
    auth: { username: config.ELASTIC_USER, password: config.ELASTIC_PASS },
});

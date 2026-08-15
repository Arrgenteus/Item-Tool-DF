import { format } from 'util';
import config from './config.js';
import { Client as ElasticClient } from '@elastic/elasticsearch/index';
import { Db, MongoClient } from 'mongodb';

export const dbConnection: Db = await MongoClient.connect(
    format(
        'mongodb://%s:%s@%s:%s/?authMechanism=%s&authSource=%s&directConnection=%s%s',
        config.DB_USER,
        encodeURIComponent(config.DB_PASS),
        config.DB_HOST,
        config.DB_PORT,
        config.DB_AUTH_MECHANISM,
        config.DB_NAME,
        config.DB_DIRECT_CONNECTION,
        config.DB_REPLICA_SET ? `&replicaSet=${encodeURIComponent(config.DB_REPLICA_SET)}` : ''
    )
).then((client) => client.db(config.DB_NAME));

export const elasticClient: ElasticClient = new ElasticClient({
    node: config.ELASTIC_URL,
    auth: { username: config.ELASTIC_USER, password: config.ELASTIC_PASS },
});

import { Client as ElasticClient } from '@elastic/elasticsearch';
import { MongoClient } from 'mongodb';
import { format } from 'util';
import config from './config';
export const dbConnection = MongoClient.connect(format('mongodb://%s:%s@%s:%s/?authMechanism=%s&authSource=%s', config.DB_USER, config.DB_PASS, config.DB_HOST, config.DB_PORT, config.DB_AUTH_MECHANISM, config.DB_NAME), {
    useUnifiedTopology: true,
    useNewUrlParser: true,
}).then((client) => client.db(config.DB_NAME));
export const elasticClient = new ElasticClient({
    node: config.ELASTIC_URL,
    auth: { username: config.ELASTIC_USER, password: config.ELASTIC_PASS },
});

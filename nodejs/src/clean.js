import zlib from 'node:zlib';
import { Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import bz2 from 'unbzip2-stream';
import N3 from 'n3';
import N3TollerantStreamParser from './N3TollerantStreamParser.js';
import { stringify } from 'csv-stringify';

const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;

const PROV_PREFIX = 'http://www.w3.org/ns/prov#';
const LSQV_PREFIX = 'http://lsq.aksw.org/vocab#';

const REMOTE_EXECUTION_PREFIX = 'http://lsq.aksw.org/re-';
const QUERY_PREFIX = 'http://lsq.aksw.org/lsqQuery-';

const EXECUTION_IRI_PROPERTY_NAME_MAPPING = {
    [PROV_PREFIX + 'atTime']: 'atTime',
    [LSQV_PREFIX + 'hostHash']: 'hostHash'
};
const EXECUTION_PROPERTY_NAME_IRI_MAPPING = Object.fromEntries(
    Object.entries(EXECUTION_IRI_PROPERTY_NAME_MAPPING).map(([iri, name]) => ([name, iri]))
);

const includedProperties = [
    ...['hash', 'hasRemoteExec', 'hostHash'].map(localName => LSQV_PREFIX + localName),
    PROV_PREFIX + 'atTime'
];

class ExecutionExtractor extends Transform {
    currentExecution = null;
    executionCache = {};
    executionToQueryCache = {};

    queryCache = {};
    confirmedQueries = new Set();
    queriesToBeIncluded = new Set();

    constructor() {
        super({objectMode: true});
    }

    _transform(quad, encoding, callback) {
        if (quad._subject.id.startsWith(REMOTE_EXECUTION_PREFIX)) {
            this.addExecutionProperty(quad._subject.id, EXECUTION_IRI_PROPERTY_NAME_MAPPING[quad._predicate.id], quad._object);
        } else if (quad._predicate.id === LSQV_PREFIX + 'hasRemoteExec') {
            this.addQueryExecutionAssociation(quad._subject.id, quad._object.id);
            this.includeQuery(quad._subject.id);
        } else if (quad._predicate.id === LSQV_PREFIX + 'text') {
            this.addQuery(quad._subject.id, quad._object.value);
        }
        callback();
    }

    getQueryHash(queryId) {
        return queryId.substring(QUERY_PREFIX.length);
    }

    addQuery(queryId, queryText) {
        const queryHash = this.getQueryHash(queryId);
        if (this.confirmedQueries.has(queryHash)) {
            return;
        }
        if (this.queriesToBeIncluded.has(queryHash)) {
            this.confirmedQueries.add(queryHash);
            this.outputQueryInfo(queryId, queryHash, queryText);
            this.queriesToBeIncluded.delete(queryHash);
        } else {
            this.queryCache[queryHash] = queryText;
        }
    }

    includeQuery(queryId) {
        const queryHash = this.getQueryHash(queryId);
        if (this.confirmedQueries.has(queryHash)) {
            return;
        }
        if (queryHash in this.queryCache) {
            this.confirmedQueries.add(queryHash);
            this.outputQueryInfo(queryId, queryHash, this.queryCache[queryHash]);
            delete this.queryCache[queryHash];
        } else { 
            this.queriesToBeIncluded.add(queryHash);
        }
    }

    outputQueryInfo(queryId, queryHash, queryText) {
        this.push({
            type: 'query',
            queryId, queryHash, queryText
        });
    }

    outputExecutionInfo(queryId, executionId, executionInfo) {
        this.push({
            type: 'execution',
            queryId, queryHash: this.getQueryHash(queryId),
            executionId, executionInfo
        });
    }

    outputExecutionInfoArray(queryId, executionId, executionInfoArray) {
        executionInfoArray.forEach(executionInfo => {
            this.outputExecutionInfo(queryId, executionId, executionInfo);
        });
    }

    addQueryExecutionAssociation(queryId, executionId) {
        if (executionId in this.executionCache) {
            const executionInfoArray = this.executionCache[executionId].shift();
            if (this.executionCache[executionId].length === 0) {
                delete this.executionCache[executionId];
            }
            this.outputExecutionInfoArray(queryId, executionId, executionInfoArray);
            return;
        }
        if (executionId in this.executionToQueryCache) {
            this.executionToQueryCache[executionId].push(queryId);
            return;
        }
        this.executionToQueryCache[executionId] = [queryId];
    }

    addExecutionSet(executionId, executionInfoArray) {
        if (executionId in this.executionToQueryCache) {
            const queryId = this.executionToQueryCache[executionId].shift();
            if (this.executionToQueryCache[executionId].length === 0) {
                delete this.executionToQueryCache[executionId];
            }
            this.outputExecutionInfoArray(queryId, executionId, executionInfoArray);
            return;
        }
        if (executionId in this.executionCache) {
            this.executionCache[executionId].push(executionInfoArray);
            return;
        }
        this.executionCache[executionId] = [executionInfoArray];
    }

    addExecutionProperty(queryExecIri, propertyName, propertyValue) {
        if (!this.currentExecution) {
            this.currentExecution = {
                id: queryExecIri,
                infoArray: [propertyName ? { [propertyName]: propertyValue } : {}]
            };
        } else {
            if (!propertyName) {
                return;
            }
            const lastInfo = this.currentExecution.infoArray.at(-1);
            if (propertyName in lastInfo) {
                this.currentExecution.infoArray.push({ [propertyName]: propertyValue });
                return;
            }
            this.currentExecution.infoArray.forEach(execInfo => {
                if (!(propertyName in execInfo)) {
                    execInfo[propertyName] = propertyValue;
                }
            });
        }
        if (propertyName === 'atTime') {
            this.addExecutionSet(this.currentExecution.id, this.currentExecution.infoArray);
            this.currentExecution = null;
        }
    }
}

class ExecutionAsQuadsSerializer extends Transform {
    execCount = 0;
    constructor(execsBaseURI) {
        super({objectMode: true});
        this.execsBaseURI = execsBaseURI;
    }

    _transform({queryId, executionInfo}, encoding, callback) {
        const executionId =
            `${this.execsBaseURI}${++this.execCount}`;
        this.push(quad(
            namedNode(queryId),
            namedNode(LSQV_PREFIX + 'hasRemoteExec'),
            namedNode(executionId)
        ));
        Object.entries(executionInfo).forEach(([propertyName, propertyValue]) => {
            this.push(quad(
                namedNode(executionId),
                namedNode(EXECUTION_PROPERTY_NAME_IRI_MAPPING[propertyName]),
                propertyValue
            ));
        });
        callback();
    }
}

class QueryAsQuadsSerializer extends Transform {
    constructor() {
        super({objectMode: true});
    }

    _transform({queryId, queryHash, queryText}, encoding, callback) {
        // const queryId = QUERY_PREFIX + queryHash;
        this.push(quad(
            namedNode(queryId),
            namedNode(LSQV_PREFIX + 'hash'),
            literal(queryHash)
        ));
        this.push(quad(
            namedNode(queryId),
            namedNode(LSQV_PREFIX + 'text'),
            literal(queryText)
        ));
        callback();
    }
}

class ObjectLogger extends Transform {
    constructor() {
        super({objectMode: true});
    }
    _transform(data, encoding, callback) {
        console.log(data);
        callback(null, data);
    }
};

class ForkStream extends Transform {
    constructor(stream) {
        super({objectMode: true});
        this.stream = stream;
    }
    _transform(data, encoding, callback) {
        this.stream.write(data);
        callback(null, data);
    }
    _flush(callback) {
        this.stream.end();
        callback();
    }
};


class DetourStream extends Transform {
    constructor(filterFn, stream) {
        super({objectMode: true});
        this.filterFn = filterFn;
        this.stream = stream;
    }
    _transform(data, encoding, callback) {
        if (this.filterFn(data)) {
            this.stream.write(data);
            callback();
        } else {
            callback(null, data);
        }
    }
    _flush(callback) {
        this.stream.end();
        callback();
    }
};

class DummySink  extends Writable {
    constructor() {
        super({objectMode: true});
    }
    _write(data, encoding, callback) {
        callback(null, data);
    }
};

export default async function cleanLsqStream(
        lsqReadStream, execsBaseURI,
        options = {}
        // queriesCSVWriteStream, execsCSVWriteStream,
        // queriesRDFWriteStream, execsRDFWriteStream,
    ) {
    const executionExtractor = new ExecutionExtractor();

    function ntGzWriter(outputWriter) {
        const writer = new N3.StreamWriter({format: 'N-Triples'});
        writer.pipe(zlib.createGzip()).pipe(outputWriter);
        return writer;
    }

    let querySink = new DummySink();
    if ('queriesCsv' in options) {
        querySink = stringify({
            header: true,
            columns: [
                {
                    key: 'queryHash',
                    header: 'queryId'
                },
                'queryText'
            ]
        })
        querySink.pipe(options.queriesCsv);
    }

    if ('queriesRdf' in options) {
        const newQuerySink = new QueryAsQuadsSerializer();
        newQuerySink.pipe(ntGzWriter(options.queriesRdf));
        querySink = new ForkStream(querySink);
        querySink.pipe(newQuerySink);
    }

    let executionSink = new DummySink();
    if ('execsCsv' in options) {
        executionSink = stringify({
            header: true,
            columns: [
                // 'execId',
                // {
                //     // key: 'queryHash',
                //     key: 'executionInfo',
                //     header: 'execId'
                // },
                {
                    key: 'queryHash',
                    header: 'queryId'
                },
                {
                    key: 'executionInfo.hostHash.value',
                    header: 'host'
                },
                {
                    key: 'executionInfo.atTime.value',
                    header: 'timestamp'
                }
            ],
            // cast: {
            //     object:  (value, context) => {
            //         if (context.column === 'executionInfo') {
            //             return "" + (context.records + 1);
            //         }
            //         return value;
            //     }
            // }
        })
        executionSink.pipe(options.execsCsv);
    }

    if ('execsRdf' in options) {
        const newExecutionSink = new ExecutionAsQuadsSerializer(execsBaseURI);
        newExecutionSink.pipe(ntGzWriter(options.execsRdf));
        executionSink = new ForkStream(executionSink);
        executionSink.pipe(newExecutionSink);
    }

    await pipeline(
        lsqReadStream,
        bz2(),
        new N3TollerantStreamParser({format: 'N-Triples'}),
        executionExtractor,
        new DetourStream(({type}) => (type === 'query'), querySink),
        executionSink
    );

}

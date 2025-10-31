import {
    CloudWatchLogsClient,
    CreateLogGroupCommand,
    CreateLogStreamCommand,
    DescribeLogStreamsCommand,
    InvalidSequenceTokenException,
    PutLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { Writable } from 'node:stream';

const pinoMetadataKey = Symbol.for('pino.metadata');

type CloudWatchTransportOptions = {
    logGroupName?: string;
    logStreamName?: string;
    region?: string;
    credentials?: {
        accessKeyId?: string;
        secretAccessKey?: string;
        sessionToken?: string;
    };
};

class CloudWatchTransport extends Writable {
    private readonly client: CloudWatchLogsClient;
    private readonly logGroupName: string;
    private readonly logStreamName: string;
    private readonly ready: Promise<void>;
    private sequenceToken?: string;
    private queue: Promise<void> = Promise.resolve();

    constructor(options: CloudWatchTransportOptions = {}) {
        super({ objectMode: false });
        this.logGroupName = options.logGroupName ?? process.env.CLOUDWATCH_LOG_GROUP ?? 'nestjs-app-logs';
        this.logStreamName =
            options.logStreamName ?? process.env.CLOUDWATCH_LOG_STREAM ?? `nestjs-stream-${process.pid}`;
        const region = options.region ?? process.env.AWS_REGION ?? process.env.CLOUDWATCH_REGION ?? 'us-east-1';
        const credentials =
            options.credentials?.accessKeyId && options.credentials?.secretAccessKey
                ? {
                      accessKeyId: options.credentials.accessKeyId,
                      secretAccessKey: options.credentials.secretAccessKey,
                  }
                : undefined;
        this.client = new CloudWatchLogsClient({
            region,
            credentials,
        });
        this.ready = this.setup();
    }

    async waitUntilReady(): Promise<void> {
        await this.ready;
    }

    _write(chunk: unknown, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
        const payload = this.toMessage(chunk, encoding);
        if (!payload) {
            callback();
            return;
        }

        this.queue = this.queue
            .then(async () => {
                await this.ready;
                await this.publish(payload);
            })
            .catch((error) => {
                console.error('Failed to publish CloudWatch log event', error);
            });

        this.queue.then(
            () => callback(),
            (error) => callback(error instanceof Error ? error : new Error(String(error))),
        );
    }

    private async setup(): Promise<void> {
        await this.ensureLogGroup();
        await this.ensureLogStream();
        await this.resolveSequenceToken();
    }

    private async ensureLogGroup(): Promise<void> {
        try {
            await this.client.send(new CreateLogGroupCommand({ logGroupName: this.logGroupName }));
        } catch (error) {
            if (!(error instanceof Error) || error.name !== 'ResourceAlreadyExistsException') {
                throw error;
            }
        }
    }

    private async ensureLogStream(): Promise<void> {
        try {
            await this.client.send(
                new CreateLogStreamCommand({
                    logGroupName: this.logGroupName,
                    logStreamName: this.logStreamName,
                }),
            );
        } catch (error) {
            if (!(error instanceof Error) || error.name !== 'ResourceAlreadyExistsException') {
                throw error;
            }
        }
    }

    private async resolveSequenceToken(): Promise<void> {
        const { logStreams } = await this.client.send(
            new DescribeLogStreamsCommand({
                logGroupName: this.logGroupName,
                logStreamNamePrefix: this.logStreamName,
            }),
        );
        const stream = logStreams?.find((item) => item.logStreamName === this.logStreamName);
        this.sequenceToken = stream?.uploadSequenceToken;
    }

    async flush(): Promise<void> {
        await this.queue;
    }

    private async publish(message: string): Promise<void> {
        const logEvents = [
            {
                message,
                timestamp: Date.now(),
            },
        ];

        try {
            const response = await this.client.send(
                new PutLogEventsCommand({
                    logGroupName: this.logGroupName,
                    logStreamName: this.logStreamName,
                    logEvents,
                    sequenceToken: this.sequenceToken,
                }),
            );
            this.sequenceToken = response.nextSequenceToken;
        } catch (error) {
            if (error instanceof InvalidSequenceTokenException && error.expectedSequenceToken) {
                this.sequenceToken = error.expectedSequenceToken;
                await this.publish(message);
                return;
            }

            throw error;
        }
    }

    private toMessage(chunk: unknown, encoding: BufferEncoding): string | undefined {
        if (typeof chunk === 'string') {
            const trimmed = chunk.trim();
            return trimmed.length > 0 ? trimmed : undefined;
        }

        if (Buffer.isBuffer(chunk)) {
            const resolvedEncoding: BufferEncoding =
                typeof encoding === 'string' && Buffer.isEncoding(encoding) ? (encoding as BufferEncoding) : 'utf8';
            const trimmed = chunk.toString(resolvedEncoding).trim();
            return trimmed.length > 0 ? trimmed : undefined;
        }

        if (chunk && typeof chunk === 'object') {
            const payload = { ...(chunk as Record<string, unknown>) };
            // Remove Pino metadata so it does not pollute log entries
            if (pinoMetadataKey in payload) {
                delete payload[pinoMetadataKey as unknown as keyof typeof payload];
            }
            try {
                const serialized = JSON.stringify(payload);
                return serialized.length > 0 ? serialized : undefined;
            } catch {
                return undefined;
            }
        }

        return undefined;
    }
}

export default async function createCloudWatchTransport(options?: CloudWatchTransportOptions): Promise<Writable> {
    const transport = new CloudWatchTransport(options);
    try {
        await transport.waitUntilReady();
        return transport;
    } catch (error) {
        transport.destroy();
        const reason =
            error instanceof Error && error.message ? error.message : 'Unknown error initialising CloudWatch transport';
        console.warn(`Disabling CloudWatch logging: ${reason}`);
        const noop = new Writable({
            write(_chunk, _encoding, callback) {
                callback();
            },
            final(callback) {
                callback();
            },
        });
        (noop as Writable & { flush?: () => Promise<void> }).flush = async () => Promise.resolve();
        return noop;
    }
}

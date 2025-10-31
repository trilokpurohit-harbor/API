import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { RoleModule } from './modules/role/role.module';
import { UserModule } from './modules/user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from '@app/core/config/configuration';
import { LoggerModule } from 'nestjs-pino';
import path from 'node:path';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        LoggerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const logToCloudWatch = configService.get<boolean>('logging.logToCloudWatch') ?? false;
                const logGroup = configService.get<string>('logging.cloudWatch.logGroup');
                const logStream = configService.get<string>('logging.cloudWatch.logStream');
                const region =
                    configService.get<string>('logging.cloudWatch.region') ??
                    process.env.AWS_REGION ??
                    process.env.CLOUDWATCH_REGION ??
                    'us-east-1';
                const credentials = configService.get<{
                    accessKeyId?: string;
                    secretAccessKey?: string;
                }>('logging.cloudWatch.credentials');
                const enableCloudWatch = logToCloudWatch || (!!logGroup && !!logStream);

                const resolvedLogGroup = logGroup ?? 'nestjs-app-logs';
                const resolvedLogStream = logStream ?? `nestjs-stream-${process.pid}`;
                const resolvedCredentials =
                    credentials?.accessKeyId && credentials?.secretAccessKey
                        ? {
                              accessKeyId: credentials.accessKeyId,
                              secretAccessKey: credentials.secretAccessKey,
                          }
                        : undefined;

                return {
                    assignResponse: true,
                    pinoHttp: {
                        redact: ['req.headers.authorization'],
                        transport: enableCloudWatch
                            ? {
                                  targets: [
                                      {
                                          target: 'pino-pretty',
                                          options: {
                                              colorize: true,
                                              translateTime: 'SYS:standard',
                                          },
                                      },
                                      {
                                          target: path.join(__dirname, 'common/loggers/pino-cloudwatch-transport.js'),
                                          options: {
                                              logGroupName: resolvedLogGroup,
                                              logStreamName: resolvedLogStream,
                                              region,
                                              credentials: resolvedCredentials,
                                          },
                                      },
                                  ],
                              }
                            : {
                                  target: 'pino-pretty',
                                  options: {
                                      colorize: true,
                                      translateTime: 'SYS:standard',
                                  },
                              },
                        serializers: {
                            req: (req) => ({
                                id: req.raw.id,
                                method: req.raw.method,
                                url: req.raw.url,
                                headers: req.raw.headers,
                                data: req.raw.body ?? req.body,
                                query: req.raw.query ?? req.query,
                            }),
                            res: (res) => ({
                                statusCode: res.raw.statusCode,
                            }),
                        },
                        customProps(req) {
                            return {
                                user: req['user'] || null,
                            };
                        },
                    },
                };
            },
        }),
        PrismaModule,
        UserModule,
        AuthModule,
        RoleModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}

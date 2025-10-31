import { UnprocessableEntityException, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config as loadEnv } from 'dotenv';
import { AppModule } from './app.module';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from '@common/filters/all-exceptions.filter';
import { ValidationError } from 'class-validator';
import { Logger } from 'nestjs-pino';

loadEnv();

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bufferLogs: true, cors: { origin: '*' } });
    const configService = app.get(NestConfigService);
    const logger = app.get(Logger);
    app.useLogger(logger);
    app.flushLogs();
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
        prefix: 'v',
    });
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            exceptionFactory: (validationErrors: ValidationError[] = []) => {
                const errMsg = {};
                validationErrors.forEach((error: ValidationError) => {
                    errMsg[error.property] = [...Object.values(error.constraints || {})];
                });
                return new UnprocessableEntityException({ data: errMsg });
            },
        }),
    );
    const apiDocumentationConfig = new DocumentBuilder()
        .setTitle('nestjs-test-project API')
        .setDescription('API documentation for nestjs-test-project')
        .setVersion('1.0.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Include the JWT access token',
                in: 'header',
            },
            'authorization',
        )
        .build();
    const document = SwaggerModule.createDocument(app, apiDocumentationConfig);
    SwaggerModule.setup('api', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });
    const port = configService.get<number>('PORT') || 3000;
    await app.listen(port);
    const url = await app.getUrl();
    const swaggerUrl = new URL('/api', url).toString().replace('[::1]', 'localhost');
    logger.log(`Swagger docs available at ${swaggerUrl}`, 'Bootstrap');
}
bootstrap().catch((error) => {
    // Ensure unexpected bootstrap errors surface clearly in dev tools
    console.error('Nest application failed to start', error);
    process.exit(1);
});

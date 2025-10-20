import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config as loadEnv } from 'dotenv';
import { AppModule } from './app.module';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const config = new DocumentBuilder()
    .setTitle('nestjs-test-project API')
    .setDescription('API documentation for nestjs-test-project')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  const url = await app.getUrl();
  const swaggerUrl = new URL('/api', url)
    .toString()
    .replace('[::1]', 'localhost');
  logger.log(`Swagger docs available at ${swaggerUrl}`);
}
bootstrap().catch((error) => {
  // Ensure unexpected bootstrap errors surface clearly in dev tools
  console.error('Nest application failed to start', error);
  process.exit(1);
});

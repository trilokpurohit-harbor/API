import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
    schema: './src/core/database/schema/',
    migrations: { path: './src/core/database/migrations/' },
});

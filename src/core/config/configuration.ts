export default () => ({
    port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
    database: {
        url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/dbname',
        shadowUrl: process.env.SHADOW_DATABASE_URL || 'postgresql://user:password@localhost:5432/dbname_shadow',
    },
    masterUser: {
        email: process.env.MASTER_USER_EMAIL || 'master@example.com',
        password: process.env.MASTER_USER_PASSWORD || 'ChangeMe123!',
        firstName: process.env.MASTER_USER_FIRST_NAME || 'Master',
        lastName: process.env.MASTER_USER_LAST_NAME || 'Admin',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'super-secret-change-me',
        expiration: process.env.JWT_EXPIRATION || '3600s',
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        logToCloudWatch: process.env.LOG_TO_CLOUDWATCH === 'true',
        cloudWatch: {
            logGroup: process.env.CLOUDWATCH_LOG_GROUP || undefined,
            logStream: process.env.CLOUDWATCH_LOG_STREAM || undefined,
            region: process.env.AWS_REGION || process.env.CLOUDWATCH_REGION || undefined,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.CLOUDWATCH_ACCESS_KEY_ID || undefined,
                secretAccessKey:
                    process.env.AWS_SECRET_ACCESS_KEY || process.env.CLOUDWATCH_SECRET_ACCESS_KEY || undefined,
                sessionToken: process.env.AWS_SESSION_TOKEN || process.env.CLOUDWATCH_SESSION_TOKEN || undefined,
            },
        },
    },
});

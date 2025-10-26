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
});

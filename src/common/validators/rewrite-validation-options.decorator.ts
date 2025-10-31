import { ArgumentMetadata, Injectable, SetMetadata, ValidationPipe, type ValidationPipeOptions } from '@nestjs/common';
import { ValidatorOptions } from 'class-validator';
import { Reflector } from '@nestjs/core';

export const REWRITE_VALIDATION_OPTIONS = 'rewrite_validation_options';

export function RewriteValidationOptions(options: ValidatorOptions) {
    return SetMetadata(REWRITE_VALIDATION_OPTIONS, options);
}

@Injectable()
export class UpdatableValidationPipe extends ValidationPipe {
    private readonly defaultValidatorOptions: ValidatorOptions;

    constructor(
        private reflector: Reflector,
        globalOptions: ValidationPipeOptions = {},
    ) {
        super(globalOptions);
        this.defaultValidatorOptions = {
            whitelist: globalOptions.whitelist,
            forbidNonWhitelisted: globalOptions.forbidNonWhitelisted,
            skipMissingProperties: globalOptions.skipMissingProperties,
            forbidUnknownValues: globalOptions.forbidUnknownValues,
        };
    }

    async transform(value: unknown, metadata: ArgumentMetadata) {
        if (metadata == null || metadata.metatype == null) return value;
        const overrideOptions = this.reflector.get<ValidatorOptions>(REWRITE_VALIDATION_OPTIONS, metadata.metatype);

        if (overrideOptions) {
            const original = { ...this.validatorOptions };
            this.validatorOptions = {
                ...this.defaultValidatorOptions,
                ...overrideOptions,
            };

            try {
                const res = await super.transform(value, metadata);
                this.validatorOptions = original;
                return res;
            } catch (err) {
                this.validatorOptions = original;
                throw err;
            }
        }

        return super.transform(value, metadata);
    }
}

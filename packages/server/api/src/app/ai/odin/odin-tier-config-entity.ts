import { BaseModelSchema, Platform } from '@activepieces/shared'
import { EntitySchema } from 'typeorm'
import { z } from 'zod'
import { ApIdSchema, BaseColumnSchemaPart } from '../../database/database-common'

const OdinTierName = z.enum(['fast', 'balanced', 'powerful'])

const OdinTierConfigSchema = z.object({
    ...BaseModelSchema,
    platformId: z.string(),
    tier: OdinTierName,
    modelId: z.string().min(1),
    enabled: z.boolean(),
})

type OdinTierConfigSchemaType = z.infer<typeof OdinTierConfigSchema> & { platform: Platform }

export const OdinTierConfigEntity = new EntitySchema<OdinTierConfigSchemaType>({
    name: 'odin_tier_config',
    columns: {
        ...BaseColumnSchemaPart,
        platformId: {
            ...ApIdSchema,
            nullable: false,
        },
        tier: {
            type: String,
            nullable: false,
        },
        modelId: {
            type: String,
            nullable: false,
        },
        enabled: {
            type: Boolean,
            nullable: false,
            default: true,
        },
    },
    indices: [
        {
            name: 'idx_odin_tier_config_platform_id_tier',
            columns: ['platformId', 'tier'],
            unique: true,
        },
    ],
    relations: {
        platform: {
            type: 'many-to-one',
            target: 'platform',
            cascade: true,
            onDelete: 'CASCADE',
            joinColumn: {
                name: 'platformId',
                foreignKeyConstraintName: 'fk_odin_tier_config_platform_id',
            },
        },
    },
})

export type OdinTierConfig = z.infer<typeof OdinTierConfigSchema>

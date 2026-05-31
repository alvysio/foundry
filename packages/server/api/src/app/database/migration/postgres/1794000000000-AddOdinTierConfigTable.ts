import { QueryRunner } from 'typeorm'
import { Migration } from '../../migration'

export class AddOdinTierConfigTable1794000000000 implements Migration {
    name = 'AddOdinTierConfigTable1794000000000'
    breaking = false
    release = '0.83.0'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "odin_tier_config" (
                "id" character varying(21) NOT NULL,
                "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "platformId" character varying NOT NULL,
                "tier" character varying NOT NULL,
                "modelId" character varying NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_odin_tier_config_id" PRIMARY KEY ("id")
            )
        `)

        await queryRunner.query(`
            CREATE UNIQUE INDEX "idx_odin_tier_config_platform_id_tier"
            ON "odin_tier_config" ("platformId", "tier")
        `)

        await queryRunner.query(`
            ALTER TABLE "odin_tier_config"
            ADD CONSTRAINT "fk_odin_tier_config_platform_id"
            FOREIGN KEY ("platformId") REFERENCES "platform"("id") ON DELETE CASCADE
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "odin_tier_config" DROP CONSTRAINT IF EXISTS "fk_odin_tier_config_platform_id"')
        await queryRunner.query('DROP INDEX IF EXISTS "idx_odin_tier_config_platform_id_tier"')
        await queryRunner.query('DROP TABLE IF EXISTS "odin_tier_config"')
    }
}

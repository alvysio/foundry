import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOdinTierConfigTableSqlite1794000000000 implements MigrationInterface {
    name = 'AddOdinTierConfigTableSqlite1794000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "odin_tier_config" (
                "id" varchar(21) PRIMARY KEY NOT NULL,
                "created" datetime NOT NULL DEFAULT (datetime('now')),
                "updated" datetime NOT NULL DEFAULT (datetime('now')),
                "platformId" varchar NOT NULL,
                "tier" varchar NOT NULL,
                "modelId" varchar NOT NULL,
                "enabled" boolean NOT NULL DEFAULT 1,
                CONSTRAINT "fk_odin_tier_config_platform_id" FOREIGN KEY ("platformId") REFERENCES "platform" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `)
        await queryRunner.query(`
            CREATE UNIQUE INDEX "idx_odin_tier_config_platform_id_tier" ON "odin_tier_config" ("platformId", "tier")
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX "idx_odin_tier_config_platform_id_tier"')
        await queryRunner.query('DROP TABLE "odin_tier_config"')
    }
}

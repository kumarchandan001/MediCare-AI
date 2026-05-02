"""
Database migration script for Google Fit integration.
Adds new columns to existing tables and creates google_fit_syncs table.
"""
import asyncio
from sqlalchemy import text
from core.database import engine


async def migrate():
    async with engine.begin() as conn:
        # Helper to get column names
        def get_cols(sync_conn, table):
            return [c["name"] for c in sync_conn.dialect.get_columns(sync_conn, table)]

        def get_tables(sync_conn):
            return sync_conn.dialect.get_table_names(sync_conn)

        # 1) User table: Google Fit columns
        cols = await conn.run_sync(lambda c: get_cols(c, "users"))

        new_user_cols = {
            "google_fit_connected": "ALTER TABLE users ADD COLUMN google_fit_connected BOOLEAN DEFAULT FALSE NOT NULL",
            "google_access_token": "ALTER TABLE users ADD COLUMN google_access_token TEXT",
            "google_refresh_token": "ALTER TABLE users ADD COLUMN google_refresh_token TEXT",
            "google_token_expiry": "ALTER TABLE users ADD COLUMN google_token_expiry TIMESTAMPTZ",
            "google_fit_last_sync": "ALTER TABLE users ADD COLUMN google_fit_last_sync TIMESTAMPTZ",
            "google_fit_auto_sync": "ALTER TABLE users ADD COLUMN google_fit_auto_sync BOOLEAN DEFAULT FALSE NOT NULL",
            "google_fit_scopes": "ALTER TABLE users ADD COLUMN google_fit_scopes TEXT",
        }
        for col_name, sql in new_user_cols.items():
            if col_name not in cols:
                await conn.execute(text(sql))
                print(f"  + users.{col_name}")

        # 2) health_monitoring: data_source, glucose_level
        hm_cols = await conn.run_sync(lambda c: get_cols(c, "health_monitoring"))
        if "data_source" not in hm_cols:
            await conn.execute(text(
                "ALTER TABLE health_monitoring ADD COLUMN data_source VARCHAR(30) DEFAULT 'manual'"
            ))
            print("  + health_monitoring.data_source")
        if "glucose_level" not in hm_cols:
            await conn.execute(text(
                "ALTER TABLE health_monitoring ADD COLUMN glucose_level FLOAT"
            ))
            print("  + health_monitoring.glucose_level")

        # 3) activity_tracking: data_source, distance, heart_rate_avg, activity_date, notes
        at_cols = await conn.run_sync(lambda c: get_cols(c, "activity_tracking"))
        at_new = {
            "data_source": "ALTER TABLE activity_tracking ADD COLUMN data_source VARCHAR(30) DEFAULT 'manual'",
            "distance": "ALTER TABLE activity_tracking ADD COLUMN distance FLOAT",
            "heart_rate_avg": "ALTER TABLE activity_tracking ADD COLUMN heart_rate_avg INTEGER",
            "activity_date": "ALTER TABLE activity_tracking ADD COLUMN activity_date TIMESTAMPTZ",
            "notes": "ALTER TABLE activity_tracking ADD COLUMN notes TEXT",
        }
        for col_name, sql in at_new.items():
            if col_name not in at_cols:
                await conn.execute(text(sql))
                print(f"  + activity_tracking.{col_name}")

        # 4) bmi_history: bmi_category, notes
        bmi_cols = await conn.run_sync(lambda c: get_cols(c, "bmi_history"))
        if "bmi_category" not in bmi_cols:
            await conn.execute(text(
                "ALTER TABLE bmi_history ADD COLUMN bmi_category VARCHAR(30)"
            ))
            print("  + bmi_history.bmi_category")
        if "notes" not in bmi_cols:
            await conn.execute(text(
                "ALTER TABLE bmi_history ADD COLUMN notes TEXT"
            ))
            print("  + bmi_history.notes")

        # 5) Create google_fit_syncs table if not exists
        tables = await conn.run_sync(get_tables)
        if "google_fit_syncs" not in tables:
            await conn.execute(text("""
                CREATE TABLE google_fit_syncs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    sync_type VARCHAR(20) NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    started_at TIMESTAMPTZ DEFAULT NOW(),
                    completed_at TIMESTAMPTZ,
                    date_range_from TIMESTAMPTZ,
                    date_range_to TIMESTAMPTZ,
                    error_message TEXT,
                    vitals_synced INTEGER DEFAULT 0,
                    activities_synced INTEGER DEFAULT 0,
                    sleep_records INTEGER DEFAULT 0,
                    weight_records INTEGER DEFAULT 0,
                    total_steps INTEGER DEFAULT 0,
                    avg_heart_rate FLOAT,
                    sync_summary TEXT
                )
            """))
            await conn.execute(text(
                "CREATE INDEX ix_gfs_id ON google_fit_syncs(id)"
            ))
            await conn.execute(text(
                "CREATE INDEX ix_gfs_user_id ON google_fit_syncs(user_id)"
            ))
            print("  + Created google_fit_syncs table")

        print("\nMigration complete!")


if __name__ == "__main__":
    asyncio.run(migrate())

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    app_name: str = "Betalab Simulation API"
    app_version: str = "0.1.0"
    experiments_db_path: str = field(
        default_factory=lambda: os.getenv(
            "BETALAB_EXPERIMENTS_DB_PATH",
            "./data/experiments.sqlite3",
        )
    )


settings = Settings()

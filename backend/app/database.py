from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


def normalize_db_url(url: str) -> str:
    """Normalize legacy postgres:// scheme to postgresql:// for SQLAlchemy."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


db_url = normalize_db_url(settings.DATABASE_URL)
migration_url = normalize_db_url(settings.DATABASE_URL_UNPOOLED or settings.DATABASE_URL)

# Configure primary application engine (pooled for web traffic)
engine_kwargs = {}
if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(db_url, **engine_kwargs)

# Configure migration engine (direct/unpooled for DDL and schema management)
migration_engine_kwargs = {}
if migration_url.startswith("sqlite"):
    migration_engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    migration_engine_kwargs["pool_pre_ping"] = True
    migration_engine_kwargs["pool_recycle"] = 300

migration_engine = create_engine(migration_url, **migration_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


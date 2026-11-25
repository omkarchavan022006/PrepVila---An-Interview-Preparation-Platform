import os
import logging
from pymongo import MongoClient
from pymongo.errors import PyMongoError

logger = logging.getLogger(__name__)

client = None
db = None


def connect_mongodb():
    global client, db

    try:
        mongodb_uri = os.getenv("MONGODB_HOST")
        database_name = os.getenv("MONGODB_DB")

        if not mongodb_uri or not database_name:
            raise ValueError("MongoDB environment variables are missing")

        client = MongoClient(
            mongodb_uri,
            serverSelectionTimeoutMS=10000
        )

        client.admin.command("ping")

        db = client[database_name]

        logger.info("MongoDB connection established.")

        return db

    except (PyMongoError, ValueError) as error:
        logger.error("MongoDB connection failed (%s).", type(error).__name__)
        raise


def get_database():
    if db is None:
        return connect_mongodb()

    return db

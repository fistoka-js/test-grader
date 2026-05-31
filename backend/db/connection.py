import psycopg2
import os

def get_connection():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        user=os.environ.get("DB_USER", "jacob"),
        password=os.environ.get("DB_PASSWORD", "password123"),
        dbname=os.environ.get("DB_NAME", "testgrader")
    )
"""
Database Initialization Script

This script creates all necessary database tables.
Run this after deploying to Railway to set up your PostgreSQL database.
"""

import os
import sys
from sqlalchemy import create_engine, text

# Add ml-service to path
sys.path.insert(0, os.path.dirname(__file__))

from database import Base, PredictionRecord, User


def init_database():
    """Initialize the database with all tables."""
    
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable not set!")
        print("   Set it in Railway: ml-service → Variables → DATABASE_URL")
        return False
    
    print(f"🔗 Connecting to database: {database_url.split('@')[1]}")
    
    try:
        # Create engine
        engine = create_engine(database_url)
        
        # Test connection
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        
        print("✅ Database connection successful!")
        
        # Create all tables
        print("📋 Creating tables...")
        Base.metadata.create_all(engine)
        
        print("✅ Successfully created tables:")
        print("   - User")
        print("   - PredictionRecord")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False


if __name__ == '__main__':
    success = init_database()
    if success:
        print("\n🎉 Database initialization complete!")
        sys.exit(0)
    else:
        print("\n⚠️  Database initialization failed!")
        sys.exit(1)

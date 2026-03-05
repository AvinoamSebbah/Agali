"""
Module pour vérifier les fichiers déjà traités dans la DB
"""
import asyncio
from pathlib import Path


class ProcessedFilesChecker:
    """Check if files have been processed in the database"""
    
    _processed_files = None
    _last_load_time = None
    
    @classmethod
    async def load_processed_files(cls, force_reload=False):
        """Load processed files from database (cached)"""
        import time
        
        # Cache for 5 minutes
        if cls._processed_files is not None and not force_reload:
            if cls._last_load_time and (time.time() - cls._last_load_time) < 300:
                return cls._processed_files
        
        try:
            from prisma import Prisma
            
            db = Prisma()
            await db.connect()
            
            result = await db.query_raw("SELECT file_name FROM processed_files")
            cls._processed_files = {row['file_name'] for row in result}
            cls._last_load_time = time.time()
            
            await db.disconnect()
            
            return cls._processed_files
        except Exception:
            # If DB not available, return empty set
            cls._processed_files = set()
            return cls._processed_files
    
    @classmethod
    def is_file_processed_sync(cls, filename):
        """Check if file is processed (synchronous version - uses cached data)"""
        if cls._processed_files is None:
            # Not loaded yet, assume not processed
            return False
        
        # Extract just the filename if it's a path
        if isinstance(filename, Path):
            filename = filename.name
        elif '/' in filename or '\\' in filename:
            filename = Path(filename).name
        
        return filename in cls._processed_files
    
    @classmethod
    async def is_file_processed(cls, filename):
        """Check if file is processed (async version)"""
        await cls.load_processed_files()
        return cls.is_file_processed_sync(filename)
    
    @classmethod
    def filter_unprocessed_files(cls, file_names):
        """Filter out files that have already been processed"""
        if cls._processed_files is None:
            # Not loaded yet, return all
            return file_names
        
        unprocessed = []
        for filename in file_names:
            # Extract just the filename
            name = filename
            if isinstance(name, Path):
                name = name.name
            elif '/' in name or '\\' in name:
                name = Path(name).name
            
            if name not in cls._processed_files:
                unprocessed.append(filename)
        
        return unprocessed


# Helper function for easy access
def load_processed_files():
    """Load processed files (sync wrapper for async)"""
    loop = None
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(ProcessedFilesChecker.load_processed_files())


def is_file_processed(filename):
    """Check if file is processed (uses cached data)"""
    return ProcessedFilesChecker.is_file_processed_sync(filename)


def filter_unprocessed_files(file_names):
    """Filter unprocessed files (uses cached data)"""
    return ProcessedFilesChecker.filter_unprocessed_files(file_names)

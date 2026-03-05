"""Stop controller for multiprocessing scraper"""
import os
import tempfile


class StopController:
    """Manage stop flag across multiple processes using a file"""
    
    _stop_file = os.path.join(tempfile.gettempdir(), "agali_scraper_stop.flag")
    
    @classmethod
    def request_stop(cls):
        """Request all scraping processes to stop"""
        try:
            with open(cls._stop_file, 'w') as f:
                f.write('STOP')
            return True
        except Exception:
            return False
    
    @classmethod
    def should_stop(cls):
        """Check if stop has been requested"""
        return os.path.exists(cls._stop_file)
    
    @classmethod
    def clear_stop(cls):
        """Clear the stop flag (at start of scraping)"""
        try:
            if os.path.exists(cls._stop_file):
                os.remove(cls._stop_file)
            return True
        except Exception:
            return False

import os
import traceback

from .logger import Logger
from .status import log_folder_details
from .databases import JsonDataBase
from .status import _now, get_output_folder
from .lock_utils import lock_by_string
from .db_checker import ProcessedFilesChecker


class ScraperStatus:
    """A class that abstracts the database interface for scraper status."""

    STARTED = "started"
    COLLECTED = "collected"
    DOWNLOADED = "downloaded"
    FAILED = "fail"
    ESTIMATED_SIZE = "estimated_size"
    VERIFIED_DOWNLOADS = "verified_downloads"

    def __init__(self, database_name, base_path, folder_name=None) -> None:
        self.database = JsonDataBase(
            database_name, get_output_folder(base_path, folder_name=folder_name)
        )
        self.task_id = _now().strftime("%Y%m%d%H%M%S")
        self.filter_between_itrations = False

    @lock_by_string()
    def on_scraping_start(self, limit, files_types, **additional_info):
        """Report that scraping has started."""
        self._insert_an_update(
            ScraperStatus.STARTED,
            limit=limit,
            files_requested=files_types,
            **additional_info,
        )

    def enable_collection_status(self):
        """enable data collection to status files"""
        self.database.enable_collection_status()

    def enable_aggregation_between_runs(self):
        """allow tracking the downloaded file and don't downloading again if downloaded"""
        self.filter_between_itrations = True

    @lock_by_string()
    def on_collected_details(
        self,
        file_name_collected_from_site,
        links_collected_from_site="",
        **additional_info,
    ):
        """Report that file details have been collected."""
        self._insert_an_update(
            ScraperStatus.COLLECTED,
            file_name_collected_from_site=file_name_collected_from_site,
            links_collected_from_site=links_collected_from_site,
            **additional_info,
        )

    @lock_by_string()
    def on_download_completed(self, **additional_info):
        """Report that the file has been downloaded."""
        self._insert_an_update(ScraperStatus.DOWNLOADED, **additional_info)
        self._add_downloaded_files_to_list(**additional_info)

    def filter_already_downloaded(
        self, storage_path, files_names_to_scrape, filelist, by_function=lambda x: x
    ):
        """Filter files already existing in long-term memory or previously downloaded."""
        
        initial_count = len(filelist)
        Logger.info(f"[FILTER] Filtering {initial_count} files for download...")
        
        # STEP 1: Check disk FIRST (source of truth!)
        # If file exists in dumps/, don't download again
        try:
            # Use os.listdir() with glob pattern matching as os.scandir may be limited on Windows
            import glob
            pattern = os.path.join(storage_path, "*")
            all_paths = glob.glob(pattern)
            exits_on_disk = [os.path.basename(p) for p in all_paths if os.path.isfile(p)]
            Logger.info(f"[DISK] Found {len(exits_on_disk)} files already on disk in {storage_path}")
        except FileNotFoundError:
            exits_on_disk = []
            Logger.info(f"[DISK] Storage path {storage_path} does not exist yet")
        
        # Handle files_names_to_scrape (force re-download)
        if files_names_to_scrape:
            # Delete any files we want to retry downloading
            for file in exits_on_disk:
                if file.split(".")[0] in files_names_to_scrape:
                    os.remove(os.path.join(storage_path, file))
            
            # Refresh the list after deletion
            import glob
            pattern = os.path.join(storage_path, "*")
            all_paths = glob.glob(pattern)
            exits_on_disk = [os.path.basename(p) for p in all_paths if os.path.isfile(p)]
            
            # Filter the files to download
            filelist = list(
                filter(lambda x: by_function(x) in files_names_to_scrape, filelist)
            )
        
        # Filter by disk first
        # CRITICAL: Compare filenames WITHOUT extensions on both sides
        # FTP has files like: Price123.aspx.xml.gz OR Price123.gz
        # Disk has decompressed files like: Price123.aspx.xml
        exits_on_disk_base = set()
        for disk_file in exits_on_disk:
            # Remove ALL extensions in correct order
            base_name = disk_file
            for ext in ['.aspx.xml', '.xml', '.gz']:
                base_name = base_name.replace(ext, '')
            exits_on_disk_base.add(base_name)
        
        disk_filtered = []
        for file in filelist:
            filename = by_function(file)
            # Remove all extensions in correct order from FTP filename
            filename_base = filename
            for ext in ['.aspx.xml.gz', '.aspx.xml', '.xml.gz', '.xml', '.gz']:
                filename_base = filename_base.replace(ext, '')
            if filename_base not in exits_on_disk_base:
                disk_filtered.append(file)
        
        disk_skip_count = len(filelist) - len(disk_filtered)
        if disk_skip_count > 0:
            Logger.info(f"[DISK] Skipped {disk_skip_count} files already on disk")
        
        filelist = disk_filtered
        
        # STEP 2: Check PostgreSQL processed_files table
        # If file already imported to database, don't download again
        processed_count = 0
        if ProcessedFilesChecker._processed_files is not None:
            db_count = len(ProcessedFilesChecker._processed_files)
            Logger.info(f"[DB] Checking against {db_count} processed files in database")
            
            unprocessed_filelist = []
            for file in filelist:
                filename = by_function(file)
                # Extract just the filename (remove path if present)
                if '/' in filename or '\\' in filename:
                    filename = os.path.basename(filename)
                
                # CRITICAL: Remove ALL extensions for comparison
                # Download: Promo123.gz → Promo123
                # DB: Promo123.aspx.xml → Promo123
                filename_base = filename.replace('.aspx.xml', '').replace('.xml', '').replace('.gz', '')
                
                # Check all possible extension variants in DB
                is_processed = (
                    ProcessedFilesChecker.is_file_processed_sync(filename_base + '.aspx.xml') or
                    ProcessedFilesChecker.is_file_processed_sync(filename_base + '.xml') or
                    ProcessedFilesChecker.is_file_processed_sync(filename_base + '.gz') or
                    ProcessedFilesChecker.is_file_processed_sync(filename_base)
                )
                
                if not is_processed:
                    unprocessed_filelist.append(file)
                else:
                    processed_count += 1
            
            if processed_count > 0:
                Logger.info(f"[DB] Skipped {processed_count} files already processed in database")
            filelist = unprocessed_filelist
        else:
            Logger.warning("[DB] Database lookup disabled - processed files not loaded")
        
        # NOTE: JSON database check REMOVED - causes desync issues
        # We rely ONLY on disk and PostgreSQL for accuracy
        
        final_count = len(filelist)
        total_filtered = initial_count - final_count
        Logger.info(
            f"[FILTER] Result: {initial_count} -> {final_count} files to download "
            f"(filtered {total_filtered} files)"
        )
        
        return filelist

    def _add_downloaded_files_to_list(self, results, **_):
        """Add downloaded files to the MongoDB collection."""
        if self.database.is_collection_enabled():
            when = _now()

            documents = []
            for res in results:
                if res["extract_succefully"]:
                    documents.append(
                        {"file_name": res["file_name"], "when": when},
                    )
            self.database.insert_documents(self.VERIFIED_DOWNLOADS, documents)

    @lock_by_string()
    def on_scrape_completed(self, folder_name, completed_successfully=True):
        """Report when scraping is completed."""
        self._insert_an_update(
            ScraperStatus.ESTIMATED_SIZE,
            folder_size=log_folder_details(folder_name),
            completed_successfully=completed_successfully,
        )

    @lock_by_string()
    def on_download_fail(self, execption, download_urls=None, file_names=None):
        """report when the scraping in failed"""
        self._insert_an_update(
            ScraperStatus.FAILED,
            execption=str(execption),
            traceback=traceback.format_exc(),
            download_urls=download_urls if download_urls else [],
            file_names=file_names if file_names else [],
        )

    def _insert_an_update(self, status, **additional_info):
        """Insert an update into the MongoDB collection."""
        document = {
            "status": status,
            "when": _now(),
            **additional_info,
        }
        self.database.insert_document(self.task_id, document)

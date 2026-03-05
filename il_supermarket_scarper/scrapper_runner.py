import os

from multiprocessing import Pool

from .scrappers_factory import ScraperFactory
from .utils import Logger, summerize_dump_folder_contant, clean_dump_folder
from .utils.db_checker import load_processed_files
from .utils.stop_controller import StopController


class MainScrapperRunner:
    """a main scraper to execute all scraping"""

    def __init__(
        self,
        size_estimation_mode=False,
        enabled_scrapers=None,
        dump_folder_name=None,
        multiprocessing=5,
        lookup_in_db=True,
    ):
        assert isinstance(enabled_scrapers, list) or enabled_scrapers is None

        env_size_estimation_mode = os.getenv("SE_MODE", None)
        if env_size_estimation_mode:
            Logger.info(
                f"Setting size estimation mode from enviroment. value={env_size_estimation_mode}"
            )
            self.size_estimation_mode = bool(env_size_estimation_mode == "True")
        else:
            self.size_estimation_mode = size_estimation_mode
        Logger.info(f"size_estimation_mode: {self.size_estimation_mode}")

        if not enabled_scrapers:
            enabled_scrapers = ScraperFactory.all_scrapers_name()

        self.enabled_scrapers = enabled_scrapers
        Logger.info(f"Enabled scrapers: {self.enabled_scrapers}")
        self.dump_folder_name = dump_folder_name
        self.multiprocessing = multiprocessing
        self.lookup_in_db = lookup_in_db

    def run(
        self,
        limit=None,
        files_types=None,
        when_date=False,
        suppress_exception=False,
        min_size=None,
        max_size=None,
    ):
        """run the scraper"""
        # Clear stop flag at start
        StopController.clear_stop()
        
        Logger.info(f"Limit is {limit}")
        Logger.info(f"files_types is {files_types}")
        Logger.info(f"Start scraping {','.join(self.enabled_scrapers)}.")
        
        # Load processed files from PostgreSQL before scraping
        if self.lookup_in_db:
            Logger.info("Loading processed files from database...")
            try:
                load_processed_files()
                from .utils.db_checker import ProcessedFilesChecker
                count = len(ProcessedFilesChecker._processed_files) if ProcessedFilesChecker._processed_files else 0
                Logger.info(f"Processed files loaded successfully ({count} files)")
            except Exception as e:
                Logger.warning(f"Could not load processed files from DB: {e}")

        with Pool(self.multiprocessing) as pool:
            scraper_args = list(
                map(
                    lambda chainScrapperClass: (
                        chainScrapperClass,
                        {
                            "limit": limit,
                            "files_types": files_types,
                            "when_date": when_date,
                            "suppress_exception": suppress_exception,
                            "min_size": min_size,
                            "max_size": max_size,
                        },
                    ),
                    self.enabled_scrapers,
                )
            )
            
            import time as _time
            start_time = _time.time()
            
            # Use imap_unordered + async collection for better progress tracking
            result = pool.map(self.scrape_one_wrap, scraper_args)
            
            elapsed = _time.time() - start_time
            Logger.info(f"All scrapers finished in {elapsed:.1f}s ({elapsed/60:.1f} min)")

        Logger.info("Done scraping all supermarkets.")

        return result

    def scrape_one_wrap(self, arg):
        """scrape one warper"""
        args, kwargs = arg
        return self.scrape_one(args, **kwargs)

    def scrape_one(
        self,
        chain_scrapper_class,
        limit=None,
        files_types=None,
        store_id=None,
        when_date=None,
        suppress_exception=False,
        min_size=None,
        max_size=None,
    ):
        """scrape one"""
        # CRITICAL: Load processed files in THIS worker process
        # Multiprocessing Pool creates separate processes - they don't share memory
        if self.lookup_in_db:
            try:
                load_processed_files()
                from .utils.db_checker import ProcessedFilesChecker
                count = len(ProcessedFilesChecker._processed_files) if ProcessedFilesChecker._processed_files else 0
                Logger.info(f"[WORKER] DB loaded in worker process ({count} files)")
            except Exception as e:
                Logger.warning(f"[WORKER] Could not load DB in worker: {e}")
        
        chain_scrapper_constractor = ScraperFactory.get(chain_scrapper_class)
        Logger.info(f"Starting scrapper {chain_scrapper_constractor}")
        scraper = chain_scrapper_constractor(folder_name=self.dump_folder_name)
        chain_name = scraper.get_chain_name()

        Logger.info(f"scraping {chain_name}")
        if self.lookup_in_db:
            scraper.enable_collection_status()
            scraper.enable_aggregation_between_runs()

        scraper.scrape(
            limit=limit,
            files_types=files_types,
            store_id=store_id,
            when_date=when_date,
            files_names_to_scrape=None,
            filter_null=False,
            filter_zero=False,
            suppress_exception=suppress_exception,
            min_size=min_size,
            max_size=max_size,
        )
        Logger.info(f"done scraping {chain_name}")

        folder_with_files = scraper.get_storage_path()
        if self.size_estimation_mode:
            Logger.info(f"Summrize test data for {chain_name}")
            summerize_dump_folder_contant(folder_with_files)

            Logger.info(f"Cleaning dump folder for {chain_name}")
            clean_dump_folder(folder_with_files)
        return folder_with_files

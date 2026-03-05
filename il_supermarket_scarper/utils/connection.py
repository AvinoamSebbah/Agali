import contextlib
import ntpath
import os
import time
import socket
import pickle
import random
from ftplib import FTP_TLS, error_perm
import subprocess

from http.client import RemoteDisconnected
from http.cookiejar import LoadError
from urllib.error import URLError
from urllib3.exceptions import MaxRetryError, ReadTimeoutError


import requests
from playwright.sync_api import sync_playwright
from requests.exceptions import (
    ReadTimeout,
    ConnectionError as RequestsConnectionError,
    ChunkedEncodingError,
    ConnectTimeout,
)
from .logger import Logger
from .retry import retry
from .file_cache import file_cache


exceptions = (
    URLError,
    RemoteDisconnected,
    ConnectionResetError,
    ConnectTimeout,
    MaxRetryError,
    socket.gaierror,
    socket.timeout,
    ConnectionError,
    ReadTimeout,
    ReadTimeoutError,
    RequestsConnectionError,
    ChunkedEncodingError,
    error_perm,
    LoadError,
)


def download_connection_retry():
    """decorator the define the retry logic of connections tring to download files"""

    def wrapper(func):
        @retry(
            exceptions=exceptions,
            tries=8,
            delay=2,
            backoff=2,
            max_delay=5 * 60,
            logger=Logger,
            timeout=15,
            backoff_timeout=5,
        )
        def inner(*args, **kwargs):
            socket.setdefaulttimeout(kwargs.get("timeout", 15))
            del kwargs["timeout"]  # function don't get timeout param
            return func(*args, **kwargs)

        return inner

    return wrapper


def url_connection_retry(init_timeout=15):
    """decorator the define the retry logic of connections tring to send get request"""

    def wrapper(func):
        # Store the original requested timeout in a closure variable
        # This will be set by the outer wrapper before retry processes it
        requested_timeout_ref = [init_timeout]

        def outer_wrapper(*args, **kwargs):
            # Capture the timeout from the original call before retry processes it
            original_timeout = kwargs.get("timeout", init_timeout)
            if original_timeout > requested_timeout_ref[0]:
                requested_timeout_ref[0] = original_timeout
            # Now call the retry-decorated function
            return retry_decorated_func(*args, **kwargs)

        @retry(
            exceptions=exceptions,
            tries=4,
            delay=2,
            backoff=2,
            max_delay=5 * 60,
            logger=Logger,
            timeout=init_timeout,
            backoff_timeout=10,
        )
        def retry_decorated_func(*args, **kwargs):
            # Use the higher of retry's timeout or the originally requested timeout
            retry_timeout = kwargs.get("timeout", init_timeout)
            actual_timeout = max(retry_timeout, requested_timeout_ref[0])
            socket.setdefaulttimeout(actual_timeout)
            kwargs["timeout"] = actual_timeout
            return func(*args, **kwargs)

        return outer_wrapper

    return wrapper


@file_cache(ttl=60)
def get_ip():
    """get the ip of the computer running the code"""
    response = requests.get("https://api.ipify.org?format=json", timeout=15).json()
    return response["ip"]


@file_cache(ttl=60)
def get_location():
    """get the estimated location of the computer running the code"""
    ip_address = get_ip()
    response = requests.get(f"https://ipapi.co/{ip_address}/json/", timeout=15).json()

    location_data = {
        "ip": ip_address,
        "city": response.get(
            "city",
        ),
        "region": response.get("region"),
        "country": response.get("country_name"),
    }
    return location_data


def disable_when_outside_israel(function):
    """decorator to disable tests that scrap gov.il site to run outside israel region"""

    def _decorator():
        Logger.warning(
            f"test {function.__name__ } has been disabled!"
            "can't scarper Gov.il site outside IL region."
        )

    execute = True
    try:
        estimated_location = get_location()
        execute = not (
            estimated_location["country"] is not None
            and estimated_location["country"] != "Israel"
        )
    except Exception as e:  # pylint: disable=broad-exception-caught
        Logger.warning(f"error in getting location {str(e)}")

    if execute:
        return function

    Logger.info(f"estimated location is {str(estimated_location)}")
    return _decorator


def get_random_user_agent():
    """get random user agent (modern browsers, 2024)"""
    user_agents = [
        # Chrome 120 on Windows
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        # Chrome 121 on macOS
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        # Firefox 121 on Windows
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        # Firefox 121 on Linux
        "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
        # Chrome 122 on Windows
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        # Edge 121
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
        # Safari on macOS
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
        # Chrome on Linux
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ]

    index = random.randrange(len(user_agents))
    return {"User-Agent": str(user_agents[index])}


@url_connection_retry(
    init_timeout=60
)  # Increased default to handle slow servers like Shufersal
def session_with_cookies(
    url, timeout=15, chain_cookie_name=None, method="GET", body=None, headers=None
):
    """
    Request resource with cookies enabled.

    Parameters:
    - url: URL to request
    - timeout: Request timeout
    - chain_cookie_name: Optional, name for saving/loading cookies
    - method: HTTP method, defaults to GET
    - body: Data to be sent in the request body (for POST or PUT requests)
    - headers: Optional dict of custom headers to include in the request
    """

    session = requests.Session()
    if chain_cookie_name:

        try:
            with open(chain_cookie_name, "rb") as f:
                session.cookies.update(pickle.load(f))
            # session.cookies.load()
        except FileNotFoundError:
            Logger.debug("Didn't find cookie file")
        except Exception as e:
            # There was an issue with reading the file.
            os.remove(chain_cookie_name)
            raise e

    Logger.debug(
        f"On a new Session requesting url: method={method}, url={url}, body={body}"
    )

    if method == "POST":
        response_content = session.post(
            url, data=body, timeout=timeout, headers=headers
        )
    else:
        response_content = session.get(url, timeout=timeout, headers=headers)

    if response_content.status_code != 200:
        Logger.debug(
            f"On Session, got status code: {response_content.status_code}"
            f", body is {response_content.text} "
        )
        raise ConnectionError(
            f"Response for {url}, returned with status"
            f" {response_content.status_code}"
        )

    if chain_cookie_name and not os.path.exists(chain_cookie_name):
        with open(chain_cookie_name, "wb") as f:
            pickle.dump(session.cookies.get_dict(), f)

    return response_content


def get_from_playwrite(page, extraction_type):
    """get the content from the page with playwrite"""

    if extraction_type == "update_date":
        content = page.locator(
            '//*[@id="content"]/div[1]/div/div/div/div[2]/div[6]/div'
        ).last.inner_text()
    elif extraction_type == "links_name":
        content = page.evaluate(
            """() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.map(link => link.textContent.trim());
    }"""
        )
    elif extraction_type == "all_text":
        content = page.evaluate(
            """
        () => {
            return document.body.innerText;
        }"""
        )
    else:
        raise ValueError(f"type '{extraction_type}' is not valid.")
    return content


@file_cache(ttl=60)
def render_webpage(url):
    """render website with playwrite"""

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(url, timeout=60000)
        page.wait_for_load_state("domcontentloaded", timeout=60000)
        content = page.content()
        browser.close()
    return content


def get_from_latast_webpage(url, extraction_type):
    """get the content from the page with playwrite"""
    time.sleep(1)
    content = render_webpage(url)
    return get_from_webpage(content, extraction_type)


def get_from_webpage(cached_page, extraction_type):
    """render website with playwrite from file system cache"""

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_content(cached_page)
        page.wait_for_load_state("domcontentloaded", timeout=60000)
        content = get_from_playwrite(page, extraction_type)
        browser.close()
    return content


def url_retrieve(url, filename, timeout=30):
    # from urllib.request import urlretrieve
    # urlretrieve(url, filename)
    # >>> add here timeout if needed
    """alternative to urllib.request.urlretrieve"""
    # https://gist.github.com/xflr6/f29ed682f23fd27b6a0b1241f244e6c9
    with contextlib.closing(
        requests.get(
            url, stream=True, timeout=timeout, headers={"Accept-Encoding": None}
        )
    ) as _request:
        _request.raise_for_status()
        size = int(_request.headers.get("Content-Length", "-1"))
        read = 0
        with open(filename, "wb") as file:
            for chunk in _request.iter_content(chunk_size=None):
                time.sleep(0.05)  # Small throttle to avoid overwhelming servers
                read += len(chunk)
                file.write(chunk)
                file.flush()

    if size >= 0 and read < size:
        msg = f"retrieval incomplete: got only {read:d} out of {size:d} bytes"
        raise ValueError(msg, (filename, _request.headers))


@url_connection_retry(60 * 5)
def collect_from_ftp(
    ftp_host, ftp_username, ftp_password, ftp_path, arg=None, timeout=60 * 5
):
    """collect all files to download from the site, returns list of (filename, size) tuples"""
    Logger.info(
        f"Open connection to FTP server with {ftp_host} "
        f", username: {ftp_username} , password: {ftp_password}"
    )
    ftp_session = FTP_TLS(ftp_host, ftp_username, ftp_password, timeout=timeout)
    ftp_session.trust_server_pasv_ipv4_address = True
    ftp_session.set_pasv(True)
    ftp_session.cwd(ftp_path)
    
    files_with_sizes = []
    
    try:
        # Try MLSD first (modern FTP, no 1000 file limit, returns size directly)
        Logger.info("[FTP] Using MLSD command (no limit)")
        for name, facts in ftp_session.mlsd(facts=["size", "type"]):
            # Skip directories, only process files
            if facts.get("type") == "file":
                # Apply filter if provided
                if arg is None or _match_ftp_pattern(name, arg):
                    try:
                        size = int(facts.get("size", 0))
                    except (ValueError, TypeError):
                        size = None
                    files_with_sizes.append((name, size))
        
        Logger.info(f"[FTP] MLSD returned {len(files_with_sizes)} files")
        
    except Exception as mlsd_error:
        # Fallback to NLST if MLSD not supported (old FTP servers)
        Logger.warning(f"[FTP] MLSD failed ({mlsd_error}), using enhanced NLST with multiple queries")
        
        # Strategy: Make multiple NLST calls with different prefixes to bypass 1000 limit
        # Common file prefixes in Israeli supermarket data
        prefixes = [
            'Price*', 'Promo*', 'Store*', 
            'PriceFull*', 'PromoFull*', 'StoresFull*'
        ]
        
        all_files_set = set()  # Use set to avoid duplicates
        
        if arg and '*' in arg:
            # If arg already has wildcard, use it directly
            try:
                files = ftp_session.nlst(arg)
                all_files_set.update(files)
                Logger.info(f"[FTP] NLST with pattern '{arg}' returned {len(files)} files")
            except Exception as e:
                Logger.warning(f"[FTP] NLST with pattern '{arg}' failed: {e}")
        else:
            # Try each prefix pattern
            for prefix in prefixes:
                try:
                    pattern = f"{prefix}.gz" if not arg else f"{prefix}{arg}.gz"
                    files = ftp_session.nlst(pattern)
                    before = len(all_files_set)
                    all_files_set.update(files)
                    added = len(all_files_set) - before
                    if added > 0:
                        Logger.info(f"[FTP] NLST '{pattern}' returned {len(files)} files (+{added} new)")
                    
                    # Also try without .gz extension for XML files
                    pattern_xml = f"{prefix}.xml"
                    files_xml = ftp_session.nlst(pattern_xml)
                    before = len(all_files_set)
                    all_files_set.update(files_xml)
                    added = len(all_files_set) - before
                    if added > 0:
                        Logger.info(f"[FTP] NLST '{pattern_xml}' returned {len(files_xml)} files (+{added} new)")
                        
                except Exception as e:
                    # Some patterns may not match anything, that's OK
                    pass
            
            # Fallback: try getting all files if nothing found
            if len(all_files_set) == 0:
                Logger.warning("[FTP] No files found with prefixes, trying NLST without pattern")
                try:
                    if arg:
                        files = ftp_session.nlst(arg)
                    else:
                        files = ftp_session.nlst()
                    all_files_set.update(files)
                    Logger.info(f"[FTP] NLST fallback returned {len(files)} files")
                except Exception as e:
                    Logger.error(f"[FTP] NLST fallback failed: {e}")
        
        # Convert set to list and get sizes
        all_files = list(all_files_set)
        Logger.info(f"[FTP] Total unique files from NLST: {len(all_files)}")
        
        # Get file sizes for each file
        for filename in all_files:
            try:
                size = ftp_session.size(filename)
                files_with_sizes.append((filename, size))
            except (error_perm, AttributeError):
                # If size() fails (e.g., for directories or permission issues), use None
                files_with_sizes.append((filename, None))

    ftp_session.quit()
    return files_with_sizes


def _match_ftp_pattern(filename, pattern):
    """Match filename against FTP wildcard pattern (* and ?)"""
    import fnmatch
    return fnmatch.fnmatch(filename, pattern)


@download_connection_retry()
def fetch_temporary_gz_file_from_ftp(
    ftp_host, ftp_username, ftp_password, ftp_path, temporary_gz_file_path, timeout=15
):
    """download a file from a cerberus base site."""
    with open(temporary_gz_file_path, "wb") as file_ftp:
        file_name = ntpath.basename(temporary_gz_file_path)
        ftp = FTP_TLS(ftp_host, ftp_username, ftp_password, timeout=timeout)
        ftp.trust_server_pasv_ipv4_address = True
        ftp.cwd(ftp_path)
        ftp.retrbinary("RETR " + file_name, file_ftp.write)
        ftp.quit()


def wget_file(file_link, file_save_path):
    """use wget to download file"""
    Logger.debug(f"trying wget file {file_link} to {file_save_path}.")

    with subprocess.Popen(
        f"wget --output-document={file_save_path} '{file_link}'",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        shell=True,
    ) as process:
        std_out, std_err = process.communicate()
    Logger.debug(f"Wget stdout {std_out}")
    Logger.debug(f"Wget stderr {std_err}")

    if not os.path.exists(file_save_path):
        Logger.error(f"fils is not exists after wget {file_save_path}")
        raise FileNotFoundError(
            f"File wasn't downloaded with wget,std_err is {std_err}"
        )

    # wget will create file always, so we need to check if there was an error
    # example for validate case is collecting start and
    # the file is removed before downloading (change of hour)
    if "ERROR 403" in std_err or "ERROR 404" in std_err:
        if os.path.exists(file_save_path):
            os.remove(file_save_path)
        Logger.error(f"Got error {std_err} while downloading {file_link}")
        raise FileNotFoundError(
            f"File wan't found in the remote, possibly removed between "
            f"collection and download, std_err is {std_err}"
        )
    return file_save_path

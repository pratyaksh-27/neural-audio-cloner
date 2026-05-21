import logging
import os
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler

def setup_logger(name, log_file="app.log"):
    """
    Configures an enterprise-grade logger with console and file output.
    """
    base_dir = Path(__file__).parent.parent
    log_dir = base_dir / "storage" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    
    log_path = log_dir / log_file
    
    # 1. Format: [Timestamp] [Level] [Process] [Message]
    formatter = logging.Formatter(
        fmt='[%(asctime)s.%(msecs)03d] [%(levelname)s] [%(name)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # 2. Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)

    # 3. Persistent File Handler (Rolling to prevent disk bloat)
    file_handler = RotatingFileHandler(
        log_path, 
        maxBytes=10*1024*1024, # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)

    # 4. Logger Instance
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # Avoid duplicate handlers if setup is called multiple times
    if not logger.handlers:
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)
        
    return logger

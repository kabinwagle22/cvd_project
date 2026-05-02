import logging
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime

def setup_logging(app):
    """Configure logging for Flask application"""
    
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.makedirs('logs')
    
    # Create logger
    logger = logging.getLogger('cvd_app')
    logger.setLevel(logging.DEBUG)
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        'logs/cvd_app.log',
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    file_handler.setLevel(logging.DEBUG)
    
    # Error file handler
    error_handler = RotatingFileHandler(
        'logs/cvd_errors.log',
        maxBytes=10485760,
        backupCount=10
    )
    error_handler.setLevel(logging.ERROR)
    
    # Formatter
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(formatter)
    error_handler.setFormatter(formatter)
    
    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(error_handler)
    
    # Also add console handler for development
    if app.debug:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
    
    return logger

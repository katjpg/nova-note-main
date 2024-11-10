import uvicorn
import logging
from pathlib import Path
import sys
import os

# Add the src directory to Python path
src_path = Path(__file__).parent
sys.path.append(str(src_path))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def init_directories():
    """Initialize required directories"""
    directories = [
        Path("data/uploads"),
        Path("data/notes"),
        Path("data/docs"),
        Path("data/chroma"),
        Path("public/kg")
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
        logger.info(f"Initialized directory: {directory}")

def main():
    try:
        # Initialize directories
        init_directories()
        
        # Start server
        logger.info("Starting FastAPI server...")
        uvicorn.run(
            "api:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            workers=1,  # Single worker to prevent concurrency issues
            timeout_keep_alive=300,
            log_level="info",
            reload_dirs=[str(src_path)]
        )
    except Exception as e:
        logger.error(f"Server startup failed: {str(e)}")
        raise

if __name__ == "__main__":
    main()
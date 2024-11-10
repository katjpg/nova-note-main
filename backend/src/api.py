from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pathlib import Path
import shutil
import logging
from datetime import datetime
import json
import sys
from typing import Optional, Dict, Any
from pydantic import BaseModel
import os 


# Add the src directory to Python path
src_path = Path(__file__).parent
project_root = src_path.parent
sys.path.append(str(src_path))

# Import local modules
from process import FilesProcessor
from createDeck import router as deck_router
from graph import router as graph_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configure directories
DATA_DIR = project_root / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
NOTES_DIR = DATA_DIR / "notes"

# Ensure directories exist
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
NOTES_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your Next.js frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store processing status
processing_status: Dict[str, Dict[str, Any]] = {}

# Pydantic models for request validation
class NoteCreate(BaseModel):
    title: str
    content: str = ""
    process: bool = False
    attachments: Optional[list] = None

class NoteUpdate(BaseModel):
    noteId: str
    content: Optional[str] = None
    title: Optional[str] = None

async def process_file(file_path: Path, file_id: str):
    """Background task for processing uploaded files"""
    try:
        processor = FilesProcessor()
        
        # Update status to processing
        processing_status[file_id] = {
            "status": "processing",
            "progress": 10
        }
        
        # Process based on file type
        if file_path.suffix.lower() == '.pdf':
            docs = processor.process_documents([str(file_path)])
        else:  # markdown
            docs = processor.process_markdown([str(file_path)])
            
        # Update status with results
        processing_status[file_id] = {
            "status": "completed",
            "progress": 100,
            "result": {
                "chunks": len(docs),
                "wordCount": sum(len(doc.page_content.split()) for doc in docs)
            }
        }
        
        logger.info(f"File {file_id} processed successfully")
        
    except Exception as e:
        logger.error(f"Processing failed for {file_id}: {str(e)}")
        processing_status[file_id] = {
            "status": "failed",
            "progress": 0,
            "message": str(e)
        }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Verify directories exist
        if not all(path.exists() for path in [NOTES_DIR, UPLOADS_DIR]):
            return JSONResponse(
                {"status": "error", "message": "Required directories not found"},
                status_code=500
            )
            
        return JSONResponse({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0"
        })
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            {"status": "error", "message": str(e)},
            status_code=500
        )
@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """Handle file uploads"""
    try:
        logger.info(f"Receiving file upload: {file.filename}")
        
        # Validate file type
        content_type = file.content_type or "application/octet-stream"
        if content_type not in ["application/pdf", "text/markdown"]:
            raise HTTPException(400, "Invalid file type")
        
        # Generate unique file path
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        sanitized_filename = "".join(c if c.isalnum() or c in ".-_" else "_" for c in file.filename)
        file_id = f"{timestamp}_{sanitized_filename}"
        file_path = UPLOADS_DIR / file_id
        
        # Create uploads directory if it doesn't exist
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Save file using a temporary file
        try:
            # First save to a temporary file
            temp_path = file_path.with_suffix(file_path.suffix + '.temp')
            with temp_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Then rename to final path
            temp_path.rename(file_path)
            
        finally:
            file.file.close()
            
        logger.info(f"File saved successfully: {file_path}")
        
        # Initialize processing status for both PDF and markdown files
        processing_status[file_id] = {
            "status": "completed" if content_type == "application/pdf" else "pending",
            "progress": 100 if content_type == "application/pdf" else 0
        }
        
        # For PDFs, update the status with file info
        if content_type == "application/pdf":
            processing_status[file_id].update({
                "result": {
                    "fileType": "pdf",
                    "fileSize": os.path.getsize(file_path),
                    "fileName": file.filename
                }
            })
        # Only process markdown files in background
        elif background_tasks is not None:
            background_tasks.add_task(process_file, file_path, file_id)
        
        return JSONResponse({
            "success": True,
            "fileId": file_id,
            "url": f"/api/files/{file_id}"
        })
        
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)
        
@app.get("/api/files/{file_id}")
async def get_file(file_id: str):
    """Serve uploaded files"""
    try:
        file_path = UPLOADS_DIR / file_id
        if not file_path.exists():
            raise HTTPException(404, "File not found")
        
        # Determine content type
        content_type = "application/pdf" if file_path.suffix.lower() == '.pdf' else "text/markdown"
        
        return FileResponse(
            path=file_path,
            media_type=content_type,
            filename=file_id,
            headers={
                "Content-Disposition": f"inline; filename={file_id}"
            }
        )
    except Exception as e:
        logger.error(f"Failed to serve file {file_id}: {str(e)}")
        raise HTTPException(500, f"Failed to serve file: {str(e)}")

# Add this utility function
def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal and invalid characters"""
    # Remove any directory components
    filename = os.path.basename(filename)
    # Replace invalid characters with underscore
    return "".join(c if c.isalnum() or c in ".-_" else "_" for c in filename)

@app.get("/api/process/{file_id}")
async def get_processing_status(file_id: str):
    """Get file processing status"""
    if file_id not in processing_status:
        # Check if the file exists even if status is not tracked
        file_path = UPLOADS_DIR / file_id
        if file_path.exists():
            # Create a status entry for existing files
            processing_status[file_id] = {
                "status": "completed",
                "progress": 100,
                "result": {
                    "fileType": "pdf" if file_path.suffix.lower() == '.pdf' else "markdown",
                    "fileSize": os.path.getsize(file_path),
                    "fileName": file_path.name
                }
            }
        else:
            raise HTTPException(404, "File not found")
    
    logger.info(f"Status check for {file_id}: {processing_status[file_id]}")
    return processing_status[file_id]

@app.get("/api/notes")
async def list_notes():
    """List all notes"""
    try:
        notes = []
        for metadata_file in NOTES_DIR.glob("*.json"):
            try:
                metadata = json.loads(metadata_file.read_text())
                note_id = metadata_file.stem
                
                # Check if corresponding markdown file exists
                md_file = NOTES_DIR / f"{note_id}.md"
                content = ""
                if md_file.exists():
                    content = md_file.read_text()
                
                notes.append({
                    "id": note_id,
                    "title": metadata.get("title", "Untitled"),
                    "content": content,
                    "created": metadata.get("created"),
                    "updated": metadata.get("updated"),
                    "attachments": metadata.get("attachments", [])
                })
            except Exception as e:
                logger.error(f"Failed to read note {metadata_file}: {str(e)}")
                continue
        
        return JSONResponse({
            "success": True,
            "notes": notes
        })
    except Exception as e:
        logger.error(f"Failed to list notes: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.post("/api/notes")
async def create_note(note_data: NoteCreate):
    """Create a new note"""
    try:
        logger.info(f"Creating new note: {note_data.title}")
        
        # Generate note ID using timestamp (matches frontend format)
        note_id = f"note-{int(datetime.now().timestamp() * 1000)}"
        logger.info(f"Generated note ID: {note_id}")
        
        # Create markdown file with initial content
        note_path = NOTES_DIR / f"{note_id}.md"
        note_path.write_text(note_data.content or '')
        logger.info(f"Created markdown file: {note_path}")
        
        # Store note metadata
        metadata = {
            "id": note_id,
            "title": note_data.title,
            "created": datetime.now().isoformat(),
            "updated": datetime.now().isoformat(),
            "attachments": note_data.attachments or []
        }
        
        metadata_path = NOTES_DIR / f"{note_id}.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        logger.info(f"Created metadata file: {metadata_path}")
        
        return JSONResponse({
            "success": True,
            "noteId": note_id,
            "metadata": metadata
        })
        
    except Exception as e:
        logger.error(f"Note creation failed: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.post("/api/notes/update")
async def update_note(note_data: NoteUpdate):
    """Update an existing note"""
    try:
        note_id = note_data.noteId
        logger.info(f"Updating note: {note_id}")
        
        # Find the metadata file
        metadata_path = NOTES_DIR / f"{note_id}.json"
        note_path = NOTES_DIR / f"{note_id}.md"
        
        if not metadata_path.exists():
            logger.error(f"Note metadata not found: {metadata_path}")
            # Try to create the note if it doesn't exist
            metadata = {
                "id": note_id,
                "title": note_data.title or "Untitled",
                "created": datetime.now().isoformat(),
                "attachments": []
            }
            metadata_path.write_text(json.dumps(metadata, indent=2))
            logger.info(f"Created new metadata file: {metadata_path}")
        
        # Read existing metadata
        try:
            metadata = json.loads(metadata_path.read_text())
        except Exception as e:
            logger.error(f"Failed to read metadata: {str(e)}")
            raise HTTPException(500, "Failed to read note metadata")

        # Check if this is a PDF note
        is_pdf = any(
            att.get("fileType") == "pdf" 
            for att in metadata.get("attachments", [])
        )

        # Update content for non-PDF notes
        if not is_pdf and note_data.content is not None:
            try:
                note_path.write_text(note_data.content)
                logger.info(f"Updated content for note: {note_id}")
            except Exception as e:
                logger.error(f"Failed to write note content: {str(e)}")
                raise HTTPException(500, "Failed to update note content")

        # Update metadata if title provided
        if note_data.title is not None:
            metadata["title"] = note_data.title
            metadata["updated"] = datetime.now().isoformat()
            
            try:
                metadata_path.write_text(json.dumps(metadata, indent=2))
                logger.info(f"Updated metadata for note: {note_id}")
            except Exception as e:
                logger.error(f"Failed to write metadata: {str(e)}")
                raise HTTPException(500, "Failed to update note metadata")
        
        return JSONResponse({
            "success": True,
            "noteId": note_id,
            "metadata": metadata
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Note update failed: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)
        
@app.get("/api/notes/{note_id}")
async def get_note(note_id: str):
    """Get note content and metadata"""
    try:
        metadata_path = NOTES_DIR / f"{note_id}.json"
        note_path = NOTES_DIR / f"{note_id}.md"
        
        if not metadata_path.exists():
            raise HTTPException(404, "Note not found")
            
        # Read metadata
        try:
            metadata = json.loads(metadata_path.read_text())
        except Exception as e:
            logger.error(f"Failed to read metadata: {str(e)}")
            raise HTTPException(500, "Failed to read note metadata")
        
        # Check if this is a PDF note
        is_pdf = any(
            att.get("fileType") == "pdf" 
            for att in metadata.get("attachments", [])
        )
        
        content = ""
        if not is_pdf and note_path.exists():
            try:
                content = note_path.read_text()
            except Exception as e:
                logger.error(f"Failed to read note content: {str(e)}")
                raise HTTPException(500, "Failed to read note content")
        
        return JSONResponse({
            "success": True,
            "noteId": note_id,
            "content": content,
            "metadata": metadata
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get note: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str):
    """Delete a note and its metadata"""
    try:
        note_path = NOTES_DIR / f"{note_id}.md"
        metadata_path = NOTES_DIR / f"{note_id}.json"
        
        if not note_path.exists():
            raise HTTPException(404, "Note not found")
            
        # Delete note file
        note_path.unlink(missing_ok=True)
        
        # Delete metadata if exists
        metadata_path.unlink(missing_ok=True)
        
        return JSONResponse({
            "success": True,
            "noteId": note_id
        })
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Note deletion failed: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.delete("/api/files/{file_id}")
async def delete_file(file_id: str):
    """Delete an uploaded file"""
    try:
        file_path = UPLOADS_DIR / file_id
        
        if not file_path.exists():
            raise HTTPException(404, "File not found")
            
        # Delete file
        file_path.unlink()
        
        # Clean up processing status if exists
        processing_status.pop(file_id, None)
        
        return JSONResponse({
            "success": True,
            "fileId": file_id
        })
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"File deletion failed: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unexpected error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error"
        }
    )
    
# Add this utility function
def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal and invalid characters"""
    # Remove any directory components
    filename = os.path.basename(filename)
    # Replace invalid characters with underscore
    return "".join(c if c.isalnum() or c in ".-_" else "_" for c in filename)




app.include_router(deck_router, prefix="/api")
app.include_router(graph_router, prefix="/api")
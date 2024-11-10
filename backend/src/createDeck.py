from fastapi import APIRouter, HTTPException
from pathlib import Path
import logging
import os
from datetime import datetime
from functools import lru_cache
import asyncio
from typing import List, Dict, Any, Optional
import hashlib
import json
from pydantic import BaseModel
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)

# Keep existing imports and configurations
from langchain_community.chat_models import ChatOpenAI
import networkx as nx
from pyvis.network import Network
from dotenv import load_dotenv
# Local imports
from process import FilesProcessor, KGProcessor
from generator import QAGenerator
from cluster import KGClusterer
from vectordb import ChromaStore
from graph import process_files_endpoint

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configure paths
project_root = Path(__file__).parent.parent
notes_dir = project_root / "data" / "notes"
docs_dir = project_root / "data" / "docs"
chroma_dir = project_root / "data" / "chroma"
kg_output_dir = project_root.parent / "frontend" / "public"

# Ensure required directories exist
for directory in [notes_dir, docs_dir, chroma_dir, kg_output_dir]:
    directory.mkdir(parents=True, exist_ok=True)

# Load environment variables
load_dotenv(project_root / '.env')

# Router
router = APIRouter()

# Pydantic models
class DeckTheme(BaseModel):
    cluster_id: int
    theme: str
    concept_count: int
    relationship_count: int
    token_count: Optional[int]

class CreateDeckResponse(BaseModel):
    success: bool
    decks: List[DeckTheme]
    error: Optional[str] = None

class DeckStatus(BaseModel):
    status: str
    progress: int
    message: Optional[str] = None

# Academic domain ontology
ACADEMIC_ONTOLOGY = {
    "allowed_nodes": [
        "Concept", "Topic", "Theory", "Method", 
        "Evidence", "Finding", "Study", "Variable"
    ],
    "allowed_relationships": [
        "RELATES_TO", "PART_OF", "DESCRIBES", "SUPPORTS",
        "CONTRADICTS", "EXTENDS", "IMPLIES", "PRECEDES"
    ]
}

# Store process status in memory
_deck_status = {
    "status": "idle",
    "progress": 0,
    "message": None,
    "started_at": None,
    "updated_at": None
}

def update_status(status: str, progress: int = 0, message: str = None):
    """Update the deck creation status"""
    global _deck_status
    _deck_status.update({
        "status": status,
        "progress": progress,
        "message": message,
        "updated_at": datetime.now().isoformat()
    })
    if status == "processing" and _deck_status["started_at"] is None:
        _deck_status["started_at"] = datetime.now().isoformat()
    logger.info(f"Status updated: {status} ({progress}%) - {message}")

def interactive_graph(graph_documents, height="750px", width="100%"):
    """Generate interactive visualization of the knowledge graph"""
    G = nx.DiGraph()
    
    node_types = set()
    edge_types = set()
    
    # Add nodes and edges to the graph
    for doc in graph_documents:
        for node in doc.nodes:
            G.add_node(node.id, title=f"Type: {node.type}", type=node.type)
            node_types.add(node.type)
        
        for rel in doc.relationships:
            G.add_edge(rel.source.id, rel.target.id, title=f"Relationship: {rel.type}", type=rel.type)
            edge_types.add(rel.type)
    
    # Create network visualization
    net = Network(height=height, width=width, bgcolor="#ffffff", font_color="#000000")
    net.from_nx(G)
    
    # Style nodes
    color_palette = {
        node_type: f"#{hash(node_type) % 0xFFFFFF:06x}" 
        for node_type in node_types
    }
    
    for node in net.nodes:
        node_type = node.get('type', 'default')
        node.update({
            'color': color_palette.get(node_type, '#97c2fc'),
            'size': 25,
            'font': {'size': 12},
            'shape': 'dot',
            'borderWidth': 2,
            'borderWidthSelected': 4,
        })
    
    # Style edges
    for edge in net.edges:
        edge.update({
            'arrows': 'to',
            'color': {'color': '#848484', 'opacity': 0.8},
            'width': 2,
            'smooth': {'type': 'continuous'}
        })
    
    # Configure physics
    net.set_options("""
    var options = {
        "physics": {
            "enabled": true,
            "forceAtlas2Based": {
                "gravitationalConstant": -50,
                "springLength": 100,
                "springConstant": 0.08,
                "damping": 0.4,
                "avoidOverlap": 0.5
            },
            "minVelocity": 0.75,
            "solver": "forceAtlas2Based"
        },
        "interaction": {
            "hover": true,
            "navigationButtons": true,
            "keyboard": {
                "enabled": true
            }
        }
    }
    """)
    
    return net

def save_visualization(net, graph_documents):
    """Save the graph visualization with legend"""
    # Create legend
    node_types = set(node.type for doc in graph_documents for node in doc.nodes)
    edge_types = set(rel.type for doc in graph_documents for rel in doc.relationships)
    
    legend_html = """
    <div style="position: absolute; top: 10px; right: 10px; padding: 10px; 
         background-color: white; border: 1px solid #ddd; border-radius: 5px;">
        <h3 style="margin: 0 0 10px 0;">Knowledge Graph Legend</h3>
        <div style="display: flex; gap: 20px;">
            <div>
                <h4 style="margin: 5px 0;">Node Types</h4>
                <ul style="list-style-type: none; padding: 0;">
    """
    
    for node_type in node_types:
        color = f"#{hash(node_type) % 0xFFFFFF:06x}"
        legend_html += f"""
            <li style="margin: 5px 0;">
                <span style="display: inline-block; width: 12px; height: 12px; 
                      background-color: {color}; border-radius: 50%; margin-right: 5px;"></span>
                {node_type}
            </li>
        """
    
    legend_html += """
                </ul>
            </div>
            <div>
                <h4 style="margin: 5px 0;">Relationship Types</h4>
                <ul style="list-style-type: none; padding: 0;">
    """
    
    for edge_type in edge_types:
        legend_html += f"""
            <li style="margin: 5px 0;">
                <span style="display: inline-block; width: 20px; height: 2px; 
                      background-color: #848484; margin-right: 5px;"></span>
                {edge_type}
            </li>
        """
    
    legend_html += """
                </ul>
            </div>
        </div>
    </div>
    """
    
    # Save to file
    output_path = kg_output_dir / "KG.html"
    net.save_graph(str(output_path))
    
    # Add legend to the saved file
    with open(output_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    content = content.replace('</body>', f'{legend_html}</body>')
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

@router.get("/decks/status", response_model=DeckStatus)
async def get_deck_status():
    """Get the current status of deck creation"""
    return _deck_status

@router.post("/decks/create", response_model=CreateDeckResponse)
async def create_decks() -> CreateDeckResponse:
    try:
        # Initialize ChromaDB
        chroma_store = ChromaStore(persist_directory=str(chroma_dir))
        chroma_store.load_db()
        chroma_store.load_collections(['notes', 'documents', 'notes_kg'])
        
        # Initialize LLM
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found")
            
        llm = ChatOpenAI(
            api_key=api_key,
            model="gpt-4o-mini",
            temperature=0
        )
        
        # Process files first - reusing process_files_endpoint logic
        processed_result = await process_files_endpoint()
        if not processed_result["success"]:
            raise ValueError("Failed to process files")
            
        # Initialize processor
        processor = FilesProcessor()
            
        # Collect markdown files from directories
        markdown_files = []
        for directory in [notes_dir, docs_dir]:
            if directory.exists():
                markdown_files.extend([
                    str(file_path) 
                    for file_path in directory.glob('**/*.md')
                ])
        
        if not markdown_files:
            raise ValueError("No markdown files found to process")
            
        # Process markdown files
        processed_docs = processor.process_markdown(markdown_files)
        
        if not processed_docs:
            raise ValueError("No documents were processed")
            
        # Generate KG documents
        kg_processor = KGProcessor(
            chroma_store=chroma_store,
            ontology=ACADEMIC_ONTOLOGY,
            batch_size=100
        )
        
        kg_docs = kg_processor.generate_kg_docs(
            documents=processed_docs,  # Using processed_docs instead of processed_files['markdown']
            llm=llm
        )
        
        if not kg_docs:
            raise ValueError("No knowledge graph documents generated")
            
        # Embed KG into ChromaDB
        kg_processor.embed_kg(
            kg_docs=kg_docs,
            collection_name='notes_kg',
            replace_existing=True
        )
        
        # Cluster nodes
        clusterer = KGClusterer(chroma_store)
        results = clusterer.cluster_nodes(
            'notes_kg',
            n_neighbors=25,
            min_cluster_size=3,
            min_samples=2,
            min_dist=0.1
        )
        
        if not results['nodes']:
            raise ValueError("No clusters generated")
            
        # Initialize QA Generator
        qa_gen = QAGenerator(
            llm=llm,
            chroma_store=chroma_store,
            collection_name='notes_kg',
            max_workers=4
        )
        
        # Generate questions from clusters
        questions_list, stats_list = qa_gen.generate_cluster_questions(
            clustering_results=results,
            show_tokens=True
        )
        
        # Create deck themes from clusters
        decks = []
        for questions, stats in zip(questions_list, stats_list):
            deck = DeckTheme(
                cluster_id=questions.cluster_id,
                theme=questions.theme,
                concept_count=stats.concept_count,
                relationship_count=stats.relationship_count,
                token_count=stats.token_count
            )
            decks.append(deck)
            
        return CreateDeckResponse(
            success=True,
            decks=decks
        )
        
    except Exception as e:
        logger.error(f"Deck creation failed: {str(e)}")
        return CreateDeckResponse(
            success=False,
            decks=[],
            error=str(e)
        )

@router.delete("/decks/{cluster_id}")
async def delete_deck(cluster_id: int):
    """Delete a deck and its associated data"""
    try:
        # Initialize ChromaDB
        chroma_store = ChromaStore(persist_directory=str(chroma_dir))
        chroma_store.load_db()
        
        # Get the notes_kg collection
        collection = chroma_store.collections.get('notes_kg')
        if not collection:
            raise HTTPException(404, "Collection not found")
            
        # Delete cluster data
        # TODO: Implement cluster deletion logic based on your needs
        
        return {"success": True, "message": f"Deck {cluster_id} deleted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to delete deck {cluster_id}: {e}")
        raise HTTPException(500, f"Failed to delete deck: {str(e)}")

# Initialize the router with the FastAPI app
def init_router(app):
    """Initialize the deck router with the FastAPI app"""
    app.include_router(router, prefix="/api", tags=["decks"])
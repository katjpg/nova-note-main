from fastapi import APIRouter, HTTPException
from typing import List
from pathlib import Path
import logging
import os
from datetime import datetime
import shutil
from dotenv import load_dotenv
from langchain_community.chat_models import ChatOpenAI
from langchain_experimental.graph_transformers import LLMGraphTransformer

# Local imports
from process import FilesProcessor, process_files 
from vectordb import ChromaStore
from pyvis.network import Network
import networkx as nx

router = APIRouter()
logger = logging.getLogger(__name__)

# Configure paths
project_root = Path(__file__).parent.parent
notes_dir = project_root / "data" / "notes"
docs_dir = project_root / "data" / "docs"
chroma_dir = project_root / "data" / "chroma"
kg_output_dir = project_root.parent / "frontend" / "public"

# Load environment variables
load_dotenv(project_root.parent / "backend" / '.env')

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

def initialize_llm():
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in environment variables")
        
    return ChatOpenAI(
        api_key=api_key,
        model="gpt-4",
        temperature=0
    )

def interactive_graph(graph_documents, height="750px", width="100%", bgcolor="#ffffff", 
                     font_color="#000000"):
    G = nx.DiGraph()
    
    node_types = set()
    edge_types = set()
    
    for doc in graph_documents:
        for node in doc.nodes:
            G.add_node(node.id, title=f"Type: {node.type}", type=node.type)
            node_types.add(node.type)
        
        for rel in doc.relationships:
            G.add_edge(rel.source.id, rel.target.id, title=f"Relationship: {rel.type}", type=rel.type)
            edge_types.add(rel.type)
    
    net = Network(height=height, width=width, bgcolor=bgcolor, font_color=font_color, 
                 notebook=True, cdn_resources='in_line')
    net.from_nx(G)
    
    # Style the nodes and edges
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
    
    for edge in net.edges:
        edge.update({
            'arrows': 'to',
            'color': {'color': '#848484', 'opacity': 0.8},
            'width': 2,
            'smooth': {'type': 'continuous'}
        })
    
    net.set_options("""
    var options = {
        "physics": {
            "enabled": true,
            "forceAtlas2Based": {
                "gravitationalConstant": -50,
                "springLength": 100,
                "springConstant": 0.08
            },
            "minVelocity": 0.75,
            "solver": "forceAtlas2Based"
        }
    }
    """)
    
    return net

def display_legend(net, graph_documents):
    net.show("KG.html")
    
    with open("KG.html", "r", encoding="utf-8") as f:
        graph_html = f.read()
    
    # Create legend
    node_types = set(node.type for doc in graph_documents for node in doc.nodes)
    edge_types = set(rel.type for doc in graph_documents for rel in doc.relationships)
    
    legend_html = """
    <div style="padding: 10px; background-color: white; border: 1px solid #ddd; margin-top: 10px;">
        <h3 style="margin: 0 0 10px 0;">Knowledge Graph Legend</h3>
        <div style="display: flex; gap: 20px;">
            <div>
                <h4>Node Types</h4>
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
                <h4>Relationship Types</h4>
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
    
    return f"{graph_html}{legend_html}"

@router.post("/graph/process-files")
async def process_files_endpoint():
    """Step 1: Process markdown and PDF files"""
    try:
        processor = FilesProcessor()
        
        # Collect markdown files from directories
        markdown_files = []
        for directory in [notes_dir, docs_dir]:
            if directory.exists():
                markdown_files.extend([
                    str(file_path) 
                    for file_path in directory.glob('**/*.md')
                ])
        
        # Process markdown files
        processed_docs = processor.process_markdown(markdown_files)
        
        return {
            "success": True,
            "processed": {
                "markdown": len(processed_docs),
                "files": len(markdown_files)
            }
        }
        
    except Exception as e:
        logger.error(f"File processing failed: {str(e)}")
        raise HTTPException(500, f"File processing failed: {str(e)}")

@router.post("/graph/process-kg")
async def process_kg_endpoint():
    """Step 2: Generate knowledge graph"""
    try:
        # Initialize ChromaDB
        chroma_store = ChromaStore(persist_directory=str(chroma_dir))
        chroma_store.load_db()
        chroma_store.load_collections(['notes', 'documents', 'notes_kg'])
        
        # Initialize LLM
        llm = initialize_llm()
        
        # Process files first
        processed_result = await process_files_endpoint()
        if not processed_result["success"]:
            raise HTTPException(500, "Failed to process files")
            
        processor = FilesProcessor()
            
            # Collect markdown files from directories
        markdown_files = []
        for directory in [notes_dir, docs_dir]:
            if directory.exists():
                    markdown_files.extend([
                        str(file_path) 
                        for file_path in directory.glob('**/*.md')
                    ])
            
            # Process markdown files
            processed_docs = processor.process_markdown(markdown_files)
        # Initialize graph transformer
        transformer = LLMGraphTransformer(
            llm=llm,
            allowed_nodes=ACADEMIC_ONTOLOGY["allowed_nodes"],
            allowed_relationships=ACADEMIC_ONTOLOGY["allowed_relationships"]
        )
        
        # Generate KG documents
        kg_docs = transformer.convert_to_graph_documents(processed_docs)
        
        return {
            "success": True,
            "kg_docs": len(kg_docs)
        }
        
    except Exception as e:
        logger.error(f"KG processing failed: {str(e)}")
        raise HTTPException(500, f"KG processing failed: {str(e)}")

@router.post("/api/graph/generate")
async def generate_graph_endpoint():
    """Step 3: Generate interactive graph visualization"""
    try:
        # Process KG
        kg_result = await process_kg_endpoint()
        if not kg_result["success"]:
            raise HTTPException(500, "Failed to process knowledge graph")
        
        # Ensure output directory exists
        kg_output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate and save graph
        processed_files = process_files(
            file_paths=[str(notes_dir)],
            display_output=False
        )
        
        llm = initialize_llm()
        transformer = LLMGraphTransformer(
            llm=llm,
            allowed_nodes=ACADEMIC_ONTOLOGY["allowed_nodes"],
            allowed_relationships=ACADEMIC_ONTOLOGY["allowed_relationships"]
        )
        
        kg_docs = transformer.convert_to_graph_documents(processed_files['markdown'])
        
        # Generate visualization
        net = interactive_graph(
            graph_documents=kg_docs,
            height="750px",
            width="100%"
        )
        
        # Save to Next.js public directory
        output_path = kg_output_dir / "KG.html"
        graph_html = display_legend(net, kg_docs)
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(graph_html)
        
        return {
            "success": True,
            "file": "/KG.html"  # Return the public URL path
        }
        
    except Exception as e:
        logger.error(f"Graph generation failed: {str(e)}")
        raise HTTPException(500, f"Graph generation failed: {str(e)}")
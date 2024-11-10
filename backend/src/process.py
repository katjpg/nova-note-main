import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import (
    MarkdownHeaderTextSplitter,
    RecursiveCharacterTextSplitter,
)
from langchain_community.embeddings import HuggingFaceBgeEmbeddings
from langchain_experimental.graph_transformers import LLMGraphTransformer
from pydantic import BaseModel, Field
from tqdm import tqdm

# Local imports
import sys
sys.path.append(str(Path(__file__).parent))
from vectordb import ChromaStore


class FilesProcessor:
    def __init__(self, md_path: str = None, pdf_path: str = None):
        self.md_path = md_path
        self.pdf_path = pdf_path

        # text splitter for chunking documents
        self.text_splitter = RecursiveCharacterTextSplitter(
            separators=["\n\n", "\n", ".", "!", "?"],
            chunk_size=1500,
            chunk_overlap=300,
            length_function=len,
            keep_separator=True
        )

        # markdown header splitter for section processing
        self.header_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=[
                ("#", "section"),
                ("##", "subsection"),
                ("###", "subsubsection")
            ]
        )

    def process_markdown(self, files: List[str]) -> List[Document]:
        processed_docs = []

        for file_path in files:
            try:
                text = self._read_and_clean_markdown(file_path)
                split_docs = self.header_splitter.split_text(text)

                for doc in split_docs:
                    metadata = self._create_markdown_metadata(doc, file_path)
                    processed_docs.append(Document(
                        page_content=doc.page_content,
                        metadata=metadata
                    ))

            except Exception as e:
                print(f"markdown processing error {file_path}: {str(e)}")

        return processed_docs

    def process_documents(self, files: List[str]) -> List[Document]:
        processed_docs = []

        for file_path in files:
            try:
                pages = PyPDFLoader(file_path).load()

                for page in pages:
                    cleaned_text = self._clean_documents(page.page_content)
                    if not cleaned_text:
                        continue

                    chunks = self.text_splitter.split_text(cleaned_text)
                    processed_docs.extend([
                        Document(
                            page_content=chunk,
                            metadata={
                                'source': file_path,
                                'page': page.metadata.get('page', 'unknown'),
                                'word_count': len(chunk.split()),
                                'total_pages': len(pages)
                            }
                        ) for chunk in chunks
                    ])

            except Exception as e:
                print(f"pdf processing error {file_path}: {str(e)}")

        return processed_docs

    def _read_and_clean_markdown(self, file_path: str) -> str:
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        return self._clean_markdown(text)

    def _create_markdown_metadata(self, doc: Document, file_path: str) -> Dict[str, Any]:
        metadata = {
            'source': file_path,
            'word_count': len(doc.page_content.split())
        }

        # add header information if present
        for header_type in ['section', 'subsection', 'subsubsection']:
            if header_type in doc.metadata:
                metadata[header_type] = str(doc.metadata[header_type])

        return metadata

    def _clean_markdown(self, text: str) -> str:
        # preserve code blocks
        code_blocks = {
            f'[CODE_BLOCK_{i}]': block
            for i, block in enumerate(re.findall(r'```[\s\S]*?```', text))
        }

        # temporarily replace code blocks
        for placeholder, block in code_blocks.items():
            text = text.replace(block, placeholder)

        # clean markdown formatting
        transformations = [
            (r'\*\*(.*?)\*\*', r'Important: \1'),  # bold
            (r'\*(.*?)\*', r'\1'),                 # italic
            (r'>\s*(.*?)\n', r'Quote: \1\n'),      # blockquotes
            (r'\s+', ' ')                          # excess whitespace
        ]

        for pattern, replacement in transformations:
            text = re.sub(pattern, replacement, text)

        # restore code blocks
        for placeholder, block in code_blocks.items():
            text = text.replace(placeholder, block.strip('`'))

        return text.strip()

    def _clean_documents(self, text: str) -> str:
        # fix common ocr errors
        text = self._fix_ocr_errors(text)

        # clean structural elements
        text = self._clean_structural_elements(text)

        # normalize whitespace and punctuation
        text = self._normalize_text(text)

        # validate cleaned text
        if self._is_invalid_text(text):
            return ''

        return text

    def _fix_ocr_errors(self, text: str) -> str:
        # fix word spacing and merging
        text = re.sub(r'(?<=\w)(?=[A-Z][a-z])', ' ', text)  # split camelCase
        text = re.sub(r'([a-z])([A-Z][a-z])', r'\1 \2',
                      text)  # fix merged words
        text = re.sub(r'([a-z])([0-9])', r'\1 \2',
                      text)  # split text and numbers

        # fix common ocr character confusions
        ocr_fixes = {
            r'l(?=\d)': '1',      # lowercase l to 1
            r'(?<=\d)O|0': '0',   # O to 0
            r'(?<=\d)I': '1',     # I to 1
            r'(?<=\d)S': '5',     # S to 5
            r'(?<=\d)Z': '2',     # Z to 2
        }

        for pattern, replacement in ocr_fixes.items():
            text = re.sub(pattern, replacement, text)

        return text

    def _clean_structural_elements(self, text: str) -> str:
        # remove headers and page artifacts
        patterns = [
            r'(?:^|\n)(?:Chapter|CHAPTER)\s+(?:[A-Za-z0-9]+\s+){1,3}.*?(?:\n|$)',
            r'(?:^|\n)(?:[A-Z][a-z]*\s+){1,3}(?:[A-Z]\s*[a-z]+\s*){1,3}.*?(?:\n|$)',
            r'Figure\s*\.\s*(?:\d+)?.*?(?:\n|$)',
            r'\n\s*\d+\s*\n'
        ]

        for pattern in patterns:
            text = re.sub(pattern, '\n', text, flags=re.MULTILINE)

        return text

    def _normalize_text(self, text: str) -> str:
        # normalize quotes and punctuation
        text = re.sub(r'[""''`]', '"', text)
        text = re.sub(r'\.{3,}', '...', text)

        # fix spacing
        text = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', text)
        text = re.sub(r'\s*([.,!?;:])\s*', r'\1 ', text)

        # clean whitespace
        return re.sub(r'\s+', ' ', text).strip()

    def _is_invalid_text(self, text: str) -> bool:
        return any([
            len(text.split()) < 10,                # too short
            text.count('.') == 0,                  # no sentences
            len([w for w in text.split() if w[0].isupper()]) > len(
                text.split()) * 0.7,  # too many caps
            not re.search(r'[A-Za-z]{2,}', text),  # no real words
            re.match(r'^(?:[A-Z][a-z]+\s+){1,3}$', text)  # just a header
        ])




def process_files(
    file_paths: Optional[List[str]] = None,
    display_output: bool = False,
    chunk_size: int = 1000  # control memory usage for large files
) -> Dict[str, List]:
    # get current directory and default paths
    current_dir = Path.cwd()
    default_paths = [current_dir / 'notes', current_dir / 'docs']
    paths_to_process = [Path(p) for p in (file_paths or default_paths)]

    # initialize processor with optimized batch size
    processor = FilesProcessor()

    # collect files using generator to save memory
    def collect_files():
        for path in paths_to_process:
            if path.exists():
                yield from path.glob('**/*.md')
                yield from path.glob('**/*.pdf')

    # group files by type efficiently
    files = {'markdown': [], 'pdf': []}
    for file_path in collect_files():
        if file_path.suffix == '.md':
            files['markdown'].append(file_path)
        elif file_path.suffix == '.pdf':
            files['pdf'].append(file_path)

    print(f"\n=== Files Found ===")
    print(f"Markdown files: {len(files['markdown'])}")
    print(f"PDF files: {len(files['pdf'])}")

    # process files in batches
    results = {'markdown': [], 'pdf': []}

    def process_batch(file_batch, file_type):
        try:
            if file_type == 'markdown':
                return processor.process_markdown([str(f) for f in file_batch])
            return processor.process_documents([str(f) for f in file_batch])
        except Exception as e:
            print(f"Error processing {file_type} batch: {e}")
            return []

    # process each file type with optimal batch size
    with ThreadPoolExecutor() as executor:
        for file_type, file_list in files.items():
            if not file_list:
                continue

            print(f"\nProcessing {file_type} files...")
            # process in smaller batches to control memory
            batches = [
                file_list[i:i + chunk_size]
                for i in range(0, len(file_list), chunk_size)
            ]

            futures = [
                executor.submit(process_batch, batch, file_type)
                for batch in batches
            ]

            # collect results as they complete
            for future in tqdm(
                as_completed(futures),
                total=len(futures),
                desc=f"{file_type.capitalize()}"
            ):
                try:
                    batch_results = future.result()
                    results[file_type].extend(batch_results)
                except Exception as e:
                    print(f"Error collecting {file_type} results: {e}")

    # display results
    total_files = sum(len(files[k]) for k in files)
    total_chunks = sum(len(results[k]) for k in results)

    print(f"\n=== Processing Summary ===")
    print(f"Total files processed: {total_files}")
    print(f"Total chunks generated: {total_chunks}")

    if display_output:
        print("\n=== Processed Chunks ===")
        for doc_type, chunks in results.items():
            if chunks:
                print(f"\n{doc_type.upper()} Chunks:")
                for i, chunk in enumerate(chunks, 1):
                    print(f"\nChunk {i}:")
                    content = chunk.page_content[:200] + "..." if len(
                        chunk.page_content) > 200 else chunk.page_content
                    print(f"Content: {content}")
                    print(f"Metadata: {chunk.metadata}")

    return results




class NodeRelationship(BaseModel):
    """Represents a relationship between nodes in the knowledge graph"""
    id: str = Field(..., description="ID of the related node")
    label: str = Field(..., description="Label of the related node")
    relationship: str = Field(..., description="Type of relationship")
    properties: Dict[str, Any] = Field(default_factory=dict)


class Node(BaseModel):
    """Represents a node in the knowledge graph"""
    id: str = Field(..., description="Unique identifier for the node")
    label: str = Field(..., description="Human-readable label")
    node_type: str = Field(..., description="Type of the node")
    properties: Dict[str, Any] = Field(default_factory=dict)
    relationships: List[NodeRelationship] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class KGProcessor:
    def __init__(
        self,
        chroma_store: ChromaStore,
        ontology: Optional[Dict] = None,
        batch_size: int = 32,
        model_name: str = "BAAI/bge-large-en-v1.5"
    ):
        self.batch_size = batch_size
        self.store = chroma_store
        self.embeddings = HuggingFaceBgeEmbeddings(
            model_name=model_name,
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        self.ontology = ontology or {
            "allowed_nodes": ["Concept", "Topic", "Theory", "Method", "Evidence"],
            "allowed_relationships": ["RELATES_TO", "PART_OF", "DESCRIBES", "SUPPORTS"]
        }
        self._validate_ontology()

    def _validate_ontology(self) -> None:
        if not all(key in self.ontology for key in ["allowed_nodes", "allowed_relationships"]):
            raise ValueError("Ontology missing required keys")
        if not all(isinstance(self.ontology[key], list) for key in self.ontology):
            raise ValueError("Ontology values must be lists")

    def _batch_documents(self, documents: List[Document]) -> List[List[Document]]:
        return [
            documents[i:i + self.batch_size]
            for i in range(0, len(documents), self.batch_size)
        ]

    def generate_kg_docs(self, documents: List[Document], llm: Any) -> List[Any]:
        try:
            transformer = LLMGraphTransformer(
                llm=llm,
                allowed_nodes=self.ontology["allowed_nodes"],
                allowed_relationships=self.ontology["allowed_relationships"],
                strict_mode=True
            )
            return transformer.convert_to_graph_documents(documents)
        except Exception as e:
            print(f"[ERROR] Graph document generation failed: {str(e)}")
            return []

    def embed_kg(
        self,
        kg_docs: List[Any],
        collection_name: str,
        replace_existing: bool = True
    ) -> None:
        if not kg_docs:
            return

        collection = self.store.collections.get(collection_name)
        if not collection:
            raise ValueError(f"Collection '{collection_name}' not found")

        if replace_existing:
            self._clear_collection(collection)

        processed_nodes = set()
        node_documents = []
        total_nodes = sum(len(doc.nodes) for doc in kg_docs)
        
        print(f"\nProcessing {total_nodes} total nodes...")

        for doc in kg_docs:
            source_metadata = self._extract_source_metadata(doc)

            for node in doc.nodes:
                if node.id in processed_nodes:
                    continue

                relationships = self._get_node_relationships(node, doc)
                node_obj = self._create_node_object(
                    node, relationships, collection_name)

                node_documents.append(Document(
                    page_content=json.dumps(node_obj.dict()),
                    metadata=self._create_node_metadata(node, source_metadata)
                ))
                processed_nodes.add(node.id)

        print(f"Prepared {len(node_documents)} unique nodes for embedding")
        
        # Process all nodes in batches
        self._batch_process_nodes(node_documents, collection)
        
        # Verify final count
        final_count = collection.count()
        print(f"\nFinal verification: {final_count} nodes in collection")
        
        if final_count != len(processed_nodes):
            print(f"WARNING: Expected {len(processed_nodes)} nodes but found {final_count}")

    def _clear_collection(self, collection) -> None:
        try:
            existing = collection.get()
            if existing and 'ids' in existing:
                collection.delete(ids=existing['ids'])
        except Exception as e:
            print(f"[WARNING] Collection clearing failed: {str(e)}")

    def _extract_source_metadata(self, doc: Any) -> Dict[str, Any]:
        if hasattr(doc, 'source') and hasattr(doc.source, 'metadata'):
            return self._sanitize_metadata(doc.source.metadata)
        return {}

    def _get_node_relationships(self, node: Any, doc: Any) -> List[NodeRelationship]:
        return [
            NodeRelationship(
                id=rel.target.id if rel.source.id == node.id else rel.source.id,
                label=rel.target.id if rel.source.id == node.id else rel.source.id,
                relationship=rel.type,
                properties=getattr(rel, 'properties', {})
            )
            for rel in doc.relationships
            if rel.source.id == node.id or rel.target.id == node.id
        ]

    def _create_node_object(
        self,
        node: Any,
        relationships: List[NodeRelationship],
        collection_name: str
    ) -> Node:
        return Node(
            id=f"{collection_name}/{node.id.replace(' ', '_')}",
            label=node.id,
            node_type=node.type,
            properties=getattr(node, 'properties', {}),
            relationships=relationships
        )

    def _create_node_metadata(
        self,
        node: Any,
        source_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        return {
            "node_id": node.id.replace(" ", "_"),
            "node_type": node.type,
            "source": source_metadata.get("source", "unknown"),
            "section": source_metadata.get("section", ""),
            "word_count": source_metadata.get("word_count", 0)
        }

    def _batch_process_nodes(
        self,
        node_documents: List[Document],
        collection
    ) -> None:
        total_processed = 0
        
        for batch_idx, batch in enumerate(self._batch_documents(node_documents)):
            try:
                embeddings = self.embeddings.embed_documents(
                    [doc.page_content for doc in batch]
                )

                # Generate unique IDs across all batches
                batch_ids = [f"node_{total_processed + i}" for i in range(len(batch))]
                
                collection.add(
                    embeddings=embeddings,
                    documents=[doc.page_content for doc in batch],
                    metadatas=[doc.metadata for doc in batch],
                    ids=batch_ids
                )
                
                total_processed += len(batch)
                
                # Print progress
                print(f"Processed batch {batch_idx + 1}, total nodes: {total_processed}")

            except Exception as e:
                print(f"Error processing batch {batch_idx + 1}: {e}")
                continue

        print(f"Successfully embedded {total_processed} nodes in total")

    def _sanitize_metadata(self, metadata: Dict) -> Dict:
        sanitized = {}
        for key, value in metadata.items():
            if isinstance(value, (str, int, float, bool)):
                sanitized[key] = value
            elif isinstance(value, dict):
                for k, v in value.items():
                    if isinstance(v, (str, int, float, bool)):
                        sanitized[f"{key}.{k}"] = v
            elif value is None:
                sanitized[key] = "null"
            else:
                sanitized[key] = str(value)
        return sanitized

    def query_kg(
        self,
        query_text: str,
        collection_name: str,
        k: int = 3
    ) -> List[Node]:
        try:
            collection = self.store.collections.get(collection_name)
            if not collection:
                raise ValueError(f"Collection '{collection_name}' not found")

            results = collection.query(
                query_embeddings=[self.embeddings.embed_query(query_text)],
                n_results=k,
                include=['documents', 'metadatas', 'distances']
            )

            return [
                Node.parse_raw(doc)
                for doc in results['documents'][0]
            ]

        except Exception as e:
            print(f"[ERROR] KG query failed: {str(e)}")
            return []
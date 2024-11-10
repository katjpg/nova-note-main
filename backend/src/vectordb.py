import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import chromadb
from chromadb.config import Settings
from pydantic import BaseModel, Field

class CollectionInfo(BaseModel):
    """Pydantic model for collection information from external sources"""
    name: str = Field(..., description="Name of the collection")
    metadata: Optional[Dict[str, Any]] = Field(
        default=None, description="Collection metadata")

class StorageInfo(BaseModel):
    """Pydantic model for storage information output"""
    base_path: str
    size_mb: float
    collection_count: int
    last_modified: str


class ChromaStore:
    def __init__(self, persist_directory: str = './chroma_db'):
        self.persist_directory = persist_directory
        self.client = None
        self.collections = {}

    def load_db(self, clear_existing: bool = False) -> None:
        try:
            if clear_existing and os.path.exists(self.persist_directory):
                shutil.rmtree(self.persist_directory)
                print(f"Cleared existing directory: {self.persist_directory}")

            os.makedirs(self.persist_directory, exist_ok=True)

            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(
                    allow_reset=True,
                    anonymized_telemetry=False
                )
            )
        except Exception as e:
            raise RuntimeError(f"Failed to initialize ChromaDB: {str(e)}")

    def load_collections(self, collection_names: List[str]) -> None:

        if not self.client:
            print("client not initialized. call load_db() first.")
            return

        if not collection_names:
            print("no collections specified.")
            return

        try:
            for name in collection_names:
                # directly use the string name instead of expecting a pydantic model
                collection = self.client.get_or_create_collection(name=name)
                self.collections[name] = collection
                print(f"collection '{name}' ready")
        except Exception as e:
            print(f"failed to load collection {name}: {str(e)}")

    def get_db_info(self) -> Optional[StorageInfo]:
        persist_dir = Path(self.persist_directory)

        try:
            files = [f for f in persist_dir.rglob('*') if f.is_file()]
            if not files:
                return None

            # Get actual collection count from ChromaDB client
            collection_count = len(self.client.list_collections()) if self.client else 0

            return StorageInfo(
                base_path=str(persist_dir.absolute()),
                size_mb=sum(f.stat().st_size for f in files) / (1024 * 1024),
                collection_count=collection_count,  # Using actual collection count
                last_modified=datetime.fromtimestamp(
                    max(os.path.getmtime(f) for f in files)
                ).strftime('%Y-%m-%d %H:%M:%S')
            )
        except Exception as e:
            print(f"Failed to get storage information: {str(e)}")
            return None

    def profile_db(self) -> Dict[str, Any]:
        if not self.client:
            raise RuntimeError("Client not initialized. Call load_db() first.")

        collections = self.client.list_collections()
        profile = {
            "total_collections": len(collections),
            "collections": []
        }

        for collection in collections:
            try:
                count = collection.count()
                has_metadata = False

                if count > 0:
                    result = collection.get(limit=1, include=['metadatas'])
                    has_metadata = bool(result.get('metadatas', [{}])[0])

                profile["collections"].append({
                    "name": collection.name,
                    "count": count,
                    "has_metadata": has_metadata
                })
            except Exception as e:
                print(
                    f"Failed to profile collection {collection.name}: {str(e)}")

        return profile

    def get_collection_counts(self) -> Dict[str, int]:
        return {
            name: collection.count()
            for name, collection in self.collections.items()
        }

    def delete_db(self) -> None:
        try:
            if self.client:
                self.client.clear_system_cache()
                self.client = None

            self.collections = {}

            if os.path.exists(self.persist_directory):
                shutil.rmtree(self.persist_directory)
        except Exception as e:
            raise RuntimeError(f"Failed to delete database: {str(e)}")
        finally:
            import gc
            gc.collect()

    def delete_collections(self, collection_names: List[str]) -> None:
        if not self.client:
            raise RuntimeError("Client not initialized. Call load_db() first")

        existing_collections = {
            col.name for col in self.client.list_collections()}

        for name in collection_names:
            try:
                if name in existing_collections:
                    self.client.delete_collection(name)
                    self.collections.pop(name, None)
            except Exception as e:
                print(f"Failed to delete collection {name}: {str(e)}")

    def __str__(self) -> str:
        if not self.client:
            return "ChromaStore (uninitialized)"

        counts = self.get_collection_counts()
        collections_info = [f"{name}: {count} docs"
                            for name, count in counts.items()]
        return (f"ChromaStore at {self.persist_directory}\n"
                f"Collections: {', '.join(collections_info)}")
from typing import Any, Dict, List
from tqdm import tqdm

from langchain.docstore.document import Document
from langchain_community.embeddings import HuggingFaceBgeEmbeddings
from langchain_community.vectorstores import Chroma

# local imports
from vectordb import ChromaStore

class EmbeddingsManager:
    def __init__(self, chroma_store, batch_size: int = 32):
        self.store = chroma_store
        self.batch_size = batch_size
        # initialize embeddings model
        self.embeddings = HuggingFaceBgeEmbeddings(
            model_name="BAAI/bge-large-en-v1.5",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )

    def embed_documents(self, docs: List[Document], collection_name: str) -> None:
        # validate inputs
        if not docs:
            print(f"No documents to embed in {collection_name}")
            return

        collection = self.store.collections.get(collection_name)
        if not collection:
            print(f"Collection '{collection_name}' not found")
            return

        try:
            # process in batches
            batches = [docs[i:i + self.batch_size] 
                      for i in range(0, len(docs), self.batch_size)]

            print(f"\nembedding {len(docs)} documents in {len(batches)} batches")

            for i, batch in enumerate(tqdm(batches, desc="Processing")):
                try:
                    # prepare batch data
                    texts = [doc.page_content for doc in batch]
                    metadata = [doc.metadata for doc in batch]
                    doc_ids = [f"{collection_name}_{i}_{j}" 
                              for j in range(len(batch))]

                    # generate and add embeddings
                    embeds = self.embeddings.embed_documents(texts)
                    collection.add(
                        embeddings=embeds,
                        documents=texts,
                        metadatas=metadata,
                        ids=doc_ids
                    )

                    # Verify embeddings after adding each batch
                    try:
                        collection_info = collection.get(
                            include=['embeddings'],
                            limit=1  # Only get one embedding to verify
                        )
                        if (collection_info and 'embeddings' in collection_info 
                            and len(collection_info['embeddings']) > 0):
                            embedding_dim = len(collection_info['embeddings'][0])
                            print(f"\n[INFO] Successfully added batch {i+1}/{len(batches)} to '{collection_name}'. "
                                  f"Embedding dimension: {embedding_dim}")
                        else:
                            print(f"\n[WARNING] No embeddings found in batch {i+1} for '{collection_name}'")
                    except Exception as e:
                        print(f"\n[WARNING] Could not verify batch {i+1}: {str(e)}")

                except Exception as e:
                    print(f"\n[ERROR] Failed to process batch {i+1}: {str(e)}")
                    continue

            # Final verification
            try:
                final_count = collection.count()
                print(f"\n[INFO] Final document count in '{collection_name}': {final_count}")
            except Exception as e:
                print(f"\n[WARNING] Could not verify final count: {str(e)}")

        except Exception as e:
            print(f"[ERROR] Overall embedding process failed: {str(e)}")

    def query_collection(
        self,
        query: str,
        collection_name: str,
        k: int = 3
    ) -> List[Dict[str, Any]]:
        try:
            # validate collection
            if collection_name not in self.store.collections:
                print(f"Collection '{collection_name}' not found")
                return []

            # get collection and query
            collection = self.store.collections[collection_name]
            query_embedding = self.embeddings.embed_query(query)

            # search collection
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=k,
                include=['documents', 'metadatas', 'distances']
            )

            # format results
            return [
                {
                    'document': Document(
                        page_content=doc,
                        metadata=meta
                    ),
                    'score': 1.0 - dist  # Convert distance to similarity score
                }
                for doc, meta, dist in zip(
                    results['documents'][0],
                    results['metadatas'][0],
                    results['distances'][0]
                )
            ]

        except Exception as e:
            print(f"Query error: {str(e)}")
            return []
            
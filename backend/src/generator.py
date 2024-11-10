import json
import re
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from time import time
from typing import Any, Dict, List, Optional

import numpy as np
import tiktoken
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_community.embeddings import HuggingFaceBgeEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field, root_validator, validator
from sklearn.metrics.pairwise import cosine_similarity
from tqdm import tqdm

from vectordb import ChromaStore

class MultiCollectionQA:
    def __init__(
        self,
        llm,
        chroma_store: ChromaStore,
        collections: List[str | tuple[str, float]],
        model_name: str = "BAAI/bge-large-en-v1.5",
        max_workers: int = 4,
        cache_size: int = 1000
    ):
        self.llm = llm
        self.store = chroma_store
        self.max_workers = max_workers
        self.cache_size = cache_size

        # process collections with weights
        self.collection_weights = {
            item[0] if isinstance(item, tuple) else item:
            item[1] if isinstance(item, tuple) else 1.0
            for item in collections
        }

        # validate store and collections
        if not self.store.client:
            raise ValueError("chromastore not initialized")

        self.collections = [
            name for name in self.collection_weights
            if name in self.store.collections
        ]

        if not self.collections:
            raise ValueError("no valid collections found")

        # initialize components
        self._setup_embeddings(model_name)
        self.qa_chains = self._initialize_chains()

    def _setup_embeddings(self, model_name: str) -> None:
        """Initialize embeddings without caching"""
        self.embeddings = HuggingFaceBgeEmbeddings(
            model_name=model_name,
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )

    def _initialize_chains(self) -> Dict:
        """Initialize retrieval chains with optimized settings"""
        chains = {}
        prompt = PromptTemplate(
            template=self._get_prompt_template(),
            input_variables=["context", "question"]
        )

        for name in self.collections:
            try:
                vectorstore = Chroma(
                    client=self.store.client,
                    collection_name=name,
                    embedding_function=self.embeddings
                )

                # optimized retriever settings
                retriever = vectorstore.as_retriever(
                    search_type="mmr",
                    search_kwargs={
                        "k": 3,              # reduced for faster retrieval
                        "lambda_mult": 0.8,  # increased diversity
                        "fetch_k": 10        # reduced fetch size
                    }
                )

                chains[name] = {
                    "chain": RetrievalQA.from_chain_type(
                        llm=self.llm,
                        retriever=retriever,
                        chain_type="stuff",
                        return_source_documents=True,
                        chain_type_kwargs={"prompt": prompt}
                    ),
                    "vectorstore": vectorstore
                }
            except Exception as e:
                print(f"failed to setup {name}: {e}")

        return chains

    def _get_prompt_template(self) -> str:
        """Get optimized prompt template"""
        return """You are a distinguished PhD-level academic professor with extensive expertise across multiple disciplines. 
        
        Your knowledge spans various fields of study, and you possess the ability to provide expert insights on a wide range of academic topics. 
    
    Synthesize the provided context to answer the question, avoiding redundancy and prioritizing factual accuracy. Provide a single, focused answer using the context.
        Context: {context}
        Question: {question}
        
        Key Requirements:
        1. Begin with your main argument or finding
        2. Support with evidence from context
        3. Bold essential terms using **term**
        4. Connect ideas with clear transitions

        Writing Guidelines:
        - Start with key findings (not question restatement)
        - Use active voice
        - Eliminate qualifiers (very, really, basically)
        - Replace redundant phrases with concise alternatives
        - Combine related ideas into single, clear statements
        
        Answer:"""

    def _create_empty_response(self, question: str) -> Dict:
        """Create empty response when no results found"""
        return {
            "question": question,
            "answer": "no relevant information found",
            "sources": [],
            "metrics": {
                "avg_score": 0.0,
                "max_score": 0.0,
                "coherence": 0.0,
                "retrieval_time": 0.0
            }
        }

    def query(
        self,
        question: str,
        collection_names: Optional[List[str]] = None,
        rerank: bool = True
    ) -> Dict:
        """Query collections with optional reranking"""
        start_time = time()
        collections = collection_names or self.collections
        valid_collections = set(collections) & set(self.qa_chains.keys())

        if not valid_collections:
            return self._create_empty_response(question)  # Fixed method name

        # parallel collection processing
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                name: executor.submit(
                    self._query_collection, name, question, rerank
                )
                for name in valid_collections
            }

            results = {
                name: future.result()
                for name, future in futures.items()
                if future.result() is not None
            }

        response = self._process_results(results, question)
        response['metrics']['retrieval_time'] = time() - start_time

        return response

    def _rerank_documents(
        self,
        question: str,
        docs: List[tuple]
    ) -> List[tuple]:
        """Rerank documents with proper numpy array handling"""
        try:
            # Convert query to numpy array and ensure it's hashable
            query_embedding = tuple(self.embed_query(question))

            reranked = []
            for doc, _ in docs:
                try:
                    # convert document embedding to tuple for hashing
                    doc_embedding = tuple(
                        self.embed_documents([doc.page_content])[0]
                    )

                    # calculate similarity using numpy arrays
                    similarity = float(cosine_similarity(
                        [list(query_embedding)],
                        [list(doc_embedding)]
                    )[0][0])

                    reranked.append((doc, similarity))
                except Exception as e:
                    print(f"Document embedding failed: {e}")
                    continue

            # sort by similarity score
            return sorted(reranked, key=lambda x: x[1], reverse=True)

        except Exception as e:
            print(f"Reranking failed: {e}")
            return docs  # return original docs if reranking fails

    def _query_collection(
        self,
        name: str,
        question: str,
        rerank: bool = True
    ) -> Optional[Dict]:
        """Query collection with improved answer handling"""
        try:
            chain_result = self.qa_chains[name]["chain"]({"query": question})
            scored_docs = self.qa_chains[name]["vectorstore"].similarity_search_with_relevance_scores(
                question, k=3
            )

            # clean and validate answer
            answer = chain_result.get("result", "").strip()
            if answer:
                # rnsure proper sentence structure
                if not answer.endswith('.'):
                    answer += '.'
                # remove duplicate sentences
                sentences = list(dict.fromkeys(
                    s.strip() for s in answer.split('.')
                    if s.strip()
                ))
                answer = '. '.join(sentences[:2]) + '.'

            return {
                "answer": answer,
                "docs": [doc for doc, _ in scored_docs],
                "scores": [float(score) for _, score in scored_docs],
                "coherence": self._calculate_coherence([
                    doc.page_content for doc, _ in scored_docs
                ])
            }

        except Exception as e:
            print(f"Query failed for {name}: {e}")
            return None

    def _calculate_coherence(self, texts: List[str]) -> float:
        """Calculate coherence using text overlap"""
        if len(texts) <= 1:
            return 1.0

        # convert texts to word sets
        word_sets = [set(text.lower().split()) for text in texts]
        overlaps = []

        for i in range(len(word_sets)):
            for j in range(i + 1, len(word_sets)):
                intersection = len(word_sets[i] & word_sets[j])
                union = len(word_sets[i] | word_sets[j])
                overlap = intersection / union if union > 0 else 0
                overlaps.append(overlap)

        return float(np.mean(overlaps)) if overlaps else 0.0

    def _synthesize_answers(
        self,
        answers: List[str],
        weights: List[float]
    ) -> str:
        """Synthesize multiple answers with weights"""
        if not answers:
            return "No relevant information found."

        # Extract unique information
        unique_info = {}
        for answer, weight in zip(answers, weights):
            # extract bold terms and their contexts
            terms = re.findall(r'\*\*(.*?)\*\*', answer)
            for term in terms:
                # find sentence containing the term
                for sentence in answer.split('.'):
                    if term in sentence:
                        # store with weight as score
                        score = weight * (
                            1 + 0.1 * len(set(terms) & set(unique_info.keys()))
                        )
                        if term not in unique_info or score > unique_info[term][1]:
                            unique_info[term] = (sentence.strip(), score)

        # combine most relevant information
        if not unique_info:
            return answers[0]  # return highest weighted answer

        # sort by score and combine
        combined = '. '.join(
            sent for sent, _ in sorted(
                unique_info.values(),
                key=lambda x: x[1],
                reverse=True
            )[:2]
        )

        return combined + '.'

    def _post_process_answer(self, answer: str) -> str:
        """Post-process answer for conciseness and clarity"""
        if not answer:
            return ""

        # extract and deduplicate bold terms
        bold_terms = set(re.findall(r'\*\*(.*?)\*\*', answer))

        # split into sentences
        sentences = [s.strip() for s in answer.split('.') if s.strip()]

        # keep only most informative sentences (max 2)
        if len(sentences) > 2:
            # Prioritize sentences with bold terms
            scored_sentences = [
                (s, len(set(re.findall(r'\*\*(.*?)\*\*', s)) & bold_terms))
                for s in sentences
            ]
            sentences = [
                s for s, _ in sorted(
                    scored_sentences,
                    key=lambda x: x[1],
                    reverse=True
                )[:2]
            ]

        return '. '.join(sentences) + '.'

    def _process_results(self, results: Dict, question: str) -> Dict:
        """Process results with deduplication"""
        if not results:
            return self._create_empty_response(question)

        # process answers with weights
        answer_info = []
        sources = []
        scores = []

        for name, result in results.items():
            weight = self.collection_weights[name]

            if result["answer"]:
                # extract bold terms for comparison
                terms = set(re.findall(r'\*\*(.*?)\*\*', result["answer"]))
                answer_info.append({
                    'text': result["answer"],
                    'weight': weight,
                    'terms': terms,
                    'score': np.mean(result["scores"]) if result["scores"] else 0
                })

            # process sources
            for doc, score in zip(result["docs"], result["scores"]):
                weighted_score = float(score) * weight
                sources.append({
                    "collection": name,
                    "source": doc.metadata.get("source", "N/A"),
                    "content": doc.page_content[:200],
                    "metadata": doc.metadata,
                    "score": float(score),
                    "weighted_score": weighted_score,
                    "weight": weight
                })
                scores.append(weighted_score)

        # deduplicate and combine answers
        final_answer = self._combine_answers(answer_info)

        # sort and limit sources
        sources.sort(key=lambda x: x["weighted_score"], reverse=True)

        return {
            "question": question,
            "answer": final_answer,
            "sources": sources[:5],
            "metrics": {
                "avg_score": float(np.mean(scores)) if scores else 0.0,
                "max_score": float(np.max(scores)) if scores else 0.0,
                "coherence": float(np.mean([
                    result.get("coherence", 0.0)
                    for result in results.values()
                ]))
            }
        }

    def _combine_answers(self, answer_info: List[Dict]) -> str:
        """Combine answers with intelligent deduplication"""
        if not answer_info:
            return "No relevant information found."

        # sort by score * weight
        answer_info.sort(key=lambda x: x['score'] * x['weight'], reverse=True)

        # take best answer as base
        best_answer = answer_info[0]['text']
        seen_terms = answer_info[0]['terms']

        # add unique information from other answers
        additional_info = []
        for info in answer_info[1:]:
            # check for new terms
            new_terms = info['terms'] - seen_terms
            if new_terms:
                # Extract sentences with new terms
                sentences = [
                    s.strip()
                    for s in info['text'].split('.')
                    if any(term in s for term in new_terms)
                ]
                if sentences:
                    additional_info.extend(sentences)
                    seen_terms.update(new_terms)

        # combine with base answer if there's new information
        if additional_info:
            # extract sentences from best answer
            base_sentences = [s.strip()
                              for s in best_answer.split('.') if s.strip()]

            # take up to 2 sentences total
            combined = base_sentences[:1] + additional_info[:1]
            return '. '.join(combined) + '.'

        return best_answer
    

class ClusterStats(BaseModel):
    cluster_id: int = Field(..., ge=0)
    concept_count: int = Field(..., ge=0)
    relationship_count: int = Field(..., ge=0)
    token_count: Optional[int] = Field(None)

    @validator('token_count')
    def validate_token_count(cls, v):
        if v is not None and v < 0:
            raise ValueError("Token count cannot be negative")
        return v


class Question(BaseModel):
    text: str = Field(
        ...,
        max_length=200,
        description="The question text"
    )
    type: str = Field(
        default="theoretical",
        description="Assigned question type (relationship/theoretical/practical/research/cross_domain)"
    )
    concepts: List[str] = Field(
        default_factory=list,
        description="List of concepts covered in the question"
    )

    @validator('text')
    def validate_text(cls, v):
        if not v or not v.strip():
            raise ValueError("Question text cannot be empty")
        return v.strip()

    @validator('type')
    def validate_type(cls, v):
        valid_types = {'relationship', 'theoretical',
                       'practical', 'research', 'cross_domain'}
        normalized_type = v.lower().replace(' ', '_')
        if normalized_type not in valid_types:
            return "theoretical"  # default to 'theoretical' if invalid
        return normalized_type


class ClusterQuestions(BaseModel):
    cluster_id: int = Field(
        ...,
        ge=0,
        description="Unique identifier for the cluster"
    )
    theme: str = Field(
        ...,
        min_length=1,
        description="Theme of the cluster"
    )
    questions: List[Question] = Field(
        ...,
        min_items=1,
        max_items=5,
        description="List of generated questions"
    )

    @root_validator(pre=True)
    def clean_questions(cls, values):
        if 'questions' in values:
            # remove any empty question dictionaries
            values['questions'] = [
                q for q in values['questions']
                if isinstance(q, dict) and q.get('text')
            ]
            # ensure at least one valid question
            if not values['questions']:
                raise ValueError("At least one valid question is required")
        return values

    class Config:
        json_schema_extra = {
            "example": {
                "cluster_id": 1,
                "theme": "Example Theme",
                "questions": [
                    {
                        "text": "Sample question?",
                        "type": "theoretical",
                        "concepts": ["concept1", "concept2"]
                    }
                ]
            }
        }


class QAGenerator:
    def __init__(
        self,
        llm,
        chroma_store: ChromaStore,
        collection_name: str = 'notes_kg',
        max_workers: int = 4
    ):
        self.llm = llm
        self.store = chroma_store
        self.collection = collection_name
        self.max_workers = max_workers
        self.tokenizer = tiktoken.get_encoding(
            "cl100k_base")  # GPT-4 tokenizer
        self._init_prompt()

    def _init_prompt(self) -> None:
        self.parser = PydanticOutputParser(pydantic_object=ClusterQuestions)

        template = """Generate academic questions for this cluster.
    Theme: {theme}
    Concepts: {concepts}
    Relationships: {relationships}

    Generate between 1-5 complete questions. Each question MUST have both text and type fields.
    Do not include partial or empty questions.

    {format_instructions}
    """
        self.prompt = PromptTemplate(
            template=template,
            input_variables=["theme", "concepts", "relationships"],
            partial_variables={
                "format_instructions": self.parser.get_format_instructions()}
        )

    @lru_cache(maxsize=100)
    def _count_tokens(self, text: str) -> int:
        """Count tokens in text using cache for efficiency"""
        return len(self.tokenizer.encode(text))

    def generate_cluster_questions(
        self,
        clustering_results: Dict[str, Any],
        cluster_id: Optional[int] = None,
        show_tokens: bool = True
    ) -> tuple[List[ClusterQuestions], List[ClusterStats]]:
        try:
            nodes = clustering_results.get('nodes', [])
            if not nodes:
                return [], []

            # group nodes by cluster
            clusters = self._group_nodes_by_cluster(nodes, cluster_id)

            # process clusters in parallel
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = []
                for cid, cluster_nodes in clusters.items():
                    future = executor.submit(
                        self._process_cluster, cid, cluster_nodes, show_tokens)
                    futures.append(future)

                questions_list = []
                stats_list = []
                for future in tqdm(futures, desc="Processing clusters"):
                    try:
                        questions, stats = future.result()
                        if questions:
                            questions_list.append(questions)
                            stats_list.append(stats)
                    except Exception as e:
                        print(f"Cluster processing failed: {e}")

            return questions_list, stats_list

        except Exception as e:
            print(f"Question generation failed: {e}")
            return [], []

        except Exception as e:
            print(f"Question generation failed: {e}")
            return []

    def _process_cluster(
        self,
        cluster_id: int,
        nodes: List[Dict],
        show_tokens: bool = True
    ) -> tuple[Optional[ClusterQuestions], Optional[ClusterStats]]:
        try:
            # extract cluster information
            concepts = [n.get('label', '') for n in nodes if n.get('label')]
            relationships = self._extract_relationships(nodes)
            theme = self._generate_theme(concepts)

            # format prompt
            prompt_text = self.prompt.format(
                theme=theme,
                concepts=str(concepts),
                relationships=str(relationships)
            )

            token_count = self._count_tokens(
                prompt_text) if show_tokens else None

            # generate questions with retries
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = self.llm.invoke(prompt_text).content
                    questions = self.parser.parse(response)
                    questions.cluster_id = cluster_id  # ensure cluster_id is set

                    # Create stats object
                    stats = ClusterStats(
                        cluster_id=cluster_id,
                        concept_count=len(concepts),
                        relationship_count=len(relationships),
                        token_count=token_count
                    )

                    return questions, stats

                except Exception as e:
                    if attempt == max_retries - 1:
                        print(
                            f"Processing failed for cluster {cluster_id}: {e}")
                    continue

            return None, None

        except Exception as e:
            print(f"Cluster {cluster_id} processing failed: {e}")
            return None, None

    def _group_nodes_by_cluster(
        self,
        nodes: List[Dict],
        cluster_id: Optional[int] = None
    ) -> Dict[int, List[Dict]]:
        clusters = {}
        for node in nodes:
            cid = node.get('cluster_id', -1)
            if cid >= 0 and (cluster_id is None or cid == cluster_id):
                if cid not in clusters:
                    clusters[cid] = []
                clusters[cid].append(node)
        return clusters

    def _extract_relationships(self, nodes: List[Dict]) -> List[Dict]:
        seen = set()
        relationships = []

        for node in nodes:
            for rel in node.get('relationships', []):
                if isinstance(rel, dict):
                    key = f"{rel.get('source')}-{rel.get('relationship')}-{rel.get('target')}"
                    if key not in seen:
                        relationships.append({
                            'source': rel.get('source', ''),
                            'type': rel.get('relationship', ''),
                            'target': rel.get('target', '')
                        })
                        seen.add(key)

        return relationships

    def _generate_theme(self, concepts: List[str]) -> str:
        if not concepts:
            return "General Academic Concepts"
        return " & ".join(concepts[:3])

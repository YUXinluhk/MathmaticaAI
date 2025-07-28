import re
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer

def chunk_text(text: str, chunk_size: int = 200, overlap: int = 50) -> List[str]:
    """
    Splits a text into overlapping chunks.
    """
    if not text:
        return []

    # A simple sentence-based chunking for now.
    # A more robust solution might use tokenizers.
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if len(current_chunk) + len(sentence) < chunk_size:
            current_chunk += sentence + " "
        else:
            chunks.append(current_chunk.strip())
            # Start new chunk with overlap
            overlap_text = " ".join(current_chunk.split()[-overlap:])
            current_chunk = overlap_text + " " + sentence + " "

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks

class KnowledgeBase:
    """
    A simple in-memory knowledge base that stores and retrieves text chunks.
    """
    def __init__(self):
        self.chunks = []
        self._embeddings = []
        self._model = SentenceTransformer('allenai/scincl-base-p')

    def add_document(self, text: str):
        """
        Adds a document to the knowledge base, splitting it into chunks.
        """
        new_chunks = chunk_text(text)
        if new_chunks:
            self.chunks.extend(new_chunks)
            new_embeddings = self._model.encode(new_chunks, convert_to_tensor=False)
            if self._embeddings:
                self._embeddings = np.vstack([self._embeddings, new_embeddings])
            else:
                self._embeddings = new_embeddings


    def get_relevant_chunks(self, query: str, top_k: int = 3) -> List[str]:
        """
        Retrieves the most relevant chunks for a given query.
        For now, this uses a simple keyword matching approach.
        A more advanced implementation would use vector embeddings.
        """
        if not self.chunks or self._embeddings is None or len(self._embeddings) == 0:
            return []

        query_embedding = self._model.encode([query], convert_to_tensor=False)

        # Cosine similarity
        cos_scores = np.dot(self._embeddings, query_embedding.T) / (
            np.linalg.norm(self._embeddings, axis=1) * np.linalg.norm(query_embedding)
        )

        # Get top_k scores
        top_indices = np.argsort(cos_scores.flatten())[-top_k:][::-1]

        return [self.chunks[i] for i in top_indices]

# In-memory singleton instance of the KnowledgeBase
knowledge_base_instance = KnowledgeBase()

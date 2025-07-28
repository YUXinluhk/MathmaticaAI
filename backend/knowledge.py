import re
from typing import List

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
        self._embeddings = None
        self._model = None

    def add_document(self, text: str):
        """
        Adds a document to the knowledge base, splitting it into chunks.
        """
        self.chunks.extend(chunk_text(text))

    def get_relevant_chunks(self, query: str, top_k: int = 3) -> List[str]:
        """
        Retrieves the most relevant chunks for a given query.
        For now, this uses a simple keyword matching approach.
        A more advanced implementation would use vector embeddings.
        """
        if not self.chunks:
            return []

        # Simple keyword matching
        query_words = set(query.lower().split())
        scores = []
        for i, chunk in enumerate(self.chunks):
            chunk_words = set(chunk.lower().split())
            score = len(query_words.intersection(chunk_words))
            scores.append((score, i))

        scores.sort(key=lambda x: x[0], reverse=True)

        top_indices = [score[1] for score in scores[:top_k]]

        return [self.chunks[i] for i in top_indices]

# In-memory singleton instance of the KnowledgeBase
knowledge_base_instance = KnowledgeBase()

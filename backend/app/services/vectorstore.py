"""
Wraps ChromaDB (via LangChain) so every uploaded document becomes part of the
user's permanent, searchable personal library. Embeddings are produced via
Google Gemini API (models/embedding-001).
"""
from langchain_postgres.vectorstores import PGVector
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document as LCDocument

from app.config import settings

_embeddings = None
_store = None


def get_embeddings():
    global _embeddings
    if _embeddings is None:
        try:
            if settings.GEMINI_API_KEY:
                from langchain_google_genai import GoogleGenerativeAIEmbeddings
                _embeddings = GoogleGenerativeAIEmbeddings(
                    model="models/text-embedding-004",
                    google_api_key=settings.GEMINI_API_KEY,
                    max_retries=0
                )
            else:
                _embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        except Exception as e:
            print(f"Failed to initialize embeddings: {e}")
            from langchain_community.embeddings import FakeEmbeddings
            _embeddings = FakeEmbeddings(size=384)
    return _embeddings


def get_vectorstore():
    global _store
    if _store is None:
        db_url = settings.DATABASE_URL or settings.SQLITE_URL
        if db_url and db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        _store = PGVector(
            collection_name="learnos_collection_v3",
            connection=db_url,
            embeddings=get_embeddings(),
            use_jsonb=True,
        )
    return _store


def index_document(document_id: str, subject_id: str, title: str, text: str):
    """Chunk the document and push it into the permanent vector library,
    tagged with metadata so search/chat can be scoped by subject or document."""
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    chunks = splitter.split_text(text)

    docs = [
        LCDocument(
            page_content=chunk,
            metadata={
                "document_id": document_id,
                "subject_id": subject_id,
                "title": title,
                "chunk_index": i,
            },
        )
        for i, chunk in enumerate(chunks)
    ]

    store = get_vectorstore()
    if docs:
        batch_size = 150
        for i in range(0, len(docs), batch_size):
            batch = docs[i:i + batch_size]
            store.add_documents(batch)
    return len(docs)


def semantic_search(query: str, k: int = 5, document_ids: list[str] | None = None):
    store = get_vectorstore()
    filt = {"document_id": {"$in": document_ids}} if document_ids else None
    import time
    for attempt in range(3):
        try:
            return store.similarity_search(query, k=k, filter=filt)
        except Exception as e:
            if attempt == 2:
                raise e
            print(f"Semantic search failed (attempt {attempt+1}/3): {e}. Retrying...")
            time.sleep(2)
    return []


def delete_document_vectors(document_id: str):
    store = get_vectorstore()
    try:
        from sqlalchemy import text
        with store._make_sync_session() as session:
            session.execute(text("DELETE FROM langchain_pg_embedding WHERE cmetadata->>'document_id' = :doc_id"), {"doc_id": document_id})
            session.commit()
    except Exception:
        pass

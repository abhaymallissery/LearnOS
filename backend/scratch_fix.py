import os
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from app.database import SessionLocal
from app import models
from app.utils.text_extract import extract_text
from app.services.ingestion import force_english
from app.services import summarizer, vectorstore

def main():
    # 1. Fetch document and close session
    db = SessionLocal()
    try:
        doc = db.query(models.Document).filter(models.Document.title.ilike('%https://youtu.be/8wmn7k1TTcI%')).first()
        if not doc:
            doc = db.query(models.Document).first()
            
        doc_id = doc.id
        file_path = doc.file_path
        file_type = doc.file_type
        subject_id = doc.subject_id
        title = doc.title
        raw_text_path = doc.raw_text_path or os.path.join("storage", "uploads", f"{doc_id}.txt")
    finally:
        db.close() # Close connection while we do the heavy 10-minute LLM lifting

    print('Extracting text from', file_path)
    text = extract_text(file_path, file_type)
    
    # Check if we should translate a smaller subset for speed? No, let's translate the whole thing
    print('Translating using Groq LLM (with rate limits)... this will take 8 minutes')
    text = force_english(text)
    print('Translation finished')
    
    # Save the text to disk
    print(f"Writing text to {raw_text_path}")
    with open(raw_text_path, "w", encoding="utf-8") as f:
        f.write(text)
    
    print('Summarizing in English...')
    summary_and_notes = summarizer.generate_summary_and_notes(text)
    
    from app.services.ingestion import _render_notes_markdown
    note_content = _render_notes_markdown(summary_and_notes['notes'])
    
    # 2. Re-open DB session to commit changes
    print("Re-opening DB connection to commit changes...")
    db = SessionLocal()
    try:
        doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
        doc.summary = summary_and_notes['summary']
        doc.raw_text_path = raw_text_path
        
        db.query(models.Note).filter(models.Note.document_id == doc_id).delete()
        note = models.Note(
            document_id=doc_id,
            title=f'Smart Notes — {doc.title}',
            content=note_content,
            key_terms=summary_and_notes['notes'].get('key_concepts', []),
        )
        db.add(note)
        
        print('Re-indexing vectors in English...')
        vectorstore.delete_document_vectors(doc_id)
        vectorstore.index_document(doc_id, subject_id, title, text)
        
        doc.status = 'indexed'
        db.commit()
        print('Successfully finished completely translating the document to English!')
    except Exception as e:
        print(f"Error saving to DB: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

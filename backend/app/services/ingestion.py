"""
Orchestrates the full pipeline that runs after a file is uploaded:
extract -> summarize -> generate smart notes -> index into the vector library.
Runs as a FastAPI BackgroundTask so the upload endpoint returns instantly.
"""
import json
import os
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.utils.text_extract import extract_text
from app.services import summarizer, vectorstore

def process_document(document_id: str, db: Session):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        return
    try:
        text = extract_text(doc.file_path, doc.file_type)

        raw_text_path = os.path.join(settings.UPLOAD_DIR, f"{doc.id}.txt")
        with open(raw_text_path, "w", encoding="utf-8") as f:
            f.write(text)
        doc.raw_text_path = raw_text_path

        summary_and_notes = summarizer.generate_summary_and_notes(text)
        doc.summary = summary_and_notes["summary"]
        notes_data = summary_and_notes["notes"]
        note_content = _render_notes_markdown(notes_data)
        note = models.Note(
            document_id=doc.id,
            title=f"Smart Notes — {doc.title}",
            content=note_content,
            key_terms=notes_data.get("key_concepts", []),
        )
        db.add(note)

        vectorstore.index_document(doc.id, doc.subject_id, doc.title, text)

        doc.status = "indexed"
        db.commit()
    except Exception as exc:  # pragma: no cover - defensive path
        print(f"Document processing failed: {exc}")
        db.rollback()
        doc = db.query(models.Document).filter(models.Document.id == document_id).first()
        if doc:
            doc.status = "failed"
            db.commit()


def _render_notes_markdown(notes: dict) -> str:
    lines = []
    if notes.get("key_concepts"):
        lines.append("## Key Concepts")
        lines += [f"- {c}" for c in notes["key_concepts"]]
    if notes.get("definitions"):
        lines.append("\n## Definitions")
        lines += [f"- **{d.get('term')}**: {d.get('definition')}" for d in notes["definitions"]]
    if notes.get("formulas"):
        lines.append("\n## Formulas")
        lines += [f"- `{f}`" for f in notes["formulas"]]
    if notes.get("important_points"):
        lines.append("\n## Important Points")
        lines += [f"- {p}" for p in notes["important_points"]]
    return "\n".join(lines) if lines else "No structured notes could be extracted."

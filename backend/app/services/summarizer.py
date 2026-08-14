"""
Uses cloud-based LLM APIs (Groq + Gemini fallback) to produce:
  1. A concise document summary
  2. Structured "Smart Notes" (key concepts, definitions, formulas)
  3. A short daily-journal entry describing what was learned
"""
import json
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate

from app.config import settings

_llm = None


def get_llm(temperature: float = 0.2):
    global _llm
    if _llm is None:
        llms = []
        if settings.GROQ_API_KEY:
            try:
                llms.append(ChatGroq(
                    api_key=settings.GROQ_API_KEY,
                    model_name=settings.GROQ_MODEL,
                    temperature=temperature,
                    max_retries=0,
                ))
            except Exception as e:
                print(f"Groq initialization failed: {e}")
        
        if settings.GEMINI_API_KEY:
            try:
                llms.append(ChatGoogleGenerativeAI(
                    google_api_key=settings.GEMINI_API_KEY,
                    model=settings.GEMINI_MODEL,
                    temperature=temperature,
                    max_retries=0,
                ))
            except Exception as e:
                print(f"Gemini initialization failed: {e}")
                
        if not llms:
            raise ValueError("No LLM API keys provided. Please set GROQ_API_KEY or GEMINI_API_KEY in .env")
            
        _llm = llms[0].with_fallbacks(llms[1:]) if len(llms) > 1 else llms[0]
        
    return _llm


SUMMARY_PROMPT = ChatPromptTemplate.from_template(
    "You are a study assistant. Summarize the following study material in "
    "6-10 concise bullet points that a student can use to quickly recall the "
    "content. Keep it factual, do not add information that is not present.\n"
    "IMPORTANT: Always output your response strictly in English, regardless of the language of the material.\n\n"
    "MATERIAL:\n{text}\n\nSUMMARY BULLETS:"
)

COMBINED_PROMPT = ChatPromptTemplate.from_template(
    "You are a study assistant. Analyze the study material below and produce a single JSON object. "
    "It must strictly adhere to this schema:\n"
    "{{\n"
    "  \"summary_bullets\": [\"string\"],\n"
    "  \"key_concepts\": [\"string\"],\n"
    "  \"definitions\": [{{\"term\": \"string\", \"definition\": \"string\"}}],\n"
    "  \"formulas\": [\"string\"],\n"
    "  \"important_points\": [\"string\"]\n"
    "}}\n"
    "Ensure summary_bullets has 6-10 concise bullet points.\n"
    "IMPORTANT: Always output your response strictly in English, regardless of the language of the material.\n"
    "Only output valid JSON, nothing else.\n\n"
    "MATERIAL:\n{text}\n\nJSON:"
)

SMART_NOTES_PROMPT = ChatPromptTemplate.from_template(
    "From the study material below, produce Smart Notes as strict JSON with "
    "this schema: {{\"key_concepts\": [string], \"definitions\": "
    "[{{\"term\": string, \"definition\": string}}], \"formulas\": [string], "
    "\"important_points\": [string]}}. Only output valid JSON, nothing else.\n"
    "IMPORTANT: Always output your response strictly in English, regardless of the language of the material.\n\n"
    "MATERIAL:\n{text}\n\nJSON:"
)


DAILY_ENTRY_PROMPT = ChatPromptTemplate.from_template(
    "Write a 2-3 sentence, first-person learning-journal entry summarizing "
    "what a student studied today, based on these document titles and "
    "summaries:\n{context}\n"
    "IMPORTANT: Always output your response strictly in English, regardless of the language of the material.\n\n"
    "JOURNAL ENTRY:"
)

STICKY_NOTES_PROMPT = ChatPromptTemplate.from_template(
    "You are a study assistant. Extract 3 to 5 bite-sized, extremely simple concepts "
    "from the following study material. Explain them as if you are explaining to a beginner. "
    "Do not just copy the text verbatim; paraphrase to make it easy to understand. "
    "Produce strict JSON with this schema: {{\"notes\": [{{\"term\": \"string\", \"definition\": \"string\"}}]}}. "
    "Only output valid JSON.\n"
    "IMPORTANT: Always output your response strictly in English, regardless of the language of the material.\n\n"
    "MATERIAL:\n{text}\n\nJSON:"
)


def _map_reduce_text(text: str, max_chars: int = 40000) -> str:
    """For very long documents, pre-condense with a simple splitter + LLM pass
    per chunk, then combine — a lightweight map-reduce.
    Increased max_chars to 40000 since Llama 3.1 8B handles up to 128k tokens,
    avoiding redundant slow map-reduce passes for short/medium documents."""
    if len(text) <= max_chars:
        return text
    splitter = RecursiveCharacterTextSplitter(chunk_size=max_chars, chunk_overlap=200)
    chunks = splitter.split_text(text)
    llm = get_llm()
    partial_summaries = []
    for chunk in chunks:
        resp = llm.invoke(SUMMARY_PROMPT.format(text=chunk))
        partial_summaries.append(resp.content)
    return "\n".join(partial_summaries)


def generate_summary(text: str) -> str:
    try:
        return _fallback_algorithmic_summary(text)
    except Exception:
        try:
            condensed = _map_reduce_text(text)
            llm = get_llm()
            resp = llm.invoke(SUMMARY_PROMPT.format(text=condensed))
            return resp.content.strip()
        except Exception:
            return "No summary available."


def generate_smart_notes(text: str) -> dict:
    try:
        return _fallback_algorithmic_smart_notes(text)
    except Exception:
        try:
            condensed = _map_reduce_text(text)
            llm = get_llm()
            resp = llm.invoke(SMART_NOTES_PROMPT.format(text=condensed))
            raw = resp.content.strip()
            raw = raw.strip("`")
            if raw.lower().startswith("json"):
                raw = raw[4:].strip()
            return json.loads(raw)
        except Exception:
            return {"key_concepts": [], "definitions": [], "formulas": [], "important_points": []}


def generate_summary_and_notes(text: str) -> dict:
    """Generates both summary and smart notes algorithmically for flash fast speed, with LLM fallback."""
    try:
        summary_text = _fallback_algorithmic_summary(text)
        notes_dict = _fallback_algorithmic_smart_notes(text)
        return {"summary": summary_text, "notes": notes_dict}
    except Exception:
        try:
            condensed = _map_reduce_text(text)
            llm = get_llm()
            resp = llm.invoke(COMBINED_PROMPT.format(text=condensed))
            raw = resp.content.strip()
            raw = raw.strip("`")
            if raw.lower().startswith("json"):
                raw = raw[4:].strip()
            data = json.loads(raw)
            
            summary_bullets = data.get("summary_bullets", [])
            if summary_bullets:
                summary = "\n".join([f"- {b}" for b in summary_bullets])
            else:
                summary = "No summary available."
                
            return {"summary": summary, "notes": data}
        except Exception:
            return {"summary": "No summary available.", "notes": {}}


def _fallback_algorithmic_summary(text: str) -> str:
    from app.services.qgen import _clean_sentences, _rank_sentences
    sentences = _clean_sentences(text)
    if not sentences:
        return text[:500] if text else "No text extracted."
    ranked = _rank_sentences(sentences, top_n=6)
    return "\n".join([f"- {s}" for s in ranked])


def _fallback_algorithmic_smart_notes(text: str) -> dict:
    from app.services.qgen import _clean_sentences, _rank_sentences, _key_terms
    terms = _key_terms(text, top_n=10)
    sentences = _clean_sentences(text)
    ranked = _rank_sentences(sentences, top_n=5)
    return {
        "key_concepts": terms[:5],
        "definitions": [],
        "formulas": [],
        "important_points": ranked[:5],
    }


def generate_daily_entry(context: str) -> str:
    llm = get_llm()
    resp = llm.invoke(DAILY_ENTRY_PROMPT.format(context=context))
    return resp.content.strip()


def answer_from_context(question: str, context_chunks: list[str]) -> str:
    """RAG answer: the model is only allowed to use the supplied chunks,
    guaranteeing the AI Chat answers strictly from the user's own materials."""
    context = "\n---\n".join(context_chunks)
    prompt = ChatPromptTemplate.from_template(
        "Answer the question concisely using ONLY the context below, which comes from "
        "the student's own uploaded study materials. Keep your answer brief and strictly to the point to ensure a fast response. "
        "If the answer is not contained in the context, say you don't have enough information in "
        "the selected materials.\n"
        "IMPORTANT: Always answer strictly in English, regardless of the language of the context or the question.\n\n"
        "CONTEXT:\n{context}\n\nQUESTION: {question}\n\nANSWER:"
    )
    llm = get_llm()
    try:
        resp = llm.invoke(prompt.format(context=context, question=question))
        return resp.content.strip()
    except Exception:
        fallback_msg = "⚠️ *AI service is currently offline. Here are the most relevant excerpts from your materials instead:*\n\n"
        excerpts = [f"- {chunk[:400]}..." for chunk in context_chunks]
        return fallback_msg + "\n\n".join(excerpts)


MANUAL_NOTE_REVIEW_PROMPT = ChatPromptTemplate.from_template(
    "You are an expert tutor and study assistant. The student has written a manual study note "
    "about the topic '{topic_name}'. Review their note, fix any grammatical errors, and correct "
    "any factual mistakes. If they misunderstood a concept, gently point out what was wrong and "
    "provide the correct explanation.\n"
    "Rewrite the note beautifully in Markdown format, using headings, bullet points, or bold text "
    "where appropriate to make it a high-quality study resource.\n"
    "IMPORTANT: Always output your response strictly in English, regardless of the language of the material.\n\n"
    "STUDENT'S NOTE:\n{note_content}\n\n"
    "PERFECTED NOTE (Markdown):"
)

def review_manual_note(topic_name: str, note_content: str) -> str:
    llm = get_llm(temperature=0.2)
    try:
        resp = llm.invoke(MANUAL_NOTE_REVIEW_PROMPT.format(topic_name=topic_name, note_content=note_content))
        return resp.content.strip()
    except Exception as e:
        print(f"Error reviewing manual note: {e}")
        return f"*(AI Review unavailable)*\n\n{note_content}"


def generate_sticky_notes(text: str) -> list[dict]:
    try:
        condensed = _map_reduce_text(text, max_chars=10000)
        llm = get_llm(temperature=0.7) # Higher temperature for more creative paraphrasing
        resp = llm.invoke(STICKY_NOTES_PROMPT.format(text=condensed))
        raw = resp.content.strip()
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()
        data = json.loads(raw)
        return data.get("notes", [])
    except Exception as e:
        print(f"Error generating sticky notes: {e}")
        return []

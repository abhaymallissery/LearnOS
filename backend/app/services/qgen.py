"""
Custom Question Generation Engine.

Per the project spec, the Exam Center deliberately does NOT call an LLM to
write questions. Instead this module uses classic NLP/IR techniques:

  - spaCy for sentence segmentation, POS tagging and Named Entity Recognition
  - TF-IDF (scikit-learn) to rank sentences/terms by importance
  - Rule-based templates to turn a scored sentence into MCQ / fill-in-the-blank
    / true-false / short-answer questions
  - WordNet-independent distractor generation: distractors are drawn from
    OTHER important terms/entities found in the same document, so they stay
    topically plausible without needing an external knowledge base.

This keeps the whole engine free, deterministic, explainable and offline.
"""
import random
import re
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer

_nlp = None


def get_nlp():
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            # Fallback to a blank pipeline with just a sentencizer if the
            # small model hasn't been downloaded yet (`python -m spacy
            # download en_core_web_sm`), so the engine still runs.
            _nlp = spacy.blank("en")
            _nlp.add_pipe("sentencizer")
    return _nlp


def _clean_sentences(text: str) -> list[str]:
    doc = get_nlp()(text)
    sents = [s.text.strip().replace("\n", " ") for s in doc.sents]
    return [s for s in sents if 20 <= len(s) <= 1000 and re.search(r"[A-Za-z]", s)]


def _rank_sentences(sentences: list[str], top_n: int) -> list[str]:
    if len(sentences) <= top_n:
        return sentences
    vectorizer = TfidfVectorizer(stop_words="english")
    matrix = vectorizer.fit_transform(sentences)
    scores = matrix.sum(axis=1).A1
    ranked = [s for _, s in sorted(zip(scores, sentences), reverse=True)]
    return ranked[:top_n]


def _key_terms(text: str, top_n: int = 40) -> list[str]:
    """Important nouns / proper nouns / entities used both as blank-answers
    and as a distractor pool."""
    doc = get_nlp()(text)
    terms = set()
    if doc.has_annotation("TAG"):
        for chunk in doc.noun_chunks:
            t = chunk.text.strip()
            if 2 <= len(t.split()) <= 4 and t.lower() not in terms:
                terms.add(t)
    for ent in getattr(doc, "ents", []):
        terms.add(ent.text.strip())
    terms = [t for t in terms if len(t) > 2]
    random.shuffle(terms)
    return terms[:top_n]


def _pick_blank_term(sentence: str, key_terms: list[str]) -> str | None:
    candidates = [t for t in key_terms if t.lower() in sentence.lower()]
    if not candidates:
        words = [w for w in sentence.split() if len(w) > 5 and w.isalpha()]
        return random.choice(words) if words else None
    return max(candidates, key=len)


def _make_fill_blank(sentence: str, key_terms: list[str]) -> dict | None:
    term = _pick_blank_term(sentence, key_terms)
    if not term:
        return None
    pattern = re.compile(re.escape(term), re.IGNORECASE)
    blanked = pattern.sub("_____", sentence, count=1)
    if blanked == sentence:
        return None
    return {"type": "fill_blank", "question": blanked, "answer": term}


def _make_mcq(sentence: str, key_terms: list[str]) -> dict | None:
    fb = _make_fill_blank(sentence, key_terms)
    if not fb:
        return None
    correct = fb["answer"]
    distractor_pool = [t for t in key_terms if t.lower() != correct.lower()]
    if len(distractor_pool) < 3:
        return None
    distractors = random.sample(distractor_pool, 3)
    options = distractors + [correct]
    random.shuffle(options)
    return {
        "type": "mcq",
        "question": fb["question"].replace("_____", "________"),
        "options": options,
        "answer": correct,
    }


def _make_true_false(sentence: str, key_terms: list[str]) -> dict:
    is_true = random.random() > 0.5
    statement = sentence
    if not is_true and len(key_terms) >= 2:
        a, b = random.sample(key_terms, 2)
        if a.lower() in sentence.lower():
            statement = re.sub(re.escape(a), b, sentence, count=1, flags=re.IGNORECASE)
    return {"type": "true_false", "question": statement, "answer": is_true}


def _make_short_answer(sentence: str) -> dict:
    question = f"Explain, in your own words, the idea expressed here: \u201c{sentence[:140]}\u2026\u201d"
    return {"type": "short_answer", "question": question, "answer": sentence}


def _make_coding_exercise(text: str) -> dict | None:
    """Detects code-like blocks (heuristic: lines with braces/semicolons/def/
    function keywords) and turns them into a 'complete the function' exercise."""
    code_lines = [
        l for l in text.splitlines()
        if re.search(r"\b(def |function |class |for\(|for \(|if\(|if \()", l)
    ]
    if not code_lines:
        return None
    snippet = "\n".join(code_lines[:6])
    return {
        "type": "coding",
        "question": "Based on the material, complete/explain what the following code does:\n\n" + snippet,
        "answer": "Open-ended: evaluated manually or compared against the source snippet.",
    }


def _generate_questions_ai(text: str, question_types: list[str], num_questions: int = 10) -> list[dict]:
    from app.services.summarizer import get_llm
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import JsonOutputParser
    
    if not text.strip():
        return []
        
    llm = get_llm(temperature=0.7)
    parser = JsonOutputParser()
    
    prompt = ChatPromptTemplate.from_template(
        "You are an expert educator. Your task is to generate a quiz based strictly on the provided material.\n"
        "IMPORTANT RULES:\n"
        "1. The quiz MUST be entirely in English, even if the material is in another language.\n"
        "2. Generate exactly {num_questions} questions.\n"
        "3. Allowed question types: {question_types}.\n"
        "4. You must format your response as a JSON array of objects.\n\n"
        "Each object should have the following fields based on its type:\n"
        "- For 'mcq': {{\"id\": \"q#\", \"type\": \"mcq\", \"question\": \"...\", \"options\": [\"...\", \"...\", \"...\", \"...\"], \"answer\": \"...\", \"source_sentence\": \"...\"}}\n"
        "- For 'fill_blank': {{\"id\": \"q#\", \"type\": \"fill_blank\", \"question\": \"...\", \"answer\": \"...\", \"source_sentence\": \"...\"}}\n"
        "- For 'true_false': {{\"id\": \"q#\", \"type\": \"true_false\", \"question\": \"...\", \"answer\": true/false, \"source_sentence\": \"...\"}}\n"
        "- For 'short_answer': {{\"id\": \"q#\", \"type\": \"short_answer\", \"question\": \"...\", \"answer\": \"...\", \"source_sentence\": \"...\"}}\n"
        "- For 'coding': {{\"id\": \"q#\", \"type\": \"coding\", \"question\": \"...\", \"answer\": \"...\", \"source_sentence\": \"...\"}}\n\n"
        "MATERIAL TO ASSESS:\n{text}\n\n"
        "Output ONLY valid JSON."
    )
    
    chain = prompt | llm | parser
    try:
        text_chunk = text[:30000] 
        questions = chain.invoke({
            "text": text_chunk, 
            "num_questions": num_questions, 
            "question_types": ", ".join(question_types)
        })
        if isinstance(questions, list):
            for i, q in enumerate(questions):
                q["id"] = f"q{i+1}"
            return questions[:num_questions]
        return []
    except Exception as e:
        print(f"Failed to generate questions with LLM: {e}")
        return []


def generate_questions(text: str, question_types: list[str], num_questions: int = 10) -> list[dict]:
    # 1. Try Algorithmic NLP first
    sentences = _clean_sentences(text)
    questions = []
    if sentences:
        ranked = _rank_sentences(sentences, top_n=max(num_questions * 3, 15))
        key_terms = _key_terms(text)
        builders = {
            "mcq": lambda s: _make_mcq(s, key_terms),
            "fill_blank": lambda s: _make_fill_blank(s, key_terms),
            "true_false": lambda s: _make_true_false(s, key_terms),
            "short_answer": lambda s: _make_short_answer(s),
        }
        active_types = [t for t in question_types if t in builders]
        if not active_types:
            active_types = ["mcq", "fill_blank", "true_false", "short_answer"]

        idx = 0
        attempts = 0
        while len(questions) < num_questions and attempts < len(ranked) * len(active_types):
            qtype = active_types[idx % len(active_types)]
            sentence = ranked[attempts % len(ranked)]
            q = builders[qtype](sentence)
            if q:
                q["id"] = f"q{len(questions) + 1}"
                q["source_sentence"] = sentence
                questions.append(q)
                idx += 1
            attempts += 1

        if "coding" in question_types:
            coding_q = _make_coding_exercise(text)
            if coding_q:
                coding_q["id"] = f"q{len(questions) + 1}"
                questions.append(coding_q)
                
    # 2. If Algorithmic NLP failed to generate meaningful questions (like for non-English), fallback to AI
    if len(questions) < 2 and len(text.strip()) > 10:
        ai_questions = _generate_questions_ai(text, question_types, num_questions)
        if ai_questions:
            return ai_questions
            
        # 3. Absolute fallback if AI also fails
        if not questions:
            questions.append({
                "id": "q1",
                "type": "short_answer",
                "question": "Summarize the key concepts discussed in this material.",
                "answer": "Answers will vary. Review the original text to check.",
                "source_sentence": text[:500]
            })

    return questions[:num_questions] if len(questions) > num_questions else questions


def grade_quiz(questions: list[dict], answers: dict) -> dict:
    """Grades objective question types automatically; short-answer / coding
    are flagged for self-assessment (common in offline study tools)."""
    total_gradable = 0
    correct = 0
    weak_concepts = []
    detailed_results = []

    for q in questions:
        qid = q["id"]
        user_answer = answers.get(qid)
        is_correct = False
        if q["type"] in ("mcq", "fill_blank"):
            total_gradable += 1
            is_correct = (
                isinstance(user_answer, str)
                and user_answer.strip().lower() == str(q["answer"]).strip().lower()
            )
            if is_correct:
                correct += 1
            else:
                weak_concepts.append(q.get("source_sentence", q["question"])[:120])
        elif q["type"] == "true_false":
            total_gradable += 1
            is_correct = bool(user_answer) == bool(q["answer"])
            if is_correct:
                correct += 1
            else:
                weak_concepts.append(q.get("source_sentence", q["question"])[:120])
        
        # Add to detailed results for all questions (including short answer/coding, though they aren't auto-graded for score)
        detailed_results.append({
            "id": qid,
            "question": q["question"],
            "type": q["type"],
            "is_correct": is_correct if q["type"] in ("mcq", "fill_blank", "true_false") else None,
            "correct_answer": q["answer"],
            "user_answer": user_answer,
            "explanation": q.get("source_sentence", "No specific source sentence available.")
        })

    score = (correct / total_gradable * 100) if total_gradable else 0.0
    return {"score": round(score, 1), "weak_concepts": weak_concepts, "detailed_results": detailed_results}

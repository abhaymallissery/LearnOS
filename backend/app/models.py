import datetime
import uuid
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base


def gen_id():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    reward_points = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    subjects = relationship("Subject", back_populates="owner", cascade="all, delete")


class Subject(Base):
    """Top level organisation unit, e.g. 'Data Structures', 'Operating Systems'."""
    __tablename__ = "subjects"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="subjects")
    documents = relationship("Document", back_populates="subject", cascade="all, delete")
    topics = relationship("Topic", back_populates="subject", cascade="all, delete")


class Topic(Base):
    """A sub-unit within a subject, auto-detected or user defined, used for the
    prerequisite graph that powers the Recommendation Engine."""
    __tablename__ = "topics"
    id = Column(String, primary_key=True, default=gen_id)
    subject_id = Column(String, ForeignKey("subjects.id"))
    name = Column(String, nullable=False)
    prerequisite_topic_id = Column(String, ForeignKey("topics.id"), nullable=True)
    mastery_score = Column(Float, default=0.0)  # 0-1, updated after exams/revisions
    status = Column(String, default="not_started")  # not_started, in_progress, completed

    subject = relationship("Subject", back_populates="topics")


class Document(Base):
    __tablename__ = "documents"
    id = Column(String, primary_key=True, default=gen_id)
    subject_id = Column(String, ForeignKey("subjects.id"))
    topic_id = Column(String, ForeignKey("topics.id"), nullable=True)
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String)  # pdf, docx, pptx, txt
    raw_text_path = Column(String, nullable=True)
    summary = Column(Text, default="")
    status = Column(String, default="processing")  # processing, indexed, failed
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    subject = relationship("Subject", back_populates="documents")
    notes = relationship("Note", back_populates="document", cascade="all, delete")


class Note(Base):
    """Auto-generated Smart Notes for quick revision or Manual AI-reviewed notes."""
    __tablename__ = "notes"
    id = Column(String, primary_key=True, default=gen_id)
    document_id = Column(String, ForeignKey("documents.id"), nullable=True)
    topic_id = Column(String, ForeignKey("topics.id"), nullable=True)
    title = Column(String)
    content = Column(Text)  # markdown: key concepts, definitions, formulas
    key_terms = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="notes")
    topic = relationship("Topic")


class DailySummary(Base):
    """Learning journal - one row per user per day."""
    __tablename__ = "daily_summaries"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"))
    date = Column(String)  # YYYY-MM-DD
    documents_studied = Column(JSON, default=list)   # document ids
    topics_touched = Column(JSON, default=list)       # topic ids
    minutes_spent = Column(Integer, default=0)
    summary_text = Column(Text, default="")


class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String, default="New Chat")
    document_ids = Column(JSON, default=list)  # restrict Q&A scope to these docs
    topic_ids = Column(JSON, default=list) # restrict Q&A scope to these topics
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String, primary_key=True, default=gen_id)
    session_id = Column(String, ForeignKey("chat_sessions.id"))
    role = Column(String)  # user | assistant
    content = Column(Text)
    sources = Column(JSON, default=list)  # doc chunks used to ground the answer
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")


class Quiz(Base):
    """A generated exam/quiz produced by the non-LLM Question Generation Engine."""
    __tablename__ = "quizzes"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"))
    subject_id = Column(String, ForeignKey("subjects.id"), nullable=True)
    document_id = Column(String, ForeignKey("documents.id"), nullable=True)
    title = Column(String)
    question_types = Column(JSON, default=list)
    questions = Column(JSON, default=list)  # list of question dicts
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(String, primary_key=True, default=gen_id)
    quiz_id = Column(String, ForeignKey("quizzes.id"))
    user_id = Column(String, ForeignKey("users.id"))
    answers = Column(JSON, default=dict)
    score = Column(Float, default=0.0)
    weak_concepts = Column(JSON, default=list)
    taken_at = Column(DateTime, default=datetime.datetime.utcnow)

    quiz = relationship("Quiz", back_populates="attempts")


class RevisionSchedule(Base):
    """Spaced-repetition (SM-2 style) schedule entries."""
    __tablename__ = "revision_schedules"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"))
    topic_id = Column(String, ForeignKey("topics.id"), nullable=True)
    document_id = Column(String, ForeignKey("documents.id"), nullable=True)
    ease_factor = Column(Float, default=2.5)
    interval_days = Column(Integer, default=1)
    repetitions = Column(Integer, default=0)
    next_review_date = Column(String)  # YYYY-MM-DD
    last_reviewed_at = Column(DateTime, nullable=True)


class ShareLink(Base):
    """Public/token-based sharing of notes, summaries, or quizzes."""
    __tablename__ = "share_links"
    id = Column(String, primary_key=True, default=gen_id)
    owner_id = Column(String, ForeignKey("users.id"))
    resource_type = Column(String)  # note, summary, quiz, document, subject, chat_session
    resource_id = Column(String)
    access_level = Column(String, default="read") # read, read_write
    chat_session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=True) # collaborative chat
    is_one_time = Column(Boolean, default=False)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class VerificationToken(Base):
    __tablename__ = "verification_tokens"
    token = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    expires_at = Column(DateTime)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    token = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    pending_password = Column(String, nullable=True)
    expires_at = Column(DateTime)

class StudyTarget(Base):
    __tablename__ = "study_targets"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    target_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    tasks = relationship("DailyStudyTask", back_populates="target", cascade="all, delete")

class DailyStudyTask(Base):
    __tablename__ = "daily_study_tasks"
    id = Column(String, primary_key=True, default=gen_id)
    target_id = Column(String, ForeignKey("study_targets.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"))
    description = Column(String, nullable=False)
    is_completed = Column(Boolean, default=False)
    completion_note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    target = relationship("StudyTarget", back_populates="tasks")


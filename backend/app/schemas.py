from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
import datetime


# ---------- Auth ----------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    is_verified: bool = False
    reward_points: int = 0

    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str

class ResetPasswordRequest(BaseModel):
    token: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Subjects / Topics ----------
class SubjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class SubjectOut(BaseModel):
    id: str
    name: str
    description: str

    class Config:
        from_attributes = True


class TopicCreate(BaseModel):
    subject_id: str
    name: str
    prerequisite_topic_id: str | None = None
    target_duration_days: int | None = None
    initial_objectives: List[str] = []

    class Config:
        from_attributes = True

class TopicUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    target_duration_days: Optional[int] = None


class TopicOut(BaseModel):
    id: str
    name: str
    status: str
    mastery_score: float
    progress: int = 0

    class Config:
        from_attributes = True


# ---------- Documents ----------
class DocumentUrlCreate(BaseModel):
    subject_id: str
    url: str

class DocumentOut(BaseModel):
    id: str
    title: str
    subject_id: Optional[str] = None
    file_type: Optional[str]
    status: str
    summary: str
    uploaded_at: datetime.datetime

    class Config:
        from_attributes = True


class NoteOut(BaseModel):
    id: str
    title: str
    content: str
    key_terms: List[str]

    class Config:
        from_attributes = True


# ---------- Chat ----------
class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"
    document_ids: List[str] = []
    topic_ids: List[str] = []

class ChatSessionUpdate(BaseModel):
    title: str


class ChatAsk(BaseModel):
    session_id: str
    question: str


class ChatMessageOut(BaseModel):
    role: str
    content: str
    sources: List[Dict[str, Any]] = []
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Exam / Quiz ----------
class QuizGenerateRequest(BaseModel):
    subject_id: str | None = None
    document_ids: list[str] = []
    topic_ids: list[str] = []
    topic_id: str | None = None  # Deprecated, use topic_ids
    question_types: list[str] = ["mcq", "fill_blank", "true_false", "short_answer", "coding"]
    num_questions: int = 10


class QuizSubmit(BaseModel):
    quiz_id: str
    answers: Dict[str, Any]


# ---------- Revision ----------
class RevisionReview(BaseModel):
    schedule_id: str
    quality: int  # 0-5 self-rated recall quality (SM-2 input)


# ---------- Share ----------
class ShareCreate(BaseModel):
    resource_type: str
    resource_id: str
    access_level: str = "read"
    is_one_time: bool = False
    base_url: Optional[str] = None
    expires_in_days: Optional[int] = 7

# ---------- Study Plan ----------
class StudyTargetCreate(BaseModel):
    title: str
    days: int

class DailyStudyTaskCreate(BaseModel):
    description: str
    target_id: Optional[str] = None

class DailyStudyTaskUpdate(BaseModel):
    description: Optional[str] = None
    completion_note: Optional[str] = None

class DailyStudyTaskOut(BaseModel):
    id: str
    target_id: Optional[str] = None
    description: str
    is_completed: bool
    completion_note: Optional[str] = None

    class Config:
        orm_mode = True

class StudyTargetOut(BaseModel):
    id: str
    title: str
    target_date: datetime.datetime
    created_at: datetime.datetime
    tasks: List[DailyStudyTaskOut] = []

    class Config:
        orm_mode = True

class ManualNoteCreate(BaseModel):
    content: str

"""
Implements the SM-2 spaced-repetition algorithm (the same family of algorithm
used by Anki/SuperMemo) to schedule when a topic or document should next be
revised, based on the student's self-rated recall quality (0-5).
"""
import datetime


def schedule_next_review(ease_factor: float, interval_days: int, repetitions: int, quality: int):
    """Returns (new_ease_factor, new_interval_days, new_repetitions, next_review_date)."""
    quality = max(0, min(5, quality))

    if quality < 3:
        repetitions = 0
        interval_days = 1
    else:
        if repetitions == 0:
            interval_days = 1
        elif repetitions == 1:
            interval_days = 6
        else:
            interval_days = round(interval_days * ease_factor)
        repetitions += 1

    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    ease_factor = max(1.3, ease_factor)

    next_date = datetime.date.today() + datetime.timedelta(days=interval_days)
    return ease_factor, interval_days, repetitions, next_date.isoformat()

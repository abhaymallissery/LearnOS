"""Extracts text content from URLs (YouTube or general web pages)."""
import re
import requests
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

def is_youtube_url(url: str) -> bool:
    return "youtube.com" in url or "youtu.be" in url

def extract_youtube_video_id(url: str) -> str:
    # Regex to extract the video ID from a YouTube URL
    regex = r"(?:v=|\/)([0-9A-Za-z_-]{11}).*"
    match = re.search(regex, url)
    if match:
        return match.group(1)
    return None

def extract_youtube_transcript(url: str) -> str:
    video_id = extract_youtube_video_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube URL. Could not extract video ID.")
    
    try:
        # The YouTubeTranscriptApi class methods changed in newer versions.
        # We need to instantiate it, list transcripts, and fetch the appropriate one.
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)
        
        try:
            # Try to get English transcript first
            transcript = transcript_list.find_transcript(['en']).fetch()
        except Exception:
            # Fallback to the first available transcript, translated to English if possible
            for t in transcript_list:
                try:
                    if t.is_translatable:
                        transcript = t.translate('en').fetch()
                    else:
                        transcript = t.fetch()
                except Exception:
                    transcript = t.fetch()
                break
                
        formatter = TextFormatter()
        text_formatted = formatter.format_transcript(transcript)
        return text_formatted
    except Exception as e:
        raise ValueError(f"Could not retrieve YouTube transcript: {e}")

def extract_webpage_text(url: str) -> str:
    try:
        # Define a user-agent to avoid being blocked by some sites
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.extract()
            
        # Get text
        text = soup.get_text(separator="\n")
        
        # Clean up text by removing extra blank lines
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = "\n".join(chunk for chunk in chunks if chunk)
        
        return text
    except Exception as e:
        raise ValueError(f"Could not extract text from webpage: {e}")

def extract_text_from_url(url: str) -> str:
    """Main entry point to extract text based on the URL type."""
    if is_youtube_url(url):
        return extract_youtube_transcript(url)
    else:
        return extract_webpage_text(url)

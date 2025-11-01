import os
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from pypdf import PdfReader
from docx import Document
try:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
except ImportError:
    print("Error: youtube-transcript-api not installed. Install it with: pip install youtube-transcript-api")
    raise
import google.generativeai as genai

# Load environment variables (make sure .env contains GOOGLE_API_KEY)
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables")

genai.configure(api_key=api_key)

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174"
        ]
    }
})
# Constants
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_TEXT_LENGTH = 50000  # characters


# ------------------------- Helper Functions -------------------------
def summarize_text_with_ai(text, user_prompt="Summarize this text:"):
    """
    Uses Google Generative AI (Gemini) to summarize text.
    """
    try:
        if not text and not user_prompt:
            return "No content provided."
        
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        # If text is too long, truncate with notice
        if len(text) > MAX_TEXT_LENGTH:
            text = text[:MAX_TEXT_LENGTH]
            truncated_notice = "\n\n[Note: Text was truncated due to length]"
        else:
            truncated_notice = ""
        
        # Build prompt
        if text:
            prompt = f"{user_prompt}\n\n{text}{truncated_notice}"
        else:
            prompt = user_prompt
        
        response = model.generate_content(prompt)
        
        if response and response.text:
            return response.text.strip()
        else:
            return "No response generated. Please try again."
            
    except Exception as e:
        print(f"AI Summarization Error: {e}")
        return f"Error during AI summarization: {str(e)}"


def validate_file_size(file):
    """Check if file size is within limits"""
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    return file_size <= MAX_FILE_SIZE


# ------------------------- YouTube Summarization -------------------------
@app.route("/api/summarize-youtube", methods=["POST"])
def summarize_youtube():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
            
        youtube_url = data.get("youtube_url")
        user_prompt = data.get("prompt", "Summarize this video:")

        if not youtube_url:
            return jsonify({"error": "YouTube URL is required"}), 400

        # Extract video ID
        video_id_match = re.search(r"(?:v=|youtu\.be/)([^&\n?#]+)", youtube_url)
        if not video_id_match:
            return jsonify({"error": "Invalid YouTube URL format"}), 400

        video_id = video_id_match.group(1)

        # Get transcript
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            # Try to get English transcript first, then auto-generated, then any available
            try:
                transcript = transcript_list.find_transcript(['en']).fetch()
            except:
                # Get any available transcript
                transcript = transcript_list.find_generated_transcript(['en']).fetch()
                
        except TranscriptsDisabled:
            return jsonify({"error": "Transcripts are disabled for this video"}), 404
        except NoTranscriptFound:
            return jsonify({"error": "No transcript found for this video"}), 404
        except Exception as e:
            return jsonify({"error": f"Could not retrieve transcript: {str(e)}"}), 404
        
        if not transcript:
            return jsonify({"error": "Empty transcript received"}), 404
            
        full_text = " ".join([t["text"] for t in transcript])
        
        if not full_text.strip():
            return jsonify({"error": "Transcript is empty"}), 404

        summary = summarize_text_with_ai(full_text, user_prompt)
        return jsonify({"summary": summary})

    except Exception as e:
        print(f"Error in YouTube summarization: {e}")
        return jsonify({"error": f"Failed to process video: {str(e)}"}), 500


# ------------------------- Document Summarization -------------------------
@app.route("/api/summarize-document", methods=["POST"])
def summarize_document():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        
        if not file.filename:
            return jsonify({"error": "No file selected"}), 400
        
        # Validate file size
        if not validate_file_size(file):
            return jsonify({"error": f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit"}), 400

        # Get optional custom prompt
        user_prompt = request.form.get("prompt", "Summarize this document:")

        # Extract text based on file type
        text = ""
        if file.filename.endswith(".pdf"):
            try:
                reader = PdfReader(file)
                text = " ".join(page.extract_text() or "" for page in reader.pages)
            except Exception as e:
                return jsonify({"error": f"Failed to read PDF: {str(e)}"}), 400
                
        elif file.filename.endswith(".docx"):
            try:
                doc = Document(file)
                text = " ".join(para.text for para in doc.paragraphs)
            except Exception as e:
                return jsonify({"error": f"Failed to read DOCX: {str(e)}"}), 400
        else:
            return jsonify({"error": "Unsupported file type. Upload PDF or DOCX only"}), 400

        # Check if text was extracted
        if not text.strip():
            return jsonify({"error": "No text could be extracted from the document"}), 400

        summary = summarize_text_with_ai(text, user_prompt)
        return jsonify({"summary": summary})

    except Exception as e:
        print(f"Error in document summarization: {e}")
        return jsonify({"error": f"Failed to process document: {str(e)}"}), 500


# ------------------------- General Chat Route -------------------------
@app.route("/api/chat", methods=["POST"])
def chat_with_ai():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
            
        prompt = data.get("prompt")

        if not prompt or not prompt.strip():
            return jsonify({"error": "Prompt is required"}), 400

        summary = summarize_text_with_ai("", prompt)
        return jsonify({"summary": summary})

    except Exception as e:
        print(f"Error in chat route: {e}")
        return jsonify({"error": f"Failed to process request: {str(e)}"}), 500


# ------------------------- Root Route -------------------------
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "AI Summarizer API is running!",
        "endpoints": {
            "chat": "/api/chat",
            "youtube": "/api/summarize-youtube",
            "document": "/api/summarize-document"
        }
    })


# ------------------------- Health Check -------------------------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200


# ------------------------- Run App -------------------------
if __name__ == "__main__":
    # Use Flask's built-in development server
    print("🚀 Starting Flask server on http://127.0.0.1:8000")
    print("📝 Make sure your frontend is running on http://localhost:5174")
    app.run(host="127.0.0.1", port=8000, debug=True, threaded=True)
import base64
import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import httpx

from app.core.config import settings
from app.core.database import get_database
from app.core.security import get_current_user

router = APIRouter()

def get_email_body(payload: dict) -> str:
    body = ""
    if "parts" in payload:
        for part in payload["parts"]:
            body += get_email_body(part)
    else:
        mime_type = payload.get("mimeType", "")
        if mime_type in ["text/plain", "text/html"]:
            data = payload.get("body", {}).get("data", "")
            if data:
                try:
                    # base64 decode URL-safe
                    decoded = base64.urlsafe_b64decode(data.encode("ASCII")).decode("utf-8", errors="ignore")
                    body += decoded
                except Exception:
                    pass
    return body

async def analyze_email_with_ai(sender: str, subject: str, snippet: str, body: str) -> Dict[str, Any]:
    trimmed_body = (body or "")[:1500]
    
    # Default fallback heuristics
    fallback_analysis = {
        "category": "Work",
        "priority": "Medium",
        "aiSummary": f"Email from {sender} regarding '{subject}'.",
        "actions": []
    }
    
    lower_sender = sender.lower()
    lower_subject = subject.lower()
    lower_content = (subject + " " + snippet + " " + trimmed_body).lower()
    
    # Simple rule-based extraction
    if any(k in lower_content for k in ["lottery", "winner", "prize", "spam", "promo", "advertisement", "free trial", "subscribe", "bonus", "unsubscribe"]):
        fallback_analysis["category"] = "Spam"
        fallback_analysis["priority"] = "Low"
        fallback_analysis["actions"] = ["Unsubscribe", "Delete email"]
    elif any(k in lower_content for k in ["otp", "transaction", "bank", "credit card", "debit card", "sbi", "hdfc", "payment success"]):
        fallback_analysis["category"] = "Banking"
        fallback_analysis["priority"] = "Critical" if "unauthorized" in lower_content or "security" in lower_content or "alert" in lower_content else "High"
        if "otp" in lower_content:
            fallback_analysis["actions"] = ["Do not share OTP", "Verify transaction details"]
        else:
            fallback_analysis["actions"] = ["Verify bank transaction"]
    elif any(k in lower_content for k in ["bill", "invoice", "due date", "payable", "electricity board", "recharge"]):
        fallback_analysis["category"] = "Bills"
        fallback_analysis["priority"] = "High"
        fallback_analysis["actions"] = ["Pay invoice/bill"]
    elif any(k in lower_content for k in ["exam", "timetable", "syllabus", "class", "college", "university", "professor", "hod"]):
        fallback_analysis["category"] = "College"
        fallback_analysis["priority"] = "High" if "timetable" in lower_content or "exam" in lower_content else "Medium"
        fallback_analysis["actions"] = ["Check course schedule", "Update calendar"]
    elif any(k in lower_content for k in ["intern", "interview", "job", "offer", "career", "hiring", "resume"]):
        fallback_analysis["category"] = "Work"
        fallback_analysis["priority"] = "Critical" if "interview" in lower_content or "offer" in lower_content else "High"
        fallback_analysis["actions"] = ["Confirm interview slot" if "interview" in lower_content else "Review career update"]
    elif any(k in lower_content for k in ["order", "shipped", "delivery", "amazon", "flipkart", "tracking"]):
        fallback_analysis["category"] = "Shopping"
        fallback_analysis["priority"] = "Low"
        fallback_analysis["actions"] = ["Track shipment delivery"]
    
    # If OpenRouter is configured and not mock, call it
    if settings.OPENROUTER_API_KEY and settings.OPENROUTER_API_KEY != "mock-openrouter-key":
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                prompt = (
                    f"You are an AI inbox assistant. Analyze this email:\n"
                    f"Sender: {sender}\n"
                    f"Subject: {subject}\n"
                    f"Content: {snippet}\n\n{trimmed_body}\n\n"
                    f"Respond with a JSON object containing:\n"
                    f'1. "category": Choose one of ["Work", "Banking", "College", "Bills", "Shopping", "Spam", "Other"]\n'
                    f'2. "priority": Choose one of ["Critical", "High", "Medium", "Low"]\n'
                    f'3. "aiSummary": A short 1-2 sentence extraction of what this email is about and any deadlines.\n'
                    f'4. "actions": A list of 0-3 short required action strings (e.g. ["Pay bill of $50", "Confirm interview slot"]).\n'
                    f"Return ONLY valid JSON, no markdown formatting."
                )
                
                headers = {
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": settings.OPENROUTER_MODEL,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
                
                response = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
                if response.status_code == 200:
                    res_json = response.json()
                    content = res_json["choices"][0]["message"]["content"].strip()
                    if content.startswith("```json"):
                        content = content[7:]
                    if content.endswith("```"):
                        content = content[:-3]
                    content = content.strip()
                    parsed = json.loads(content)
                    return {
                        "category": parsed.get("category", fallback_analysis["category"]),
                        "priority": parsed.get("priority", fallback_analysis["priority"]),
                        "aiSummary": parsed.get("aiSummary", fallback_analysis["aiSummary"]),
                        "actions": parsed.get("actions", fallback_analysis["actions"])
                    }
        except Exception as e:
            print(f"OpenRouter API error: {e}, falling back to heuristics")
            
    return fallback_analysis

def get_fallback_mock_emails():
    return [
        {
            "id": "mock-1",
            "sender": "Microsoft Careers",
            "subject": "Interview Invitation - Software Engineer Intern",
            "date": "Today, 10:45 AM",
            "snippet": "Thank you for your application. We are pleased to invite you to the technical interview rounds. Please confirm your availability for next Monday.",
            "category": "Work",
            "priority": "Critical",
            "aiSummary": "Invitation to technical interview rounds for Software Engineer Intern position. Action required: schedule calendar timeslots for next Monday.",
            "actions": ["Confirm interview attendance", "Choose time slot on portal"]
        },
        {
            "id": "mock-2",
            "sender": "State Bank of India",
            "subject": "Urgent: Transaction Alert - Account Security",
            "date": "Today, 8:12 AM",
            "snippet": "We detected a login attempt from an unrecognized IP address. If this was not you, please secure your account immediately using the link.",
            "category": "Banking",
            "priority": "Critical",
            "aiSummary": "Security warning regarding login alert from unfamiliar IP. Action required: verify account details immediately.",
            "actions": ["Verify transaction status", "Reset netbanking credentials"]
        },
        {
            "id": "mock-3",
            "sender": "Prof. Sharma (HOD)",
            "subject": "Final End-Semester Timetable and Syllabus Updates",
            "date": "Yesterday",
            "snippet": "Dear Students, please find attached the revised timetable for end-semester exams beginning on July 10. Make sure to download the correct exam syllabus.",
            "category": "College",
            "priority": "High",
            "aiSummary": "Revised exam datesheet and syllabus for College Semester examinations. Exams begin July 10.",
            "actions": ["Add exams to Google Calendar", "Download attachments"]
        },
        {
            "id": "mock-4",
            "sender": "Maharashtra Electricity Board",
            "subject": "Bill Invoice for Account #492819200",
            "date": "Yesterday",
            "snippet": "Your electricity invoice for the billing cycle of June is ready. Total amount due is ₹1,240, payable by July 4. Please avoid late charges.",
            "category": "Bills",
            "priority": "High",
            "aiSummary": "Electricity utility invoice for June. Total amount due: ₹1,240. Payment deadline: July 4 (Tomorrow).",
            "actions": ["Pay invoice of ₹1,240", "Verify transaction invoice PDF"]
        },
        {
            "id": "mock-5",
            "sender": "Amazon India",
            "subject": "Your order #402-9281920-192 has been shipped",
            "date": "2 days ago",
            "snippet": "Your package containing mechanical keyboard has been shipped and is out for delivery. You can track your shipment using the link.",
            "category": "Shopping",
            "priority": "Low",
            "aiSummary": "Delivery tracker update. Mechanical keyboard shipped, arriving tomorrow.",
            "actions": ["Track package delivery"]
        }
    ]

@router.get("", summary="Get Authenticated User's Gmail Messages")
async def get_emails(current_user: dict = Depends(get_current_user)):
    try:
        db = get_database()
        user_doc = await db.users.find_one({"email": current_user["email"]})
        
        if not user_doc or "google_credentials" not in user_doc:
            # Fallback for mock/local validation without real database credentials
            return get_fallback_mock_emails()
            
        db_creds = user_doc["google_credentials"]
        
        # Build credentials
        creds = Credentials(
            token=db_creds["token"],
            refresh_token=db_creds.get("refresh_token"),
            token_uri=db_creds["token_uri"],
            client_id=db_creds["client_id"],
            client_secret=db_creds["client_secret"],
            scopes=db_creds["scopes"]
        )
        
        # Auto refresh if token expired
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                await db.users.update_one(
                    {"email": current_user["email"]},
                    {"$set": {
                        "google_credentials.token": creds.token,
                        "google_credentials.expiry": creds.expiry.isoformat() if creds.expiry else None
                    }}
                )
            except Exception as e:
                print(f"Failed to refresh Google token: {e}")
                
        # Connect to Gmail API
        service = build("gmail", "v1", credentials=creds)
        
        # List latest 10 messages from Inbox
        results = service.users().messages().list(userId="me", maxResults=10, labelIds=["INBOX"]).execute()
        messages = results.get("messages", [])
        
        if not messages:
            return []
            
        parsed_emails = []
        for msg in messages:
            msg_id = msg["id"]
            
            # Check MongoDB cache first to avoid re-running AI analysis on known emails
            cached_email = None
            if db is not None:
                cached_email = await db.analyzed_emails.find_one({"id": msg_id, "user_email": current_user["email"]})
                
            if cached_email:
                parsed_emails.append({
                    "id": cached_email["id"],
                    "sender": cached_email["sender"],
                    "subject": cached_email["subject"],
                    "date": cached_email["date"],
                    "snippet": cached_email["snippet"],
                    "category": cached_email["category"],
                    "priority": cached_email["priority"],
                    "aiSummary": cached_email["aiSummary"],
                    "actions": cached_email["actions"]
                })
            else:
                # Fetch message details
                msg_detail = service.users().messages().get(userId="me", id=msg_id, format="full").execute()
                
                payload = msg_detail.get("payload", {})
                headers = payload.get("headers", [])
                
                subject = "No Subject"
                sender = "Unknown Sender"
                date = "Unknown Date"
                
                for h in headers:
                    name = h.get("name", "").lower()
                    if name == "subject":
                        subject = h.get("value")
                    elif name == "from":
                        sender = h.get("value")
                    elif name == "date":
                        date = h.get("value")
                
                snippet = msg_detail.get("snippet", "")
                body = get_email_body(payload)
                
                # Analyze email with AI/Heuristics
                ai_data = await analyze_email_with_ai(sender, subject, snippet, body)
                
                email_item = {
                    "id": msg_id,
                    "sender": sender,
                    "subject": subject,
                    "date": date,
                    "snippet": snippet,
                    "category": ai_data["category"],
                    "priority": ai_data["priority"],
                    "aiSummary": ai_data["aiSummary"],
                    "actions": ai_data["actions"]
                }
                
                # Cache in MongoDB
                if db is not None:
                    await db.analyzed_emails.insert_one({
                        **email_item,
                        "user_email": current_user["email"]
                    })
                    
                parsed_emails.append(email_item)
            
        return parsed_emails
        
    except Exception as e:
        print(f"Error reading emails from Google API: {e}")
        return get_fallback_mock_emails()

from pydantic import BaseModel
from typing import Optional, List

class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str
    attachment: Optional[dict] = None  # Legacy support
    attachments: Optional[List[dict]] = None  # { filename: str, content: str (b64), mime_type: str }[]

@router.post("/send", summary="Send an email directly")
async def send_email(request: SendEmailRequest, current_user: dict = Depends(get_current_user)):
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders
    import base64
    
    user_email = current_user.get("email", "")
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    user_doc = await db.users.find_one({"email": user_email})
    if not user_doc or "google_credentials" not in user_doc:
        raise HTTPException(status_code=400, detail="Google account is not connected")
        
    db_creds = user_doc["google_credentials"]
    
    scopes = db_creds.get("scopes", [])
    if "https://www.googleapis.com/auth/gmail.send" not in scopes:
        raise HTTPException(status_code=403, detail="Gmail send permission is missing. Please log out and log in again.")
        
    creds = Credentials(
        token=db_creds["token"],
        refresh_token=db_creds.get("refresh_token"),
        token_uri=db_creds["token_uri"],
        client_id=db_creds["client_id"],
        client_secret=db_creds["client_secret"],
        scopes=db_creds["scopes"]
    )
    
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            await db.users.update_one(
                {"email": user_email},
                {"$set": {
                    "google_credentials.token": creds.token,
                    "google_credentials.expiry": creds.expiry.isoformat() if creds.expiry else None
                }}
            )
        except Exception as e:
            print(f"Failed to refresh token: {e}")
            
    service = build("gmail", "v1", credentials=creds)
    
    clean_body = request.body.replace("\\n", "\n").replace("\\\\n", "\n")
    
    # Use MIMEMultipart to support optional file attachments
    message = MIMEMultipart()
    message["to"] = request.to
    message["from"] = user_email
    message["subject"] = request.subject
    
    message.attach(MIMEText(clean_body, "plain"))
    
    # Gather all attachments (both list and single legacy param)
    all_attachments = []
    if request.attachments:
        all_attachments.extend(request.attachments)
    elif request.attachment:
        all_attachments.append(request.attachment)
        
    for att in all_attachments:
        filename = att.get("filename", "attachment")
        content_b64 = att.get("content", "")
        mime_type = att.get("mime_type", "application/octet-stream")
        
        if content_b64:
            try:
                file_data = base64.b64decode(content_b64)
                part = MIMEBase(*mime_type.split("/", 1))
                part.set_payload(file_data)
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename={filename}",
                )
                message.attach(part)
            except Exception as e:
                print(f"Failed to attach file: {e}")
                
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    
    try:
        sent = service.users().messages().send(userId="me", body={"raw": raw}).execute()
        return {"success": True, "message_id": sent.get("id")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


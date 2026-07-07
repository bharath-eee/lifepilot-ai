import base64
import json
from email.mime.text import MIMEText
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import httpx

from app.core.config import settings
from app.core.database import get_database
from app.core.security import get_current_user
from pydantic import BaseModel

router = APIRouter()

from typing import Optional, List

class ChatMessage(BaseModel):
    sender: str
    text: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None
    attachment: Optional[dict] = None
    attachments: Optional[List[dict]] = None

class ChatResponse(BaseModel):
    reply: str
    action_taken: Optional[str] = None

async def get_gmail_service(user_email: str):
    """Build and return an authenticated Gmail API service for the user."""
    db = get_database()
    if db is None:
        return None
    
    user_doc = await db.users.find_one({"email": user_email})
    if not user_doc or "google_credentials" not in user_doc:
        return None
    
    db_creds = user_doc["google_credentials"]
    creds = Credentials(
        token=db_creds["token"],
        refresh_token=db_creds.get("refresh_token"),
        token_uri=db_creds["token_uri"],
        client_id=db_creds["client_id"],
        client_secret=db_creds["client_secret"],
        scopes=db_creds["scopes"]
    )
    
    # Auto refresh if expired
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
    
    return build("gmail", "v1", credentials=creds)

async def send_email_via_gmail(service, to: str, subject: str, body: str, sender_email: str, attachment: Optional[dict] = None, attachments: Optional[List[dict]] = None) -> dict:
    """Send an email using the Gmail API."""
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders
    import base64
    
    # Clean double escaped newlines in body
    clean_body = body.replace("\\n", "\n").replace("\\\\n", "\n")
    
    # Use MIMEMultipart to support optional file attachments
    message = MIMEMultipart()
    message["to"] = to
    message["from"] = sender_email
    message["subject"] = subject
    
    message.attach(MIMEText(clean_body, "plain"))
    
    # Gather all attachments
    all_attachments = []
    if attachments:
        all_attachments.extend(attachments)
    elif attachment:
        all_attachments.append(attachment)
        
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
        sent = service.users().messages().send(
            userId="me",
            body={"raw": raw}
        ).execute()
        return {"success": True, "message_id": sent.get("id", "unknown")}
    except Exception as e:
        clean_error = str(e).replace("<", "[").replace(">", "]")
        return {"success": False, "error": clean_error}

async def get_calendar_service(user_email: str):
    """Build and return an authenticated Google Calendar API service for the user."""
    db = get_database()
    if db is None:
        return None
    
    user_doc = await db.users.find_one({"email": user_email})
    if not user_doc or "google_credentials" not in user_doc:
        return None
    
    db_creds = user_doc["google_credentials"]
    creds = Credentials(
        token=db_creds["token"],
        refresh_token=db_creds.get("refresh_token"),
        token_uri=db_creds["token_uri"],
        client_id=db_creds["client_id"],
        client_secret=db_creds["client_secret"],
        scopes=db_creds["scopes"]
    )
    
    # Auto refresh if expired
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
            
    return build("calendar", "v3", credentials=creds)

async def list_calendar_events(service, start_time_iso: str, end_time_iso: str) -> dict:
    """List calendar events in the given range."""
    try:
        results = service.events().list(
            calendarId='primary',
            timeMin=start_time_iso,
            timeMax=end_time_iso,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        events = results.get('items', [])
        return {"success": True, "events": events}
    except Exception as e:
        clean_error = str(e).replace("<", "[").replace(">", "]")
        return {"success": False, "error": clean_error}

async def create_calendar_event(service, summary: str, start_time_iso: str, end_time_iso: str, description: str = None) -> dict:
    """Create a new calendar event."""
    event_body = {
        'summary': summary,
        'description': description or '',
        'start': {
            'dateTime': start_time_iso,
        },
        'end': {
            'dateTime': end_time_iso,
        }
    }
    try:
        event = service.events().insert(calendarId='primary', body=event_body).execute()
        return {"success": True, "event_id": event.get("id"), "html_link": event.get("htmlLink")}
    except Exception as e:
        clean_error = str(e).replace("<", "[").replace(">", "]")
        return {"success": False, "error": clean_error}

async def delete_calendar_event(service, event_id: str) -> dict:
    """Delete a calendar event by ID."""
    try:
        service.events().delete(calendarId='primary', eventId=event_id).execute()
        return {"success": True}
    except Exception as e:
        clean_error = str(e).replace("<", "[").replace(">", "]")
        return {"success": False, "error": clean_error}

def format_events_list(events: list, start_time: str, end_time: str) -> str:
    from datetime import datetime
    try:
        date_str = start_time.split('T')[0]
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        readable_date = dt.strftime("%A, %B %d, %Y")
    except Exception:
        readable_date = start_time
        
    if not events:
        return f"\n\n📅 **Calendar Availability for {readable_date}:**\nYou are completely free! No events scheduled."
        
    lines = [f"\n\n📅 **Calendar Events for {readable_date}:**"]
    for event in events:
        summary = event.get('summary', 'No Title')
        start = event.get('start', {})
        time_val = start.get('dateTime') or start.get('date', '')
        if 'T' in time_val:
            time_part = time_val.split('T')[1].split('+')[0][:5]
            lines.append(f"- **{time_part}**: {summary}")
        else:
            lines.append(f"- **All Day**: {summary}")
    return "\n".join(lines)

def format_event_create_success(summary: str, start_time: str, end_time: str) -> str:
    from datetime import datetime
    try:
        date_part, time_part = start_time.split('T')
        dt = datetime.strptime(date_part, "%Y-%m-%d")
        readable_date = dt.strftime("%A, %B %d, %Y")
        time_str = time_part.split('+')[0][:5]
    except Exception:
        readable_date = start_time
        time_str = ""
        
    return f"\n\n✅ **Event Scheduled Successfully!**\n- **Title:** {summary}\n- **Date:** {readable_date}\n- **Time:** {time_str}"

async def get_recent_emails_summary(service, max_results: int = 5) -> str:
    """Get a brief summary of recent emails for AI context."""
    try:
        results = service.users().messages().list(
            userId="me", maxResults=max_results, labelIds=["INBOX"]
        ).execute()
        messages = results.get("messages", [])
        
        if not messages:
            return "No recent emails in inbox."
        
        summaries = []
        for msg in messages:
            detail = service.users().messages().get(
                userId="me", id=msg["id"], format="metadata",
                metadataHeaders=["From", "Subject", "Date"]
            ).execute()
            
            headers = detail.get("payload", {}).get("headers", [])
            subject = next((h["value"] for h in headers if h["name"].lower() == "subject"), "No Subject")
            sender = next((h["value"] for h in headers if h["name"].lower() == "from"), "Unknown")
            snippet = detail.get("snippet", "")
            
            summaries.append(f"- From: {sender} | Subject: {subject} | Preview: {snippet[:80]}")
        
        return "\n".join(summaries)
    except Exception as e:
        clean_error = str(e).replace("<", "[").replace(">", "]")
        return f"Could not fetch emails: {clean_error}"

def parse_send_email_command(user_message: str) -> Optional[dict]:
    """Try to parse a direct email send command from user message.
    Handles patterns like: 'send mail hi to user@example.com'
    """
    msg_lower = user_message.lower().strip()
    
    # Pattern: "send mail/email <body> to <email>"
    import re
    
    # Match: send (mail|email) <content> to <email>
    pattern1 = r'send\s+(?:mail|email)\s+(.+?)\s+to\s+([\w\.\+\-]+@[\w\.\-]+\.\w+)'
    match1 = re.search(pattern1, msg_lower)
    if match1:
        body = match1.group(1).strip().replace("\\n", "\n").replace("\\\\n", "\n")
        to_email = match1.group(2).strip()
        return {"to": to_email, "subject": "Message from LifePilot", "body": body}
    
    # Match: send <content> to <email>
    pattern2 = r'send\s+(.+?)\s+to\s+([\w\.\+\-]+@[\w\.\-]+\.\w+)'
    match2 = re.search(pattern2, msg_lower)
    if match2:
        body = match2.group(1).strip().replace("\\n", "\n").replace("\\\\n", "\n")
        to_email = match2.group(2).strip()
        return {"to": to_email, "subject": "Message from LifePilot", "body": body}
    
    # Match: email <email> <content>
    pattern3 = r'(?:mail|email)\s+([\w\.\+\-]+@[\w\.\-]+\.\w+)\s+(.+)'
    match3 = re.search(pattern3, msg_lower)
    if match3:
        to_email = match3.group(1).strip()
        body = match3.group(2).strip().replace("\\n", "\n").replace("\\\\n", "\n")
        return {"to": to_email, "subject": "Message from LifePilot", "body": body}
    
    return None


async def get_ai_response(user_message: str, context: str, user_email: str, history: Optional[List[dict]] = None) -> str:
    """Get a response from OpenRouter AI with context about the user's emails."""
    if not settings.OPENROUTER_API_KEY or settings.OPENROUTER_API_KEY == "mock-openrouter-key":
        return "AI assistant is not configured. Please add your OpenRouter API key to the .env file."
    
    from datetime import datetime
    current_time_str = datetime.now().strftime("%A, %B %d, %Y %I:%M %p")
    
    system_prompt = (
        "You are LifePilot AI, an intelligent personal productivity assistant. "
        "You help the user manage their emails, calendar, tasks, and scheduling. "
        f"The user's email is: {user_email}.\n\n"
        "You have the capability to interact with the user's Google Calendar and send emails. "
        "The user is able to upload file attachments. If they upload one or more files in the chat input, "
        "these files will be automatically attached when you trigger the [ACTION: EMAIL_SEND] tag. "
        "Therefore, you CAN now handle file attachments! Affirm to the user that files will be attached "
        "automatically when triggered.\n\n"
        "To perform these actions, you MUST append the appropriate action tag at the very end of your response. "
        "The backend will intercept this tag, execute the action, and report the result.\n\n"
        "Available Action Tags:\n"
        "1. Send Email:\n"
        "   [ACTION: EMAIL_SEND | to=recipient@email.com | subject=Subject line | body=Body content]\n"
        "2. List Calendar Events:\n"
        "   [ACTION: CALENDAR_LIST | start=YYYY-MM-DDTHH:MM:SS+05:30 | end=YYYY-MM-DDTHH:MM:SS+05:30]\n"
        "3. Create Calendar Event:\n"
        "   [ACTION: CALENDAR_CREATE | summary=Meeting Title | start=YYYY-MM-DDTHH:MM:SS+05:30 | end=YYYY-MM-DDTHH:MM:SS+05:30 | description=Optional Description]\n"
        "4. Delete Calendar Event (Use event_id if known, or summary and start time to search and delete):\n"
        "   [ACTION: CALENDAR_DELETE | event_id=OptionalEventID | summary=Event Title | start=YYYY-MM-DDTHH:MM:SS+05:30]\n\n"
        f"Current system date and time is: {current_time_str} (timezone offset +05:30).\n\n"
        "Keep responses concise, actionable, and friendly. Use bullet points when listing items.\n\n"
        f"Here are the user's recent emails for context:\n{context}"
    )
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            headers = {
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            
            messages = [{"role": "system", "content": system_prompt}]
            if history:
                for h in history:
                    role = "assistant" if h.get("sender") == "ai" else "user"
                    messages.append({"role": role, "content": h.get("text", "")})
            messages.append({"role": "user", "content": user_message})
            
            payload = {
                "model": settings.OPENROUTER_MODEL,
                "messages": messages,
                "max_tokens": 500
            }
            
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
            else:
                error_detail = response.text[:200]
                print(f"OpenRouter API error ({response.status_code}): {error_detail}")
                return f"I encountered an issue connecting to the AI service. Please try again shortly."
    except Exception as e:
        print(f"OpenRouter request failed: {e}")
        return "I'm having trouble reaching the AI service right now. Please try again in a moment."


@router.post("", response_model=ChatResponse, summary="Process a chat message")
async def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("email", "")
    user_message = request.message.strip()
    
    if not user_message:
        return ChatResponse(reply="Please type a message to get started!")
    
    # Try to get services for this user
    gmail_service = await get_gmail_service(user_email)
    calendar_service = await get_calendar_service(user_email)
    
    # 1. Check if this is a direct "send email" command (fast-path)
    send_cmd = parse_send_email_command(user_message)
    if send_cmd:
        if not gmail_service:
            return ChatResponse(
                reply="❌ Google account is not connected. Please log in using Google to connect your account and enable sending emails.",
                action_taken="email_send_failed"
            )
        
        # Check database document for scopes
        db = get_database()
        if db is not None:
            user_doc = await db.users.find_one({"email": user_email})
            if user_doc and "google_credentials" in user_doc:
                scopes = user_doc["google_credentials"].get("scopes", [])
                if "https://www.googleapis.com/auth/gmail.send" not in scopes:
                    return ChatResponse(
                        reply="❌ Gmail send permission is missing.\n\nPlease log out (click the logout icon in the bottom-left of the sidebar) and sign in again. Make sure you check the **'Send email on your behalf'** permission checkbox on the Google consent screen.",
                        action_taken="email_send_failed"
                    )

        result = await send_email_via_gmail(
            gmail_service,
            to=send_cmd["to"],
            subject=send_cmd["subject"],
            body=send_cmd["body"],
            sender_email=user_email,
            attachment=request.attachment,
            attachments=request.attachments
        )
        if result["success"]:
            return ChatResponse(
                reply=f"✅ Email sent successfully!\n\n**To:** {send_cmd['to']}\n**Subject:** {send_cmd['subject']}\n**Body:** {send_cmd['body']}\n\nMessage ID: {result['message_id']}",
                action_taken="email_sent"
            )
        else:
            return ChatResponse(
                reply=f"❌ Failed to send email to {send_cmd['to']}.\n\nError: {result['error']}\n\nPlease make sure the Gmail send permission is granted.",
                action_taken="email_send_failed"
            )
    
    # 2. For all other messages, use AI with email context
    email_context = "No email access available."
    if gmail_service:
        # Check if readonly permission is granted
        db = get_database()
        if db is not None:
            user_doc = await db.users.find_one({"email": user_email})
            if user_doc and "google_credentials" in user_doc:
                scopes = user_doc["google_credentials"].get("scopes", [])
                if "https://www.googleapis.com/auth/gmail.readonly" in scopes:
                    email_context = await get_recent_emails_summary(gmail_service)
                else:
                    email_context = "Gmail read permission is missing. Tell the user to log out and sign in again, ensuring the read permission checkbox is checked."
    
    history_dicts = []
    if request.history:
        history_dicts = [{"sender": h.sender, "text": h.text} for h in request.history]

    ai_reply = await get_ai_response(user_message, email_context, user_email, history_dicts)
    
    # 3. Intercept and execute action tags
    import re
    action_match = re.search(r'\[ACTION:\s*([^\]]+)\]', ai_reply)
    if action_match:
        # Clean reply from the action tag for output display
        clean_reply = ai_reply.replace(action_match.group(0), "").strip()
        
        action_str = action_match.group(1).strip()
        parts = [p.strip() for p in action_str.split('|')]
        action_type = parts[0]
        
        params = {}
        for p in parts[1:]:
            if '=' in p:
                k, v = p.split('=', 1)
                params[k.strip()] = v.strip()
                
        # Handle Action Types
        if action_type == "EMAIL_SEND":
            to = params.get("to")
            subject = params.get("subject", "Message from LifePilot")
            body = params.get("body", "").replace("\\n", "\n").replace("\\\\n", "\n")
            
            if not to:
                return ChatResponse(reply=f"{clean_reply}\n\n❌ Error: Recipient email address ('to') is missing in the action request.", action_taken="email_send_failed")
                
            if not gmail_service:
                return ChatResponse(reply=f"{clean_reply}\n\n❌ Google account is not connected. Please log in using Google to enable sending emails.", action_taken="email_send_failed")
                
            db = get_database()
            if db is not None:
                user_doc = await db.users.find_one({"email": user_email})
                scopes = user_doc.get("google_credentials", {}).get("scopes", [])
                if "https://www.googleapis.com/auth/gmail.send" not in scopes:
                    return ChatResponse(
                        reply=f"{clean_reply}\n\n❌ Gmail send permission is missing. Please log out and sign in again, making sure to check the 'Send email on your behalf' checkbox on the Google consent screen.",
                        action_taken="email_send_failed"
                    )
            
            result = await send_email_via_gmail(
                gmail_service, 
                to=to, 
                subject=subject, 
                body=body, 
                sender_email=user_email, 
                attachment=request.attachment,
                attachments=request.attachments
            )
            if result["success"]:
                return ChatResponse(
                    reply=f"{clean_reply}\n\n✅ Email sent successfully to **{to}**!\n**Subject:** {subject}",
                    action_taken="email_sent"
                )
            else:
                return ChatResponse(
                    reply=f"{clean_reply}\n\n❌ Failed to send email to {to}. Error: {result['error']}",
                    action_taken="email_send_failed"
                )
                
        elif action_type == "CALENDAR_LIST":
            start = params.get("start")
            end = params.get("end")
            
            if not start or not end:
                return ChatResponse(reply=f"{clean_reply}\n\n❌ Error: Missing start or end time parameter for calendar check.", action_taken="calendar_list_failed")
                
            if not calendar_service:
                return ChatResponse(reply=f"{clean_reply}\n\n❌ Google calendar is not connected. Please log in using Google.", action_taken="calendar_list_failed")
                
            db = get_database()
            if db is not None:
                user_doc = await db.users.find_one({"email": user_email})
                scopes = user_doc.get("google_credentials", {}).get("scopes", [])
                if "https://www.googleapis.com/auth/calendar" not in scopes:
                    return ChatResponse(
                        reply=f"{clean_reply}\n\n❌ Google Calendar permission is missing.\n\nPlease log out (click the logout icon in the bottom-left of the sidebar) and sign in again. Make sure you check the **'See, edit, share, and permanently delete all the calendars you can access using Google Calendar'** permission checkbox on the Google consent screen.",
                        action_taken="calendar_list_failed"
                    )
            
            result = await list_calendar_events(calendar_service, start, end)
            if result["success"]:
                formatted_list = format_events_list(result["events"], start, end)
                return ChatResponse(
                    reply=f"{clean_reply}{formatted_list}",
                    action_taken="calendar_list"
                )
            else:
                return ChatResponse(
                    reply=f"{clean_reply}\n\n❌ Failed to list calendar events. Error: {result['error']}",
                    action_taken="calendar_list_failed"
                )
                
        elif action_type == "CALENDAR_CREATE":
            summary = params.get("summary", "Meeting")
            start = params.get("start")
            end = params.get("end")
            description = params.get("description", "")
            
            if not start or not end:
                return ChatResponse(reply=f"{clean_reply}\n\n❌ Error: Missing start or end time parameter for event creation.", action_taken="calendar_create_failed")
                
            if not calendar_service:
                return ChatResponse(reply=f"{clean_reply}\n\n❌ Google calendar is not connected. Please log in using Google.", action_taken="calendar_create_failed")
                
            db = get_database()
            if db is not None:
                user_doc = await db.users.find_one({"email": user_email})
                scopes = user_doc.get("google_credentials", {}).get("scopes", [])
                if "https://www.googleapis.com/auth/calendar" not in scopes:
                    return ChatResponse(
                        reply=f"{clean_reply}\n\n❌ Google Calendar permission is missing.\n\nPlease log out (click the logout icon in the bottom-left of the sidebar) and sign in again. Make sure you check the **'See, edit, share, and permanently delete all the calendars you can access using Google Calendar'** permission checkbox on the Google consent screen.",
                        action_taken="calendar_create_failed"
                    )
            
            result = await create_calendar_event(calendar_service, summary, start, end, description)
            if result["success"]:
                # Auto-mention / append event in the task list
                if db is not None:
                    try:
                        from datetime import datetime
                        date_str = start.split('T')[0]
                        dt = datetime.strptime(date_str, "%Y-%m-%d")
                        due_readable = dt.strftime("%A, %B %d, %Y")
                    except Exception:
                        due_readable = "Upcoming"
                    try:
                        await db.tasks.update_one(
                            {"title": f"Attend: {summary}", "email": user_email},
                            {"$set": {
                                "title": f"Attend: {summary}",
                                "due": due_readable,
                                "completed": False,
                                "priority": "Medium",
                                "email": user_email
                            }},
                            upsert=True
                        )
                    except Exception as task_err:
                        print(f"Failed to auto-add task for scheduled event: {task_err}")

                formatted_success = format_event_create_success(summary, start, end)
                return ChatResponse(
                    reply=f"{clean_reply}{formatted_success}\n\n📝 *An objective 'Attend: {summary}' has also been added to your Task List!*",
                    action_taken="calendar_event_created"
                )
            else:
                return ChatResponse(
                    reply=f"{clean_reply}\n\n❌ Failed to create calendar event. Error: {result['error']}",
                    action_taken="calendar_create_failed"
                )
                
        elif action_type == "CALENDAR_DELETE":
            event_id = params.get("event_id")
            summary = params.get("summary")
            start = params.get("start")
            
            if not event_id and (not summary or not start):
                return ChatResponse(reply=f"{clean_reply}\n\n❌ Error: Missing event_id or (summary and start time) for event deletion.", action_taken="calendar_delete_failed")
                
            if not calendar_service:
                return ChatResponse(reply=f"{clean_reply}\n\n❌ Google calendar is not connected. Please log in using Google.", action_taken="calendar_delete_failed")
                
            db = get_database()
            if db is not None:
                user_doc = await db.users.find_one({"email": user_email})
                scopes = user_doc.get("google_credentials", {}).get("scopes", [])
                if "https://www.googleapis.com/auth/calendar" not in scopes:
                    return ChatResponse(
                        reply=f"{clean_reply}\n\n❌ Google Calendar permission is missing.\n\nPlease log out (click the logout icon in the bottom-left of the sidebar) and sign in again. Make sure you check the **'See, edit, share, and permanently delete all the calendars you can access using Google Calendar'** permission checkbox on the Google consent screen.",
                        action_taken="calendar_delete_failed"
                    )
            
            if not event_id:
                # Find event_id by searching on start day
                start_day = start.split('T')[0]
                time_min = f"{start_day}T00:00:00+05:30"
                time_max = f"{start_day}T23:59:59+05:30"
                
                list_res = await list_calendar_events(calendar_service, time_min, time_max)
                if not list_res["success"]:
                    return ChatResponse(reply=f"{clean_reply}\n\n❌ Failed to search for event. Error: {list_res['error']}", action_taken="calendar_delete_failed")
                    
                matched_events = []
                for ev in list_res["events"]:
                    ev_summary = ev.get("summary", "").lower()
                    if summary.lower() in ev_summary:
                        matched_events.append(ev)
                        
                if not matched_events:
                    return ChatResponse(reply=f"{clean_reply}\n\n❌ Event '{summary}' not found on {start_day}.", action_taken="calendar_delete_failed")
                elif len(matched_events) > 1:
                    # Try to match start time exactly
                    exact_matches = []
                    for ev in matched_events:
                        ev_start = ev.get("start", {}).get("dateTime", "")
                        if start in ev_start or ev_start in start:
                            exact_matches.append(ev)
                    if len(exact_matches) == 1:
                        event_id = exact_matches[0]["id"]
                        summary = exact_matches[0].get("summary", summary)
                    else:
                        return ChatResponse(reply=f"{clean_reply}\n\n❌ Multiple events found matching '{summary}' on {start_day}. Please clarify which one to delete.", action_taken="calendar_delete_failed")
                else:
                    event_id = matched_events[0]["id"]
                    summary = matched_events[0].get("summary", summary)
                    
            result = await delete_calendar_event(calendar_service, event_id)
            if result["success"]:
                return ChatResponse(
                    reply=f"{clean_reply}\n\n✅ **Event Deleted Successfully!**\n- **Title:** {summary}",
                    action_taken="calendar_event_deleted"
                )
            else:
                return ChatResponse(
                    reply=f"{clean_reply}\n\n❌ Failed to delete calendar event. Error: {result['error']}",
                    action_taken="calendar_delete_failed"
                )
                
    return ChatResponse(reply=ai_reply)

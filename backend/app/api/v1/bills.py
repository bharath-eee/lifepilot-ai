from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.core.database import get_database
from app.core.security import get_current_user
from app.core.config import settings
from pydantic import BaseModel
from typing import List
import base64
import httpx
import json

router = APIRouter()

class BillItem(BaseModel):
    vendor: str
    amount: float
    due: str
    category: str
    status: str
    invoiceNumber: str

class BillResponse(BaseModel):
    id: str
    vendor: str
    amount: float
    due: str
    category: str
    status: str
    invoiceNumber: str

@router.get("", response_model=List[BillResponse])
async def get_bills(current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        return []
        
    user_email = current_user["email"]
    bills = await db.bills.find({"email": user_email}).to_list(None)
    
    # Seed default bills if empty
    if not bills:
        default_bills = [
            { "vendor": "MSEB Electricity", "amount": 1240.0, "due": "2026-07-04", "category": "Electricity", "status": "Unpaid", "invoiceNumber": "INV-2026-092", "email": user_email },
            { "vendor": "Jio Fiber Internet", "amount": 799.0, "due": "2026-07-08", "category": "Internet", "status": "Unpaid", "invoiceNumber": "INV-8271-92", "email": user_email },
            { "vendor": "Google Cloud Platform", "amount": 3450.0, "due": "2026-07-15", "category": "Other", "status": "Paid", "invoiceNumber": "GCP-9281-11", "email": user_email },
            { "vendor": "Tuition Fee (Semester VII)", "amount": 45000.0, "due": "2026-08-01", "category": "Tuition", "status": "Unpaid", "invoiceNumber": "COL-2026-11", "email": user_email }
        ]
        for bill in default_bills:
            await db.bills.insert_one(bill)
        bills = await db.bills.find({"email": user_email}).to_list(None)
        
    return [
        BillResponse(
            id=str(b["_id"]),
            vendor=b["vendor"],
            amount=b["amount"],
            due=b["due"],
            category=b["category"],
            status=b["status"],
            invoiceNumber=b["invoiceNumber"]
        ) for b in bills
    ]

@router.post("", response_model=BillResponse)
async def create_bill(bill: BillItem, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unconnected")
        
    bill_doc = bill.dict()
    bill_doc["email"] = current_user["email"]
    
    result = await db.bills.insert_one(bill_doc)
    return BillResponse(
        id=str(result.inserted_id),
        vendor=bill.vendor,
        amount=bill.amount,
        due=bill.due,
        category=bill.category,
        status=bill.status,
        invoiceNumber=bill.invoiceNumber
    )

@router.put("/{bill_id}/pay", response_model=BillResponse)
async def pay_bill(bill_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unconnected")
        
    from bson import ObjectId
    bill = await db.bills.find_one({"_id": ObjectId(bill_id), "email": current_user["email"]})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
        
    await db.bills.update_one(
        {"_id": ObjectId(bill_id)},
        {"$set": {"status": "Paid"}}
    )
    
    return BillResponse(
        id=bill_id,
        vendor=bill["vendor"],
        amount=bill["amount"],
        due=bill["due"],
        category=bill["category"],
        status="Paid",
        invoiceNumber=bill["invoiceNumber"]
    )

def fix_and_parse_json(content: str):
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    
    try:
        return json.loads(content)
    except Exception:
        pass
        
    # Attempt auto-fixing of missing braces due to LLM truncation
    open_curly = content.count('{')
    close_curly = content.count('}')
    open_square = content.count('[')
    close_square = content.count(']')
    
    fixed = content
    if open_curly > close_curly:
        if fixed.endswith(']') and open_square == close_square:
            fixed = fixed[:-1] + '}]'
            open_curly -= 1
        else:
            fixed += '}' * (open_curly - close_curly)
            
    if open_square > close_square:
        fixed += ']' * (open_square - close_square)
        
    try:
        return json.loads(fixed)
    except Exception as e:
        print(f"Failed to load balanced JSON: {fixed}. Error: {e}")
        
    try:
        import re
        objs = []
        matches = re.findall(r'\{[^{}]*\}', content)
        for m in matches:
            try:
                objs.append(json.loads(m))
            except Exception:
                pass
        if objs:
            return objs
    except Exception as re_err:
        print(f"Regex extraction failed: {re_err}")
        
    return None

@router.post("/upload")
async def upload_bill(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    file_bytes = await file.read()
    image_bytes = None
    pdf_text_content = None
    content_type = file.content_type or ""
    
    if "pdf" in content_type.lower():
        try:
            import io
            from pypdf import PdfReader
            pdf_file = io.BytesIO(file_bytes)
            reader = PdfReader(pdf_file)
            text_list = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_list.append(text)
            extracted_text = "\n".join(text_list).strip()
            if len(extracted_text) > 50:
                pdf_text_content = extracted_text
        except Exception as e:
            print(f"Failed to extract text using pypdf: {e}")
            
        if not pdf_text_content:
            try:
                import pdf2image
                images = pdf2image.convert_from_bytes(file_bytes, first_page=1, last_page=1)
                if images:
                    import io
                    img_byte_arr = io.BytesIO()
                    images[0].save(img_byte_arr, format='PNG')
                    image_bytes = img_byte_arr.getvalue()
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail="This PDF appears to be a scanned document (image-only) and Poppler is not installed on this system. To analyze scanned PDF invoices, please upload them as images (PNG/JPEG/GIF) or install Poppler."
                )
    else:
        image_bytes = file_bytes
        
    if not pdf_text_content and not image_bytes:
        raise HTTPException(status_code=400, detail="Invalid file type or failed to extract content from file.")
        
    b64_image = None
    if image_bytes:
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
    
    if not settings.OPENROUTER_API_KEY or settings.OPENROUTER_API_KEY == "mock-openrouter-key":
        mock_result = {
            "vendor": "Mock Airtel Broadband",
            "amount": 999.0,
            "due": "2026-07-12",
            "category": "Internet",
            "invoiceNumber": "AR-99281"
        }
        db = get_database()
        if db is not None:
            mock_result["email"] = current_user["email"]
            mock_result["status"] = "Unpaid"
            result = await db.bills.insert_one(mock_result)
            return {
                "success": True,
                "ocr_text": "OCR Extracted: Vendor: Mock Airtel Broadband, Amount: ₹999, Due: 2026-07-12, Invoice: AR-99281",
                "bill": {
                    "id": str(result.inserted_id),
                    **mock_result
                }
            }
        raise HTTPException(status_code=500, detail="OpenRouter API Key not configured and database unconnected")
        
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            if pdf_text_content:
                payload = {
                    "model": "google/gemini-2.5-flash",
                    "max_tokens": 1500,
                    "messages": [
                        {
                            "role": "user",
                            "content": f"Analyze this invoice/bill text. If there are multiple invoices/bills listed in the text, return a JSON list containing each invoice object. Otherwise, return a single JSON object. Each object should have fields: 'vendor', 'amount' (number, e.g. 1200.50), 'due' (due date in YYYY-MM-DD format), 'category' (choose one of: ['Electricity', 'Internet', 'Water', 'Rent', 'Tuition', 'Other']), and 'invoiceNumber' (string). Return ONLY valid JSON, no markdown syntax or formatting.\n\nInvoice Text:\n{pdf_text_content}"
                        }
                    ]
                }
            else:
                payload = {
                    "model": "google/gemini-2.5-flash",
                    "max_tokens": 1500,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Analyze this invoice/bill image. If there are multiple invoices/bills listed, return a JSON list containing each invoice object. Otherwise, return a single JSON object. Each object should have fields: 'vendor', 'amount' (number, e.g. 1200.50), 'due' (due date in YYYY-MM-DD format), 'category' (choose one of: ['Electricity', 'Internet', 'Water', 'Rent', 'Tuition', 'Other']), and 'invoiceNumber' (string). Return ONLY valid JSON, no markdown syntax or formatting."
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{b64_image}"
                                    }
                                }
                            ]
                        }
                    ]
                }
            response = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
            if response.status_code == 200:
                res_json = response.json()
                content = res_json["choices"][0]["message"]["content"].strip()
                
                parsed = fix_and_parse_json(content)
                if parsed is None:
                    print(f"Failed to parse OCR response JSON content: {content}")
                    parsed = {}
                    
                parsed_list = []
                if isinstance(parsed, list):
                    parsed_list = parsed
                elif isinstance(parsed, dict):
                    if parsed:
                        parsed_list = [parsed]
                else:
                    parsed_list = []
                    
                if not parsed_list:
                    parsed_list = [{}]
                
                db = get_database()
                if db is not None:
                    inserted_bills = []
                    for item in parsed_list:
                        raw_amount = item.get("amount")
                        amount_val = 0.0
                        if raw_amount is not None:
                            try:
                                if isinstance(raw_amount, str):
                                    cleaned = "".join(c for c in raw_amount if c.isdigit() or c == '.')
                                    amount_val = float(cleaned)
                                else:
                                    amount_val = float(raw_amount)
                            except Exception:
                                amount_val = 0.0
                        
                        bill_doc = {
                            "vendor": item.get("vendor", "Unknown Vendor"),
                            "amount": amount_val,
                            "due": item.get("due", "2026-07-04"),
                            "category": item.get("category", "Other"),
                            "status": "Unpaid",
                            "invoiceNumber": item.get("invoiceNumber", "INV-UNKNOWN"),
                            "email": current_user["email"]
                        }
                        result = await db.bills.insert_one(bill_doc)
                        bill_doc["id"] = str(result.inserted_id)
                        del bill_doc["_id"]
                        inserted_bills.append(bill_doc)
                    
                    if len(inserted_bills) > 1:
                        ocr_text = f"OCR Extracted: Processed {len(inserted_bills)} invoices successfully."
                    else:
                        first = inserted_bills[0]
                        ocr_text = f"OCR Extracted: Vendor: {first['vendor']}, Amount: ₹{first['amount']}, Due: {first['due']}, Invoice: {first['invoiceNumber']}"
                        
                    return {
                        "success": True,
                        "ocr_text": ocr_text,
                        "bill": inserted_bills[0]
                    }
                else:
                    raise HTTPException(status_code=500, detail="Database unconnected")
            else:
                raise HTTPException(status_code=response.status_code, detail=f"OpenRouter Vision API failed: {response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing invoice: {str(e)}")

import React, { useState, useEffect, useRef } from 'react';
import { Receipt, Upload, Sparkles, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Bill {
  id: string;
  vendor: string;
  amount: number;
  due: string;
  category: string;
  status: 'Unpaid' | 'Paid';
  invoiceNumber: string;
}

export const BillManager: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingBills, setLoadingBills] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuth();

  const fetchBills = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/bills', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBills(data);
      }
    } catch (err) {
      console.error("Failed to fetch bills", err);
    } finally {
      setLoadingBills(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBills();
    }
  }, [token]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setOcrResult(null);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/v1/bills/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to upload and analyze bill');
      }

      setOcrResult(data.ocr_text);
      fetchBills(); // Refresh list to show new pending bill
    } catch (err: any) {
      setUploadError(err.message || 'Something went wrong during file upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const triggerSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handlePay = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/bills/${id}/pay`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const updated = await response.json();
        setBills(bills.map(b => b.id === id ? updated : b));
      }
    } catch (err) {
      console.error("Failed to pay bill", err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Receipt className="w-6 h-6 mr-2 text-neonGreen" />
          Bill Management & OCR Ingestion
        </h1>
        <p className="text-slate-400 text-xs mt-1">Upload invoices or let AI retrieve billing records automatically from your Gmail.</p>
      </div>

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Upload Container */}
        <div className="glass-panel p-6 rounded-2xl border-glassBorder space-y-4 md:col-span-1">
          <h2 className="text-sm font-bold text-white font-mono">UPLOAD INVOICE</h2>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*,application/pdf"
          />
          
          <div 
            onClick={triggerSelectFile}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-white/[0.01] ${
              isDragging 
                ? 'border-neonGreen bg-neonGreen/5 shadow-neonGreen/10 animate-pulse' 
                : 'border-glassBorder hover:border-neonGreen/40'
            }`}
          >
            <Upload className={`w-8 h-8 mb-2 transition-colors ${isDragging ? 'text-neonGreen' : 'text-slate-500'}`} />
            <p className="text-xs text-slate-400 text-center font-medium">
              {isDragging ? 'Drop your invoice here!' : 'Drag & drop or click to select invoice'}
            </p>
            <p className="text-[10px] text-slate-600 mt-1 text-center">Supports PDF, PNG, JPEG, GIF</p>
          </div>

          {uploading && (
            <div className="flex items-center space-x-2 text-xs text-neonGreen font-mono bg-neonGreen/5 border border-neonGreen/20 p-3 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-neonGreen animate-ping" />
              <span>Analyzing Document with Vision Pipeline...</span>
            </div>
          )}

          {uploadError && (
            <div className="bg-critical/10 border border-critical/20 p-4 rounded-xl space-y-1.5 flex items-start space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 text-critical flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-critical font-mono">UPLOAD FAILURE</p>
                <p className="text-slate-300 leading-relaxed">{uploadError}</p>
              </div>
            </div>
          )}

          {ocrResult && (
            <div className="bg-white/[0.02] border border-neonGreen/20 p-4 rounded-xl space-y-2">
              <p className="text-[10px] font-bold text-neonGreen font-mono flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                OCR EXTRACTED RESULTS
              </p>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">{ocrResult}</p>
            </div>
          )}
        </div>

        {/* Bills list */}
        <div className="glass-panel p-6 rounded-2xl border-glassBorder md:col-span-2 space-y-6">
          <h2 className="text-sm font-bold text-white font-mono">BILL DATABASE & BALANCES</h2>
          <div className="space-y-4">
            {loadingBills ? (
              <div className="text-center py-10 text-slate-500 font-mono text-xs">Fetching bills from database...</div>
            ) : bills.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-mono text-xs">No bills in database. Upload invoices to add them!</div>
            ) : (
              bills.map(bill => (
                <div 
                  key={bill.id} 
                  className={`p-4 rounded-xl border flex justify-between items-center transition-all duration-300 ${
                    bill.status === 'Paid' 
                      ? 'bg-white/[0.01] border-glassBorder/30 opacity-55' 
                      : 'bg-white/[0.02] border-glassBorder hover:border-neonGreen/30'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div className="p-2.5 bg-white/5 border border-glassBorder rounded-lg text-slate-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{bill.vendor}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{bill.invoiceNumber} &bull; Due {bill.due}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">₹{bill.amount}</p>
                      <span className="text-[10px] text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded-full">{bill.category}</span>
                    </div>
                    {bill.status === 'Paid' ? (
                      <span className="text-xs text-neonGreen bg-neonGreen/10 border border-neonGreen/20 px-3 py-1.5 rounded-xl font-bold font-mono">
                        PAID
                      </span>
                    ) : (
                      <button 
                        onClick={() => handlePay(bill.id)}
                        className="text-xs text-white bg-neonGreen/20 hover:bg-neonGreen hover:text-black border border-neonGreen/40 px-3 py-1.5 rounded-xl font-bold transition-all"
                      >
                        Pay Bill
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

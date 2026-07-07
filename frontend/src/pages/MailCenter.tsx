import React, { useState, useEffect } from 'react';
import { Mail, Sparkles, Filter, AlertCircle, ShieldAlert, Reply, Send, Paperclip } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

interface Email {
  id: string;
  sender: string;
  subject: string;
  date: string;
  snippet: string;
  category: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  aiSummary: string;
  actions: string[];
}

export const MailCenter: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);
  const [replyAttachment, setReplyAttachment] = useState<{ filename: string, content: string, mime_type: string } | null>(null);

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Attachment size should be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64Content = reader.result.split(',')[1];
        setReplyAttachment({
          filename: file.name,
          content: base64Content,
          mime_type: file.type || 'application/octet-stream'
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendReply = async (email: Email) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    setReplySuccess(null);
    try {
      let cleanRecipient = email.sender;
      const match = email.sender.match(/<(.+?)>/);
      if (match) {
        cleanRecipient = match[1];
      }

      const response = await fetch(`${API_BASE_URL}/emails/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: cleanRecipient,
          subject: `Re: ${email.subject}`,
          body: replyText,
          attachment: replyAttachment
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send reply');
      }

      setReplySuccess(email.id);
      setReplyText('');
      setReplyAttachment(null);
      setTimeout(() => {
        setReplyingToId(null);
        setReplySuccess(null);
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to send reply. Make sure you granted send permissions.');
    } finally {
      setSendingReply(false);
    }
  };
  
  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/emails`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to retrieve emails from the API.');
        }
        const data = await response.json();
        setEmails(data);
      } catch (err: any) {
        setError(err.message || 'Something went wrong while fetching emails.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchEmails();
    } else {
      setLoading(false);
    }
  }, [token]);

  const categories = ['All', 'Work', 'Banking', 'College', 'Bills', 'Shopping', 'Spam'];

  const filteredEmails = activeCategory === 'All' 
    ? emails 
    : emails.filter(e => e.category === activeCategory);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Mail className="w-6 h-6 mr-2 text-neonBlue" />
            Important Mail Center
          </h1>
          <p className="text-slate-600 text-xs mt-1">AI-powered inbox intelligence parsing critical messages first.</p>
        </div>

        {/* AI summary banner */}
        <div className="bg-neonBlue/10 border border-neonBlue/20 py-2 px-4 rounded-xl flex items-center space-x-2 text-xs font-mono text-neonBlue">
          <Sparkles className="w-4 h-4 animate-spin-slow" />
          <span>Morning Summary: 3 Critical Actions Pending</span>
        </div>
      </div>

      {/* Categories Filters Tab row */}
      <div className="flex items-center space-x-2 border-b border-glassBorder pb-4 overflow-x-auto whitespace-nowrap scrollbar-none">
        <span className="text-slate-500 mr-2 flex items-center text-xs font-semibold">
          <Filter className="w-3.5 h-3.5 mr-1" />
          FILTER:
        </span>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeCategory === cat 
                ? 'bg-neonBlue text-white font-bold shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 bg-slate-50 border border-glassBorder'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Mail Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mail list */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="glass-panel p-10 rounded-2xl border-glassBorder flex flex-col items-center justify-center space-y-4 text-center py-16">
              <span className="w-10 h-10 border-4 border-neonBlue border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-sm text-slate-500">Fetching and analyzing your Gmail inbox...</p>
            </div>
          ) : error ? (
            <div className="glass-panel p-10 rounded-2xl border-critical/20 flex flex-col items-center justify-center space-y-4 text-center py-16">
              <AlertCircle className="w-12 h-12 text-critical" />
              <h3 className="text-lg font-bold text-slate-900">Failed to retrieve emails</h3>
              <p className="text-slate-500 text-sm">{error}</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="glass-panel p-10 rounded-2xl border-glassBorder flex flex-col items-center justify-center space-y-4 text-center py-16">
              <Mail className="w-12 h-12 text-slate-500" />
              <h3 className="text-lg font-bold text-slate-900">No emails found</h3>
              <p className="text-slate-500 text-sm">We couldn't find any emails matching this category.</p>
            </div>
          ) : (
            filteredEmails.map(email => (
              <div 
                key={email.id} 
                className="glass-panel p-5 rounded-2xl border-glassBorder hover:border-neonBlue/30 transition-all duration-300 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-800">{email.sender}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                      <span className="text-xs text-slate-500 font-mono">{email.date}</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-950">{email.subject}</h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-600 bg-slate-100 border border-glassBorder py-0.5 px-2 rounded-full font-mono">
                      {email.category}
                    </span>
                    <span className={`text-[10px] font-mono py-0.5 px-2 rounded-full ${
                      email.priority === 'Critical' ? 'bg-critical/15 text-critical border border-critical/20' :
                      email.priority === 'High' ? 'bg-high/15 text-high border border-high/20' :
                      'bg-low/15 text-low border border-low/20'
                    }`}>
                      {email.priority}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed truncate">{email.snippet}</p>

                {/* AI Analysis Panel */}
                <div className="bg-slate-50 border border-glassBorder/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-1.5 text-xs text-neonBlue font-mono font-bold">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    <span>AI EXTRACTION SUMMARY</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{email.aiSummary}</p>
                  
                  {email.actions.length > 0 && (
                    <div className="pt-2 border-t border-glassBorder/30 space-y-2">
                      <p className="text-[10px] text-slate-500 font-bold font-mono">REQUIRED ACTIONS</p>
                      <div className="flex flex-wrap gap-2">
                        {email.actions.map((act, i) => (
                          <span key={i} className="text-xs bg-neonBlue/10 text-neonBlue py-1 px-2.5 rounded-lg border border-neonBlue/20 flex items-center font-medium">
                            <AlertCircle className="w-3 h-3 mr-1.5 flex-shrink-0" />
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reply Button Footer */}
                  <div className="pt-3 border-t border-glassBorder/40 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-mono">LifePilot Assistant</span>
                    <button 
                      onClick={() => {
                        if (replyingToId === email.id) {
                          setReplyingToId(null);
                        } else {
                          setReplyingToId(email.id);
                          setReplyText('');
                          setReplySuccess(null);
                        }
                      }}
                      className="text-xs font-semibold bg-neonBlue text-white hover:bg-neonBlue/90 px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-sm transition-all"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>{replyingToId === email.id ? 'Cancel' : 'Reply'}</span>
                    </button>
                  </div>

                  {/* Inline Reply Editor Drawer */}
                  {replyingToId === email.id && (
                    <div className="mt-3 pt-3 border-t border-glassBorder/40 space-y-3">
                      {replySuccess === email.id ? (
                        <div className="text-xs text-neonGreen font-mono bg-neonGreen/10 border border-neonGreen/20 p-2.5 rounded-lg">
                          ✅ Reply delivered successfully!
                        </div>
                      ) : (
                        <>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Reply to ${email.sender.split('<')[0].trim()}...`}
                            rows={3}
                            className="w-full glass-input text-xs p-3 focus:ring-1 focus:ring-neonBlue"
                            disabled={sendingReply}
                          />
                          <div className="flex items-center justify-between">
                            {/* File Attachment */}
                            <div className="flex items-center space-x-2">
                              <label className="cursor-pointer p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-glassBorder text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center">
                                <Paperclip className="w-4 h-4" />
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={handleFileAttach}
                                  disabled={sendingReply}
                                />
                              </label>
                              
                              {replyAttachment && (
                                <div className="text-xs bg-slate-100 border border-glassBorder px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 max-w-[200px]">
                                  <span className="truncate text-slate-700 font-medium">{replyAttachment.filename}</span>
                                  <button 
                                    onClick={() => setReplyAttachment(null)}
                                    className="text-slate-400 hover:text-critical font-bold flex-shrink-0"
                                    type="button"
                                  >
                                    &times;
                                  </button>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => handleSendReply(email)}
                              disabled={sendingReply || !replyText.trim()}
                              className="text-xs font-semibold bg-neonBlue text-white hover:bg-neonBlue/90 disabled:opacity-50 px-4 py-2 rounded-lg flex items-center space-x-1.5 shadow-sm transition-all"
                            >
                              {sendingReply ? (
                                <span>Sending...</span>
                              ) : (
                                <>
                                  <Send className="w-3 h-3" />
                                  <span>Send Reply</span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Info Section */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border-glassBorder space-y-4">
            <h2 className="text-md font-bold text-slate-900 flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2 text-neonBlue" />
              Action Agent Status
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Our background scheduler matches key patterns in incoming mails and coordinates automatic scheduling.
            </p>
            <div className="border-t border-glassBorder pt-4 space-y-2 text-xs font-mono text-slate-500">
              <div className="flex justify-between">
                <span>Last Polled:</span>
                <span className="text-slate-800">Just now</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-neonGreen">Watching Gmail inbox</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

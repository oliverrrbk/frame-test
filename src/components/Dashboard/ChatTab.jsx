import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  MessageSquare, Send, Phone, Search, Users, User,
  Sparkles, Paperclip, Mic, ArrowLeft, ShieldAlert, CheckCircle2,
  Megaphone, HardHat, Square, Info, Image as ImageIcon, FileText, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import UserAvatar from '../ui/UserAvatar';

const ChatTab = ({ profile, leads = [], targetLeadId, clearTargetLeadId }) => {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'dm', 'case', 'company'
  const [teammates, setTeammates] = useState([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [mobileViewState, setMobileViewState] = useState('list'); // 'list', 'chat', 'info'

  const messagesEndRef = useRef(null);
  const realtimeChannelRef = useRef(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);

  // Handle targetLeadId to auto-select or auto-create case chat thread
  useEffect(() => {
    if (!isLoadingThreads && targetLeadId && profile) {
      const handleTargetLeadChat = async () => {
        const leadIdStr = String(targetLeadId);
        // Look for existing case thread
        const existingThread = threads.find(t => t.type === 'case' && String(t.related_lead_id) === leadIdStr);
        
        if (existingThread) {
          setActiveThread(existingThread);
          setMobileViewState('chat');
          if (clearTargetLeadId) clearTargetLeadId();
          return;
        }

        // If not found, create a new case thread
        try {
          const lead = leads.find(l => String(l.id) === leadIdStr);
          if (!lead) {
            console.error('Lead not found for id:', targetLeadId);
            if (clearTargetLeadId) clearTargetLeadId();
            return;
          }

          const companyId = profile.company_id || profile.id;
          
          // Create the thread with a client-generated UUID to bypass RLS chicken-and-egg
          const threadId = window.crypto.randomUUID();
          const { error: threadError } = await supabase
            .from('chat_threads')
            .insert([{
              id: threadId,
              company_id: companyId,
              type: 'case',
              related_lead_id: lead.id
            }]);

          if (threadError) throw threadError;

          // Gather initial participants: current user, assigned workers, and PMs
          const pm = lead.raw_data?.assigned_pm;
          const pmArr = Array.isArray(pm) ? pm : (pm ? [pm] : []);
          const workers = lead.raw_data?.assigned_workers || [];
          
          // Set of unique user IDs to add as participants
          const participantUserIds = new Set([
            profile.id,
            ...pmArr.map(String),
            ...workers.map(String)
          ]);

          const participantsToInsert = Array.from(participantUserIds).map(userId => ({
            thread_id: threadId,
            user_id: userId
          }));

          const { error: partError } = await supabase
            .from('chat_participants')
            .insert(participantsToInsert);

          if (partError) throw partError;

          const enriched = {
            id: threadId,
            company_id: companyId,
            type: 'case',
            related_lead_id: lead.id,
            participantIds: Array.from(participantUserIds),
            lastMessage: null,
            created_at: new Date().toISOString()
          };

          // Update local threads state
          setThreads(prev => [enriched, ...prev]);
          setActiveThread(enriched);
          setMobileViewState('chat');
          toast.success(`Sagschat oprettet for ${lead.raw_data?.project_title || lead.project_category}`);
        } catch (error) {
          console.error('Error creating case chat:', error);
          toast.error('Kunne ikke oprette sagschat.');
        } finally {
          if (clearTargetLeadId) clearTargetLeadId();
        }
      };

      handleTargetLeadChat();
    }
  }, [isLoadingThreads, targetLeadId, profile, threads, leads, clearTargetLeadId]);

  // Load teammates (carpenters) and threads
  useEffect(() => {
    if (profile && profile.id) {
      loadTeammatesAndThreads();
    }
  }, [profile?.id, leads]);

  // Scroll to bottom whenever messages list updates
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeThread]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessageText]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };
  
  // Subscribe to realtime messages for the active thread
  useEffect(() => {
    if (activeThread) {
      loadMessages(activeThread.id);
      subscribeToRealtimeMessages(activeThread.id);
    } else {
      setMessages([]);
    }

    return () => {
      unsubscribeRealtimeMessages();
    };
  }, [activeThread]);

  const loadTeammatesAndThreads = async () => {
    if (!profile || !profile.id) return;
    setIsLoadingThreads(true);
    try {
      const companyId = profile.company_id || profile.id;

      // 1. Fetch teammates (carpenters)
      const { data: teamData, error: teamError } = await supabase
        .from('carpenters')
        .select('id, owner_name, company_name, email, role, phone, avatar_url')
        .or(`company_id.eq.${companyId},id.eq.${companyId}`);

      if (teamError) throw teamError;
      setTeammates(teamData || []);

      // 2. Fetch threads for this company
      const { data: threadData, error: threadError } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (threadError) throw threadError;

      // Ensure the "Company" thread exists
      let finalThreads = threadData || [];
      const companyThread = finalThreads.find(t => t.type === 'company');
      
      if (!companyThread) {
        // Create the company thread
        const { data: newCompanyThread, error: createError } = await supabase
          .from('chat_threads')
          .insert([{ company_id: companyId, type: 'company' }])
          .select()
          .single();

        if (!createError && newCompanyThread) {
          finalThreads = [newCompanyThread, ...finalThreads];
        }
      }

      // Fetch participants for each thread to enrich info
      const enrichedThreads = await Promise.all(
        finalThreads.map(async (thread) => {
          const { data: participants } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('thread_id', thread.id);

          const participantIds = (participants || []).map(p => p.user_id);
          
          // Get the last message in this thread
          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('text_content, created_at, sender_id')
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...thread,
            participantIds,
            lastMessage: lastMsg?.[0] || null
          };
        })
      );

      setThreads(enrichedThreads);
    } catch (error) {
      console.error('Error loading chat info:', error);
      toast.error('Kunne ikke hente chatsystem.');
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const loadMessages = async (threadId) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Kunne ikke hente beskeder.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const subscribeToRealtimeMessages = (threadId) => {
    unsubscribeRealtimeMessages();

    realtimeChannelRef.current = supabase
      .channel(`chat-room:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });

          // Update last message in the threads list
          setThreads((prevThreads) => 
            prevThreads.map((t) => 
              t.id === threadId 
                ? { ...t, lastMessage: payload.new } 
                : t
            )
          );
        }
      )
      .subscribe();
  };

  const unsubscribeRealtimeMessages = () => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  };

  const startDirectMessage = async (teammate) => {
    try {
      const companyId = profile.company_id || profile.id;
      
      // Look for an existing DM thread with this teammate
      let existingDm = threads.find(t => 
        t.type === 'dm' && 
        t.participantIds.includes(teammate.id) &&
        t.participantIds.includes(profile.id)
      );

      if (existingDm) {
        setActiveThread(existingDm);
        setMobileViewState('chat');
        return;
      }

      // Create new DM thread with a client-generated UUID to bypass RLS chicken-and-egg
      const threadId = window.crypto.randomUUID();
      const { error: threadError } = await supabase
        .from('chat_threads')
        .insert([{ id: threadId, company_id: companyId, type: 'dm' }]);

      if (threadError) throw threadError;

      // Add participants
      const participantsToInsert = [
        { thread_id: threadId, user_id: profile.id },
        { thread_id: threadId, user_id: teammate.id }
      ];

      const { error: partError } = await supabase
        .from('chat_participants')
        .insert(participantsToInsert);

      if (partError) throw partError;

      const enriched = {
        id: threadId,
        company_id: companyId,
        type: 'dm',
        participantIds: [profile.id, teammate.id],
        lastMessage: null,
        created_at: new Date().toISOString()
      };

      setThreads(prev => [enriched, ...prev]);
      setActiveThread(enriched);
      setMobileViewState('chat');
      toast.success(`Chat startet med ${teammate.owner_name}`);
    } catch (error) {
      console.error('Error starting DM:', error);
      toast.error('Kunne ikke starte chat.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeThread) return;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${window.crypto.randomUUID()}.${fileExt}`;
      const filePath = `${activeThread.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat_media')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('chat_media')
        .getPublicUrl(filePath);
        
      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert([{
          thread_id: activeThread.id,
          sender_id: profile.id,
          message_type: 'image',
          media_url: publicUrl,
          text_content: file.name
        }]);
        
      if (msgError) throw msgError;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Kunne ikke uploade fil.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        setIsUploading(true);
        try {
          const fileName = `${window.crypto.randomUUID()}.webm`;
          const filePath = `${activeThread?.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('chat_media')
            .upload(filePath, audioBlob);
            
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('chat_media')
            .getPublicUrl(filePath);
            
          const { error: msgError } = await supabase
            .from('chat_messages')
            .insert([{
              thread_id: activeThread.id,
              sender_id: profile.id,
              message_type: 'voice',
              media_url: publicUrl,
              text_content: 'Lydbesked'
            }]);
            
          if (msgError) throw msgError;
        } catch (err) {
          console.error('Error uploading voice note:', err);
          toast.error('Kunne ikke sende lydbesked.');
        } finally {
          setIsUploading(false);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      toast.error('Kunne ikke få adgang til mikrofonen.');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeThread) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');

    // Optimistic UI update
    const tempId = window.crypto.randomUUID();
    const optimisticMsg = {
      id: tempId,
      thread_id: activeThread.id,
      sender_id: profile.id,
      message_type: 'text',
      text_content: textToSend,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          id: tempId,
          thread_id: activeThread.id,
          sender_id: profile.id,
          message_type: 'text',
          text_content: textToSend
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Kunne ikke sende besked.');
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessageText(textToSend);
    }
  };

  // Helper to get Thread Title & Info
  const getThreadInfo = (thread) => {
    if (!thread) return { title: '', desc: '', avatar: '' };

    if (thread.type === 'company') {
      return {
        title: 'Firma-fællestråd',
        desc: 'Beskeder til alle medarbejdere i virksomheden',
        avatar: <Megaphone size={22} color="#2563eb" />,
        phone: null
      };
    }

    if (thread.type === 'case') {
      const lead = leads.find(l => String(l.id) === String(thread.related_lead_id));
      const caseNumberText = lead?.case_number ? `#${lead.case_number} - ` : '';
      const title = lead ? `Sag ${caseNumberText}${lead.raw_data?.project_title || lead.project_category}` : 'Sagsgruppe';
      return {
        title,
        desc: 'Fælles sags-chat',
        avatar: <HardHat size={22} color="#ea580c" />,
        phone: null
      };
    }

    // DM Type - Find the other participant
    const otherId = thread.participantIds?.find(id => id !== profile.id);
    const otherParticipant = teammates.find(t => t.id === otherId);
    
    return {
      title: otherParticipant?.owner_name || 'Kollega',
      desc: otherParticipant ? `${otherParticipant.role === 'admin' ? 'Mester' : 'Svend'} · ${otherParticipant.email}` : 'Direkte besked',
      avatar: <UserAvatar name={otherParticipant?.owner_name || 'Kollega'} avatarUrl={otherParticipant?.avatar_url} size={40} ring={false} />,
      phone: otherParticipant?.phone || null
    };
  };

  const filteredThreads = threads.filter(thread => {
    // Apply Type Filter
    if (activeFilter !== 'all' && thread.type !== activeFilter) return false;

    // Apply Search Query
    if (searchQuery.trim() !== '') {
      const info = getThreadInfo(thread);
      return info.title.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 100px)',
      background: 'rgba(255, 255, 255, 0.45)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.5)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
      overflow: 'hidden',
      fontFamily: 'Outfit, Inter, system-ui, sans-serif'
    }}>
      {/* 1. LEFT SIDEBAR: Threads list */}
      <div style={{
        flexDirection: 'column',
        borderRight: '1px solid rgba(226, 232, 240, 0.8)',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        transition: 'all 0.3s ease',
      }} className="chat-sidebar">
        
        {/* Search & Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(226, 232, 240, 0.8)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Beskeder</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#dbeafe', color: '#2563eb', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
              <Sparkles size={13} />
              <span>Realtime</span>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
            <input 
              type="text"
              placeholder="Søg i samtaler..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                borderRadius: '12px',
                border: '1px solid rgba(203, 213, 225, 0.8)',
                background: 'rgba(255, 255, 255, 0.6)',
                outline: 'none',
                fontSize: '0.9rem',
                color: '#0f172a',
                transition: 'border-color 0.2s'
              }}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', padding: '10px 20px', gap: '8px', borderBottom: '1px solid rgba(226, 232, 240, 0.4)' }}>
          {['all', 'dm', 'case', 'company'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: 'none',
                background: activeFilter === filter ? '#0f172a' : 'rgba(241, 245, 249, 0.8)',
                color: activeFilter === filter ? '#ffffff' : '#475569',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {filter === 'all' && 'Alle'}
              {filter === 'dm' && 'Direkte'}
              {filter === 'case' && 'Sager'}
              {filter === 'company' && 'Firma'}
            </button>
          ))}
        </div>

        {/* Threads list container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {isLoadingThreads ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px', color: '#64748b' }}>
              <div className="animate-spin" style={{ width: '20px', height: '20px', border: '2px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', marginBottom: '8px' }}></div>
              <span style={{ fontSize: '0.85rem' }}>Henter samtaler...</span>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', fontSize: '0.85rem' }}>
              Ingen samtaler fundet
            </div>
          ) : (
            filteredThreads.map(thread => {
              const info = getThreadInfo(thread);
              const isActive = activeThread?.id === thread.id;
              
              return (
                <div
                  key={thread.id}
                  onClick={() => {
                    setActiveThread(thread);
                    setMobileViewState('chat');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '14px',
                    backgroundColor: isActive ? 'rgba(15, 23, 42, 0.08)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '4px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}>
                    {info.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{ fontWeight: isActive ? 700 : 600, color: '#0f172a', fontSize: '0.95rem', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {info.title}
                      </span>
                      {thread.lastMessage && (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                          {new Date(thread.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {thread.lastMessage ? thread.lastMessage.text_content : 'Ingen beskeder endnu'}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          {/* Quick DM Teammates Section */}
          {activeFilter === 'dm' && teammates.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h5 style={{ margin: '0 0 10px 12px', fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>Start ny chat</h5>
              {teammates.filter(t => t.id !== profile.id).map(mate => (
                <div
                  key={mate.id}
                  onClick={() => startDirectMessage(mate)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: '#475569',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserAvatar name={mate.owner_name || mate.company_name || ''} avatarUrl={mate.avatar_url} size={30} ring={false} />
                  </div>
                  <span>{mate.owner_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. MIDDLE PANEL: Active conversation */}
      <div style={{
        flex: 1,
        flexDirection: 'column',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        position: 'relative'
      }} className="chat-main">
        {activeThread ? (
          <>
            {/* Header */}
            {(() => {
              const info = getThreadInfo(activeThread);
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    {/* Back button on mobile */}
                    <button 
                      onClick={() => setMobileViewState('list')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '8px',
                        color: '#64748b',
                        marginRight: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      className="chat-back-btn"
                    >
                      <ArrowLeft size={20} />
                    </button>

                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1, minWidth: 0 }}
                      onClick={() => setMobileViewState('info')}
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                        {info.avatar}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.title}</h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.desc}</p>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {info.phone && (
                      <a
                        href={`tel:${info.phone}`}
                        title={`Ring til ${info.title}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          textDecoration: 'none',
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <Phone size={18} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Messages body */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {isLoadingMessages ? (
                <div style={{ display: 'flex', flex1: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Henter beskeder...</div>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '8px', height: '100%' }}>
                  <MessageSquare size={36} style={{ opacity: 0.3 }} />
                  <span style={{ fontSize: '0.85rem' }}>Send en besked for at starte samtalen</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === profile.id;
                  const sender = teammates.find(t => t.id === msg.sender_id);
                  const senderName = sender?.owner_name || 'Kollega';
                  
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isOwn ? 'flex-end' : 'flex-start',
                        maxWidth: '75%',
                        alignSelf: isOwn ? 'flex-end' : 'flex-start'
                      }}
                    >
                      {/* Show sender name if group case/company and not own message */}
                      {!isOwn && activeThread.type !== 'dm' && (
                        <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '8px', marginBottom: '2px', fontWeight: 600 }}>
                          {senderName}
                        </span>
                      )}

                      {/* Bubble */}
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '16px',
                        borderTopRightRadius: isOwn ? '4px' : '16px',
                        borderTopLeftRadius: isOwn ? '16px' : '4px',
                        background: isOwn 
                          ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' 
                          : 'rgba(255, 255, 255, 0.75)',
                        border: isOwn ? 'none' : '1px solid rgba(226, 232, 240, 0.8)',
                        color: isOwn ? '#ffffff' : '#0f172a',
                        fontSize: '0.9rem',
                        lineHeight: 1.4,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        wordBreak: 'break-word'
                      }}>
                        {msg.message_type === 'image' && msg.media_url ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <img 
                              src={msg.media_url} 
                              alt="Vedhæftning" 
                              style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', cursor: 'pointer', objectFit: 'contain' }} 
                              onClick={() => window.open(msg.media_url, '_blank')}
                            />
                          </div>
                        ) : msg.message_type === 'voice' && msg.media_url ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Mic size={16} />
                            <audio controls src={msg.media_url} style={{ height: '32px', maxWidth: '200px' }} />
                          </div>
                        ) : msg.message_type === 'file' && msg.media_url ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Paperclip size={16} />
                            <a href={msg.media_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                              {msg.text_content || 'Vedhæftet fil'}
                            </a>
                          </div>
                        ) : (
                          msg.text_content
                        )}
                      </div>

                      {/* Timestamp */}
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '3px', marginRight: isOwn ? '4px' : '0', marginLeft: isOwn ? '0' : '4px' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <form 
              onSubmit={handleSendMessage}
              style={{
                padding: '16px 20px',
                borderTop: '1px solid rgba(226, 232, 240, 0.8)',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '12px'
              }}
            >
              {/* Attachment actions */}
              <input 
                type="file" 
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <button 
                type="button" 
                title="Vedhæft fil"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isUploading ? '#cbd5e1' : '#2563eb',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  marginBottom: '2px'
                }}
              >
                {isUploading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" /> : <Plus size={24} strokeWidth={2.5} />}
              </button>

              {isRecording ? (
                <div style={{
                  flex: 1,
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#ef4444',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}>
                  <div className="animate-pulse mr-2" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                  Optager... {formatRecordingTime(recordingTime)}
                </div>
              ) : (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'flex-end',
                  background: 'rgba(241, 245, 249, 0.8)',
                  borderRadius: '20px',
                  padding: '4px 4px 4px 16px',
                }}>
                  <textarea
                    ref={textareaRef}
                    placeholder="Aa"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isUploading}
                    rows={1}
                    className="focus:ring-0 focus:outline-none"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: 'none',
                      background: 'transparent',
                      backgroundColor: 'transparent',
                      outline: 'none',
                      boxShadow: 'none',
                      WebkitAppearance: 'none',
                      fontSize: '0.95rem',
                      color: '#0f172a',
                      resize: 'none',
                      overflowY: 'auto',
                      padding: '8px 0',
                      lineHeight: '1.4',
                      maxHeight: '120px',
                      fontFamily: 'inherit',
                      marginTop: '2px',
                      marginBottom: '2px'
                    }}
                  />
                  {/* Voice note action */}
                  <button 
                    type="button" 
                    title={isRecording ? "Stop optagelse" : "Indtal besked"}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isUploading}
                    style={{
                      background: isRecording ? '#fee2e2' : 'transparent',
                      border: 'none',
                      color: isRecording ? '#ef4444' : '#2563eb',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      padding: '8px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                      marginBottom: '2px'
                    }}
                  >
                    {isRecording ? <Square size={18} /> : <Mic size={20} />}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={!newMessageText.trim()}
                style={{
                  backgroundColor: newMessageText.trim() ? '#2563eb' : '#cbd5e1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: newMessageText.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: newMessageText.trim() ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  marginBottom: '2px'
                }}
              >
                <Send size={16} style={{ marginLeft: '2px' }} />
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '12px', height: '100%' }}>
            <MessageSquare size={48} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Vælg en samtale for at starte</span>
            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>Klik på en tråd i menuen til venstre.</p>
          </div>
        )}
      </div>

      {/* 3. RIGHT PANEL: Chat Info */}
      {activeThread && (
        <div style={{
          borderLeft: '1px solid rgba(226, 232, 240, 0.8)',
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          flexDirection: 'column',
          overflowY: 'auto'
        }} className="chat-info">
          {(() => {
            const info = getThreadInfo(activeThread);
            return (
              <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {/* Back button strictly for mobile, using global CSS class `chat-info-back` */}
                <button 
                  onClick={() => setMobileViewState('chat')}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '8px',
                    color: '#64748b',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  className="chat-info-back-btn"
                >
                  <ArrowLeft size={20} />
                </button>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f8fafc', border: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  {info.avatar}
                </div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', textAlign: 'center', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.title}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', textAlign: 'center', marginBottom: '32px', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.desc}</p>

                <div style={{ width: '100%', borderTop: '1px solid rgba(226, 232, 240, 0.8)', paddingTop: '20px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', fontWeight: 700 }}>Chatoplysninger</h4>
                  
                  {info.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(226, 232, 240, 0.4)' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Phone size={14} color="#64748b" />
                      </div>
                      <a href={`tel:${info.phone}`} style={{ fontSize: '0.9rem', color: '#0f172a', textDecoration: 'none', fontWeight: 500 }}>{info.phone}</a>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(226, 232, 240, 0.4)', cursor: 'pointer' }}
                       onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.02)'}
                       onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={14} color="#64748b" />
                    </div>
                    <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>Deltagere ({activeThread.participantIds?.length || 0})</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(226, 232, 240, 0.4)', cursor: 'pointer' }}
                       onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.02)'}
                       onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={14} color="#64748b" />
                    </div>
                    <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>Medier og billeder</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', cursor: 'pointer' }}
                       onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.02)'}
                       onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={14} color="#64748b" />
                    </div>
                    <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>Filer og links</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Global CSS Inject to support responsive view */}
      <style>{`
        @media (max-width: 768px) {
          .chat-sidebar {
            width: 100% !important;
            max-width: none !important;
            display: ${mobileViewState === 'list' ? 'flex' : 'none'} !important;
          }
          .chat-main {
            display: ${mobileViewState === 'chat' ? 'flex' : 'none'} !important;
          }
          .chat-info {
            width: 100% !important;
            max-width: none !important;
            display: ${mobileViewState === 'info' ? 'flex' : 'none'} !important;
            border-left: none !important;
          }
          .chat-back-btn {
            display: flex !important;
          }
          .chat-info-back-btn {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .chat-back-btn, .chat-info-back-btn {
            display: none !important;
          }
          .chat-sidebar {
             width: 320px !important;
             max-width: 320px !important;
             display: flex !important;
          }
          .chat-main {
             display: flex !important;
          }
          .chat-info {
             width: 320px !important;
             max-width: 320px !important;
             display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatTab;

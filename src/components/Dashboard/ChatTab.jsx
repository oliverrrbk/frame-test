import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  MessageSquare, Send, Phone, Search, Users, 
  Sparkles, Paperclip, Mic, ArrowLeft, ShieldAlert, CheckCircle2 
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [isMobileActiveThread, setIsMobileActiveThread] = useState(false);

  const messagesEndRef = useRef(null);
  const realtimeChannelRef = useRef(null);

  // Handle targetLeadId to auto-select or auto-create case chat thread
  useEffect(() => {
    if (!isLoadingThreads && targetLeadId && profile) {
      const handleTargetLeadChat = async () => {
        const leadIdStr = String(targetLeadId);
        // Look for existing case thread
        const existingThread = threads.find(t => t.type === 'case' && String(t.related_lead_id) === leadIdStr);
        
        if (existingThread) {
          setActiveThread(existingThread);
          setIsMobileActiveThread(true);
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
          setIsMobileActiveThread(true);
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
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        .select('id, owner_name, company_name, email, role, phone')
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
        setIsMobileActiveThread(true);
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
      setIsMobileActiveThread(true);
      toast.success(`Chat startet med ${teammate.owner_name}`);
    } catch (error) {
      console.error('Error starting DM:', error);
      toast.error('Kunne ikke starte chat.');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeThread) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          thread_id: activeThread.id,
          sender_id: profile.id,
          message_type: 'text',
          text_content: textToSend
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Kunne ikke sende besked.');
    }
  };

  // Helper to get Thread Title & Info
  const getThreadInfo = (thread) => {
    if (!thread) return { title: '', desc: '', avatar: '' };

    if (thread.type === 'company') {
      return {
        title: 'Firma-fællestråd',
        desc: 'Beskeder til alle medarbejdere i virksomheden',
        avatar: '📢',
        phone: null
      };
    }

    if (thread.type === 'case') {
      const lead = leads.find(l => String(l.id) === String(thread.related_lead_id));
      const title = lead ? `Sag: ${lead.raw_data?.project_title || lead.project_category}` : 'Sagsgruppe';
      const caseNo = lead?.case_number ? `Sag #${lead.case_number}` : '';
      return {
        title,
        desc: caseNo || 'Fælles sags-chat',
        avatar: '🏗️',
        phone: null
      };
    }

    // DM Type - Find the other participant
    const otherId = thread.participantIds?.find(id => id !== profile.id);
    const otherParticipant = teammates.find(t => t.id === otherId);
    
    return {
      title: otherParticipant?.owner_name || 'Kollega',
      desc: otherParticipant ? `${otherParticipant.role === 'admin' ? 'Mester' : 'Svend'} · ${otherParticipant.email}` : 'Direkte besked',
      avatar: '👤',
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
        width: isMobileActiveThread ? '0%' : '100%',
        maxWidth: isMobileActiveThread ? '0px' : 'none',
        display: isMobileActiveThread ? 'none' : 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(226, 232, 240, 0.8)',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        transition: 'all 0.3s ease',
        flex: 1
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
                    setIsMobileActiveThread(true);
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {info.title}
                      </h4>
                      {thread.lastMessage && (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
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
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                    👤
                  </div>
                  <span>{mate.owner_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. RIGHT PANEL: Active conversation */}
      <div style={{
        flex: 3,
        display: !isMobileActiveThread && window.innerWidth <= 768 ? 'none' : 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        width: '100%'
      }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Back button on mobile */}
                    <button 
                      onClick={() => setIsMobileActiveThread(false)}
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

                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                      {info.avatar}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{info.title}</h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{info.desc}</p>
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
                        {msg.text_content}
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
                alignItems: 'center',
                gap: '12px'
              }}
            >
              {/* Dummy attachment actions */}
              <button 
                type="button" 
                title="Vedhæft fil"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Paperclip size={20} />
              </button>

              <input
                type="text"
                placeholder="Skriv besked..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '24px',
                  border: '1px solid rgba(203, 213, 225, 0.8)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  outline: 'none',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  transition: 'border-color 0.2s'
                }}
              />

              {/* Dummy voice note action */}
              <button 
                type="button" 
                title="Indtal besked"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Mic size={20} />
              </button>

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
                  transition: 'all 0.2s'
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

      {/* Global CSS Inject to support responsive view */}
      <style>{`
        @media (max-width: 768px) {
          .chat-sidebar {
            width: 100% !important;
            max-width: none !important;
          }
          .chat-back-btn {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .chat-back-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatTab;

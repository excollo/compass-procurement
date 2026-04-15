import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Custom hook to fetch and subscribe to real-time chat messages for a Vendor.
 */
export default function useChatMessages(vendorPhone, poNums = []) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    const uniquePoNums = [...new Set((poNums || []).filter(Boolean))];
    const hasPhone = Boolean(vendorPhone);
    const hasPos = uniquePoNums.length > 0;

    if (!hasPhone && !hasPos) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Clear previous state
    setMessages([]);
    setLoading(true);
    setError(null);

    // Remove previous channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Fetch existing messages
    const fetchMessages = async () => {
      let query = supabase
        .from('chat_history')
        .select('*')
        .order('sent_at', { ascending: true });

      if (hasPhone && hasPos) {
        query = query.or(`vendor_phone.eq.${vendorPhone},po_num.in.(${uniquePoNums.join(',')})`);
      } else if (hasPhone) {
        query = query.eq('vendor_phone', vendorPhone);
      } else {
        query = query.in('po_num', uniquePoNums);
      }

      const { data, error: fetchError } = await query;

      if (cancelled) return;

      if (fetchError) {
        console.error('Error fetching chat messages:', fetchError);
        setError(fetchError.message || 'Failed to load messages');
        setLoading(false);
        return;
      }

      // De-dup rows when both phone and po_num clauses match.
      const deduped = [];
      const seen = new Set();
      (data || []).forEach((row) => {
        const key = row.id || `${row.sent_at || ''}-${row.sender_type || ''}-${row.message_text || ''}-${row.po_num || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(row);
        }
      });

      setMessages(deduped);
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to realtime INSERT events
    const channel = supabase
      .channel(`vendor-chat-${vendorPhone || 'po-only'}-${uniquePoNums.join('_') || 'none'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_history',
          filter: hasPhone ? `vendor_phone=eq.${vendorPhone}` : undefined,
        },
        (payload) => {
          const row = payload.new;
          const phoneMatch = hasPhone && row.vendor_phone === vendorPhone;
          const poMatch = hasPos && uniquePoNums.includes(row.po_num);
          if (!phoneMatch && !poMatch) return;

          setMessages((prev) => {
            const key = row.id || `${row.sent_at || ''}-${row.sender_type || ''}-${row.message_text || ''}-${row.po_num || ''}`;
            const exists = prev.some((m) => (m.id ? m.id === row.id : `${m.sent_at || ''}-${m.sender_type || ''}-${m.message_text || ''}-${m.po_num || ''}` === key));
            if (exists) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup on Vendor change or unmount
    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [vendorPhone, JSON.stringify(poNums)]);

  return { messages, loading, error };
}

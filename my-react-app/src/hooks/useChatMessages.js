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
    const uniquePoNums = [...new Set((poNums || []).filter(Boolean).map((po) => String(po)))];
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

    const normalizeChatRow = (row) => {
      const messageTextRaw =
        row?.message_text ??
        row?.message ??
        row?.text ??
        row?.body ??
        row?.content ??
        row?.vendor_message ??
        row?.reply_text ??
        '';
      const normalizedPo =
        row?.po_num ??
        row?.po_id ??
        row?.po_number ??
        row?.order_id ??
        '';
      const normalizedPhone =
        row?.vendor_phone ??
        row?.phone ??
        row?.sender_phone ??
        row?.from_phone ??
        null;
      const direction = String(row?.direction || '').toLowerCase();
      const senderLabel = String(row?.sender_label || '').toLowerCase();
      let normalizedSenderType = row?.sender_type;
      if (!normalizedSenderType) {
        if (direction === 'inbound') normalizedSenderType = 'vendor';
        else if (direction === 'outbound' && senderLabel.includes('procurement')) normalizedSenderType = 'operator';
        else if (direction === 'outbound') normalizedSenderType = 'bot';
      }

      return {
        ...row,
        po_num: normalizedPo ? String(normalizedPo) : '',
        vendor_phone: normalizedPhone,
        sender_type: normalizedSenderType || 'bot',
        message_text: String(messageTextRaw || ''),
        sent_at: row?.sent_at || row?.created_at || row?.inserted_at || new Date().toISOString(),
      };
    };

    const matchesTrackedThread = (rawRow) => {
      const row = normalizeChatRow(rawRow);
      const rowPhone = String(row?.vendor_phone || '');
      const rowPo = String(row?.po_num || '');
      const phoneMatch = hasPhone && rowPhone && rowPhone === String(vendorPhone || '');
      const poMatch = hasPos && rowPo && uniquePoNums.includes(rowPo);
      return phoneMatch || poMatch;
    };

    // Fetch existing messages
    const fetchMessages = async () => {
      // Read broadly, then filter client-side to handle schema/field inconsistencies
      // (e.g. vendor rows missing vendor_phone but containing po_num/po_id).
      const { data, error: fetchError } = await supabase
        .from('chat_history')
        .select('*')
        .order('sent_at', { ascending: true })
        .limit(2000);

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
      (data || []).filter(matchesTrackedThread).forEach((rawRow) => {
        const row = normalizeChatRow(rawRow);
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
        },
        (payload) => {
          const normalizedRow = normalizeChatRow(payload.new);
          if (!matchesTrackedThread(normalizedRow)) return;

          setMessages((prev) => {
            const key = normalizedRow.id || `${normalizedRow.sent_at || ''}-${normalizedRow.sender_type || ''}-${normalizedRow.message_text || ''}-${normalizedRow.po_num || ''}`;
            const exists = prev.some((m) => (m.id ? m.id === normalizedRow.id : `${m.sent_at || ''}-${m.sender_type || ''}-${m.message_text || ''}-${m.po_num || ''}` === key));
            if (exists) return prev;
            return [...prev, normalizedRow];
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

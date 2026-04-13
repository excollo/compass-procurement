import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Custom hook to fetch and subscribe to real-time chat messages for a Vendor.
 */
export default function useChatMessages(vendorPhone) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!vendorPhone) {
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
      const { data, error: fetchError } = await supabase
        .from('chat_history')
        .select('*')
        .eq('vendor_phone', vendorPhone)
        .order('sent_at', { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        console.error('Error fetching chat messages:', fetchError);
        setError(fetchError.message || 'Failed to load messages');
        setLoading(false);
        return;
      }

      setMessages(data || []);
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to realtime INSERT events
    const channel = supabase
      .channel(`vendor-chat-${vendorPhone}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_history',
          filter: `vendor_phone=eq.${vendorPhone}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
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
  }, [vendorPhone]);

  return { messages, loading, error };
}

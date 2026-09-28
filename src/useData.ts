import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Campaign, PartnerAppointment } from './types';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    const { data, error } = await supabase
      .from('ipa_campaigns')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) {
      console.error('Error fetching campaigns:', error);
      return;
    }
    if (data) setCampaigns(data as Campaign[]);
  };

  const addCampaign = async (c: Omit<Campaign, 'id'>) => {
    const { data, error } = await supabase
      .from('ipa_campaigns')
      .insert([c])
      .select()
      .single();
      
    if (error) {
      console.error('Error adding campaign:', error);
      return;
    }
    if (data) setCampaigns(prev => [data as Campaign, ...prev]);
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    const { data, error } = await supabase
      .from('ipa_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating campaign:', error);
      return;
    }
    if (data) setCampaigns(prev => prev.map(c => (c.id === id ? (data as Campaign) : c)));
  };

  const deleteCampaign = async (id: string) => {
    const { error } = await supabase
      .from('ipa_campaigns')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting campaign:', error);
      return;
    }
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  return { campaigns, addCampaign, updateCampaign, deleteCampaign };
}

export function usePartners() {
  const [partners, setPartners] = useState<PartnerAppointment[]>([]);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    const { data, error } = await supabase
      .from('ipa_partners')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) {
      console.error('Error fetching partners:', error);
      return;
    }
    if (data) setPartners(data as PartnerAppointment[]);
  };

  const addPartner = async (p: Omit<PartnerAppointment, 'id'>) => {
    const { data, error } = await supabase
      .from('ipa_partners')
      .insert([p])
      .select()
      .single();
      
    if (error) {
      console.error('Error adding partner:', error);
      return;
    }
    if (data) setPartners(prev => [data as PartnerAppointment, ...prev]);
  };

  const updatePartner = async (id: string, updates: Partial<PartnerAppointment>) => {
    const { data, error } = await supabase
      .from('ipa_partners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating partner:', error);
      return;
    }
    if (data) setPartners(prev => prev.map(p => (p.id === id ? (data as PartnerAppointment) : p)));
  };

  const deletePartner = async (id: string) => {
    const { error } = await supabase
      .from('ipa_partners')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting partner:', error);
      return;
    }
    setPartners(prev => prev.filter(p => p.id !== id));
  };

  return { partners, addPartner, updatePartner, deletePartner };
}

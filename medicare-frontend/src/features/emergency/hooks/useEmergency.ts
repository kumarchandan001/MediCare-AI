import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emergencyApi } from "../api/emergencyApi";
import { useToast } from "@/store/toastStore";

const CONTACTS_KEY = ["emergency", "contacts"];
const ALERTS_KEY = ["emergency", "alerts"];

export function useEmergency() {
  const toast = useToast();
  const qc = useQueryClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [sosActive, setSosActive] = useState(false);

  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: CONTACTS_KEY,
    queryFn: emergencyApi.getContacts,
    staleTime: 5 * 60 * 1000,
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ALERTS_KEY,
    queryFn: emergencyApi.getAlerts,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: emergencyApi.addContact,
    onSuccess: () => {
      toast.success("Contact added!");
      qc.invalidateQueries({ queryKey: CONTACTS_KEY });
      setShowAddForm(false);
    },
    onError: () => toast.error("Failed to add contact."),
  });

  const deleteMutation = useMutation({
    mutationFn: emergencyApi.deleteContact,
    onSuccess: () => {
      toast.success("Contact removed.");
      qc.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
    onError: () => toast.error("Failed to delete contact."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      emergencyApi.updateContact(id, data),
    onSuccess: () => {
      toast.success("Contact updated!");
      qc.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });

  const triggerSOS = () => {
    setSosActive(true);
    toast.error("🚨 SOS Activated! Calling emergency services...", 8000);
    setTimeout(() => setSosActive(false), 5000);
  };

  return {
    contactsData,
    contactsLoading,
    showAddForm,
    setShowAddForm,
    addContact: addMutation.mutate,
    deleteContact: deleteMutation.mutate,
    updateContact: (id: number, data: any) =>
      updateMutation.mutate({ id, data }),
    isAdding: addMutation.isPending,
    isDeleting: deleteMutation.isPending,
    alertsData,
    alertsLoading,
    sosActive,
    triggerSOS,
  };
}

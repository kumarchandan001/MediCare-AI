import { api } from "@/lib/apiClient";
import type {
  ContactsData,
  CreateContactPayload,
  EmergencyAlertsData,
} from "../types/emergency.types";

export const emergencyApi = {
  getContacts: () =>
    api.get<ContactsData>("/emergency/contacts"),

  addContact: (data: CreateContactPayload) =>
    api.post("/emergency/contacts", data),

  updateContact: (id: number, data: Partial<CreateContactPayload>) =>
    api.patch(`/emergency/contacts/${id}`, data),

  deleteContact: (id: number) =>
    api.delete(`/emergency/contacts/${id}`),

  getAlerts: () =>
    api.get<EmergencyAlertsData>("/emergency/alerts"),
};

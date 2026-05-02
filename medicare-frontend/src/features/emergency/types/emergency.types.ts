export interface EmergencyContact {
  id: number;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
}

export interface ContactsData {
  contacts: EmergencyContact[];
  count: number;
  primary?: EmergencyContact;
}

export interface CreateContactPayload {
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
  notes?: string;
}

export interface EmergencyAlertItem {
  id: number;
  title: string;
  message?: string;
  severity: "high" | "critical";
  category?: string;
  created_at: string;
}

export interface EmergencyAlertsData {
  alerts: EmergencyAlertItem[];
  count: number;
}

export const EMERGENCY_NUMBERS = [
  {
    number: "112",
    label: "Emergency",
    sublabel: "Police / Fire / Medical",
    color: "danger",
    icon: "fa-phone-volume",
  },
  {
    number: "108",
    label: "Ambulance",
    sublabel: "Emergency Medical Service",
    color: "orange",
    icon: "fa-truck-medical",
  },
  {
    number: "104",
    label: "Health Line",
    sublabel: "24×7 Health Helpline",
    color: "accent",
    icon: "fa-heart-pulse",
  },
  {
    number: "1800-180-1104",
    label: "Mental Health",
    sublabel: "NIMHANS Helpline",
    color: "purple",
    icon: "fa-brain",
  },
] as const;

export const NEARBY_HOSPITALS = [
  {
    name: "Jain Global Campus",
    type: "Campus Health Centre",
    address: "Himalaya Hostel Block, Jain University, Bengaluru",
    timing: "10:00 AM – 5:00 PM",
    days: "Mon – Sat",
    phone: "080-4343-4343",
    mapUrl: "https://maps.google.com/?q=Jain+University+Bangalore",
    openStart: 10,
    openEnd: 17,
    color: "recovery",
    icon: "fa-hospital-user",
  },
  {
    name: "Dayananda Sagar Hospital",
    type: "Multi-Specialty Hospital",
    address: "Shavige Malleshwara Hills, Bengaluru",
    timing: "8:00 AM – 8:00 PM",
    days: "Mon – Sun",
    phone: "080-2666-1234",
    mapUrl: "https://maps.google.com/?q=Dayananda+Sagar+Hospital+Bangalore",
    openStart: 8,
    openEnd: 20,
    color: "strain",
    icon: "fa-hospital",
  },
  {
    name: "Manipal Hospital",
    type: "Super Specialty Hospital",
    address: "Old Airport Road, Bengaluru",
    timing: "24 Hours",
    days: "Mon – Sun",
    phone: "080-2502-4444",
    mapUrl: "https://maps.google.com/?q=Manipal+Hospital+Old+Airport+Road+Bangalore",
    openStart: 0,
    openEnd: 24,
    color: "warning",
    icon: "fa-house-medical",
  },
] as const;

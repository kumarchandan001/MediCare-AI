import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { useEmergency } from "../hooks/useEmergency";
import { SOSButton } from "../components/SOSButton";
import { EmergencyNumbers } from "../components/EmergencyNumbers";
import { ContactCard } from "../components/ContactCard";
import { AddContactModal } from "../components/AddContactModal";
import { NearbyHospitals } from "../components/NearbyHospitals";
import { AlertsList } from "../components/AlertsList";

export default function EmergencyPage() {
  const {
    contactsData, contactsLoading,
    alertsData,
    showAddForm, setShowAddForm,
    addContact, deleteContact,
    isAdding, isDeleting,
    sosActive, triggerSOS,
  } = useEmergency();

  return (
    <ErrorBoundary>
      <div className="animate-page-in">
        {/* Warning banner */}
        <div
          className="flex items-start gap-3 p-4 rounded-2xl mb-6"
          style={{
            background: theme.colors.health.warning.bg,
            border: `1px solid ${theme.colors.health.warning.border}`,
            borderLeft: `4px solid ${theme.colors.health.warning.DEFAULT}`,
          }}
        >
          <i
            className="fas fa-triangle-exclamation flex-shrink-0 mt-0.5"
            style={{ color: theme.colors.health.warning.DEFAULT, fontSize: "1.1rem" }}
          />
          <div>
            <div className="font-bold mb-1" style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.primary }}>
              For Life-Threatening Emergencies
            </div>
            <p style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.muted, lineHeight: 1.5 }}>
              Call 112 immediately. Do not rely solely on this app. MediCare AI is an informational tool — not a substitute for emergency services.
            </p>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* LEFT column */}
          <div className="space-y-6">
            {/* SOS Section */}
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.health.danger.border}` }}
            >
              <div
                className="font-bold uppercase tracking-widest mb-6 flex items-center justify-center gap-2"
                style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.health.danger.DEFAULT }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: theme.colors.health.danger.DEFAULT, animation: "pulse-dot 1.5s infinite" }}
                />
                Emergency SOS
              </div>
              <SOSButton onPress={triggerSOS} isActive={sosActive} />
            </div>

            <EmergencyNumbers />

            {/* Active Health Alerts */}
            {alertsData && alertsData.count > 0 && (
              <AlertsList alerts={alertsData.alerts} count={alertsData.count} />
            )}
          </div>

          {/* RIGHT column */}
          <div className="space-y-6">
            {/* Emergency Contacts */}
            <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.colors.accent.primary }} />
                  <span
                    className="font-bold uppercase tracking-widest"
                    style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
                  >
                    Emergency Contacts
                  </span>
                  {contactsData && (
                    <span style={{
                      fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle,
                      background: theme.colors.surface[4], padding: "2px 8px", borderRadius: "9999px",
                    }}>
                      {contactsData.count}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all active:scale-95"
                  style={{
                    fontSize: theme.typography.sizes.xxs, fontFamily: theme.typography.fonts.primary,
                    background: theme.colors.accent.primary, color: theme.colors.bg.primary,
                    minHeight: "36px", boxShadow: theme.shadows.accent,
                  }}
                >
                  <i className="fas fa-plus" /> Add
                </button>
              </div>

              <div className="p-4">
                {contactsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: theme.colors.surface[3] }} />
                    ))}
                  </div>
                ) : !contactsData || contactsData.count === 0 ? (
                  <div className="text-center py-10" style={{ color: theme.colors.text.subtle }}>
                    <i className="fas fa-user-plus text-3xl mb-3 block" style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: theme.typography.sizes.sm }}>No emergency contacts yet.</p>
                    <p style={{ fontSize: theme.typography.sizes.xs, marginTop: "4px" }}>
                      Add contacts who should be notified in an emergency.
                    </p>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="mt-4 px-5 py-2.5 rounded-xl font-bold transition-all"
                      style={{
                        background: theme.colors.accent.primary, color: theme.colors.bg.primary,
                        fontFamily: theme.typography.fonts.primary, fontSize: theme.typography.sizes.xs,
                        boxShadow: theme.shadows.accent, minHeight: "44px",
                      }}
                    >
                      <i className="fas fa-plus mr-2" /> Add First Contact
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contactsData.contacts.map((contact, i) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        index={i}
                        onDelete={deleteContact}
                        isDeleting={isDeleting}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <NearbyHospitals />
          </div>
        </div>

        <AddContactModal
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          onSubmit={addContact}
          isSaving={isAdding}
        />
      </div>
    </ErrorBoundary>
  );
}

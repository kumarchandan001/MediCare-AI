import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { theme } from "@/config/theme";
import { ROUTES } from "@/config/constants";
import { useAuthStore } from "@/features/auth/store/authStore";
import { authApi } from "@/features/auth/api/authApi";
import { useToast } from "@/shared/hooks/useToast";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, setUser } = useAuthStore();

  const [formData, setFormData] = useState({
    gender: user?.gender || "",
    height: user?.height || "",
    weight: user?.weight || "",
    blood_type: user?.blood_type || "",
    medical_conditions: user?.medical_conditions || "",
    allergies: user?.allergies || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success("Profile setup complete!");
      navigate(ROUTES.DASHBOARD);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || "Failed to save profile. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.gender || !formData.height || !formData.weight || !formData.blood_type) {
      toast.error("Please fill in all required fields.");
      return;
    }

    updateProfileMutation.mutate({
      gender: formData.gender,
      height: parseInt(formData.height.toString()),
      weight: parseInt(formData.weight.toString()),
      blood_type: formData.blood_type,
      medical_conditions: formData.medical_conditions,
      allergies: formData.allergies,
    });
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden"
      style={{ background: theme.colors.bg.primary }}
    >
      {/* Background decoration */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-20 blur-[100px]"
        style={{ background: theme.colors.accent.primary }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full opacity-20 blur-[80px]"
        style={{ background: theme.colors.score.excellent }}
      />

      <motion.div 
        className="w-full max-w-2xl relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div 
          className="rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl border border-white/10"
          style={{ background: theme.colors.surface[1] }}
        >
          <div className="text-center mb-8">
            <h1 
              className="text-3xl sm:text-4xl font-extrabold mb-3"
              style={{ color: theme.colors.text.primary }}
            >
              Complete Your Profile
            </h1>
            <p 
              className="text-lg"
              style={{ color: theme.colors.text.secondary }}
            >
              Welcome to MediCare AI! Let's get to know you better so we can provide accurate health insights.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Gender */}
              <div className="space-y-2">
                <label className="text-sm font-semibold" style={{ color: theme.colors.text.primary }}>
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border appearance-none focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{
                    backgroundColor: theme.colors.bg.secondary,
                    borderColor: theme.colors.border[1],
                    color: theme.colors.text.primary,
                  }}
                >
                  <option value="" disabled>Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Blood Type */}
              <div className="space-y-2">
                <label className="text-sm font-semibold" style={{ color: theme.colors.text.primary }}>
                  Blood Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="blood_type"
                  value={formData.blood_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border appearance-none focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{
                    backgroundColor: theme.colors.bg.secondary,
                    borderColor: theme.colors.border[1],
                    color: theme.colors.text.primary,
                  }}
                >
                  <option value="" disabled>Select blood type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              {/* Height */}
              <Input
                label="Height (cm) *"
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                placeholder="e.g. 175"
                min="50"
                max="300"
                required
              />

              {/* Weight */}
              <Input
                label="Weight (kg) *"
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="e.g. 70"
                min="10"
                max="500"
                required
              />
            </div>

            {/* Medical Conditions */}
            <div className="space-y-2">
              <label className="text-sm font-semibold" style={{ color: theme.colors.text.primary }}>
                Medical Conditions (Optional)
              </label>
              <textarea
                name="medical_conditions"
                value={formData.medical_conditions}
                onChange={handleChange}
                placeholder="e.g. Diabetes, Hypertension..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none"
                style={{
                  backgroundColor: theme.colors.bg.secondary,
                  borderColor: theme.colors.border[1],
                  color: theme.colors.text.primary,
                }}
              />
            </div>

            {/* Allergies */}
            <div className="space-y-2">
              <label className="text-sm font-semibold" style={{ color: theme.colors.text.primary }}>
                Allergies (Optional)
              </label>
              <textarea
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                placeholder="e.g. Peanuts, Penicillin..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none"
                style={{
                  backgroundColor: theme.colors.bg.secondary,
                  borderColor: theme.colors.border[1],
                  color: theme.colors.text.primary,
                }}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-8"
              loading={updateProfileMutation.isPending}
            >
              Finish Setup
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

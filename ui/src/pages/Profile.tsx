import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ProfileUpdateData, getPlayerLevelStatus, updatePlayerLevel } from "@/lib/serverComm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LevelSelector } from "@/components/LevelSelector";
import { ArrowLeft, Save, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Profile() {
  const { user: firebaseUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  // Form state - we'll fetch user data from server
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: firebaseUser?.email || "",
  });

  // Level validation state
  const [levelStatus, setLevelStatus] = useState({
    claimed_level: undefined as string | undefined,
    level_validation_status: "none" as "none" | "pending" | "approved" | "rejected",
    level_validated_at: undefined as string | undefined,
    level_validation_notes: undefined as string | undefined,
  });

  // Fetch user data from server on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const promises = [api.getCurrentUser()];
        
        // Only fetch level status for players (not admins)
        if (!isAdmin) {
          promises.push(getPlayerLevelStatus());
        }
        
        const responses = await Promise.all(promises);
        const userResponse = responses[0];
        
        setFormData({
          first_name: userResponse.user.first_name || "",
          last_name: userResponse.user.last_name || "",
          phone_number: userResponse.user.phone_number || "",
          email: userResponse.user.email || "",
        });

        // Only set level status for players
        if (!isAdmin && responses[1]) {
          const levelResponse = responses[1];
          setLevelStatus({
            claimed_level: levelResponse.claimed_level,
            level_validation_status: levelResponse.level_validation_status,
            level_validated_at: levelResponse.level_validated_at,
            level_validation_notes: levelResponse.level_validation_notes,
          });
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        setError("Failed to load profile data");
      } finally {
        setInitialLoading(false);
      }
    };

    if (firebaseUser) {
      fetchUserData();
    } else {
      setInitialLoading(false);
    }
  }, [firebaseUser, isAdmin]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const updateData: ProfileUpdateData = {
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
        phone_number: formData.phone_number || undefined,
      };

      await api.updateUserProfile(updateData);
      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLevelChange = async (level: string) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await updatePlayerLevel(level);
      setSuccess("Level validation request submitted successfully!");
      
      // Refresh level status
      const levelResponse = await getPlayerLevelStatus();
      setLevelStatus({
        claimed_level: levelResponse.claimed_level,
        level_validation_status: levelResponse.level_validation_status,
        level_validated_at: levelResponse.level_validated_at,
        level_validation_notes: levelResponse.level_validation_notes,
      });
    } catch (err: any) {
      setError(err.message || "Failed to update level");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  // Show loading state while fetching initial data
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="mb-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              Profile Settings
            </h1>
            <p className="text-gray-600 mt-2">Loading your profile...</p>
          </div>
          <Card className="bg-white shadow-sm">
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-gray-600">
                  Loading profile data...
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Update your personal information</p>
        </div>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900">
              Personal Information
            </CardTitle>
            <CardDescription className="text-gray-600">
              Manage your account details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="first_name"
                    className="text-sm font-medium text-gray-700"
                  >
                    First Name
                  </Label>
                  <Input
                    id="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={(e) =>
                      handleInputChange("first_name", e.target.value)
                    }
                    className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-gray-800"
                    placeholder="Enter your first name"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="last_name"
                    className="text-sm font-medium text-gray-700"
                  >
                    Last Name
                  </Label>
                  <Input
                    id="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={(e) =>
                      handleInputChange("last_name", e.target.value)
                    }
                    className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-gray-800"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed"
                  placeholder="Email address"
                />
                <p className="text-xs text-gray-500">
                  Email cannot be changed as it's used for authentication
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="phone_number"
                  className="text-sm font-medium text-gray-700"
                >
                  Phone Number
                </Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) =>
                    handleInputChange("phone_number", e.target.value)
                  }
                  className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Only show level selector for players, not admins */}
              {!isAdmin && (
                <LevelSelector
                  value={levelStatus.claimed_level}
                  onChange={handleLevelChange}
                  disabled={loading}
                  validationStatus={levelStatus.level_validation_status}
                  notes={levelStatus.level_validation_notes}
                  validatedAt={levelStatus.level_validated_at}
                />
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 flex-1 sm:flex-none"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

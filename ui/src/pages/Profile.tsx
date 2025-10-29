import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ProfileUpdateData, getPlayerLevelStatus, updatePlayerLevel, updateProfilePicture, removeProfilePicture } from "@/lib/serverComm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LevelSelector } from "@/components/LevelSelector";
import { UserAvatar } from "@/components/user-avatar";
import { ArrowLeft, Save, X, Upload, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { uploadWidgetConfig } from "@/lib/cloudinary";
import { useTranslation } from "@/hooks/useTranslation";

export function Profile() {
  const { user: firebaseUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('profile');
  const { t: tCommon } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [pictureLoading, setPictureLoading] = useState(false);
  const [pictureError, setPictureError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const uploadWidgetRef = useRef<any>(null);

  // Form state - we'll fetch user data from server
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    dni: "",
    tshirt_size: "",
    email: firebaseUser?.email || "",
    profile_picture_url: "",
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
          dni: userResponse.user.dni || "",
          tshirt_size: userResponse.user.tshirt_size || "",
          email: userResponse.user.email || "",
          profile_picture_url: userResponse.user.profile_picture_url || "",
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
        dni: formData.dni || undefined,
        tshirt_size: formData.tshirt_size || undefined,
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

  const handlePictureChange = async (imageUrl: string) => {
    setPictureLoading(true);
    setPictureError("");
    setSuccess(""); // Clear previous success message
    
    try {
      await updateProfilePicture(imageUrl);
      setFormData((prev) => ({ ...prev, profile_picture_url: imageUrl }));
      setSuccess("Profile picture updated successfully!");
    } catch (err: any) {
      setPictureError(err.message || "Failed to update profile picture");
    } finally {
      setPictureLoading(false);
    }
  };

  const handlePictureRemove = async () => {
    setPictureLoading(true);
    setPictureError("");
    setSuccess(""); // Clear previous success message
    
    try {
      await removeProfilePicture();
      setFormData((prev) => ({ ...prev, profile_picture_url: "" }));
      setSuccess("Profile picture removed successfully!");
    } catch (err: any) {
      setPictureError(err.message || "Failed to remove profile picture");
    } finally {
      setPictureLoading(false);
    }
  };

  const handlePictureError = (error: string) => {
    setPictureError(error);
    setSuccess(""); // Clear success message when error occurs
  };

  const handleConfirmRemove = () => {
    handlePictureRemove();
    setShowRemoveDialog(false);
  };

  const handleCancelRemove = () => {
    setShowRemoveDialog(false);
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
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-2">{t('subtitle')}</p>
        </div>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900">
              {t('personalInformation')}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {t('personalInformationSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Picture Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <UserAvatar
                    user={{
                      photo_url: null,
                      profile_picture_url: formData.profile_picture_url,
                      first_name: formData.first_name,
                      last_name: formData.last_name,
                      email: formData.email,
                    }}
                    size="lg"
                    className="border-2 border-border"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{t('profilePicture')}</h4>
                    <p className="text-sm text-gray-600">
                      {formData.profile_picture_url ? t('hasCustomPicture') : t('noCustomPicture')}
                    </p>
                  </div>
                </div>

                {/* Error Display */}
                {pictureError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-600">{pictureError}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      if (uploadWidgetRef.current) {
                        uploadWidgetRef.current.open();
                        return;
                      }

                      // Create upload widget
                      uploadWidgetRef.current = (window as any).cloudinary.createUploadWidget(
                        uploadWidgetConfig,
                        (error: any, result: any) => {
                          if (error) {
                            console.error('Upload error:', error);
                            setIsUploading(false);
                            
                            // Provide user-friendly error messages
                            let errorMessage = 'Upload failed. Please try again.';
                            
                            if (error.status === 'Unknown API key') {
                              errorMessage = 'Upload service is not configured. Please contact support.';
                            } else if (error.status === 401) {
                              errorMessage = 'Upload failed due to authentication error. Please try again.';
                            } else if (error.status === 413) {
                              errorMessage = 'File is too large. Please choose a smaller image.';
                            } else if (error.message) {
                              errorMessage = error.message;
                            } else if (error.statusText) {
                              errorMessage = error.statusText;
                            }
                            
                            handlePictureError(errorMessage);
                            return;
                          }

                          if (result && result.event === 'success') {
                            const imageUrl = result.info.secure_url;
                            handlePictureChange(imageUrl);
                            setIsUploading(false);
                          } else if (result && result.event === 'close') {
                            // User closed the widget without uploading
                            setIsUploading(false);
                          }
                        }
                      );

                      uploadWidgetRef.current.open();
                      setIsUploading(true);
                    }}
                    disabled={pictureLoading || isUploading}
                    className="flex-1"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {formData.profile_picture_url ? t('changePicture') : t('uploadPicture')}
                      </>
                    )}
                  </Button>
                  
                  {formData.profile_picture_url && (
                    <Button
                      type="button"
                      onClick={() => setShowRemoveDialog(true)}
                      disabled={pictureLoading || isUploading}
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t('removePicture')}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="first_name"
                    className="text-sm font-medium text-gray-700"
                  >
                    {t('firstName')}
                  </Label>
                  <Input
                    id="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={(e) =>
                      handleInputChange("first_name", e.target.value)
                    }
                    className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-gray-800"
                    placeholder={t('firstNamePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="last_name"
                    className="text-sm font-medium text-gray-700"
                  >
                    {t('lastName')}
                  </Label>
                  <Input
                    id="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={(e) =>
                      handleInputChange("last_name", e.target.value)
                    }
                    className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-gray-800"
                    placeholder={t('lastNamePlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  {t('emailAddress')}
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
                  {t('phoneNumber')}
                </Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) =>
                    handleInputChange("phone_number", e.target.value)
                  }
                  className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-gray-800"
                  placeholder={t('phoneNumberPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="dni"
                  className="text-sm font-medium text-gray-700"
                >
                  {t('dni')}
                </Label>
                <Input
                  id="dni"
                  type="text"
                  value={formData.dni}
                  onChange={(e) =>
                    handleInputChange("dni", e.target.value)
                  }
                  className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-gray-800"
                  placeholder={t('dniPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="tshirt_size"
                  className="text-sm font-medium text-gray-700"
                >
                  {t('tshirtSize')}
                </Label>
                <Select
                  value={formData.tshirt_size || undefined}
                  onValueChange={(value) => handleInputChange("tshirt_size", value)}
                >
                  <SelectTrigger className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-gray-800 w-full">
                    <SelectValue placeholder={t('tshirtSizePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S">S</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                  </SelectContent>
                </Select>
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
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t('saveChanges')}
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

        {/* Remove Confirmation Dialog */}
        <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('removePictureConfirm')}</DialogTitle>
              <DialogDescription>
                {t('removePictureConfirmMessage')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCancelRemove}
                disabled={pictureLoading}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmRemove}
                disabled={pictureLoading}
              >
                {pictureLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('removing')}
                  </>
                ) : (
                  t('removePicture')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

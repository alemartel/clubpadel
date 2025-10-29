import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, type NewTeam } from "@/lib/serverComm";
import { useTranslation } from "@/hooks/useTranslation";

export function CreateTeam() {
  const { serverUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('teams');
  const { t: tCommon } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [teamName, setTeamName] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("");

  // Map display gender values to backend values
  const genderMap: Record<string, string> = {
    "Masculine": "male",
    "Femenine": "female",
    "Mixed": "mixed"
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamName.trim() || !selectedLevel || !selectedGender) {
      setError(t('pleaseFillAllFields'));
      return;
    }

    // Validate creator's gender matches team gender requirement (if creator has gender set)
    if (serverUser?.gender) {
      const backendGender = genderMap[selectedGender];
      if (backendGender === "male" && serverUser.gender !== "male") {
        setError(t('genderMismatch'));
        return;
      }
      if (backendGender === "female" && serverUser.gender !== "female") {
        setError(t('genderMismatch'));
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const teamData: NewTeam = {
        name: teamName.trim(),
        level: selectedLevel,
        gender: genderMap[selectedGender],
      };

      const response = await api.createTeam(teamData);
      
      if (response.error) {
        setError(response.error);
      } else {
        // Redirect to team detail page
        navigate(`/teams/${response.team.id}`);
      }
    } catch (err) {
      setError(t('failedToCreateTeam'));
      console.error("Error creating team:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/teams")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">{t('backToTeams')}</span>
          <span className="sm:hidden">{tCommon('back')}</span>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('createTeam')}</h1>
          <p className="text-muted-foreground">
            {t('createNewTeam')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
{t('teamInformation')}
          </CardTitle>
          <CardDescription>
{t('createNewTeam')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-md">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="teamName">{t('teamName')}</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder={t('teamNamePlaceholder')}
                required
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
{t('teamNameUnique')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">{t('selectLevel')}</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectLevel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">{t('selectGender')}</Label>
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectGender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculine">{t('masculine')}</SelectItem>
                  <SelectItem value="Femenine">{t('femenine')}</SelectItem>
                  <SelectItem value="Mixed">{t('mixed')}</SelectItem>
                </SelectContent>
              </Select>
              {serverUser?.gender && selectedGender && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  {(() => {
                    const backendGender = genderMap[selectedGender];
                    if (backendGender === "male" && serverUser.gender !== "male") {
                      return t('genderMismatch');
                    }
                    if (backendGender === "female" && serverUser.gender !== "female") {
                      return t('genderMismatch');
                    }
                    return null;
                  })()}
                </p>
              )}
            </div>


            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading || !teamName.trim() || !selectedLevel || !selectedGender}
                className="flex-1"
              >
{loading ? t('creatingTeam') : t('createTeam')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/teams")}
                disabled={loading}
              >
{tCommon('cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getLevelValidationRequests,
  approveLevelValidation,
  rejectLevelValidation,
  LevelValidationRequest,
} from "@/lib/serverComm";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Search, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AdminLevelValidation() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  // State for validation requests
  const [requests, setRequests] = useState<LevelValidationRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<LevelValidationRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<LevelValidationRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/", { state: { error: "Admin access required" } });
    }
  }, [isAdmin, loading, navigate]);

  // Load validation requests on mount
  useEffect(() => {
    if (isAdmin) {
      loadValidationRequests();
    }
  }, [isAdmin]);

  // Filter requests based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredRequests(requests);
    } else {
      const filtered = requests.filter(
        (request) =>
          request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (request.first_name && request.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (request.last_name && request.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredRequests(filtered);
    }
  }, [requests, searchTerm]);

  const loadValidationRequests = async () => {
    setLoadingRequests(true);
    setError("");

    try {
      const response = await getLevelValidationRequests();
      setRequests(response.requests);
    } catch (err: any) {
      setError(err.message || "Failed to load validation requests");
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      await approveLevelValidation(selectedRequest.id, notes || undefined);
      setShowApproveModal(false);
      setSelectedRequest(null);
      setNotes("");
      await loadValidationRequests();
    } catch (err: any) {
      setError(err.message || "Failed to approve validation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !notes.trim()) return;

    setActionLoading(true);
    try {
      await rejectLevelValidation(selectedRequest.id, notes);
      setShowRejectModal(false);
      setSelectedRequest(null);
      setNotes("");
      await loadValidationRequests();
    } catch (err: any) {
      setError(err.message || "Failed to reject validation");
    } finally {
      setActionLoading(false);
    }
  };

  const openApproveModal = (request: LevelValidationRequest) => {
    setSelectedRequest(request);
    setNotes("");
    setShowApproveModal(true);
  };

  const openRejectModal = (request: LevelValidationRequest) => {
    setSelectedRequest(request);
    setNotes("");
    setShowRejectModal(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Level Validation</h1>
          <p className="text-muted-foreground">Review and approve player level requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {filteredRequests.length} pending request{filteredRequests.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Level Validation Requests</CardTitle>
          <CardDescription>
            Review player level change requests and approve or reject them
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-muted-foreground">Loading requests...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {searchTerm ? "No matching requests found" : "No pending requests"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm 
                  ? "Try adjusting your search terms"
                  : "All level validation requests have been processed"
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Claimed Level</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {request.first_name && request.last_name
                            ? `${request.first_name} ${request.last_name}`
                            : "Unknown Player"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{request.email}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Level {request.claimed_level}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(request.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openApproveModal(request)}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRejectModal(request)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Level Validation</DialogTitle>
            <DialogDescription>
              Approve the level change request for {selectedRequest?.first_name} {selectedRequest?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Request Details</h4>
              <p><strong>Player:</strong> {selectedRequest?.first_name} {selectedRequest?.last_name}</p>
              <p><strong>Email:</strong> {selectedRequest?.email}</p>
              <p><strong>Claimed Level:</strong> Level {selectedRequest?.claimed_level}</p>
            </div>
            <div>
              <Label htmlFor="approve-notes">Optional Notes</Label>
              <Textarea
                id="approve-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? "Approving..." : "Approve Level"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Level Validation</DialogTitle>
            <DialogDescription>
              Reject the level change request for {selectedRequest?.first_name} {selectedRequest?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Request Details</h4>
              <p><strong>Player:</strong> {selectedRequest?.first_name} {selectedRequest?.last_name}</p>
              <p><strong>Email:</strong> {selectedRequest?.email}</p>
              <p><strong>Claimed Level:</strong> Level {selectedRequest?.claimed_level}</p>
            </div>
            <div>
              <Label htmlFor="reject-notes">Rejection Reason *</Label>
              <Textarea
                id="reject-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Please provide a reason for rejecting this level request..."
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                This reason will be shown to the player
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={actionLoading || !notes.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? "Rejecting..." : "Reject Level"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

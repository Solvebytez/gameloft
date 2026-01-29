'use client';

import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import DataTable, { Column } from '@/app/components/ui/DataTable';
import ImageCropModal from '@/app/components/ui/ImageCropModal';
import ConfirmModal from '@/app/components/ui/ConfirmModal';
import { useTeams, useCreateTeam, useUpdateTeam, useDeleteTeam, useUpdateTeamStatus, Team } from '@/app/hooks/useTeams';

export default function CreateTeamPage() {
  const [formData, setFormData] = useState({
    teamName: '',
    teamLogo: null as File | null,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('No file chosen');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageForCrop, setImageForCrop] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [teamToUpdateStatus, setTeamToUpdateStatus] = useState<Team | null>(null);
  const [newStatus, setNewStatus] = useState<'active' | 'inactive' | null>(null);

  // Fetch teams from API
  const { data: teams = [], isLoading, error } = useTeams();
  const createTeamMutation = useCreateTeam();
  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();
  const updateStatusMutation = useUpdateTeamStatus();

  // Placeholder image URL - always use this for table display
  const placeholderLogo = 'https://placehold.co/40x40/e8dcc8/2d2d2d?text=Team';

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      if (imageForCrop) {
        URL.revokeObjectURL(imageForCrop);
      }
    };
  }, [imagePreview, imageForCrop]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Check if file is an image type (jpeg, jpg, png)
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const fileType = file.type.toLowerCase();
      
      if (validImageTypes.includes(fileType)) {
        // Clean up previous preview URL
        if (imagePreview) {
          URL.revokeObjectURL(imagePreview);
        }
        if (imageForCrop) {
          URL.revokeObjectURL(imageForCrop);
        }
        
        // Store original file and show crop modal
        setOriginalFile(file);
        const previewUrl = URL.createObjectURL(file);
        setImageForCrop(previewUrl);
        setShowCropModal(true);
        
        // Clear error
        if (errors.teamLogo) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.teamLogo;
            return newErrors;
          });
        }
      } else {
        toast.error('Please upload a JPEG, JPG, or PNG image', { duration: 3000 });
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } else {
      // Clean up preview URL
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      if (imageForCrop) {
        URL.revokeObjectURL(imageForCrop);
      }
      setFormData((prev) => ({ ...prev, teamLogo: null }));
      setFileName('No file chosen');
      setImagePreview(null);
      setImageForCrop(null);
      setOriginalFile(null);
    }
  };

  const handleCropComplete = (croppedImageFile: File) => {
    // Clean up previous preview URL
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    
    // Set the cropped image
    setFormData((prev) => ({ ...prev, teamLogo: croppedImageFile }));
    setFileName(croppedImageFile.name);
    
    // Create preview URL for cropped image
    const previewUrl = URL.createObjectURL(croppedImageFile);
    setImagePreview(previewUrl);
    
    // Clean up crop modal image
    if (imageForCrop) {
      URL.revokeObjectURL(imageForCrop);
    }
    setImageForCrop(null);
    setOriginalFile(null);
    
    toast.success('Image cropped successfully!', { duration: 2000 });
  };

  const handleCropCancel = () => {
    // Clean up crop modal image
    if (imageForCrop) {
      URL.revokeObjectURL(imageForCrop);
    }
    setImageForCrop(null);
    setOriginalFile(null);
    setShowCropModal(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleSave();
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};

    // Validation - name is always required
    if (!formData.teamName.trim()) {
      newErrors.teamName = 'Team Name is required';
    }
    // Logo is required only when creating, optional when editing
    if (!isEditMode && !formData.teamLogo) {
      newErrors.teamLogo = 'Team Logo is required';
    }

    // Set errors and show toast if validation fails
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError, { duration: 3000 });
      return;
    }

    // Clear all errors
    setErrors({});

    try {
      if (isEditMode && editingTeam) {
        // Update existing team
        const updatePayload: { name?: string; logo?: File } = {};
        if (formData.teamName.trim() !== editingTeam.name) {
          updatePayload.name = formData.teamName.trim();
        }
        // Check if a new logo file was selected (not just the preview URL)
        // In edit mode, formData.teamLogo will be a File object if user selected a new image
        // If it's null, user wants to keep the existing logo
        if (formData.teamLogo && formData.teamLogo instanceof File) {
          updatePayload.logo = formData.teamLogo;
        }
        
        // Only call update if there are changes
        if (updatePayload.name || updatePayload.logo) {
          await updateTeamMutation.mutateAsync({
            id: editingTeam.id,
            payload: updatePayload,
          });
        } else {
          toast('No changes to save', { duration: 2000 });
        }
      } else {
        // Create new team
        await createTeamMutation.mutateAsync({
          name: formData.teamName.trim(),
          logo: formData.teamLogo!,
        });
      }

      // Reset form after successful save
      handleCancelEdit();
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error('Error saving team:', error);
    }
  };

  const handleCancelEdit = () => {
    // Clean up preview URL
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setFormData({
      teamName: '',
      teamLogo: null,
    });
    setFileName('No file chosen');
    setImagePreview(null);
    setIsEditMode(false);
    setEditingTeam(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Transform teams data for DataTable display
  const transformedTeams = teams.map((team) => ({
    ...team,
    statusDisplay: team.status === 'active' ? 'Active' : 'Inactive',
  }));

  // DataTable columns configuration
  const columns: Column<typeof transformedTeams[0]>[] = [
    {
      key: 'id',
      label: 'id',
      sortable: true,
    },
    {
      key: 'name',
      label: 'name',
      sortable: true,
      render: (value) => {
        // Randomly assign blue or purple color (you can customize this logic)
        const isPurple = value.toLowerCase().includes('bash');
        return (
          <span className={isPurple ? 'text-purple-600' : 'text-blue-600'} style={{ cursor: 'pointer' }}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'logo',
      label: 'Logo',
      sortable: false,
      render: (value, row) => {
        // Use actual logo URL from API response, fallback to placeholder
        const logoUrl = row.logo || row.logo_image?.url || placeholderLogo;
        return (
          <img
            src={logoUrl}
            alt="Team logo"
            className="w-12 h-8 object-contain border border-retro-dark rounded"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              const target = e.target as HTMLImageElement;
              target.src = placeholderLogo;
            }}
          />
        );
      },
    },
    {
      key: 'statusDisplay',
      label: 'Status',
      sortable: true,
      render: (value, row) => (
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
          row.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      ),
    },
  ];

  const handleEditTeam = (team: Team) => {
    // Set edit mode and populate form with team data
    setIsEditMode(true);
    setEditingTeam(team);
    setFormData({
      teamName: team.name,
      teamLogo: null, // Don't pre-fill file, user can choose to update or keep existing
    });
    setFileName('Keep existing logo');
    
    // Set preview to existing logo if available
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    const logoUrl = team.logo || team.logo_image?.url || placeholderLogo;
    setImagePreview(logoUrl);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTeam = (team: Team) => {
    setTeamToDelete(team);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (teamToDelete) {
      try {
        await deleteTeamMutation.mutateAsync(teamToDelete.id);
        // Success message is handled by the mutation's onSuccess callback
        setShowDeleteModal(false);
        setTeamToDelete(null);
      } catch (error) {
        // Error is already handled by the mutation's onError callback
        console.error('Error deleting team:', error);
      }
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setTeamToDelete(null);
  };

  const handleStatusChange = (team: Team) => {
    // Get current status or default to 'active'
    const currentStatus = team.status || 'active';
    const status = currentStatus === 'active' ? 'inactive' : 'active';
    setTeamToUpdateStatus(team);
    setNewStatus(status);
    setShowStatusModal(true);
  };

  const confirmStatusChange = () => {
    if (teamToUpdateStatus && newStatus) {
      updateStatusMutation.mutate({
        teamId: teamToUpdateStatus.id,
        status: newStatus,
      });
      setShowStatusModal(false);
      setTeamToUpdateStatus(null);
      setNewStatus(null);
    }
  };

  const cancelStatusChange = () => {
    setShowStatusModal(false);
    setTeamToUpdateStatus(null);
    setNewStatus(null);
  };

  const handleRowSelect = (selectedRows: Team[]) => {
    console.log('Selected rows:', selectedRows);
    // Handle row selection logic here
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          {isEditMode ? 'EDIT TEAM' : 'CREATE TEAM'}
        </h1>
        {isEditMode && editingTeam && (
          <p className="text-sm text-[var(--retro-dark)]/60 mt-1">
            Editing: {editingTeam.name}
          </p>
        )}
      </div>
      <Card>
        <form className="space-y-6" onSubmit={handleFormSubmit}>
          {/* Single Row - Team Name, Team Logo, Save Button */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Team Name Field */}
            <div className="md:col-span-4">
              <Input
                type="text"
                label="Team Name*"
                id="team-name"
                value={formData.teamName}
                onChange={(e) => handleInputChange('teamName', e.target.value)}
                error={errors.teamName}
              />
            </div>

            {/* Team Logo Field */}
            <div className="md:col-span-5">
              <label htmlFor="team-logo" className="block text-sm font-semibold text-[#2d2d2d] mb-2 uppercase">
                Team Logo{isEditMode ? ' (optional)' : '*'}
              </label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="team-logo"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Team logo preview"
                    className="w-16 h-16 object-cover border-[3px] border-retro-dark rounded"
                  />
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-4 py-3 border-[3px] ${
                    errors.teamLogo ? 'border-red-500' : 'border-retro-dark'
                  } bg-white text-retro-dark font-bold text-lg rounded focus:outline-none focus:ring-2 focus:ring-retro-accent hover:opacity-90 transition-opacity whitespace-nowrap h-[60px]`}
                >
                  Choose file
                </button>
                <span className="text-retro-dark font-bold text-lg flex-1 min-w-0 truncate">{fileName}</span>
              </div>
              {errors.teamLogo && <p className="mt-1 text-sm text-red-500">{errors.teamLogo}</p>}
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-3 flex items-end gap-4">
              <button
                type="submit"
                disabled={createTeamMutation.isPending || updateTeamMutation.isPending}
                className="px-6 py-3 bg-retro-accent text-white font-bold text-lg rounded hover:opacity-90 transition-opacity w-full md:w-auto h-[60px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createTeamMutation.isPending || updateTeamMutation.isPending
                  ? 'Saving...'
                  : isEditMode
                  ? 'Update'
                  : 'Save'}
              </button>
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-3 bg-gray-500 text-white font-bold text-lg rounded hover:opacity-90 transition-opacity h-[60px]"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
      </Card>

      {/* DataTable below the form */}
      <Card>
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-[var(--retro-dark)]/60">Loading teams...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Error loading teams: {error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
          ) : (
            <DataTable
              title="TEAM SUMMARY"
              data={transformedTeams}
              columns={columns}
              onEdit={handleEditTeam}
              onDelete={handleDeleteTeam}
              onStatusChange={handleStatusChange}
              onRowSelect={handleRowSelect}
              entriesPerPageOptions={[10, 25, 50, 100]}
              defaultEntriesPerPage={100}
            />
          )}
        </div>
      </Card>

      {/* Image Crop Modal */}
      {imageForCrop && (
        <ImageCropModal
          isOpen={showCropModal}
          imageSrc={imageForCrop}
          onClose={handleCropCancel}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
          cropSize={{ width: 512, height: 512 }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Team"
        message={teamToDelete ? `Are you sure you want to delete team "${teamToDelete.name}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="red"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* Status Change Confirmation Modal */}
      <ConfirmModal
        isOpen={showStatusModal}
        title="Change Team Status"
        message={teamToUpdateStatus && newStatus ? `Change status of "${teamToUpdateStatus.name}" to ${newStatus === 'active' ? 'Active' : 'Inactive'}?` : ''}
        confirmText="Change Status"
        cancelText="Cancel"
        confirmButtonColor="blue"
        onConfirm={confirmStatusChange}
        onCancel={cancelStatusChange}
      />
    </div>
  );
}


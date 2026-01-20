'use client';

import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import DataTable, { Column } from '@/app/components/ui/DataTable';

interface Team {
  id: number;
  name: string;
  logo: string; // URL or base64 string
}

export default function CreateTeamPage() {
  const [formData, setFormData] = useState({
    teamName: '',
    teamLogo: null as File | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('No file chosen');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Placeholder image URL - always use this for table display
  const placeholderLogo = 'https://placehold.co/40x40/e8dcc8/2d2d2d?text=Team';

  // Sample data - In future, this will come from React TanStack Query
  const [teams, setTeams] = useState<Team[]>([
    {
      id: 1,
      name: 'India',
      logo: placeholderLogo,
    },
    {
      id: 2,
      name: 'Australia',
      logo: placeholderLogo,
    },
    {
      id: 3,
      name: 'big bash',
      logo: placeholderLogo,
    },
    {
      id: 4,
      name: 'syndy thunder',
      logo: placeholderLogo,
    },
  ]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

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
      // Clean up previous preview URL
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      
      setFormData((prev) => ({ ...prev, teamLogo: file }));
      setFileName(file.name);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      // Clear error
      if (errors.teamLogo) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.teamLogo;
          return newErrors;
        });
      }
    } else {
      // Clean up preview URL
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setFormData((prev) => ({ ...prev, teamLogo: null }));
      setFileName('No file chosen');
      setImagePreview(null);
    }
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};

    // Validation - both fields are mandatory
    if (!formData.teamName.trim()) {
      newErrors.teamName = 'Team Name is required';
    }
    if (!formData.teamLogo) {
      newErrors.teamLogo = 'Team Logo is required';
    }

    // Set errors and show toast if validation fails
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError, { duration: 3000 });
      return;
    }

    // Clear all errors on success
    setErrors({});
    toast.success('Team created successfully!', { duration: 3000 });

    // Add new team to the table
    // Convert file to data URL for preview in table
    let logoUrl = '';
    if (formData.teamLogo) {
      logoUrl = URL.createObjectURL(formData.teamLogo);
    }

    const newTeam: Team = {
      id: Date.now(), // Temporary ID generation
      name: formData.teamName,
      logo: logoUrl || placeholderLogo,
    };
    setTeams((prev) => [newTeam, ...prev]);

    // Reset form after successful save
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Handle save logic here (in future, will use TanStack Query mutation)
    console.log('Team data:', formData);
  };

  // DataTable columns configuration
  const columns: Column<Team>[] = [
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
      sortable: true,
      render: (value) => {
        // Always use placeholder for now - in future, value will be actual logo URL
        const placeholderImg = 'https://placehold.co/40x40/e8dcc8/2d2d2d?text=Team';
        // For now, always use placeholder. Later when real logos are available, use: value || placeholderImg
        return (
          <img
            src={placeholderImg}
            alt="Team logo"
            className="w-12 h-8 object-contain border border-retro-dark rounded"
            onError={(e) => {
              // Fallback to a simple data URI if placehold.co fails
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml,%3Csvg width="40" height="40" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="40" height="40" fill="%23e8dcc8"/%3E%3Ctext x="20" y="25" font-family="Arial" font-size="10" fill="%232d2d2d" font-weight="bold" text-anchor="middle"%3ETeam%3C/text%3E%3C/svg%3E';
            }}
          />
        );
      },
    },
  ];

  const handleEditTeam = (team: Team) => {
    toast.success(`Editing team: ${team.name}`, { duration: 2000 });
    // Handle edit logic here - in future will navigate to edit page or open modal
    console.log('Edit team:', team);
  };

  const handleDeleteTeam = (team: Team) => {
    if (confirm(`Are you sure you want to delete team ${team.name}?`)) {
      // Clean up object URL if it's a blob URL
      if (team.logo.startsWith('blob:')) {
        URL.revokeObjectURL(team.logo);
      }
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      toast.success(`Team ${team.name} deleted successfully`, { duration: 2000 });
    }
  };

  const handleRowSelect = (selectedRows: Team[]) => {
    console.log('Selected rows:', selectedRows);
    // Handle row selection logic here
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">CREATE TEAM</h1>
      </div>
      <Card>
        <form className="space-y-6">
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
                Team Logo*
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

            {/* Save Button */}
            <div className="md:col-span-3 flex items-end">
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-3 bg-retro-accent text-white font-bold text-lg rounded hover:opacity-90 transition-opacity w-full md:w-auto h-[60px]"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </Card>

      {/* DataTable below the form */}
      <Card>
        <div className="p-4">
          <DataTable
            title="TEAM SUMMARY"
            data={teams}
            columns={columns}
            onEdit={handleEditTeam}
            onDelete={handleDeleteTeam}
            onRowSelect={handleRowSelect}
            entriesPerPageOptions={[10, 25, 50, 100]}
            defaultEntriesPerPage={100}
          />
        </div>
      </Card>
    </div>
  );
}


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import ProfilePage from '../app/profile/page';
import { UserPreferencesService } from '../lib/services/user-preferences-service';

// Mock dependencies
vi.mock('../lib/supabase-browser', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            email: 'test@example.com',
            user_metadata: { name: 'Test User' }
          }
        }
      }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({})
    }
  })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock('../components/PageContainer', () => ({
  default: ({ children, title }: any) => (
    <div data-testid="page-container">
      <h1>{title}</h1>
      {children}
    </div>
  )
}));

vi.mock('../components/LocationSelector', () => ({
  LocationSelector: ({ onLocationSelect, currentLocation }: any) => (
    <div data-testid="location-selector">
      <button
        onClick={() => onLocationSelect({
          city: 'London',
          country: 'UK',
          latitude: 51.5074,
          longitude: -0.1278,
          timezone: 'Europe/London'
        })}
      >
        {currentLocation ? `${currentLocation.city}, ${currentLocation.country}` : 'Set Location'}
      </button>
    </div>
  )
}));

// Mock UserPreferencesService
const mockPreferencesService = {
  getPreferences: vi.fn(),
  updatePreferences: vi.fn()
};

vi.mock('../lib/services/user-preferences-service', () => ({
  UserPreferencesService: vi.fn(() => mockPreferencesService)
}));

// Test messages
const messages = {
  profile: {
    title: 'Profile',
    subtitle: 'Manage your spiritual journey preferences',
    spiritualSeeker: 'Spiritual Seeker',
    memberSince: 'Member since',
    daysActive: 'Days Active',
    habits: 'Habits',
    basicInformation: 'Basic Information',
    personalDetails: 'Your personal details',
    displayName: 'Display Name',
    displayNamePlaceholder: 'Enter your display name',
    emailAddress: 'Email Address',
    emailNote: 'Email cannot be changed',
    timezone: 'Timezone',
    autoDetected: 'Auto-detected',
    language: 'Language',
    prayerCalculationMethod: 'Prayer Calculation Method',
    location: 'Location',
    locationNote: 'Used for accurate prayer times',
    notifications: 'Notifications',
    spiritualReminders: 'Configure your spiritual reminders',
    fajrReminder: 'Fajr Reminder',
    fajrDescription: 'Get reminded for Fajr prayer',
    dailyReminder: 'Daily Reminder',
    dailyDescription: 'Daily spiritual content',
    habitStreak: 'Habit Streak',
    habitDescription: 'Celebrate your progress',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    signOut: 'Sign Out',
    accountDeletion: 'Account Deletion',
    deletionWarning: 'This action cannot be undone',
    requestDeletion: 'Request Deletion',
    profileSaved: 'Profile saved successfully',
    saveFailed: 'Failed to save profile',
    nameRequired: 'Name is required',
    error: 'Error',
    success: 'Success',
    timezones: {
      eastern: 'Eastern Time',
      central: 'Central Time',
      mountain: 'Mountain Time',
      pacific: 'Pacific Time',
      london: 'London Time',
      dubai: 'Dubai Time',
      riyadh: 'Riyadh Time',
      karachi: 'Karachi Time'
    }
  }
};

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPreferencesService.getPreferences.mockResolvedValue({
      success: true,
      data: {
        language: 'en',
        location: null,
        prayerCalculationMethod: 'ISNA',
        notificationSettings: {
          fajrReminder: true,
          dailyReminder: true,
          habitStreak: false
        },
        privacySettings: {
          dataSharing: false,
          analytics: false
        },
        displaySettings: {
          theme: 'light',
          fontSize: 'medium',
          showArabicWithTranslation: true
        }
      }
    });
    mockPreferencesService.updatePreferences.mockResolvedValue({
      success: true,
      data: {}
    });
  });

  const renderWithIntl = (component: React.ReactElement) => {
    return render(
      <NextIntlClientProvider locale="en" messages={messages}>
        {component}
      </NextIntlClientProvider>
    );
  };

  it('renders the profile page with basic information', async () => {
    renderWithIntl(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('displays user email and name from Supabase auth', async () => {
    renderWithIntl(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    });
  });

  it('loads and displays user preferences', async () => {
    renderWithIntl(<ProfilePage />);

    await waitFor(() => {
      expect(mockPreferencesService.getPreferences).toHaveBeenCalled();

      // Check language selection
      const languageSelect = screen.getByDisplayValue('🇺🇸 English');
      expect(languageSelect).toBeInTheDocument();

      // Check prayer calculation method
      const prayerMethodSelect = screen.getByDisplayValue('🇺🇸 ISNA (Islamic Society of North America)');
      expect(prayerMethodSelect).toBeInTheDocument();
    });
  });

  it('updates profile when form is submitted', async () => {
    renderWithIntl(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    // Change display name
    const nameInput = screen.getByDisplayValue('Test User');
    fireEvent.change(nameInput, { target: { value: 'Updated User' } });

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPreferencesService.updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'en',
          prayerCalculationMethod: 'ISNA'
        })
      );
    });
  });

  it('shows validation error when name is empty', async () => {
    renderWithIntl(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    });

    // Clear the name input
    const nameInput = screen.getByDisplayValue('Test User');
    fireEvent.change(nameInput, { target: { value: '' } });

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  it('handles location selection correctly', async () => {
    renderWithIntl(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByTestId('location-selector')).toBeInTheDocument();
    });

    // Select a location
    const locationButton = screen.getByText('Set Location');
    fireEvent.click(locationButton);

    await waitFor(() => {
      expect(screen.getByText('London, UK')).toBeInTheDocument();
    });
  });

  it('toggles notification preferences', async () => {
    renderWithIntl(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Fajr Reminder')).toBeInTheDocument();
    });

    // Find all checkboxes
    const checkboxes = screen.getAllByRole('checkbox');

    // Toggle habit streak notification (should be off by default)
    const habitStreakCheckbox = checkboxes.find(checkbox =>
      checkbox.closest('div')?.textContent?.includes('Habit Streak')
    );

    if (habitStreakCheckbox) {
      fireEvent.click(habitStreakCheckbox);
    }

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPreferencesService.updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationSettings: expect.objectContaining({
            habitStreak: true
          })
        })
      );
    });
  });

  it('changes language preference', async () => {
    renderWithIntl(<ProfilePage />);

    await waitFor(() => {
      const languageSelect = screen.getByDisplayValue('🇺🇸 English');
      expect(languageSelect).toBeInTheDocument();
    });

    // Change language to Arabic
    const languageSelect = screen.getByDisplayValue('🇺🇸 English');
    fireEvent.change(languageSelect, { target: { value: 'ar' } });

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPreferencesService.updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'ar'
        })
      );
    });
  });

  it('changes prayer calculation method', async () => {
    renderWithIntl(<ProfilePage />);

    await waitFor(() => {
      const prayerMethodSelect = screen.getByDisplayValue('🇺🇸 ISNA (Islamic Society of North America)');
      expect(prayerMethodSelect).toBeInTheDocument();
    });

    // Change to Muslim World League
    const prayerMethodSelect = screen.getByDisplayValue('🇺🇸 ISNA (Islamic Society of North America)');
    fireEvent.change(prayerMethodSelect, { target: { value: 'MWL' } });

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPreferencesService.updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          prayerCalculationMethod: 'MWL'
        })
      );
    });
  });

  it('shows success message after successful save', async () => {
    renderWithIntl(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Profile saved successfully')).toBeInTheDocument();
    });
  });

  it('shows error message when save fails', async () => {
    mockPreferencesService.updatePreferences.mockResolvedValue({
      success: false,
      error: { message: 'Network error' }
    });

    renderWithIntl(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('dismisses error and success messages', async () => {
    renderWithIntl(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    // Submit form to trigger success message
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Profile saved successfully')).toBeInTheDocument();
    });

    // Dismiss success message
    const dismissButton = screen.getByText('×');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Profile saved successfully')).not.toBeInTheDocument();
    });
  });

  it('disables save button while loading', async () => {
    renderWithIntl(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Changes');

    // Click to start saving
    fireEvent.click(saveButton);

    // Button should be disabled during save
    expect(saveButton).toBeDisabled();
  });
});
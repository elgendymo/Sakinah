import React, { useState } from 'react';
import { useEnhancedGet, useEnhancedPost, useOfflineQueue } from '../hooks/useEnhancedApi';
import { ErrorDisplay } from '../../components/ErrorDisplay';

/**
 * Example component demonstrating comprehensive error handling and recovery
 *
 * This component showcases:
 * - Automatic retry with exponential backoff
 * - Token refresh for authentication errors
 * - Offline request queueing
 * - Error recovery strategies
 * - Loading and error state management
 * - Manual retry capabilities
 * - Offline queue monitoring
 */
export const ErrorHandlingExample: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<string>('1');

  // Example 1: GET request with automatic error handling
  const {
    state: usersState,
    execute: fetchUsers,
    retry: retryUsers,
    isRetryable: usersRetryable
  } = useEnhancedGet('/api/users', {
    immediate: true,
    context: {
      component: 'ErrorHandlingExample'
    },
    onSuccess: (users) => {
      console.log('Users loaded successfully:', users.length);
    },
    onError: (error) => {
      console.error('Failed to load users:', error.message);
    },
    onRetry: (retryCount) => {
      console.log(`Retrying users fetch (attempt ${retryCount})`);
    }
  });

  // Example 2: GET request for specific user with error handling
  const {
    state: userState,
    execute: fetchUser,
    retry: retryUser,
    cancel: cancelUser,
    isRetryable: userRetryable
  } = useEnhancedGet(`/api/users/${selectedUserId}`, {
    context: {
      component: 'ErrorHandlingExample',
      metadata: { userId: selectedUserId }
    },
    enableAutoRecovery: true,
    showGlobalErrors: false // Handle errors locally
  });

  // Example 3: POST request with error handling
  const {
    state: createUserState,
    post: createUser,
    retry: retryCreateUser,
    reset: resetCreateUser,
    isRetryable: createUserRetryable
  } = useEnhancedPost('/api/users', {
    context: {
      component: 'ErrorHandlingExample'
    },
    onSuccess: (newUser) => {
      console.log('User created successfully:', newUser);
      fetchUsers(); // Refresh users list
    },
    onError: (error) => {
      console.error('Failed to create user:', error.message);
    }
  });

  // Example 4: Offline queue monitoring
  const { queueStatus, clearQueue, isOnline } = useOfflineQueue();

  // Example form data
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: ''
  });

  // Handle form submission
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserForm.name || !newUserForm.email) {
      return;
    }

    try {
      await createUser(newUserForm);
      setNewUserForm({ name: '', email: '' });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    fetchUser();
  };

  // Initialize hooks for simulation at component level
  const { execute: executeAuthError } = useEnhancedGet('/api/protected/admin-only', { immediate: false });
  const { execute: executeServerError } = useEnhancedGet('/api/force-error', { immediate: false });

  // Force error for demonstration
  const simulateError = async (errorType: 'network' | 'auth' | 'validation' | 'server') => {
    const errorMap = {
      network: () => fetchUsers(), // This will try to fetch, potentially causing network error
      auth: () => executeAuthError(),
      validation: () => createUser({ name: '', email: 'invalid-email' }),
      server: () => executeServerError()
    };

    try {
      await errorMap[errorType]();
    } catch (error) {
      console.log(`Simulated ${errorType} error:`, error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Error Handling & Recovery System Demo
        </h1>

        {/* Online/Offline Status */}
        <div className="mb-6">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isOnline
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isOnline ? 'bg-green-400' : 'bg-red-400'
            }`} />
            {isOnline ? 'Online' : 'Offline'}
          </div>

          {queueStatus.count > 0 && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="text-sm text-amber-800">
                {queueStatus.count} requests queued for offline sync
              </div>
              <button
                onClick={clearQueue}
                className="mt-1 text-xs text-amber-600 hover:text-amber-800 underline"
              >
                Clear queue
              </button>
            </div>
          )}
        </div>

        {/* Error Simulation Buttons */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Simulate Errors</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => simulateError('network')}
              className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
            >
              Network Error
            </button>
            <button
              onClick={() => simulateError('auth')}
              className="px-3 py-1 bg-orange-100 text-orange-800 rounded text-sm hover:bg-orange-200"
            >
              Auth Error
            </button>
            <button
              onClick={() => simulateError('validation')}
              className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200"
            >
              Validation Error
            </button>
            <button
              onClick={() => simulateError('server')}
              className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm hover:bg-purple-200"
            >
              Server Error
            </button>
          </div>
        </div>

        {/* Users List Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Users List</h2>
            <div className="flex gap-2">
              <button
                onClick={fetchUsers}
                disabled={usersState.loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {usersState.loading ? 'Loading...' : 'Refresh'}
              </button>
              {usersRetryable && (
                <button
                  onClick={retryUsers}
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
                >
                  Retry
                </button>
              )}
            </div>
          </div>

          {usersState.error && (
            <ErrorDisplay
              error={usersState.error}
              onDismiss={() => {}} // Error will be cleared on successful retry
              onRetry={usersRetryable ? retryUsers : undefined}
              className="mb-4"
            />
          )}

          {usersState.loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading users...</span>
            </div>
          )}

          {usersState.data && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {usersState.data.map((user: any) => (
                <div
                  key={user.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedUserId === user.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleUserSelect(user.id)}
                >
                  <h3 className="font-medium">{user.name}</h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Details Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">User Details</h2>
            <div className="flex gap-2">
              {userRetryable && (
                <button
                  onClick={retryUser}
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
                >
                  Retry
                </button>
              )}
              <button
                onClick={cancelUser}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>

          {userState.error && (
            <ErrorDisplay
              error={userState.error}
              onDismiss={() => {}}
              onRetry={userRetryable ? retryUser : undefined}
              className="mb-4"
            />
          )}

          {userState.loading && (
            <div className="flex items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading user details...</span>
            </div>
          )}

          {userState.data && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg">{userState.data.name}</h3>
              <p className="text-gray-600">{userState.data.email}</p>
              <p className="text-sm text-gray-500 mt-2">
                ID: {userState.data.id} | Retry Count: {userState.retryCount}
              </p>
            </div>
          )}
        </div>

        {/* Create User Form */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Create New User</h2>

          {createUserState.error && (
            <ErrorDisplay
              error={createUserState.error}
              onDismiss={resetCreateUser}
              onRetry={createUserRetryable ? retryCreateUser : undefined}
              className="mb-4"
            />
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createUserState.loading}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {createUserState.loading ? 'Creating...' : 'Create User'}
              </button>

              {createUserRetryable && (
                <button
                  type="button"
                  onClick={retryCreateUser}
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
                >
                  Retry
                </button>
              )}

              <button
                type="button"
                onClick={resetCreateUser}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Error Service Status */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Error Service Status</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Network Status: {isOnline ? 'Connected' : 'Disconnected'}</p>
            <p>Queued Requests: {queueStatus.count}</p>
            {queueStatus.oldestRequest && (
              <p>
                Oldest Request: {new Date(queueStatus.oldestRequest).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorHandlingExample;
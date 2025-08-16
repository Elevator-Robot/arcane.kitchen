import { useState, useEffect } from 'react';
import { signIn, signUp, confirmSignUp, signOut, getCurrentUser, fetchUserAttributes, updateUserAttributes, updatePassword } from 'aws-amplify/auth';
import ProfilePictureSelector from './ProfilePictureSelector';

interface HeaderProps {
  onMenuClick: () => void;
  isAuthenticated: boolean;
  onAuthChange: (authenticated: boolean) => void;
}

function Header({ onMenuClick, isAuthenticated, onAuthChange }: HeaderProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'confirm' | 'account' | 'updatePassword'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickName, setNickName] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [selectedProfilePicture, setSelectedProfilePicture] = useState('');
  const [currentProfilePicture, setCurrentProfilePicture] = useState('');

  // Fetch user attributes when component mounts or when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserData();
    }
  }, [isAuthenticated]);

  const fetchUserData = async () => {
    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      setCurrentUser(user);
      setUserAttributes(attributes);
      
      // Pre-populate form fields
      setNickName(attributes?.nickname || '');
      setCurrentProfilePicture(attributes?.picture || '');
      setSelectedProfilePicture(attributes?.picture || '');
      
      console.log('User attributes:', attributes);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Show themed notification
  const showThemedNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 4000);
  };
  const getDisplayName = () => {
    if (userAttributes?.nickname) {
      return userAttributes.nickname;
    }
    if (userAttributes?.email) {
      return userAttributes.email.split('@')[0];
    }
    if (currentUser?.username) {
      return currentUser.username;
    }
    return 'Kitchen Witch';
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn({
        username: email,
        password: password,
      });

      if (result.isSignedIn) {
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        setCurrentUser(user);
        setUserAttributes(attributes);
        onAuthChange(true);
        setShowAuthModal(false);
        resetForm();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check thy credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Thy passwords do not match, wise one.');
      setIsLoading(false);
      return;
    }

    if (!nickName.trim()) {
      setError('Thy mystical name is required to join the coven.');
      setIsLoading(false);
      return;
    }

    if (!selectedProfilePicture) {
      setError('Please choose thy mystical avatar to join the coven.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
            nickname: nickName.trim(),
            picture: selectedProfilePicture,
          },
        },
      });

      if (result.nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        setAuthMode('confirm');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create thy grimoire. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: confirmationCode,
      });

      // After confirmation, sign in automatically
      const result = await signIn({
        username: email,
        password: password,
      });

      if (result.isSignedIn) {
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        setCurrentUser(user);
        setUserAttributes(attributes);
        onAuthChange(true);
        setShowAuthModal(false);
        resetForm();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to confirm thy account. Please check the sacred code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const updateData: any = {
        nickname: nickName.trim(),
      };

      // Only update picture if it has changed
      if (selectedProfilePicture !== currentProfilePicture) {
        updateData.picture = selectedProfilePicture;
      }

      await updateUserAttributes({
        userAttributes: updateData,
      });

      // Refresh user data
      await fetchUserData();
      setError('');
      showThemedNotification('Thy mystical profile has been updated successfully!', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to update thy profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (newPassword !== confirmNewPassword) {
      setError('Thy new passwords do not match, wise one.');
      setIsLoading(false);
      return;
    }

    try {
      await updatePassword({
        oldPassword: currentPassword,
        newPassword: newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setError('');
      showThemedNotification('Thy sacred password has been updated successfully!', 'success');
      setAuthMode('account');
    } catch (err: any) {
      setError(err.message || 'Failed to update thy password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setCurrentUser(null);
      setUserAttributes(null);
      onAuthChange(false);
      setShowAuthModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to leave the coven.');
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNickName('');
    setConfirmationCode('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setSelectedProfilePicture('');
    setCurrentProfilePicture('');
    setError('');
    setAuthMode('signin');
  };

  const closeModal = () => {
    setShowAuthModal(false);
    resetForm();
  };

  return (
    <>
      <header className="header-mystical fixed top-0 w-full z-50">
        <div className="flex justify-between items-center p-4">
          {/* Left side - Logo */}
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-lg font-semibold text-gradient gothic-text">𝔄𝔯𝔠𝔞𝔫𝔢 𝔎𝔦𝔱𝔠𝔥𝔢𝔫</h1>
              <p className="text-xs text-green-300">Culinary Magic & Recipes</p>
            </div>
          </div>
          
          {/* Right side - Auth */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-3 text-sm text-green-200 hover:text-green-100 transition-colors p-2 rounded-lg hover:bg-green-800/20"
                title="Profile"
              >
                {currentProfilePicture ? (
                  <img
                    src={`/images/profile-pictures/${currentProfilePicture}`}
                    alt="Profile"
                    className="w-12 h-12 rounded-full object-cover border-2 border-green-500/40 shadow-lg"
                    onError={(e) => {
                      // Fallback to default icon if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center border border-green-500/40 shadow-lg">
                    <svg className="w-6 h-6 text-green-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                
                {/* Fallback icon (hidden by default) */}
                <div className="hidden w-12 h-12 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center border border-green-500/40 shadow-lg">
                  <svg className="w-6 h-6 text-green-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                
                <span className="hidden sm:inline font-medium">Profile</span>
              </button>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="btn-secondary text-sm"
              >
                Join Coven
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Custom Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-enchanted rounded-2xl shadow-xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="text-center flex-1">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-lg border border-yellow-500/40">
                  <svg className="w-8 h-8 text-yellow-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-enchanted gothic-text mb-2">
                  {isAuthenticated ? '𝔊𝔯𝔦𝔪𝔬𝔦𝔯𝔢 𝔄𝔠𝔠𝔢𝔰𝔰' : 
                   authMode === 'signin' ? '𝔈𝔫𝔱𝔢𝔯 𝔱𝔥𝔢 ℭ𝔦𝔯𝔠𝔩𝔢' :
                   authMode === 'signup' ? 'ℌ𝔞𝔦𝔩 𝔞𝔫𝔡 𝔚𝔢𝔩𝔠𝔬𝔪𝔢' :
                   authMode === 'confirm' ? '𝔄𝔴𝔞𝔦𝔱 ℭ𝔬𝔫𝔣𝔦𝔯𝔪𝔞𝔱𝔦𝔬𝔫' :
                   authMode === 'account' ? '𝔄𝔠𝔠𝔬𝔲𝔫𝔱 𝔖𝔢𝔱𝔱𝔦𝔫𝔤𝔰' :
                   '𝔘𝔭𝔡𝔞𝔱𝔢 𝔓𝔞𝔰𝔰𝔴𝔬𝔯𝔡'}
                </h2>
                <p className="text-green-300">
                  {isAuthenticated ? 'Manage thy sacred recipes' : 
                   authMode === 'signin' ? 'Sign in to thy sacred grimoire' :
                   authMode === 'signup' ? 'Create thy mystical grimoire' :
                   authMode === 'confirm' ? 'Confirm thy place in the coven' :
                   authMode === 'account' ? 'Update thy mystical profile' :
                   'Change thy sacred incantation'}
                </p>
              </div>
              <button 
                onClick={closeModal}
                className="text-green-300 hover:text-green-100 transition-colors p-2 rounded-lg hover:bg-green-800/20"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Authentication Forms */}
            <div className="space-y-6">
              {isAuthenticated ? (
                // Authenticated State - Account Management
                <div className="space-y-6">
                  {authMode === 'account' ? (
                    // Account Settings View
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shadow-lg border border-green-500/40 mb-4">
                          <svg className="w-10 h-10 text-green-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gradient gothic-text mb-2">
                          {getDisplayName()}'s Profile
                        </h3>
                        <p className="text-green-300 text-sm mb-6">
                          Email: {userAttributes?.email || 'Not available'}
                        </p>
                      </div>

                      {/* Profile Update Form */}
                      <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-green-300 mb-2">
                            Mystical Name
                          </label>
                          <input
                            type="text"
                            value={nickName}
                            onChange={(e) => setNickName(e.target.value)}
                            className="chat-input w-full"
                            placeholder={userAttributes?.nickname || "Enter thy mystical name"}
                            required
                          />
                        </div>
                        
                        {/* Profile Picture Selection */}
                        <ProfilePictureSelector
                          selectedProfilePicture={selectedProfilePicture}
                          onSelect={setSelectedProfilePicture}
                          className="mb-4"
                        />
                        
                        <button 
                          type="submit" 
                          className="btn-primary w-full"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Updating...' : 'Update Profile'}
                        </button>
                      </form>

                      {/* Account Actions */}
                      <div className="space-y-3 pt-4 border-t border-green-700/30">
                        <button 
                          onClick={() => setAuthMode('updatePassword')}
                          className="btn-secondary w-full"
                        >
                          Change Sacred Password
                        </button>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button 
                            onClick={handleSignOut}
                            className="btn-secondary flex-1"
                          >
                            Leave Coven
                          </button>
                          <button 
                            onClick={closeModal}
                            className="btn-primary flex-1"
                          >
                            Return to Kitchen
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : authMode === 'updatePassword' ? (
                    // Password Update Form
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-lg border border-yellow-500/40 mb-4">
                          <svg className="w-8 h-8 text-yellow-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <p className="text-green-300 text-sm">
                          Update thy sacred incantation to protect thy grimoire
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          Current Sacred Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="chat-input w-full"
                          placeholder="Enter thy current incantation"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          New Sacred Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="chat-input w-full"
                          placeholder="Create thy new incantation"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="chat-input w-full"
                          placeholder="Repeat thy new incantation"
                          required
                        />
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button 
                          type="button"
                          onClick={() => setAuthMode('account')}
                          className="btn-secondary flex-1"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="btn-primary flex-1"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    // Default Authenticated Welcome
                    <div className="text-center space-y-6">
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shadow-lg border border-green-500/40">
                        <svg className="w-10 h-10 text-green-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gradient gothic-text mb-2">
                          𝔚𝔢𝔩𝔠𝔬𝔪𝔢, {getDisplayName()}!
                        </h3>
                        <p className="text-green-300">Thy grimoire awaits thy wisdom</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                          onClick={() => setAuthMode('account')}
                          className="btn-secondary flex-1"
                        >
                          Account Settings
                        </button>
                        <button 
                          onClick={closeModal}
                          className="btn-primary flex-1"
                        >
                          Enter Kitchen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Authentication Forms
                <div className="space-y-6">
                  {/* Error Message */}
                  {error && (
                    <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-sm">
                      {error}
                    </div>
                  )}

                  {authMode === 'signin' && (
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          Witch's Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="chat-input w-full"
                          placeholder="your.name@coven.mystical"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          Sacred Password
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="chat-input w-full"
                          placeholder="Enter thy secret incantation"
                          required
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="btn-primary w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Entering Circle...' : 'Enter the Sacred Circle'}
                      </button>
                    </form>
                  )}

                  {authMode === 'signup' && (
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          Mystical Name
                        </label>
                        <input
                          type="text"
                          value={nickName}
                          onChange={(e) => setNickName(e.target.value)}
                          className="chat-input w-full"
                          placeholder="Thy chosen witch name"
                          required
                        />
                      </div>
                      
                      {/* Profile Picture Selection */}
                      <ProfilePictureSelector
                        selectedProfilePicture={selectedProfilePicture}
                        onSelect={setSelectedProfilePicture}
                        className="mb-4"
                      />
                      
                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          Witch's Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="chat-input w-full"
                          placeholder="your.name@coven.mystical"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          Sacred Password
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="chat-input w-full"
                          placeholder="Create thy secret incantation"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          Confirm Sacred Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="chat-input w-full"
                          placeholder="Repeat thy incantation"
                          required
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="btn-primary w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Creating Grimoire...' : 'Create Sacred Grimoire'}
                      </button>
                    </form>
                  )}

                  {authMode === 'confirm' && (
                    <form onSubmit={handleConfirmSignUp} className="space-y-4">
                      <div className="text-center mb-4">
                        <p className="text-green-300 text-sm">
                          A sacred scroll has been sent to thy email. Enter the mystical code to complete thy initiation.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          Confirmation Code
                        </label>
                        <input
                          type="text"
                          value={confirmationCode}
                          onChange={(e) => setConfirmationCode(e.target.value)}
                          className="chat-input w-full text-center text-lg tracking-widest"
                          placeholder="123456"
                          required
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="btn-primary w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Confirming...' : 'Complete Initiation'}
                      </button>
                    </form>
                  )}

                  {/* Mode Switcher */}
                  {authMode !== 'confirm' && (
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-4 mb-4">
                        <div className="h-px bg-green-700 flex-1"></div>
                        <span className="text-green-400 text-sm">or</span>
                        <div className="h-px bg-green-700 flex-1"></div>
                      </div>
                      
                      {authMode === 'signin' ? (
                        <button 
                          onClick={() => setAuthMode('signup')}
                          className="btn-secondary w-full"
                        >
                          Create New Grimoire
                        </button>
                      ) : (
                        <button 
                          onClick={() => setAuthMode('signin')}
                          className="btn-secondary w-full"
                        >
                          Return to Sacred Circle
                        </button>
                      )}
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-xs text-green-400">
                      By joining our coven, you agree to share in the ancient wisdom 
                      and protect the sacred recipes of kitchen witchcraft.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Themed Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-[60] animate-slideIn">
          <div className={`p-4 rounded-xl shadow-2xl backdrop-blur-xl border max-w-sm ${
            notificationType === 'success' 
              ? 'bg-green-900/90 border-green-500/40 text-green-100' 
              : 'bg-red-900/90 border-red-500/40 text-red-100'
          }`}>
            <div className="flex items-start space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                notificationType === 'success' 
                  ? 'bg-green-600' 
                  : 'bg-red-600'
              }`}>
                {notificationType === 'success' ? (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-relaxed">
                  {notificationMessage}
                </p>
              </div>
              <button 
                onClick={() => setShowNotification(false)}
                className={`text-sm opacity-70 hover:opacity-100 transition-opacity ${
                  notificationType === 'success' ? 'text-green-300' : 'text-red-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;

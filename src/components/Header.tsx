import { useState, useEffect } from 'react';
import {
  signIn,
  signUp,
  confirmSignUp,
  signOut,
  getCurrentUser,
  fetchUserAttributes,
  updateUserAttributes,
  updatePassword,
  deleteUser,
} from 'aws-amplify/auth';
import ProfilePictureSelector from './ProfilePictureSelector';

interface HeaderProps {
  onMenuClick: () => void;
  isAuthenticated: boolean;
  onAuthChange: (authenticated: boolean) => void;
  userAttributes?: any;
  characterData?: {
    avatar: string;
    name: string;
    cookingStyle: string;
    favoriteIngredients: string[];
    magicalSpecialty: string;
  } | null;
  onShowCharacterBuilder?: () => void;
}

function Header({
  onMenuClick,
  isAuthenticated,
  onAuthChange,
  userAttributes: passedUserAttributes,
  onShowCharacterBuilder,
}: HeaderProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<
    'signin' | 'signup' | 'confirm' | 'account' | 'updatePassword'
  >('signin');
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
  const [notificationType, setNotificationType] = useState<'success' | 'error'>(
    'success'
  );
  const [selectedProfilePicture, setSelectedProfilePicture] = useState('');
  const [currentProfilePicture, setCurrentProfilePicture] = useState('');
  const [profilePictureLoaded, setProfilePictureLoaded] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Fetch user attributes when component mounts or when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (passedUserAttributes) {
        // Use passed attributes immediately
        setUserAttributes(passedUserAttributes);
        setNickName(passedUserAttributes?.nickname || '');
        setCurrentProfilePicture(passedUserAttributes?.picture || '');
        setSelectedProfilePicture(passedUserAttributes?.picture || '');
        setProfilePictureLoaded(true);
      } else {
        // Fallback to fetching if not passed
        fetchUserData();
      }
    }
  }, [isAuthenticated, passedUserAttributes]);

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
      setProfilePictureLoaded(true);

      console.log('User attributes:', attributes);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Show themed notification
  const showThemedNotification = (
    message: string,
    type: 'success' | 'error' = 'success'
  ) => {
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
      setError(
        err.message || 'Failed to sign in. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (!nickName.trim()) {
      setError('Name is required.');
      setIsLoading(false);
      return;
    }

    if (!selectedProfilePicture) {
      setError('Please choose an avatar.');
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
      setError(err.message || 'Failed to create account. Please try again.');
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
      setError(
        err.message || 'Failed to confirm account. Please check the code.'
      );
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
      showThemedNotification('Profile updated successfully!', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
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
      showThemedNotification(
        'Your password has been updated successfully!',
        'success'
      );
      setAuthMode('account');
    } catch (err: any) {
      setError(err.message || 'Failed to update your password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    setError('');

    try {
      await deleteUser();

      // Clear all user data
      setCurrentUser(null);
      setUserAttributes(null);
      setCurrentProfilePicture('');
      setSelectedProfilePicture('');
      setProfilePictureLoaded(false);
      onAuthChange(false);
      setShowAuthModal(false);
      setShowDeleteConfirmation(false);
      resetForm();

      showThemedNotification(
        'Your account has been permanently deleted.',
        'success'
      );
    } catch (err: any) {
      setError(
        err.message || 'Failed to delete your account. Please try again.'
      );
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
    setProfilePictureLoaded(false);
    setError('');
    setAuthMode('signin');
  };

  const closeModal = () => {
    setShowAuthModal(false);
    // Only reset form data, not profile data for authenticated users
    if (!isAuthenticated) {
      resetForm();
    } else {
      // Just reset form fields, keep profile data
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setConfirmationCode('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setError('');
      setAuthMode('account'); // Reset to account view for authenticated users
    }
  };

  return (
    <>
      <header className="header-mystical fixed top-0 w-full z-50">
        <div className="flex justify-between items-center px-4 py-2">
          {/* Left side - Logo */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="hover:scale-105 transition-transform duration-200 p-2 rounded-lg"
            >
              <img
                src="/logo-no-background.svg"
                alt="Arcane Kitchen"
                className="h-28 w-auto cursor-pointer"
              />
            </button>
          </div>

          {/* Center - Navigation (when authenticated) */}
          {isAuthenticated && (
            <div className="header-nav-buttons flex items-center space-x-2 md:space-x-4">
              <button
                onClick={onMenuClick}
                className="header-nav-button flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 rounded-xl bg-stone-800/50 border border-stone-600/30 hover:border-emerald-400/50 transition-all duration-300 text-stone-300 hover:text-emerald-300"
              >
                <svg
                  className="w-4 h-4 md:w-5 md:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-xs md:text-sm font-medium">
                  Toggle View
                </span>
              </button>

              {onShowCharacterBuilder && (
                <button
                  onClick={onShowCharacterBuilder}
                  className="header-nav-button flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 rounded-xl bg-amber-800/50 border border-amber-600/30 hover:border-amber-400/50 transition-all duration-300 text-amber-300 hover:text-amber-200"
                >
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span className="text-xs md:text-sm font-medium">
                    Character
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Right side - Auth */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  setShowAuthModal(true);
                  setAuthMode('account'); // Go directly to account settings
                }}
                className="flex items-center space-x-3 text-sm text-green-200 hover:text-green-100 transition-colors p-4"
                title="Profile"
              >
                {isAuthenticated && currentProfilePicture ? (
                  <img
                    src={`/images/profile-pictures/${currentProfilePicture}`}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border-2 border-green-500/60 shadow-lg hover:scale-110 hover:shadow-green-400/50 hover:shadow-2xl hover:border-green-400/80 transition-all duration-300 ease-out"
                    onError={(e) => {
                      console.error(
                        `Failed to load profile image: ${currentProfilePicture}`
                      );
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                    onLoad={() => {
                      setProfilePictureLoaded(true);
                      console.log(
                        'Profile picture loaded:',
                        profilePictureLoaded
                      );
                    }}
                  />
                ) : isAuthenticated ? (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-stone-600/20 to-stone-700/20 flex items-center justify-center border border-stone-500/20 shadow-lg">
                    <div className="w-4 h-4 bg-stone-400/50 rounded-full animate-pulse"></div>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center border border-green-500/40 shadow-lg hover:scale-110 hover:shadow-green-400/50 hover:shadow-2xl transition-all duration-300 ease-out">
                    <svg
                      className="w-8 h-8 text-green-100"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                )}

                {/* Fallback icon (hidden by default) */}
                <div className="hidden w-12 h-12 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center border border-green-500/40 shadow-lg">
                  <svg
                    className="w-6 h-6 text-green-100"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-stone-800/60 via-green-900/30 to-amber-900/40 hover:from-stone-700/80 hover:via-green-800/50 hover:to-amber-800/60 backdrop-blur-lg border border-green-400/40 hover:border-green-400/70 rounded-xl px-6 py-3 text-stone-100 hover:text-green-200 font-medium shadow-lg shadow-green-500/20 hover:shadow-green-500/40 transition-all duration-300 text-sm relative overflow-hidden"
              >
                {/* Mystical background particles */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-1 right-2 w-0.5 h-0.5 bg-green-300 rounded-full animate-pulse"></div>
                  <div
                    className="absolute bottom-1 left-3 w-0.5 h-0.5 bg-amber-300 rounded-full animate-ping"
                    style={{ animationDelay: '1s' }}
                  ></div>
                </div>
                <span className="relative z-10">Join the Coven</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mystical Authentication Modal */}
      {showAuthModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-start justify-end z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-gradient-to-br from-stone-800/90 via-green-900/30 to-amber-900/40 backdrop-blur-xl border border-green-400/40 rounded-2xl shadow-2xl shadow-green-500/20 p-8 max-w-md w-full max-h-[95vh] overflow-y-auto relative mr-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mystical background particles and stars */}
            <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
              {/* Floating particles */}
              <div className="absolute top-6 right-8 w-1 h-1 bg-green-300 rounded-full animate-pulse"></div>
              <div
                className="absolute bottom-8 left-6 w-0.5 h-0.5 bg-amber-300 rounded-full animate-ping"
                style={{ animationDelay: '1s' }}
              ></div>
              <div
                className="absolute top-1/3 left-8 w-0.5 h-0.5 bg-emerald-300 rounded-full animate-pulse"
                style={{ animationDelay: '2s' }}
              ></div>
              <div
                className="absolute bottom-1/3 right-6 w-1 h-1 bg-yellow-300 rounded-full animate-ping"
                style={{ animationDelay: '1.5s' }}
              ></div>

              {/* Pulsing stars - dynamically positioned */}
              <div
                className="absolute top-12 left-12 text-green-300 animate-pulse"
                style={{ animationDuration: '2s' }}
              >
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>

              <div
                className="absolute top-24 right-16 text-amber-300 animate-pulse"
                style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}
              >
                <svg
                  className="w-2 h-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>

              <div
                className="absolute top-40 left-20 text-emerald-300 animate-pulse"
                style={{ animationDuration: '3s', animationDelay: '1s' }}
              >
                <svg
                  className="w-2.5 h-2.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>

              <div
                className="absolute bottom-32 right-8 text-yellow-300 animate-pulse"
                style={{ animationDuration: '2.2s', animationDelay: '1.5s' }}
              >
                <svg
                  className="w-2 h-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>

              <div
                className="absolute bottom-48 left-8 text-green-200 animate-pulse"
                style={{ animationDuration: '2.8s', animationDelay: '0.8s' }}
              >
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>

              <div
                className="absolute top-60 right-24 text-amber-200 animate-pulse"
                style={{ animationDuration: '2.3s', animationDelay: '2s' }}
              >
                <svg
                  className="w-2.5 h-2.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>

              <div
                className="absolute bottom-20 left-16 text-emerald-200 animate-pulse"
                style={{ animationDuration: '2.7s', animationDelay: '0.3s' }}
              >
                <svg
                  className="w-2 h-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>

              <div
                className="absolute top-80 left-24 text-green-400 animate-pulse"
                style={{ animationDuration: '3.2s', animationDelay: '1.2s' }}
              >
                <svg
                  className="w-2 h-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>

              {/* Twinkling effect stars */}
              <div
                className="absolute top-16 right-12 text-white animate-ping"
                style={{ animationDuration: '4s', animationDelay: '0.5s' }}
              >
                <svg
                  className="w-1 h-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>

              <div
                className="absolute bottom-40 right-20 text-white animate-ping"
                style={{ animationDuration: '3.5s', animationDelay: '2.5s' }}
              >
                <svg
                  className="w-1 h-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>

            <div className="mb-8 relative z-10 text-center py-6 px-8">
              <h2 className="text-3xl font-bold text-transparent bg-gradient-to-r from-amber-300 via-green-300 to-emerald-400 bg-clip-text font-mono tracking-widest drop-shadow-lg relative">
                {isAuthenticated ? (
                  <span className="relative">
                    ✦ Profile ✦
                    <div className="absolute -top-1 -left-1 text-green-300/30 animate-pulse">
                      ✦ Profile ✦
                    </div>
                  </span>
                ) : (
                  <span className="relative">
                    ✦ Join the Coven ✦
                    <div className="absolute -top-1 -left-1 text-green-300/30 animate-pulse">
                      ✦ Join the Coven ✦
                    </div>
                  </span>
                )}
              </h2>
            </div>

            {/* Authentication Forms */}
            <div className="space-y-6">
              {isAuthenticated ? (
                // Authenticated State - Account Management
                <div className="space-y-6">
                  {authMode === 'account' ? (
                    // Account Settings View - Enhanced Design
                    <div className="space-y-8">
                      {/* Enhanced Profile Header */}
                      <div className="relative">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-green-800/20 rounded-2xl"></div>
                        <div className="relative p-6 text-center">
                          {/* Profile Picture Display */}
                          <div className="relative inline-block mb-4">
                            {currentProfilePicture ? (
                              <img
                                src={`/images/profile-pictures/${currentProfilePicture}`}
                                alt="Profile"
                                className="w-24 h-24 rounded-2xl object-cover border-2 border-green-500/60 shadow-xl mx-auto"
                              />
                            ) : (
                              <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shadow-xl border-2 border-green-500/60">
                                <svg
                                  className="w-12 h-12 text-green-100"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                              </div>
                            )}
                            {/* Mystical Glow Effect */}
                            <div className="absolute -inset-2 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-2xl blur-lg animate-pulse"></div>
                          </div>

                          {/* Enhanced Name Display */}
                          <h3 className="text-2xl font-bold text-gradient gothic-text mb-2">
                            {getDisplayName()}
                          </h3>
                          <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-800/30 border border-green-600/40 mb-4">
                            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                            <span className="text-green-300 text-sm font-medium">
                              Kitchen Witch
                            </span>
                          </div>
                          <p className="text-green-300/80 text-sm">
                            {userAttributes?.email || 'Mystical practitioner'}
                          </p>
                        </div>
                      </div>

                      {/* Enhanced Profile Update Form */}
                      <form
                        onSubmit={handleUpdateProfile}
                        className="space-y-6"
                      >
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-green-300 mb-3 flex items-center">
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                />
                              </svg>
                              Name
                            </label>
                            <input
                              type="text"
                              value={nickName}
                              onChange={(e) => setNickName(e.target.value)}
                              className="chat-input w-full"
                              placeholder={
                                userAttributes?.nickname || 'Enter your name'
                              }
                              required
                            />
                          </div>

                          {/* Enhanced Profile Picture Selection */}
                          <div>
                            <label className="block text-sm font-medium text-green-300 mb-3 flex items-center">
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              Avatar
                            </label>
                            <ProfilePictureSelector
                              selectedProfilePicture={selectedProfilePicture}
                              onSelect={setSelectedProfilePicture}
                              className="mb-4"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="btn-primary w-full py-3 text-base relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isLoading}
                        >
                          {/* Mystical button background */}
                          <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-1 right-4 w-0.5 h-0.5 bg-amber-300 rounded-full animate-pulse"></div>
                            <div
                              className="absolute bottom-1 left-6 w-0.5 h-0.5 bg-green-300 rounded-full animate-ping"
                              style={{ animationDelay: '0.5s' }}
                            ></div>
                          </div>

                          {isLoading ? (
                            <div className="flex items-center justify-center relative z-10">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                              Updating Profile...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center relative z-10">
                              <svg
                                className="w-5 h-5 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                />
                              </svg>
                              Update Profile
                            </div>
                          )}
                        </button>
                      </form>

                      {/* Enhanced Account Actions */}
                      <div className="space-y-4 pt-6 border-t border-green-700/30">
                        <div className="grid grid-cols-1 gap-3">
                          <button
                            onClick={() => setAuthMode('updatePassword')}
                            className="btn-secondary w-full py-3 flex items-center justify-center hover:border-emerald-500/50 hover:text-emerald-300"
                          >
                            <svg
                              className="w-5 h-5 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                              />
                            </svg>
                            Change Password
                          </button>

                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={handleSignOut}
                              className="btn-secondary py-3 flex items-center justify-center text-red-300 hover:text-red-200 border-red-600/30 hover:border-red-500/50"
                            >
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                              </svg>
                              Logout
                            </button>
                            <button
                              onClick={closeModal}
                              className="btn-primary py-3 flex items-center justify-center"
                            >
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                />
                              </svg>
                              Return to Kitchen
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Dangerous Actions Section */}
                      <div className="pt-6 border-t border-red-700/30">
                        <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4">
                          <div className="flex items-center mb-3">
                            <svg
                              className="w-5 h-5 text-red-400 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                              />
                            </svg>
                            <h4 className="text-red-300 font-medium">
                              Danger Zone
                            </h4>
                          </div>
                          <p className="text-red-300/80 text-sm mb-4">
                            Once your account is deleted, there is no going
                            back. This action cannot be undone.
                          </p>

                          {!showDeleteConfirmation ? (
                            <button
                              onClick={() => setShowDeleteConfirmation(true)}
                              className="w-full py-2 px-4 bg-red-900/30 border border-red-600/50 rounded-lg text-red-300 hover:text-red-200 hover:bg-red-900/50 hover:border-red-500/70 transition-all duration-200 flex items-center justify-center text-sm"
                            >
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Delete Account
                            </button>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-red-200 text-sm font-medium">
                                Are you absolutely sure? This will permanently
                                delete your account and all associated data.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    setShowDeleteConfirmation(false)
                                  }
                                  className="flex-1 py-2 px-4 bg-stone-700/50 border border-stone-600/50 rounded-lg text-stone-300 hover:text-stone-200 hover:bg-stone-700/70 transition-all duration-200 text-sm"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleDeleteAccount}
                                  disabled={isLoading}
                                  className="flex-1 py-2 px-4 bg-red-900/50 border border-red-600/70 rounded-lg text-red-200 hover:text-red-100 hover:bg-red-900/70 hover:border-red-500/80 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isLoading
                                    ? 'Deleting...'
                                    : 'Yes, Delete Forever'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : authMode === 'updatePassword' ? (
                    // Password Update Form
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                      <div className="text-center mb-6">
                        <p className="text-green-300 text-sm">
                          Update your password to keep your account secure
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="chat-input w-full"
                          placeholder="Enter current password"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="chat-input w-full"
                          placeholder="Enter new password"
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
                          onChange={(e) =>
                            setConfirmNewPassword(e.target.value)
                          }
                          className="chat-input w-full"
                          placeholder="Confirm new password"
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
                        <svg
                          className="w-10 h-10 text-green-100"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gradient gothic-text mb-2">
                          𝔚𝔢𝔩𝔠𝔬𝔪𝔢, {getDisplayName()}!
                        </h3>
                        <p className="text-green-300">
                          Thy grimoire awaits thy wisdom
                        </p>
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
                          Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="chat-input w-full"
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="chat-input w-full"
                          placeholder="Enter your password"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn-primary w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Signing in...' : 'Sign in'}
                      </button>
                    </form>
                  )}

                  {authMode === 'signup' && (
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={nickName}
                          onChange={(e) => setNickName(e.target.value)}
                          className="chat-input w-full"
                          placeholder="Your name"
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
                          Password
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="chat-input w-full"
                          placeholder="Create password"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-300 mb-2">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="chat-input w-full"
                          placeholder="Confirm password"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn-primary w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Creating Grimoire...' : 'Join the Coven'}
                      </button>
                    </form>
                  )}

                  {authMode === 'confirm' && (
                    <form onSubmit={handleConfirmSignUp} className="space-y-4">
                      <div className="text-center mb-4">
                        <p className="text-green-300 text-sm">
                          A confirmation code has been sent to your email. Enter
                          the code to complete registration.
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
                          Sign up
                        </button>
                      ) : (
                        <button
                          onClick={() => setAuthMode('signin')}
                          className="btn-secondary w-full"
                        >
                          Return to Login
                        </button>
                      )}
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-xs text-green-400">
                      By joining our coven, you pledge to guard the sacred
                      recipes of kitchen witchcraft.
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
          <div
            className={`p-4 rounded-xl shadow-2xl backdrop-blur-xl border max-w-sm ${
              notificationType === 'success'
                ? 'bg-green-900/90 border-green-500/40 text-green-100'
                : 'bg-red-900/90 border-red-500/40 text-red-100'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notificationType === 'success' ? 'bg-green-600' : 'bg-red-600'
                }`}
              >
                {notificationType === 'success' ? (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
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
                  notificationType === 'success'
                    ? 'text-green-300'
                    : 'text-red-300'
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
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

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
  isAuthenticated: boolean;
  onAuthChange: (authenticated: boolean) => void;
  userAttributes?: any;
  showAuthModal?: boolean;
  setShowAuthModal?: (show: boolean) => void;
  prefilledData?: {
    avatar: string;
    name: string;
  };
  hideProfileButton?: boolean;
}

function Header({
  isAuthenticated,
  onAuthChange,
  userAttributes: passedUserAttributes,
  showAuthModal: externalShowAuthModal,
  setShowAuthModal: externalSetShowAuthModal,
  prefilledData,
  hideProfileButton = false,
}: HeaderProps) {
  const [internalShowAuthModal, setInternalShowAuthModal] = useState(false);
  const showAuthModal = externalShowAuthModal ?? internalShowAuthModal;
  const setShowAuthModal = externalSetShowAuthModal ?? setInternalShowAuthModal;
  const [authMode, setAuthMode] = useState<
    'auth' | 'signup' | 'confirm' | 'account' | 'persona' | 'updatePassword'
  >('auth');
  const [isNewUser, setIsNewUser] = useState(false);
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

  // Cooking Persona fields
  const [cookingStyle, setCookingStyle] = useState('');
  const [magicalSpecialty, setMagicalSpecialty] = useState('');
  const [favoriteIngredients, setFavoriteIngredients] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);

  // Cooking styles mapping
  const COOKING_STYLES_MAP: { [key: string]: string } = {
    traditional: 'Traditional Kitchen Witch',
    experimental: 'Alchemical Innovator',
    herbalist: 'Garden Herbalist',
    comfort: 'Comfort Food Sage',
    global: 'Worldly Wanderer',
    seasonal: 'Seasonal Mystic',
  };
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
        // Load cooking persona data
        setCookingStyle(passedUserAttributes?.['custom:cookingStyle'] || '');
        setMagicalSpecialty(
          passedUserAttributes?.['custom:magicalSpecialty'] || ''
        );
        try {
          const ingredients =
            passedUserAttributes?.['custom:favoriteIngredients'];
          setFavoriteIngredients(ingredients ? JSON.parse(ingredients) : []);
        } catch {
          setFavoriteIngredients([]);
        }
      } else {
        // Fallback to fetching if not passed
        fetchUserData();
      }
    }
  }, [isAuthenticated, passedUserAttributes]);

  // Prefill data from onboarding when modal opens or when switching to new user mode
  useEffect(() => {
    if (!isAuthenticated && (showAuthModal || isNewUser)) {
      // Try to load from localStorage first
      try {
        const storedPrefill = localStorage.getItem('arcane_onboarding_prefill');
        if (storedPrefill) {
          const prefillData = JSON.parse(storedPrefill);
          if (prefillData.name && prefillData.name.trim() !== '') {
            setNickName(prefillData.name);
          }
          if (prefillData.avatar && prefillData.avatar.trim() !== '') {
            setSelectedProfilePicture(prefillData.avatar);
          }
          return;
        }
      } catch (error) {
        console.error('Error loading prefill data:', error);
      }
      
      // Fallback to passed prefilledData if localStorage is empty
      if (prefilledData) {
        if (prefilledData.name && prefilledData.name.trim() !== '') {
          setNickName(prefilledData.name);
        }
        if (prefilledData.avatar && prefilledData.avatar.trim() !== '') {
          setSelectedProfilePicture(prefilledData.avatar);
        }
      }
    }
  }, [showAuthModal, isAuthenticated, prefilledData, isNewUser]);

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

      // Load cooking persona data
      setCookingStyle(attributes?.['custom:cookingStyle'] || '');
      setMagicalSpecialty(attributes?.['custom:magicalSpecialty'] || '');
      try {
        const ingredients = attributes?.['custom:favoriteIngredients'];
        setFavoriteIngredients(ingredients ? JSON.parse(ingredients) : []);
      } catch {
        setFavoriteIngredients([]);
      }

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // If this is a new user completing signup
    if (isNewUser) {
      // Validate additional fields
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

      // Proceed with sign up
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
      return;
    }

    // Try to sign in first
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
      // If user doesn't exist, switch to sign up mode
      if (
        err.name === 'UserNotFoundException' ||
        err.message?.includes('User does not exist') ||
        err.message?.includes('Incorrect username or password')
      ) {
        setIsNewUser(true);
        setError(''); // Clear any errors when switching to signup mode
      } else {
        setError(
          err.message || 'Failed to sign in. Please check your credentials.'
        );
      }
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
        
        // Clear prefill data from localStorage after successful account creation
        localStorage.removeItem('arcane_onboarding_prefill');
        
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
        'custom:cookingStyle': cookingStyle,
        'custom:magicalSpecialty': magicalSpecialty,
        'custom:favoriteIngredients': JSON.stringify(favoriteIngredients),
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

  const toggleIngredient = (ingredient: string) => {
    setFavoriteIngredients((prev) =>
      prev.includes(ingredient)
        ? prev.filter((i) => i !== ingredient)
        : [...prev, ingredient]
    );
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
    setAuthMode('auth');
    setIsNewUser(false);
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
      {!hideProfileButton && (
        <header className="fixed top-0 right-0 z-50">
          {/* Mobile: Right side profile layout */}
          <div className="md:hidden fixed top-1/2 right-0 -translate-y-1/2">
            {/* Profile Button - Right Center */}
            <div className="flex justify-end pr-6">
              <button
                onClick={() => {
                  setShowAuthModal(true);
                  setAuthMode('account');
                }}
                className="text-sm text-green-200 hover:text-green-100 transition-colors"
                title="Profile"
              >
                {currentProfilePicture ? (
                  <img
                    src={`/images/profile-pictures/${currentProfilePicture}`}
                    alt="Profile"
                    className="w-14 h-14 rounded-full object-cover border-2 border-green-500/60 shadow-lg hover:scale-110 hover:shadow-green-400/50 hover:shadow-2xl hover:border-green-400/80 transition-all duration-300 ease-out"
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
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-stone-600/20 to-stone-700/20 flex items-center justify-center border border-stone-500/20 shadow-lg">
                    <div className="w-4 h-4 bg-stone-400/50 rounded-full animate-pulse"></div>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Desktop: Right side layout */}
          <div className="hidden md:block fixed top-1/2 right-0 -translate-y-1/2">
            {/* Profile Button - Right Center */}
            <div className="flex justify-end pr-6">
              <button
                onClick={() => {
                  setShowAuthModal(true);
                  setAuthMode('account'); // Go directly to account settings
                }}
                className="flex items-center space-x-3 text-sm text-green-200 hover:text-green-100 transition-colors p-6"
                title="Profile"
              >
                {currentProfilePicture ? (
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
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-stone-600/20 to-stone-700/20 flex items-center justify-center border border-stone-500/20 shadow-lg">
                    <div className="w-4 h-4 bg-stone-400/50 rounded-full animate-pulse"></div>
                  </div>
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Mystical Authentication Modal - Slide from Right */}
      {showAuthModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-end z-50 animate-fadeIn"
          onClick={closeModal}
        >
          <div
            className="bg-gradient-to-br from-stone-800/90 via-green-900/30 to-amber-900/40 backdrop-blur-xl border-l border-green-400/40 shadow-2xl shadow-green-500/20 p-8 w-full max-w-md h-full overflow-y-auto relative animate-slideInRight"
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
                ) : authMode === 'confirm' ? (
                  <span className="relative">
                    ✦ Confirm Your Email ✦
                    <div className="absolute -top-1 -left-1 text-green-300/30 animate-pulse">
                      ✦ Confirm Your Email ✦
                    </div>
                  </span>
                ) : isNewUser ? (
                  <span className="relative">
                    ✦ Complete Your Profile ✦
                    <div className="absolute -top-1 -left-1 text-green-300/30 animate-pulse">
                      ✦ Complete Your Profile ✦
                    </div>
                  </span>
                ) : (
                  <span className="relative">
                    ✦ Enter the Kitchen ✦
                    <div className="absolute -top-1 -left-1 text-green-300/30 animate-pulse">
                      ✦ Enter the Kitchen ✦
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
                              {cookingStyle
                                ? COOKING_STYLES_MAP[cookingStyle] ||
                                  'Kitchen Witch'
                                : 'Kitchen Witch'}
                            </span>
                          </div>
                          <p className="text-green-300/80 text-sm">
                            {userAttributes?.email || 'Mystical practitioner'}
                          </p>
                        </div>
                      </div>

                      {/* Combined Profile & Cooking Preferences Form */}
                      <form
                        onSubmit={handleUpdateProfile}
                        className="space-y-6"
                      >
                        {/* Profile Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-green-300 flex items-center border-b border-green-700/30 pb-2">
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
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            Your Profile
                          </h3>

                          <div>
                            <label className="block text-sm font-medium text-green-300 mb-2 flex items-center">
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

                          <div>
                            <label className="block text-sm font-medium text-green-300 mb-2 flex items-center">
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
                              className="mb-2"
                            />
                          </div>
                        </div>

                        {/* Cooking Preferences Section */}
                        <div className="space-y-4 pt-4 border-t border-amber-700/30">
                          <h3 className="text-lg font-semibold text-amber-300 flex items-center border-b border-amber-700/30 pb-2">
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
                                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                              />
                            </svg>
                            Cooking Preferences
                          </h3>

                          {/* Cooking Style - Compact Grid for Mobile */}
                          <div>
                            <label className="block text-sm font-medium text-amber-300 mb-2 flex items-center">
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
                                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                />
                              </svg>
                              Cooking Style
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {[
                                {
                                  id: 'traditional',
                                  name: 'Traditional Kitchen Witch',
                                  desc: 'Ancestral recipes',
                                },
                                {
                                  id: 'experimental',
                                  name: 'Alchemical Innovator',
                                  desc: 'Bold experimenter',
                                },
                                {
                                  id: 'herbalist',
                                  name: 'Garden Herbalist',
                                  desc: 'Fresh magical herbs',
                                },
                                {
                                  id: 'comfort',
                                  name: 'Comfort Food Sage',
                                  desc: 'Soul-warming recipes',
                                },
                                {
                                  id: 'global',
                                  name: 'Worldly Wanderer',
                                  desc: 'Global flavors',
                                },
                                {
                                  id: 'seasonal',
                                  name: 'Seasonal Mystic',
                                  desc: 'Natural rhythms',
                                },
                              ].map((style) => (
                                <button
                                  key={style.id}
                                  type="button"
                                  onClick={() => setCookingStyle(style.id)}
                                  className={`p-2.5 rounded-lg text-left transition-all duration-300 ${
                                    cookingStyle === style.id
                                      ? 'bg-amber-600/40 border-2 border-amber-400/60'
                                      : 'bg-stone-700/40 border-2 border-stone-600/30 hover:border-amber-400/40'
                                  }`}
                                >
                                  <div className="font-medium text-stone-200 text-xs">
                                    {style.name}
                                  </div>
                                  <div className="text-xs text-stone-400">
                                    {style.desc}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Magical Specialty - Compact Grid for Mobile */}
                          <div>
                            <label className="block text-sm font-medium text-amber-300 mb-2 flex items-center">
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
                                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                                />
                              </svg>
                              Magical Specialty
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {[
                                {
                                  id: 'healing',
                                  name: 'Healing Brews',
                                  icon: '🌿',
                                },
                                {
                                  id: 'protection',
                                  name: 'Protection Charms',
                                  icon: '🛡️',
                                },
                                {
                                  id: 'abundance',
                                  name: 'Abundance Feasts',
                                  icon: '🌾',
                                },
                                {
                                  id: 'love',
                                  name: 'Love Potions',
                                  icon: '💖',
                                },
                                {
                                  id: 'wisdom',
                                  name: 'Wisdom Elixirs',
                                  icon: '📚',
                                },
                                {
                                  id: 'strength',
                                  name: 'Strength Tonics',
                                  icon: '💪',
                                },
                              ].map((specialty) => (
                                <button
                                  key={specialty.id}
                                  type="button"
                                  onClick={() =>
                                    setMagicalSpecialty(specialty.id)
                                  }
                                  className={`p-2.5 rounded-lg text-center transition-all duration-300 ${
                                    magicalSpecialty === specialty.id
                                      ? 'bg-purple-600/40 border-2 border-purple-400/60'
                                      : 'bg-stone-700/40 border-2 border-stone-600/30 hover:border-purple-400/40'
                                  }`}
                                >
                                  <div className="text-xl mb-1">
                                    {specialty.icon}
                                  </div>
                                  <div className="font-medium text-stone-200 text-xs leading-tight">
                                    {specialty.name}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Favorite Ingredients - Compact Pills */}
                          <div>
                            <label className="block text-sm font-medium text-amber-300 mb-2 flex items-center">
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
                                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                />
                              </svg>
                              Favorite Ingredients
                              <span className="ml-2 text-xs text-stone-400">
                                (Optional)
                              </span>
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                'Fresh Herbs',
                                'Exotic Spices',
                                'Wild Mushrooms',
                                'Garden Vegetables',
                                'Ancient Grains',
                                'Healing Honey',
                                'Sea Salt',
                                'Rare Oils',
                                'Fermented Foods',
                                'Seasonal Fruits',
                                'Aromatic Flowers',
                                'Sacred Seeds',
                              ].map((ingredient) => (
                                <button
                                  key={ingredient}
                                  type="button"
                                  onClick={() => toggleIngredient(ingredient)}
                                  className={`px-2.5 py-1 rounded-full text-xs transition-all duration-300 ${
                                    favoriteIngredients.includes(ingredient)
                                      ? 'bg-emerald-400/30 text-emerald-200 border border-emerald-400/50'
                                      : 'bg-stone-700/50 text-stone-300 border border-stone-600/50 hover:border-emerald-400/30'
                                  }`}
                                >
                                  {ingredient}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Save Button */}
                        <button
                          type="submit"
                          className="btn-primary w-full py-3 text-base relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isLoading}
                        >
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
                              Updating...
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
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Save Changes
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

                  {authMode === 'auth' && (
                    <form onSubmit={handleAuth} className="space-y-4">
                      {isNewUser && (
                        <div className="mb-4 p-4 rounded-xl bg-green-900/20 border border-green-500/30">
                          <p className="text-green-300 text-sm text-center">
                            ✨ Welcome, new witch! Let's complete your profile
                          </p>
                        </div>
                      )}

                      {isNewUser && (
                        <>
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
                        </>
                      )}

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
                          disabled={isNewUser}
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
                          minLength={8}
                          disabled={isNewUser}
                        />
                        {!isNewUser && (
                          <p className="text-xs text-green-400 mt-1">
                            New here? Just enter your email and create a password to get started! ✨
                          </p>
                        )}
                      </div>

                      {isNewUser && (
                        <div>
                          <label className="block text-sm font-medium text-green-300 mb-2">
                            Confirm Password
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="chat-input w-full"
                            placeholder="Confirm your password"
                            required
                            minLength={8}
                          />
                        </div>
                      )}

                      <div className="flex space-x-2">
                        {isNewUser && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsNewUser(false);
                              setNickName('');
                              setConfirmPassword('');
                              setSelectedProfilePicture('');
                              setError('');
                            }}
                            className="btn-secondary flex-1"
                          >
                            Back
                          </button>
                        )}
                        <button
                          type="submit"
                          className={`btn-primary ${isNewUser ? 'flex-1' : 'w-full'}`}
                          disabled={isLoading}
                        >
                          {isLoading 
                            ? (isNewUser ? 'Creating Account...' : 'Checking...')
                            : (isNewUser ? 'Join the Coven' : 'Continue')}
                        </button>
                      </div>
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

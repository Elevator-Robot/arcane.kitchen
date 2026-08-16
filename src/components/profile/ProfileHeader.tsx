import React, { useState, useRef } from 'react';
import { Edit2, Share, MapPin, Calendar, Camera, X, Check } from 'lucide-react';
import type { User } from '../../types/profile';
import PresetGrid from './PresetGrid';
import { loadUserProfiles, saveUserProfiles, upsertUserProfile, sanitizeUsername, validateUsername, isUsernameChangeAllowed, USERNAME_CHANGE_COOLDOWN_DAYS } from '../../utils/userProfiles';

type Props = {
  user: User;
  onAvatarUpload?: (file?: File) => void;
  onShareProfile?: () => void;
  isOwnProfile?: boolean;
  onSelectPreset?: (file: string) => void;
  onProfileUpdated?: (next: { name?: string; handle?: string; bio?: string }) => void;
};

export default function ProfileHeader({ user, onAvatarUpload, onShareProfile, isOwnProfile = true, onSelectPreset, onProfileUpdated }: Props) {
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'upload'>('presets');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [draftName, setDraftName] = useState(user.name || '');
  const [draftHandle, setDraftHandle] = useState(user.handle || '');
  const [draftBio, setDraftBio] = useState(user.bio || '');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFile = (file?: File) => {
    if (file && onAvatarUpload) onAvatarUpload(file);
    setShowAvatarModal(false);
    setUploadFile(null);
  };

  const handleShareProfile = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: `${user.name} on Arcane Kitchen`, url });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        if (onShareProfile) onShareProfile();
        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        if (onShareProfile) onShareProfile();
        return;
      }

      // Legacy fallback
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        if (onShareProfile) onShareProfile();
        return;
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setUploadFile(f);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
        <div className="flex items-start gap-6 w-full md:w-auto">
          <div className="relative">
            <img src={user.avatarUrl || '/api/placeholder/160/160'} alt={user.name} className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-md" />
            {isOwnProfile && (
              <button onClick={() => setShowAvatarModal(true)} className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow border border-gray-200" aria-label="update avatar">
                <Camera className="w-4 h-4 text-[#945d3f]" />
              </button>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {!isEditingName ? (
                <>
                  <h1 className="text-3xl font-bold text-[#1c1917] truncate">{user.name}</h1>
                  {isOwnProfile && <button onClick={() => setIsEditingName(true)} aria-label="edit display name" className="p-1 rounded-full hover:bg-gray-100 text-gray-500"><Edit2 className="w-4 h-4" /></button>}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <input value={draftName} onChange={(e) => setDraftName(e.target.value)} className="px-2 py-1 border rounded" />
                  <button onClick={() => {
                    const userId = String(user.id || 'current');
                    const profiles = loadUserProfiles();
                    const updated = upsertUserProfile(profiles, { userId, displayName: draftName });
                    saveUserProfiles(updated);
                    setIsEditingName(false);
                    if (onProfileUpdated) onProfileUpdated({ name: draftName });
                  }} className="px-3 py-1 bg-[#945d3f] text-white rounded">Save</button>
                  <button onClick={() => { setIsEditingName(false); setDraftName(user.name || ''); }} className="px-3 py-1 border rounded">Cancel</button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              {!isEditingHandle ? (
                <>
                  <span className="text-sm text-gray-600 truncate">@{user.handle}</span>
                  {isOwnProfile && <button onClick={() => {
                    const existingProfile = loadUserProfiles()[String(user.id || 'current')];
                    const lastChange = existingProfile?.lastUsernameChange;
                    const cooldownMs = USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
                    if (lastChange && Date.now() - lastChange < cooldownMs) {
                      const daysLeft = Math.ceil((cooldownMs - (Date.now() - lastChange)) / (24 * 60 * 60 * 1000));
                      window.alert(`Username can only be changed once every 30 days (${daysLeft} days remaining).`);
                      return;
                    }
                    setIsEditingHandle(true);
                  }} aria-label="edit username" className="p-1 rounded-full hover:bg-gray-100 text-gray-500"><Edit2 className="w-3.5 h-3.5" /></button>}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <input value={draftHandle} onChange={(e) => setDraftHandle(e.target.value)} className="px-2 py-1 border rounded" />
                  <button onClick={() => {
                    const desired = sanitizeUsername(draftHandle);
                    const userId = String(user.id || 'current');
                    const profiles = loadUserProfiles();
                    const existingProfile = profiles[userId];

                    if (!validateUsername(desired)) {
                      window.alert('Usernames must be 3-20 characters: lowercase letters, numbers, or underscores.');
                      return;
                    }

                    if (!isUsernameChangeAllowed(existingProfile || ({} as any), desired)) {
                      window.alert('You can only change your username once every 30 days.');
                      return;
                    }

                    const updated = upsertUserProfile(profiles, { userId, username: desired });
                    saveUserProfiles(updated);
                    setIsEditingHandle(false);
                    setDraftHandle(desired);
                    if (onProfileUpdated) onProfileUpdated({ handle: desired });
                  }} className="px-3 py-1 bg-[#945d3f] text-white rounded">Save</button>
                  <button onClick={() => { setIsEditingHandle(false); setDraftHandle(user.handle || ''); }} className="px-3 py-1 border rounded">Cancel</button>
                </div>
              )}
            </div>

            <div className="mt-4">
              {!isEditingBio ? (
                <div>
                  {user.bio ? (
                    <div className="flex items-start gap-2 text-sm text-gray-700">
                      <p className="whitespace-pre-wrap">{user.bio}</p>
                      {isOwnProfile && <button onClick={() => setIsEditingBio(true)} aria-label="edit bio" className="p-1 -ml-1 rounded-full hover:bg-gray-100 text-gray-500"><Edit2 className="w-4 h-4" /></button>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>No bio added yet. Click to add one.</span>
                      {isOwnProfile && <button onClick={() => setIsEditingBio(true)} aria-label="edit bio" className="p-1 rounded-full hover:bg-gray-100 text-gray-500"><Edit2 className="w-4 h-4" /></button>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <textarea value={draftBio} onChange={(e) => setDraftBio(e.target.value)} aria-label="bio" className="w-full rounded border px-3 py-2 text-sm" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setIsEditingBio(false); setDraftBio(user.bio || ''); }} className="px-3 py-1 border rounded">Cancel</button>
                    <button onClick={() => {
                      const userId = String(user.id || 'current');
                      const profiles = loadUserProfiles();
                      const updated = upsertUserProfile(profiles, { userId, bio: draftBio });
                      saveUserProfiles(updated);
                      setIsEditingBio(false);
                      if (onProfileUpdated) onProfileUpdated({ bio: draftBio });
                    }} className="px-3 py-1 bg-[#945d3f] text-white rounded">Save</button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
              {user.location && (
                <div className="inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{user.location}</span>
                </div>
              )}
              {user.joinDate && (
                <div className="inline-flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{formatJoinDate(user.joinDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto mt-2 md:mt-0">
          <div className="flex md:flex-col items-center md:items-end gap-3">
            <button type="button" onClick={handleShareProfile} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${copied ? 'border border-emerald-500 text-emerald-600 bg-emerald-50' : 'border border-[#e6dacb] text-[#44403c] bg-white hover:bg-[#fffaf6]'}`}>
              {copied ? <><Check className="w-4 h-4" /> <span>Copied! ✓</span></> : <><Share className="w-4 h-4" /> <span>Share profile</span></>}
            </button>
          </div>
        </div>
      </div>
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-md rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-cozy-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Update Profile Picture</h3>
              <button onClick={() => setShowAvatarModal(false)} className="p-1 rounded-md text-gray-600 hover:bg-[var(--theme-surface-alt)]"><X size={16} /></button>
            </div>

            <div className="mt-4">
              <div className="inline-flex rounded-full bg-gray-100 p-1 gap-1">
                <button onClick={() => setActiveTab('presets')} className={`px-3 py-1 rounded-full text-sm font-medium ${activeTab === 'presets' ? 'bg-[#945d3f] text-white' : 'text-gray-700'}`}>Preset Avatars</button>
                <button onClick={() => setActiveTab('upload')} className={`px-3 py-1 rounded-full text-sm font-medium ${activeTab === 'upload' ? 'bg-[#945d3f] text-white' : 'text-gray-700'}`}>Upload Photo</button>
              </div>

              <div className="mt-3">
                {activeTab === 'presets' && (
                  <PresetGrid onSelect={(file) => setSelectedPreset(file)} selected={selectedPreset} />
                )}

                {activeTab === 'upload' && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) setUploadFile(f); }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center ${dragOver ? 'border-[#945d3f]/80 bg-[var(--theme-surface)]' : 'border-gray-200'}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="w-8 h-8 text-gray-400" />
                      <p className="text-sm text-gray-600">Click to choose or drag an image here</p>
                      <label className="mt-2 inline-flex items-center px-4 py-2 bg-[#faf6f3] text-[#8c5a35] border border-[#e2d5c8] rounded-lg cursor-pointer">
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleInputChange} className="hidden" />
                        Choose file
                      </label>
                      {uploadFile && <p className="text-xs text-gray-500 mt-2">Selected: {uploadFile.name}</p>}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => { setShowAvatarModal(false); setSelectedPreset(null); setUploadFile(null); }} className="rounded border px-3 py-1">Cancel</button>
                <button onClick={() => {
                  if (activeTab === 'presets' && selectedPreset && onSelectPreset) {
                    onSelectPreset(selectedPreset);
                    setShowAvatarModal(false);
                    return;
                  }
                  if (activeTab === 'upload' && uploadFile) {
                    handleFile(uploadFile);
                    return;
                  }
                }} className="rounded px-3 py-1 bg-[#945d3f] text-white">Save Picture</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatJoinDate(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short' };
    return `Joined ${d.toLocaleDateString(undefined, opts)}`.replace(',', '');
  } catch {
    return iso;
  }
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/http';
import {
  patchMe,
  resolveAvatarUrl,
  uploadAvatar,
  type MeUser,
} from '../api/users';
import { useAuth } from '../auth/AuthContext';
import ProfileLayout from '../components/ProfileLayout';

function EditProfileForm({
  me,
  reload,
}: {
  me: MeUser;
  reload: () => Promise<void>;
}) {
  const { applyMeUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [aboutBio, setAboutBio] = useState(me.aboutBio ?? '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [clearAvatar, setClearAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAboutBio(me.aboutBio ?? '');
    setClearAvatar(false);
  }, [me.id, me.aboutBio, me.avatarUrl]);

  const displayAvatar = clearAvatar
    ? '/no-avatar.jpg'
    : previewUrl || resolveAvatarUrl(me.avatarUrl);

  const onPickFile = (file: File | null) => {
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setClearAvatar(false);
    setSaved(false);
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      let latest = me;
      if (pendingFile) {
        latest = await uploadAvatar(pendingFile);
        setPendingFile(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
      }
      latest = await patchMe({ aboutBio: aboutBio.trim() });
      applyMeUser(latest);
      setSaved(true);
      await reload();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not save profile',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-profile">
      <div className="profile-top">
        <h1 className="profile-title">Edit profile</h1>
        <Link to="/profile/overview" className="profile-top-link">
          Profile overview
        </Link>
      </div>

      <section className="edit-photo-section">
        <h2 className="profile-section-title">Photo</h2>
        <div className="edit-photo-row">
          <div className="edit-avatar-wrap">
            <img src={displayAvatar} alt="" className="edit-avatar" />
            <span className="edit-avatar-fog" aria-hidden />
            <button
              type="button"
              className="edit-avatar-trash"
              aria-label="Remove photo"
              onClick={() => {
                setClearAvatar(true);
                setPendingFile(null);
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }
              }}
            >
              <img src="/rubbish.png" alt="" />
            </button>
          </div>
          <div className="edit-photo-meta">
            <div className="edit-thumbs">
              {previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt=""
                    className="edit-thumb edit-thumb--active"
                  />
                  {me.avatarUrl && !clearAvatar ? (
                    <img
                      src={resolveAvatarUrl(me.avatarUrl)}
                      alt=""
                      className="edit-thumb"
                    />
                  ) : null}
                </>
              ) : me.avatarUrl && !clearAvatar ? (
                <img
                  src={resolveAvatarUrl(me.avatarUrl)}
                  alt=""
                  className="edit-thumb edit-thumb--active"
                />
              ) : null}
            </div>
            <p className="edit-photo-help">
              A profile photo that shows your face can help other hosts and
              guests get to know you
            </p>
            <label className="edit-upload-btn">
              Upload photo
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="edit-about-section">
        <h2 className="profile-section-title">About</h2>
        <textarea
          className="edit-about"
          value={aboutBio}
          onChange={(e) => {
            setAboutBio(e.target.value);
            setSaved(false);
          }}
          placeholder="Tell hosts and guests a bit about yourself…"
          maxLength={2000}
        />
      </section>

      {error ? <p className="profile-error">{error}</p> : null}
      {saved ? <p className="profile-success">Profile saved.</p> : null}

      <div className="edit-actions">
        <Link to="/profile/overview" className="edit-cancel">
          CANCEL
        </Link>
        <button
          type="button"
          className="edit-save"
          disabled={saving}
          onClick={() => void onSave()}
        >
          {saving ? 'SAVING…' : 'SAVE'}
        </button>
      </div>
    </div>
  );
}

export default function EditProfilePage() {
  return (
    <ProfileLayout title="Edit profile">
      {(me, reload) => <EditProfileForm me={me} reload={reload} />}
    </ProfileLayout>
  );
}

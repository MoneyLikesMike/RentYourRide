import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/http';
import {
  createStudioTeamMember,
  deleteStudioTeamMember,
  listStudioTeam,
  updateStudioTeamMember,
  uploadTeamPhoto,
} from '../../api/studio';
import type { TeamMember } from '../../api/team';
import { errorMessage } from './helpers';

type Draft = {
  name: string;
  role: string;
  bio: string;
  photoUrl: string | null;
  sortOrder: number;
  published: boolean;
};

const EMPTY_DRAFT: Draft = {
  name: '',
  role: '',
  bio: '',
  photoUrl: null,
  sortOrder: 0,
  published: true,
};

function toDraft(member: TeamMember): Draft {
  return {
    name: member.name,
    role: member.role,
    bio: member.bio,
    photoUrl: member.photoUrl,
    sortOrder: member.sortOrder,
    published: member.published,
  };
}

type Props = {
  onUnauthorized: () => void;
};

export default function TeamPanel({ onUnauthorized }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setMembers(await listStudioTeam());
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        onUnauthorized();
        return;
      }
      setError(errorMessage(err, 'Could not load the team'));
    }
  }, [onUnauthorized]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function startNew() {
    setSelectedId(null);
    setDraft({ ...EMPTY_DRAFT, sortOrder: members.length });
    setStatus(null);
    setError(null);
  }

  function openMember(member: TeamMember) {
    setSelectedId(member.id);
    setDraft(toDraft(member));
    setStatus(null);
    setError(null);
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!draft.name.trim()) {
      setError('A name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);

    const payload = {
      name: draft.name.trim(),
      role: draft.role.trim(),
      bio: draft.bio.trim(),
      photoUrl: draft.photoUrl,
      sortOrder: draft.sortOrder,
      published: draft.published,
    };

    try {
      const saved = selectedId
        ? await updateStudioTeamMember(selectedId, payload)
        : await createStudioTeamMember(payload);
      setSelectedId(saved.id);
      setDraft(toDraft(saved));
      setStatus(saved.published ? 'Saved and showing on the About page.' : 'Saved and hidden.');
      await refresh();
    } catch (err) {
      setError(errorMessage(err, 'Could not save this team member'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selectedId) return;
    if (!window.confirm(`Remove ${draft.name || 'this person'} from the team?`)) return;
    setBusy(true);
    try {
      await deleteStudioTeamMember(selectedId);
      setSelectedId(null);
      setDraft(EMPTY_DRAFT);
      await refresh();
      setStatus('Removed from the site.');
    } catch (err) {
      setError(errorMessage(err, 'Could not remove this team member'));
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      update('photoUrl', await uploadTeamPhoto(file));
      setStatus('Photo uploaded. Remember to save.');
    } catch (err) {
      setError(errorMessage(err, 'Could not upload that photo'));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <div className="studio-layout">
      <aside className="studio-sidebar">
        <button
          type="button"
          className="studio-button studio-button--primary studio-new"
          onClick={startNew}
        >
          Add team member
        </button>

        <ul className="studio-list">
          {members.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                className={`studio-list-item${member.id === selectedId ? ' is-active' : ''}`}
                onClick={() => openMember(member)}
              >
                <span className="studio-list-person">
                  {member.photoUrl ? (
                    <img className="studio-list-avatar" src={member.photoUrl} alt="" />
                  ) : (
                    <span className="studio-list-avatar studio-list-avatar--empty" />
                  )}
                  <span className="studio-list-title">{member.name}</span>
                </span>
                <span className={`studio-badge${member.published ? ' is-published' : ''}`}>
                  {member.published ? 'Live' : 'Hidden'}
                </span>
              </button>
            </li>
          ))}
          {members.length === 0 ? (
            <li className="studio-empty">No team members yet.</li>
          ) : null}
        </ul>
      </aside>

      <main className="studio-editor">
        <div className="studio-field-row">
          <label className="studio-field">
            <span>Name</span>
            <input
              value={draft.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Michael Okoye"
            />
          </label>

          <label className="studio-field">
            <span>Role</span>
            <input
              value={draft.role}
              onChange={(e) => update('role', e.target.value)}
              placeholder="Founder"
            />
          </label>
        </div>

        <label className="studio-field">
          <span>Bio</span>
          <textarea
            rows={8}
            maxLength={4000}
            value={draft.bio}
            onChange={(e) => update('bio', e.target.value)}
            placeholder="Leave a blank line between paragraphs."
          />
          <small className="studio-hint">
            The first couple of lines show on the card; the full bio opens when someone
            clicks the profile.
          </small>
        </label>

        <div className="studio-field">
          <span>Photo</span>
          <div className="studio-cover">
            {draft.photoUrl ? (
              <img src={draft.photoUrl} alt="" className="studio-avatar-preview" />
            ) : (
              <div className="studio-avatar-preview studio-cover-preview--empty">
                No photo
              </div>
            )}
            <div className="studio-cover-actions">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                onChange={pickPhoto}
                className="studio-file"
              />
              {draft.photoUrl ? (
                <button
                  type="button"
                  className="studio-button"
                  onClick={() => update('photoUrl', null)}
                >
                  Remove photo
                </button>
              ) : null}
            </div>
          </div>
          <small className="studio-hint">
            Square photos look best — they are cropped to a circle.
          </small>
        </div>

        <div className="studio-field-row">
          <label className="studio-field">
            <span>Order</span>
            <input
              type="number"
              value={draft.sortOrder}
              onChange={(e) => update('sortOrder', Number(e.target.value) || 0)}
            />
            <small className="studio-hint">Lower numbers appear first.</small>
          </label>

          <label className="studio-field studio-field--toggle">
            <span>Visibility</span>
            <label className="studio-checkbox">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => update('published', e.target.checked)}
              />
              Show on the About page
            </label>
          </label>
        </div>

        {error ? <p className="studio-error">{error}</p> : null}
        {status ? <p className="studio-status">{status}</p> : null}

        <div className="studio-actions">
          <button
            type="button"
            className="studio-button studio-button--primary"
            onClick={() => void save()}
            disabled={busy}
          >
            {selectedId ? 'Save changes' : 'Add to the team'}
          </button>
          {selectedId ? (
            <button
              type="button"
              className="studio-button studio-button--danger"
              onClick={() => void remove()}
              disabled={busy}
            >
              Remove
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
}

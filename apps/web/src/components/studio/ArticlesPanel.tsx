import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Article } from '../../api/articles';
import { ApiError } from '../../api/http';
import {
  createStudioArticle,
  deleteStudioArticle,
  listStudioArticles,
  updateStudioArticle,
  uploadArticleCover,
} from '../../api/studio';
import { errorMessage, slugify } from './helpers';

type Draft = {
  title: string;
  slug: string;
  category: string;
  author: string;
  summary: string;
  body: string;
  coverImageUrl: string | null;
  published: boolean;
};

const EMPTY_DRAFT: Draft = {
  title: '',
  slug: '',
  category: 'News',
  author: 'Rent Your Ride',
  summary: '',
  body: '',
  coverImageUrl: null,
  published: false,
};

function toDraft(article: Article): Draft {
  return {
    title: article.title,
    slug: article.slug,
    category: article.category,
    author: article.author,
    summary: article.summary,
    body: article.body,
    coverImageUrl: article.coverImageUrl,
    published: article.published,
  };
}

type Props = {
  onUnauthorized: () => void;
};

export default function ArticlesPanel({ onUnauthorized }: Props) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [slugTouched, setSlugTouched] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setArticles(await listStudioArticles());
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        onUnauthorized();
        return;
      }
      setError(errorMessage(err, 'Could not load articles'));
    }
  }, [onUnauthorized]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = useMemo(
    () => articles.find((a) => a.id === selectedId) ?? null,
    [articles, selectedId],
  );

  function startNew() {
    setSelectedId(null);
    setDraft(EMPTY_DRAFT);
    setSlugTouched(false);
    setStatus(null);
    setError(null);
  }

  function openArticle(article: Article) {
    setSelectedId(article.id);
    setDraft(toDraft(article));
    setSlugTouched(true);
    setStatus(null);
    setError(null);
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const effectiveSlug = slugTouched && draft.slug ? draft.slug : slugify(draft.title);

  async function save(published: boolean) {
    if (!draft.title.trim()) {
      setError('A title is required.');
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);

    const payload = {
      title: draft.title.trim(),
      slug: effectiveSlug,
      category: draft.category,
      author: draft.author,
      summary: draft.summary,
      body: draft.body,
      coverImageUrl: draft.coverImageUrl,
      published,
    };

    try {
      const saved = selectedId
        ? await updateStudioArticle(selectedId, payload)
        : await createStudioArticle(payload);
      setSelectedId(saved.id);
      setDraft(toDraft(saved));
      setSlugTouched(true);
      setStatus(saved.published ? 'Published.' : 'Saved as a draft.');
      await refresh();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the article'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selectedId) return;
    if (!window.confirm('Delete this article? This cannot be undone.')) return;
    setBusy(true);
    try {
      await deleteStudioArticle(selectedId);
      startNew();
      await refresh();
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the article'));
    } finally {
      setBusy(false);
    }
  }

  async function pickCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      update('coverImageUrl', await uploadArticleCover(file));
      setStatus('Cover image uploaded. Remember to save.');
    } catch (err) {
      setError(errorMessage(err, 'Could not upload that image'));
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
          New article
        </button>

        <ul className="studio-list">
          {articles.map((article) => (
            <li key={article.id}>
              <button
                type="button"
                className={`studio-list-item${article.id === selectedId ? ' is-active' : ''}`}
                onClick={() => openArticle(article)}
              >
                <span className="studio-list-title">{article.title}</span>
                <span className={`studio-badge${article.published ? ' is-published' : ''}`}>
                  {article.published ? 'Published' : 'Draft'}
                </span>
              </button>
            </li>
          ))}
          {articles.length === 0 ? (
            <li className="studio-empty">No articles yet.</li>
          ) : null}
        </ul>
      </aside>

      <main className="studio-editor">
        <label className="studio-field">
          <span>Title</span>
          <input
            value={draft.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Back with an enhanced experience"
          />
        </label>

        <div className="studio-field-row">
          <label className="studio-field">
            <span>Category</span>
            <input
              value={draft.category}
              onChange={(e) => update('category', e.target.value)}
              placeholder="News"
            />
          </label>

          <label className="studio-field">
            <span>Author</span>
            <input
              value={draft.author}
              onChange={(e) => update('author', e.target.value)}
            />
          </label>
        </div>

        <label className="studio-field">
          <span>URL</span>
          <input
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              update('slug', slugify(e.target.value));
            }}
          />
          <small className="studio-hint">
            rentyourride.ca/news/{effectiveSlug || '…'}
          </small>
        </label>

        <label className="studio-field">
          <span>Summary</span>
          <textarea
            rows={3}
            value={draft.summary}
            maxLength={500}
            onChange={(e) => update('summary', e.target.value)}
            placeholder="One or two sentences shown on the article card."
          />
        </label>

        <div className="studio-field">
          <span>Cover image</span>
          <div className="studio-cover">
            {draft.coverImageUrl ? (
              <img src={draft.coverImageUrl} alt="" className="studio-cover-preview" />
            ) : (
              <div className="studio-cover-preview studio-cover-preview--empty">
                No cover yet
              </div>
            )}
            <div className="studio-cover-actions">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                onChange={pickCover}
                className="studio-file"
              />
              {draft.coverImageUrl ? (
                <button
                  type="button"
                  className="studio-button"
                  onClick={() => update('coverImageUrl', null)}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <label className="studio-field">
          <span>Body</span>
          <textarea
            className="studio-body"
            rows={16}
            value={draft.body}
            onChange={(e) => update('body', e.target.value)}
            placeholder={
              'Write in plain text. Leave a blank line between paragraphs.\n\n## Use two hashes for a heading\n\n- Start a line with a dash for a bullet'
            }
          />
          <small className="studio-hint">
            Blank line = new paragraph · <code>## </code> = heading · <code>- </code> = bullet
          </small>
        </label>

        {error ? <p className="studio-error">{error}</p> : null}
        {status ? <p className="studio-status">{status}</p> : null}

        <div className="studio-actions">
          <button
            type="button"
            className="studio-button"
            onClick={() => void save(false)}
            disabled={busy}
          >
            {draft.published ? 'Unpublish' : 'Save draft'}
          </button>
          <button
            type="button"
            className="studio-button studio-button--primary"
            onClick={() => void save(true)}
            disabled={busy}
          >
            {draft.published ? 'Save changes' : 'Publish'}
          </button>
          {selected?.published ? (
            <Link className="studio-button" to={`/news/${selected.slug}`}>
              View
            </Link>
          ) : null}
          {selectedId ? (
            <button
              type="button"
              className="studio-button studio-button--danger"
              onClick={() => void remove()}
              disabled={busy}
            >
              Delete
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
}

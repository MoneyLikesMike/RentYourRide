import { useEffect, useRef, useState } from 'react';

type Platform = {
  id: string;
  label: string;
  icon: string;
  iconClass?: string;
  profileUrl: string;
  /** Embeddable feed URL. Omitted when the platform needs an API token. */
  embedUrl?: string;
  /** Individual post permalinks — used where the platform has no feed embed. */
  posts?: string[];
  /** Shown instead of an embed when nothing else is available. */
  note?: string;
};

const PLATFORMS: Platform[] = [
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: '/footer/tiktok.svg',
    profileUrl: 'https://www.tiktok.com/@rentyourride',
    embedUrl: 'https://www.tiktok.com/embed/@rentyourride',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: '/footer/youtube.svg',
    iconClass: 'youtube',
    profileUrl: 'https://www.youtube.com/@rentyourride',
    embedUrl:
      'https://www.youtube.com/embed/videoseries?list=UU6H1St7iz-nW7pN_JWVoJnA',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: '/footer/facebook.png',
    iconClass: 'facebook',
    profileUrl: 'https://www.facebook.com/rentyourride.ca/',
    embedUrl:
      'https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Frentyourride.ca%2F&tabs=timeline&width=500&height=620&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false',
  },
  {
    id: 'x',
    label: 'X',
    icon: '/footer/x.svg',
    profileUrl: 'https://x.com/rentyourride',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: '/footer/instagram.png',
    profileUrl: 'https://instagram.com/rentyourride.ca',
    posts: [
      'https://www.instagram.com/p/DKKVIdAx5Vp/',
      'https://www.instagram.com/p/Cl4zCcBMF-X/',
      'https://www.instagram.com/p/DbWxLuUia8r/',
    ],
  },
];

const X_SCRIPT_SRC = 'https://platform.twitter.com/widgets.js';
const IG_SCRIPT_SRC = 'https://www.instagram.com/embed.js';

declare global {
  interface Window {
    twttr?: { widgets?: { load?: (el?: HTMLElement) => void } };
    instgrm?: { Embeds?: { process?: () => void } };
  }
}

/**
 * Loads an external social widget script once and re-runs its processor when the
 * embeds mount. Instagram exposes `instgrm.Embeds.process`, X exposes
 * `twttr.widgets.load`.
 */
function useSocialScript(src: string, process: () => void) {
  useEffect(() => {
    if (document.querySelector(`script[src="${src}"]`)) {
      process();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = process;
    document.body.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
}

/** Grid of individual Instagram posts rendered with the official embed.js. */
function InstagramPosts({ posts }: { posts: string[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useSocialScript(IG_SCRIPT_SRC, () => window.instgrm?.Embeds?.process?.());

  return (
    <div className="social-ig-grid" ref={containerRef}>
      {posts.map((url) => (
        <blockquote
          key={url}
          className="instagram-media"
          data-instgrm-permalink={url}
          data-instgrm-version="14"
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            View this post on Instagram
          </a>
        </blockquote>
      ))}
    </div>
  );
}

/** X timeline widget — loads the official script on demand. */
function XTimeline({ profileUrl }: { profileUrl: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useSocialScript(X_SCRIPT_SRC, () =>
    window.twttr?.widgets?.load?.(containerRef.current ?? undefined),
  );

  return (
    <div className="social-embed social-embed--x" ref={containerRef}>
      <a
        className="twitter-timeline"
        data-height="620"
        data-chrome="noheader nofooter transparent"
        href={profileUrl}
      >
        Posts from Rent Your Ride
      </a>
    </div>
  );
}

/** Tabbed feed of the latest posts from our social accounts. */
export default function SocialFeed() {
  const [activeId, setActiveId] = useState(PLATFORMS[0].id);
  const active = PLATFORMS.find((p) => p.id === activeId) ?? PLATFORMS[0];

  return (
    <div className="social-feed">
      <div className="social-tabs" role="tablist" aria-label="Social accounts">
        {PLATFORMS.map((platform) => (
          <button
            key={platform.id}
            type="button"
            role="tab"
            id={`social-tab-${platform.id}`}
            aria-selected={platform.id === activeId}
            aria-controls={`social-panel-${platform.id}`}
            className={`social-tab${platform.id === activeId ? ' is-active' : ''}`}
            onClick={() => setActiveId(platform.id)}
          >
            <img
              src={platform.icon}
              alt=""
              className={`social-tab-icon${platform.iconClass ? ` ${platform.iconClass}` : ''}`}
            />
            {platform.label}
          </button>
        ))}
      </div>

      <div
        className="social-panel"
        role="tabpanel"
        id={`social-panel-${active.id}`}
        aria-labelledby={`social-tab-${active.id}`}
      >
        {active.id === 'x' ? (
          <XTimeline profileUrl={active.profileUrl} />
        ) : active.posts ? (
          <InstagramPosts posts={active.posts} />
        ) : active.embedUrl ? (
          <iframe
            key={active.id}
            className="social-embed"
            src={active.embedUrl}
            title={`Latest ${active.label} posts from Rent Your Ride`}
            loading="lazy"
            allow="encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="social-empty">
            <p className="social-empty-note">{active.note}</p>
          </div>
        )}

        <a
          className="social-follow"
          href={active.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Follow us on {active.label}
        </a>
      </div>
    </div>
  );
}

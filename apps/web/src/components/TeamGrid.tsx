import { useEffect, useState } from 'react';
import { listTeam, type TeamMember } from '../api/team';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function Avatar({ member, className }: { member: TeamMember; className: string }) {
  if (member.photoUrl) {
    return (
      <img className={className} src={member.photoUrl} alt={member.name} loading="lazy" />
    );
  }
  return (
    <div className={`${className} team-photo--initials`} aria-hidden="true">
      {initials(member.name)}
    </div>
  );
}

/** Team members published from the studio. Renders nothing until there are some. */
export default function TeamGrid() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [active, setActive] = useState<TeamMember | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTeam()
      .then((rows) => {
        if (!cancelled) setMembers(rows);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active]);

  if (members.length === 0) return null;

  return (
    <>
      <ul className="team-grid">
        {members.map((member) => (
          <li key={member.id}>
            <button
              type="button"
              className="team-card"
              onClick={() => setActive(member)}
              aria-haspopup="dialog"
            >
              <Avatar member={member} className="team-photo" />
              <h3 className="team-name">{member.name}</h3>
              {member.role ? <p className="team-role">{member.role}</p> : null}
              {member.bio ? <p className="team-bio">{member.bio}</p> : null}
              <span className="team-more">Read bio</span>
            </button>
          </li>
        ))}
      </ul>

      {active ? (
        <div
          className="team-modal-backdrop"
          role="presentation"
          onClick={() => setActive(null)}
        >
          <div
            className="team-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-modal-name"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="team-modal-close"
              onClick={() => setActive(null)}
              aria-label="Close"
            >
              <img src="/close.png" alt="" className="close-x-img" />
            </button>

            <Avatar member={active} className="team-modal-photo" />
            <h3 className="team-modal-name" id="team-modal-name">
              {active.name}
            </h3>
            {active.role ? <p className="team-modal-role">{active.role}</p> : null}

            {active.bio ? (
              <div className="team-modal-bio">
                {active.bio
                  .split(/\n{2,}/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
            ) : (
              <p className="team-modal-bio">No bio yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

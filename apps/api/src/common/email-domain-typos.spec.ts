import {
  EMAIL_DOMAIN_TYPO_MAP,
  findEmailDomainTypo,
  emailTypoUserMessage,
} from './email-domain-typos';

describe('email-domain-typos', () => {
  it('flags gmil.com (HubSpot BD case)', () => {
    const hit = findEmailDomainTypo('denzel@gmil.com');
    expect(hit?.suggestedEmail).toBe('denzel@gmail.com');
    expect(emailTypoUserMessage('denzel@gmil.com')).toMatch(/gmail\.com/);
  });

  it('flags gmial / hotmail / outlook / yahoo / icloud typos', () => {
    expect(findEmailDomainTypo('a@gmial.com')?.suggestion).toBe('gmail.com');
    expect(findEmailDomainTypo('a@hotmal.com')?.suggestion).toBe('hotmail.com');
    expect(findEmailDomainTypo('a@outlok.com')?.suggestion).toBe('outlook.com');
    expect(findEmailDomainTypo('a@yaho.com')?.suggestion).toBe('yahoo.com');
    expect(findEmailDomainTypo('a@iclod.com')?.suggestion).toBe('icloud.com');
  });

  it('allows correct domains', () => {
    expect(findEmailDomainTypo('host@gmail.com')).toBeNull();
    expect(findEmailDomainTypo('host@yahoo.ca')).toBeNull();
    expect(findEmailDomainTypo('host@rentyourride.ca')).toBeNull();
  });

  it('exposes typo domain list for admin filters', () => {
    expect(EMAIL_DOMAIN_TYPO_MAP['gmil.com']).toBe('gmail.com');
  });
});

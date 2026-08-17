type Props = {
  src: string;
  alt: string;
  className?: string;
};

/** CSS-drawn iPhone frame wrapped around an app screenshot. */
export default function PhoneMockup({ src, alt, className }: Props) {
  return (
    <div className={className ? `phone-mockup ${className}` : 'phone-mockup'}>
      <div className="phone-mockup-island" aria-hidden />
      <img src={src} alt={alt} className="phone-mockup-screen" />
    </div>
  );
}

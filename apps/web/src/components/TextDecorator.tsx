type Props = {
  title: string;
  /** Underline width. Use `"100%"` to span the full title. */
  width?: string;
};

/** Yellow underline accent from legacy TextDecorator */
export default function TextDecorator({ title, width = '4rem' }: Props) {
  const full = width === '100%';
  return (
    <span
      className="text-decorator"
      style={full ? undefined : { minWidth: width }}
    >
      {title}
      <span className="text-decorator-underline" style={{ width }} />
    </span>
  );
}

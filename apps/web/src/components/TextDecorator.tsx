type Props = {
  title: string;
  width?: string;
};

/** Yellow underline accent from legacy TextDecorator */
export default function TextDecorator({ title, width = '4rem' }: Props) {
  return (
    <span className="text-decorator" style={{ minWidth: width }}>
      {title}
      <span className="text-decorator-underline" style={{ width }} />
    </span>
  );
}

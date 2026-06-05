import Link from "next/link";

export default function Home() {
  return (
    <main>
      <Link href="/auth">
        <button type="button">Go to login</button>
      </Link>
    </main>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-blue-100">
      <h1 className="text-4xl font-extrabold mb-4 text-blue-900">Welcome to Vibe!</h1>
      <p className="mb-8 text-lg text-blue-700">
        Your AI dashboard for projects, chat, and more.
      </p>
      <Link
        href="/auth/signin"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold shadow hover:bg-blue-700 transition"
      >
        Sign In
      </Link>
    </main>
  );
}
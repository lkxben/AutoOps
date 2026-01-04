import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full text-center px-4">
      <h1 className="text-5xl font-extrabold mb-6">Welcome to AutoOps</h1>
      <p className="text-lg max-w-xl mb-8">
        Automate your tasks, track your progress, and stay on top of your operations—all in one place.
      </p>
      <div className="space-x-4">
        <Link href="/tasks/new">
          <button className="px-6 py-3 bg-sky-400 hover:bg-sky-500 text-white font-semibold rounded-lg">
            Get Started
          </button>
        </Link>
      </div>
      <div className="mt-12 max-w-2xl">
        <p className="text-gray-600">
          AutoOps helps you streamline your workflows, connect your services, and get real-time updates
          instantly. Sign up now and take control of your operations!
        </p>
      </div>
    </div>
  );
}

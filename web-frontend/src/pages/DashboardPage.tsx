import Header from '../components/Header';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          העגלה שלי
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300">בקרוב...</p>
      </div>
    </div>
  );
}

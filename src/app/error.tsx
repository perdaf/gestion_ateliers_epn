'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold text-red-600 mb-4">Oups !</h1>
      <h2 className="text-2xl font-semibold mb-6">Une erreur est survenue</h2>
      <p className="text-gray-600 mb-8 max-w-md">
        Nous sommes désolés, mais quelque chose s&apos;est mal passé. Veuillez réessayer ou contacter l&apos;administrateur si le problème persiste.
      </p>
      <div className="space-y-4">
        <button
          onClick={() => reset()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
        >
          Réessayer
        </button>
        <div>
          <button
            onClick={() => window.location.href = '/'}
            className="text-blue-600 hover:underline"
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    </div>
  );
}
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GamesPage } from './pages/GamesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GamesPage />
    </QueryClientProvider>
  );
}

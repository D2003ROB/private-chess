import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { GamesPage } from './pages/GamesPage';
import { BoardPage } from './pages/BoardPage';

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
      <BrowserRouter>
        <nav className="site-nav">
          <NavLink to="/">Games</NavLink>
          <NavLink to="/board">Board</NavLink>
        </nav>
        <Routes>
          <Route path="/" element={<GamesPage />} />
          <Route path="/board" element={<BoardPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

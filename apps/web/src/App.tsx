import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { GamesPage } from './pages/GamesPage';
import { BoardPage } from './pages/BoardPage';
import { ReviewPage } from './pages/ReviewPage';
import { GameProvider } from './game';

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
        {/* The played game lives above the routes so /review can read what
            /board produced without serialising it through the URL. */}
        <GameProvider>
          <nav className="site-nav">
            <NavLink to="/">Games</NavLink>
            <NavLink to="/board">Board</NavLink>
            <NavLink to="/review">Review</NavLink>
          </nav>
          <Routes>
            <Route path="/" element={<GamesPage />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/review" element={<ReviewPage />} />
          </Routes>
        </GameProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

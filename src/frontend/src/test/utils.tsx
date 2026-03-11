import { PropsWithChildren, ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';

type WrapperOptions = {
  useMemoryRouter?: boolean;
  initialEntries?: string[];
};

export const createTestWrapper = (options: WrapperOptions = {}) => {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: PropsWithChildren) => {
    const router = options.useMemoryRouter ? (
      <MemoryRouter initialEntries={options.initialEntries || ['/']}>{children}</MemoryRouter>
    ) : (
      <BrowserRouter>{children}</BrowserRouter>
    );

    return <QueryClientProvider client={queryClient}>{router}</QueryClientProvider>;
  };

  return Wrapper;
};

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

type RenderRouteOptions = {
  route: string;
  path: string;
  renderOptions?: Omit<RenderOptions, 'wrapper'>;
};

export const renderWithRoute = (ui: ReactElement, options: RenderRouteOptions) => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[options.route]}>
        <Routes>
          <Route path={options.path} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
    options.renderOptions
  );
};

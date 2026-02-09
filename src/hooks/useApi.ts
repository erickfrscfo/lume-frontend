import { useState, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<any>) => {
    setState({ data: null, isLoading: true, error: null });
    try {
      const response = await apiCall();
      const data = response.data?.data || response.data;
      setState({ data, isLoading: false, error: null });
      return data;
    } catch (err: any) {
      const error = err.response?.data?.error || err.message || 'Erro desconhecido';
      setState({ data: null, isLoading: false, error });
      throw err;
    }
  }, []);

  return { ...state, execute };
}

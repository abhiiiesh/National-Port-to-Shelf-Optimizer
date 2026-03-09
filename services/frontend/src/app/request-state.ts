export type ViewStateStatus = 'idle' | 'loading' | 'empty' | 'ready' | 'error';

export interface ViewState<TData> {
  status: ViewStateStatus;
  data: TData | null;
  errorMessage: string | null;
}

export const createIdleState = <TData>(): ViewState<TData> => ({
  status: 'idle',
  data: null,
  errorMessage: null,
});

export const createLoadingState = <TData>(previousData: TData | null = null): ViewState<TData> => ({
  status: 'loading',
  data: previousData,
  errorMessage: null,
});

export const createReadyState = <TData>(data: TData): ViewState<TData> => ({
  status: 'ready',
  data,
  errorMessage: null,
});

export const createEmptyState = <TData>(): ViewState<TData> => ({
  status: 'empty',
  data: null,
  errorMessage: null,
});

export const createErrorState = <TData>(errorMessage: string): ViewState<TData> => ({
  status: 'error',
  data: null,
  errorMessage,
});

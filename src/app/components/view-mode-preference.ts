export type ViewMode = 'grid' | 'list';
export type ViewModeScope = 'distributor' | 'brand' | 'product';

export function loadViewMode(scope: ViewModeScope): ViewMode {
  try {
    return localStorage.getItem(`${scope}-view-mode`) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

export function saveViewMode(scope: ViewModeScope, mode: ViewMode): void {
  try {
    localStorage.setItem(`${scope}-view-mode`, mode);
  } catch {
    // A visualização continua funcionando quando o armazenamento está indisponível.
  }
}

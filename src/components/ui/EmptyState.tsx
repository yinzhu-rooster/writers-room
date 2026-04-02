interface EmptyStateProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

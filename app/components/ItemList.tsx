'use client';

type ConfigItemType = 'clients' | 'campaigns' | 'publications';

interface Item {
  name: string;
  hidden?: boolean;
}

interface ItemListProps {
  label: string;
  items: Item[];
  isAdding: boolean;
  newItemValue: string;
  editingIndex: number | null;
  editItemValue: string;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onSaveNew: () => void;
  onNewValueChange: (v: string) => void;
  onStartEdit: (index: number) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditValueChange: (v: string) => void;
  onRemove: (index: number) => void;
  onToggleVisibility: (name: string) => void;
}

export function ItemList({
  label,
  items,
  isAdding,
  newItemValue,
  editingIndex,
  editItemValue,
  onStartAdd,
  onCancelAdd,
  onSaveNew,
  onNewValueChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditValueChange,
  onRemove,
  onToggleVisibility,
}: ItemListProps) {
  const singular = label.slice(0, -1).toLowerCase(); // "Clients" → "client"

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">{label}</h3>
        <button className="btn btn-primary" onClick={onStartAdd}>+ Add</button>
      </div>
      <div className="space-y-2">
        {[...items].sort((a, b) => a.name.localeCompare(b.name)).map((item) => {
          const actualIndex = items.findIndex(i => i.name === item.name);
          const isEditing = editingIndex === actualIndex;

          return (
            <div key={item.name} className="flex justify-between items-center bg-gray-50 p-2 rounded">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    className="flex-1 px-2 py-1 border rounded mr-2"
                    value={editItemValue}
                    onChange={(e) => onEditValueChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveEdit();
                      if (e.key === 'Escape') onCancelEdit();
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={onSaveEdit}
                      className="text-green-600 hover:text-green-700 p-1 rounded"
                      title="Save changes"
                      disabled={!editItemValue.trim()}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={onCancelEdit}
                      className="text-gray-600 hover:text-gray-700 p-1 rounded"
                      title="Cancel"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className={item.hidden ? 'text-gray-400 line-through' : ''}>{item.name}</span>
                    <button
                      onClick={() => onToggleVisibility(item.name)}
                      className="text-gray-500 hover:text-gray-700 p-1 rounded"
                      title={item.hidden ? `Show this ${singular}` : `Hide this ${singular}`}
                    >
                      {item.hidden ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-blue-600 hover:text-blue-700 p-1 rounded"
                      onClick={() => onStartEdit(actualIndex)}
                      title={`Edit ${singular} name`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button className="text-red-600 hover:text-red-700" onClick={() => onRemove(actualIndex)}>
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {isAdding && (
          <div className="flex items-center gap-2 bg-blue-50 p-2 rounded border">
            <input
              type="text"
              className="flex-1 px-2 py-1 border rounded"
              placeholder={`Enter new ${singular} name`}
              value={newItemValue}
              onChange={(e) => onNewValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveNew();
                if (e.key === 'Escape') onCancelAdd();
              }}
              autoFocus
            />
            <button
              className="btn btn-primary text-sm px-3 py-1"
              onClick={onSaveNew}
              disabled={!newItemValue.trim()}
            >
              Save
            </button>
            <button
              className="btn btn-secondary text-sm px-3 py-1"
              onClick={onCancelAdd}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

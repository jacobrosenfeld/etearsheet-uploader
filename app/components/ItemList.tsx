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
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-semibold text-slate-700">{label}</h3>
        <button className="btn-primary text-sm py-1.5 px-3" onClick={onStartAdd}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>
      <div className="space-y-1.5">
        {[...items].sort((a, b) => a.name.localeCompare(b.name)).map((item) => {
          const actualIndex = items.findIndex(i => i.name === item.name);
          const isEditing = editingIndex === actualIndex;

          return (
            <div key={item.name} className={`flex justify-between items-center px-3 py-2 rounded-lg border transition-colors ${isEditing ? 'border-brand/30 bg-brand/5' : 'border-slate-100 bg-slate-50 hover:bg-white'}`}>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    className="flex-1 px-2 py-1 border border-slate-200 rounded-lg mr-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                    value={editItemValue}
                    onChange={(e) => onEditValueChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveEdit();
                      if (e.key === 'Escape') onCancelEdit();
                    }}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={onSaveEdit}
                      className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Save changes"
                      disabled={!editItemValue.trim()}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={onCancelEdit}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Cancel"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${item.hidden ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{item.name}</span>
                    <button
                      onClick={() => onToggleVisibility(item.name)}
                      className="p-1 text-slate-300 hover:text-slate-500 rounded transition-colors"
                      title={item.hidden ? `Show this ${singular}` : `Hide this ${singular}`}
                    >
                      {item.hidden ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="p-1.5 text-brand/60 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors"
                      onClick={() => onStartEdit(actualIndex)}
                      title={`Edit ${singular} name`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      className="p-1.5 text-brand-secondary/60 hover:text-brand-secondary hover:bg-brand-secondary/5 rounded-lg transition-colors text-xs font-medium"
                      onClick={() => onRemove(actualIndex)}
                      title={`Remove ${singular}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {isAdding && (
          <div className="flex items-center gap-2 bg-brand/5 border border-brand/20 p-2.5 rounded-lg">
            <input
              type="text"
              className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder={`New ${singular} name`}
              value={newItemValue}
              onChange={(e) => onNewValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveNew();
                if (e.key === 'Escape') onCancelAdd();
              }}
              autoFocus
            />
            <button
              className="btn-primary text-sm py-1.5 px-3"
              onClick={onSaveNew}
              disabled={!newItemValue.trim()}
            >
              Save
            </button>
            <button
              className="btn-secondary text-sm py-1.5 px-3"
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

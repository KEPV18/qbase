import React, { useCallback } from 'react';
import { FieldSchema } from '../../data/formSchemas';
import { RichTextField } from './RichTextField';

interface EditableSchemaFieldProps {
  field: FieldSchema;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  readOnly?: boolean;
  error?: string;
}

export const EditableSchemaField: React.FC<EditableSchemaFieldProps> = ({
  field, value, onChange, readOnly = false, error,
}) => {
  const handleChange = useCallback((newValue: unknown) => {
    onChange(field.key, newValue);
  }, [field.key, onChange]);

  const renderInput = () => {
    switch (field.type) {
      case 'text':
      case 'signature':
        return <input type="text" value={String(value || '')} onChange={e => handleChange(e.target.value)}
          readOnly={readOnly}
          className={`w-full px-3 py-2 border rounded-md text-sm ${error ? 'border-red-500' : 'border-input'} ${readOnly ? 'bg-muted/50' : 'bg-white'}`}
          placeholder={field.placeholder || `Enter ${field.label}`}
        />;

      case 'textarea':
        return <RichTextField value={String(value || '')} onChange={html => handleChange(html)}
          placeholder={field.placeholder || `Enter ${field.label}`} readOnly={readOnly} minHeight="80px"
        />;

      case 'number':
        return <input type="number" value={String(value || '')}
          onChange={e => handleChange(e.target.value === '' ? '' : Number(e.target.value))}
          readOnly={readOnly}
          className={`w-full px-3 py-2 border rounded-md text-sm font-mono ${error ? 'border-red-500' : 'border-input'} ${readOnly ? 'bg-muted/50' : 'bg-white'}`}
        />;

      case 'date': {
        const isoValue = String(value || '').replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1');
        return <input type="date" value={isoValue}
          onChange={e => {
            const d = e.target.value;
            if (d) { const [y, m, day] = d.split('-'); handleChange(`${day}/${m}/${y}`); }
            else handleChange('');
          }}
          readOnly={readOnly}
          className={`w-full px-3 py-2 border rounded-md text-sm ${error ? 'border-red-500' : 'border-input'} ${readOnly ? 'bg-muted/50' : 'bg-white'}`}
        />;
      }

      case 'select':
        return <select value={String(value || '')} onChange={e => handleChange(e.target.value)} disabled={readOnly}
          className={`w-full px-3 py-2 border rounded-md text-sm ${error ? 'border-red-500' : 'border-input'} ${readOnly ? 'bg-muted/50' : 'bg-white'}`}
        >
          <option value="">Select {field.label}...</option>
          {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>;

      case 'radio':
        return <div className="flex flex-wrap gap-3">
          {field.options?.map(opt => <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name={field.key} value={opt} checked={value === opt}
              onChange={e => handleChange(e.target.value)} disabled={readOnly} className="w-4 h-4"
            />
            <span className="text-sm">{opt}</span>
          </label>)}
        </div>;

      case 'checkbox':
        return <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!value} onChange={e => handleChange(e.target.checked)}
            disabled={readOnly} className="w-5 h-5 rounded"
          />
          <span className="text-sm">{field.label}</span>
        </label>;

      case 'multiselect': {
        const currentValues = Array.isArray(value) ? value : String(value || '').split(',').map(s => s.trim()).filter(Boolean);
        return <div className="flex flex-wrap gap-2">
          {field.options?.map(opt => <label key={opt}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
              currentValues.includes(opt) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-border text-muted-foreground hover:bg-accent'
            } ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input type="checkbox" value={opt} checked={currentValues.includes(opt)}
              onChange={e => {
                const newValues = e.target.checked ? [...currentValues, opt] : currentValues.filter(v => v !== opt);
                handleChange(newValues);
              }}
              disabled={readOnly} className="hidden"
            />
            {opt}
          </label>)}
        </div>;
      }

      case 'table': {
        const rows = Array.isArray(value) ? value : [];
        const columns = field.columns || [];
        return <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50">
                <th className="px-2 py-1.5 text-xs font-medium text-left">#</th>
                {columns.map(col => <th key={col.key} className="px-2 py-1.5 text-xs font-medium text-left">{col.label}</th>)}
                {!readOnly && <th className="px-2 py-1.5 w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                  {columns.map(col => <td key={col.key} className="px-2 py-1.5">
                    <input type="text" value={String((row as Record<string, unknown>)?.[col.key] || '')}
                      onChange={e => {
                        const newRows = [...rows];
                        newRows[i] = { ...(newRows[i] as Record<string, unknown>), [col.key]: e.target.value };
                        handleChange(newRows);
                      }}
                      readOnly={readOnly}
                      className={`w-full px-2 py-1 text-sm border rounded ${readOnly ? 'bg-transparent' : 'bg-white border-input'}`}
                    />
                  </td>)}
                  {!readOnly && <td className="px-2 py-1.5">
                    <button onClick={() => handleChange(rows.filter((_, ri) => ri !== i))}
                      className="text-red-500 hover:text-red-700"
                    >×</button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
          {!readOnly && <button onClick={() => {
            const newRow: Record<string, unknown> = {};
            columns.forEach(col => newRow[col.key] = '');
            handleChange([...rows, newRow]);
          }} className="w-full px-3 py-2 text-sm text-muted-foreground hover:bg-accent border-t"
          >+ Add Row</button>}
        </div>;
      }

      default:
        return <RichTextField value={String(value || '')} onChange={html => handleChange(html)}
          placeholder={field.placeholder || `Enter ${field.label}`} readOnly={readOnly} minHeight="60px"
        />;
    }
  };

  return (
    <div className={`space-y-1 ${error ? 'animate-shake' : ''}`}>
      {field.type !== 'checkbox' && (
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{field.label}</span>
          {field.required && <span className="text-red-500">*</span>}
        </div>
      )}
      {renderInput()}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default EditableSchemaField;
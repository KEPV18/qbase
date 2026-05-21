/**
 * Simple form validation utilities
 */

type ValidationRule<T> = {
  validate: (value: T) => boolean;
  message: string;
};

type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]> | ValidationRule<T[K]>[];
};

type ValidationErrors<T> = Partial<Record<keyof T, string>>;

export function validateForm<T extends Record<string, unknown>>(
  data: T,
  rules: ValidationRules<T>
): { isValid: boolean; errors: ValidationErrors<T> } {
  const errors: ValidationErrors<T> = {};

  for (const key in rules) {
    const fieldRules = rules[key];
    const value = data[key];

    if (Array.isArray(fieldRules)) {
      for (const rule of fieldRules) {
        if (!rule.validate(value as never)) {
          errors[key as keyof T] = rule.message;
          break;
        }
      }
    } else if (fieldRules) {
      if (!fieldRules.validate(value as never)) {
        errors[key as keyof T] = fieldRules.message;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Common validation rules
export const validators = {
  required: (message = 'This field is required'): ValidationRule<unknown> => ({
    validate: (value) => value !== null && value !== undefined && value !== '',
    message,
  }),

  email: (message = 'Invalid email address'): ValidationRule<string> => ({
    validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || value.length >= min,
    message: message || `Minimum ${min} characters required`,
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || value.length <= max,
    message: message || `Maximum ${max} characters allowed`,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    validate: (value) => !value || regex.test(value),
    message,
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value === undefined || value >= min,
    message: message || `Minimum value is ${min}`,
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value === undefined || value <= max,
    message: message || `Maximum value is ${max}`,
  }),

  url: (message = 'Invalid URL'): ValidationRule<string> => ({
    validate: (value) => !value || /^https?:\/\/.+/.test(value),
    message,
  }),

  phone: (message = 'Invalid phone number'): ValidationRule<string> => ({
    validate: (value) => !value || /^[\d\s\-+()]{10,}$/.test(value),
    message,
  }),

  date: (message = 'Invalid date'): ValidationRule<string> => ({
    validate: (value) => !value || !isNaN(Date.parse(value)),
    message,
  }),

  // For select/radio/checkbox groups
  oneOf: <T>(options: T[], message?: string): ValidationRule<T> => ({
    validate: (value) => options.includes(value),
    message: message || `Must be one of: ${options.join(', ')}`,
  }),
};

// Type-safe form hook
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validationRules: ValidationRules<T>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors<T>>({});

  const validate = useCallback(() => {
    const result = validateForm(values, validationRules);
    setErrors(result.errors);
    return result.isValid;
  }, [values, validationRules]);

  const handleChange = useCallback((field: keyof T, value: unknown) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is changed
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  return {
    values,
    errors,
    isValid: Object.keys(errors).length === 0,
    validate,
    handleChange,
    reset,
    setValues,
  };
}
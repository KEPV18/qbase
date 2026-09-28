// ============================================================================
// QBase — Schema & Validation Exports
// Central import point for all validation logic
// ============================================================================

export {
  FORM_ZOD_SCHEMAS,
  getZodSchema,
  validateFormData,
  // Types
  type F08Data, type F09Data, type F10Data, type F50Data,
  type F11Data, type F19Data,
  type F12Data, type F17Data, type F18Data, type F22Data, type F25Data, type F47Data, type F48Data,
  type F13Data, type F14Data, type F15Data, type F16Data,
  type F28Data, type F29Data, type F30Data, type F40Data, type F41Data, type F42Data, type F43Data, type F44Data,
  type F32Data, type F34Data, type F35Data, type F37Data,
  type F20Data, type F21Data, type F23Data, type F24Data, type F45Data, type F46Data,
} from './formValidation';

// NOTE: this barrel used to re-export F08Schema … F50Schema from
// './formValidation'. formValidation.ts never exported them and nothing in the
// repository imported them, so through this barrel they resolved to `undefined`
// at runtime and to TS2305 at compile time. The usable entry points are
// FORM_ZOD_SCHEMAS / getZodSchema (values) and the per-form F##Data types above.

export {
  isoToDisplay,
  displayToIso,
  todayDDMMYYYY,
  todayISO,
  generateSerial,
  getNextSerial,
  registerSerials,
  isSerialUnique,
  checkPreCreationGate,
  getFrequencyWarning,
  type PreCreationAnswers,
  type PreCreationGateData,
  type PreCreationField,
  validatePreCreationGate, // alias for backward compatibility
} from './serialAndDate';
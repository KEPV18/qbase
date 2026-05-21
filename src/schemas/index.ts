// ============================================================================
// QMS Forge — Schema & Validation Exports
// Central import point for all validation logic
// ============================================================================

export { 
  FORM_ZOD_SCHEMAS,
  PreCreationGateSchema,
  getZodSchema,
  validateFormData,
  validatePreCreationGate,
  // All individual schemas
  F08Schema, F09Schema, F10Schema, F50Schema,
  F11Schema, F19Schema,
  F12Schema, F17Schema, F18Schema, F22Schema, F25Schema, F47Schema, F48Schema,
  F13Schema, F14Schema, F15Schema, F16Schema,
  F28Schema, F29Schema, F30Schema, F40Schema, F41Schema, F42Schema, F43Schema, F44Schema,
  F32Schema, F34Schema, F35Schema, F37Schema,
  F20Schema, F21Schema, F23Schema, F24Schema, F45Schema, F46Schema,
  // Types
  type F08Data, type F09Data, type F10Data, type F50Data,
  type F11Data, type F19Data,
  type F12Data, type F17Data, type F18Data, type F22Data, type F25Data, type F47Data, type F48Data,
  type F13Data, type F14Data, type F15Data, type F16Data,
  type F28Data, type F29Data, type F30Data, type F40Data, type F41Data, type F42Data, type F43Data, type F44Data,
  type F32Data, type F34Data, type F35Data, type F37Data,
  type F20Data, type F21Data, type F23Data, type F24Data, type F45Data, type F46Data,
  type PreCreationGateData,
} from './formValidation';

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
} from './serialAndDate';
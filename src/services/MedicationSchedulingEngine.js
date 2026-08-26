/**
 * Medication Scheduling Engine
 * -----------------------------
 * Single-file, dependency-free business logic for:
 *
 * Prescription API
 *   -> API mapping (SmartCare HIS & standard models)
 *   -> quantity/frequency calculation
 *   -> medication activation
 *   -> date/time schedule generation
 *   -> deterministic alarms
 *   -> taken/skip/snooze actions
 *   -> dashboard/today selectors
 *
 * Date convention:
 * - scheduledDate is inclusive: a 7-day course starting on 2026-08-26 ends on
 *   2026-09-01.
 * - All schedule times are patient's local time. Pass a numeric timezone offset
 *   such as "+05:30" for India. The IANA timezone is also stored as metadata.
 */

// ---------------------------------------------------------------------------
// Configuration and public constants
// ---------------------------------------------------------------------------

export const MEDICATION_STATUS = Object.freeze({
  UPCOMING: "UPCOMING",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
});

export const SCHEDULE_STATUS = Object.freeze({
  SCHEDULED: "SCHEDULED",
  TAKEN: "TAKEN",
  SKIPPED: "SKIPPED",
  SNOOZED: "SNOOZED",
  CANCELLED: "CANCELLED",
});

export const ALARM_STATUS = Object.freeze({
  SCHEDULED: "SCHEDULED",
  FIRED: "FIRED",
  CANCELLED: "CANCELLED",
});

export const DEFAULT_MEDICATION_TIMING_CONFIG = Object.freeze({
  // The specification's default Indian medication timings.
  MORNING: "08:00",
  AFTERNOON: "14:00",
  EVENING: "20:00",

  // A configurable fallback for a fourth frequency value (1-1-1-1).
  // Replace this in product configuration if the product uses another night
  // slot. The first three values above are the required defaults.
  NIGHT: "22:00",
});

export const DEFAULT_SLOT_NAMES = Object.freeze([
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "NIGHT",
]);

export const DEFAULT_TIMEZONE_OFFSET = "+05:30";
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Generic utilities
// ---------------------------------------------------------------------------

export function required(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${fieldName} is required`);
  }
  return value;
}

export function nonNegativeNumber(value, fieldName) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return number;
}

export function positiveNumber(value, fieldName) {
  const number = nonNegativeNumber(value, fieldName);
  if (number <= 0) {
    throw new Error(`${fieldName} must be greater than zero`);
  }
  return number;
}

export function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function firstDefined(object, keys, fallback = undefined) {
  for (const key of keys) {
    if (object && object[key] !== undefined && object[key] !== null) {
      return object[key];
    }
  }
  return fallback;
}

export function toDateOnly(value, fieldName = "date") {
  if (!value) {
    return todayInUtc();
  }
  const text = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    // Attempt Date parse
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    throw new Error(`${fieldName} must use YYYY-MM-DD (received "${value}")`);
  }
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new Error(`${fieldName} is not a valid calendar date`);
  }
  return text;
}

export function todayInUtc(now = new Date()) {
  const d = new Date(now);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateOnly, days) {
  const date = new Date(`${toDateOnly(dateOnly)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + Number(days));
  return date.toISOString().slice(0, 10);
}

export function compareDates(left, right) {
  return toDateOnly(left).localeCompare(toDateOnly(right));
}

export function normalizeTime(time, fieldName = "time") {
  if (typeof time !== "string") {
    throw new Error(`${fieldName} must be a string in HH:mm format`);
  }

  const trimmed = time.trim();

  // Support 12h formats like "08:00 AM" or "8:00 PM"
  if (/am|pm/i.test(trimmed)) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const [hm, meridiem] = parts;
      let [h, m] = hm.split(":").map(Number);
      if (meridiem.toUpperCase() === "PM" && h < 12) h += 12;
      if (meridiem.toUpperCase() === "AM" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
    }
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    throw new Error(`${fieldName} must use HH:mm`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw new Error(`${fieldName} is not a valid time`);
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatTime12h(time24h) {
  if (!time24h) return "08:00 AM";
  const [hStr, mStr] = String(time24h).slice(0, 5).split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  if (isNaN(h)) return "08:00 AM";
  const meridiem = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, "0")}:${m} ${meridiem}`;
}

export function normalizeTimezoneOffset(offset = DEFAULT_TIMEZONE_OFFSET) {
  const text = String(offset).trim();
  if (!/^[+-]\d{2}:\d{2}$/.test(text)) {
    return DEFAULT_TIMEZONE_OFFSET;
  }
  const hours = Number(text.slice(1, 3));
  const minutes = Number(text.slice(4, 6));
  if (hours > 23 || minutes > 59) {
    return DEFAULT_TIMEZONE_OFFSET;
  }
  return text;
}

export function localDateTime(dateOnly, time, timezoneOffset) {
  const date = toDateOnly(dateOnly, "scheduledDate");
  const normalizedTime = normalizeTime(time, "scheduledTime");
  const offset = normalizeTimezoneOffset(timezoneOffset);
  return `${date}T${normalizedTime}:00${offset}`;
}

export function isFutureInstant(scheduledAt, now = new Date()) {
  return Date.parse(scheduledAt) > new Date(now).getTime();
}

export function isPastOrNow(scheduledAt, now = new Date()) {
  return !isFutureInstant(scheduledAt, now);
}

export function stableId(...parts) {
  return parts
    .map((part) =>
      String(part ?? "")
        .trim()
        .replace(/[^a-zA-Z0-9_.-]+/g, "_"),
    )
    .join(":");
}

export function sum(values) {
  return values.reduce((total, value) => total + Number(value), 0);
}

// ---------------------------------------------------------------------------
// Frequency, timing, and quantity domain services
// ---------------------------------------------------------------------------

/**
 * Parses medical frequencies into slot doses:
 * - "1-1-1", "1-0-1", "1-0-0", "0-0-1", "1-1-1-1"
 * - "OD" / "once_daily" -> [1, 0, 0]
 * - "BD" / "BID" / "twice_daily" -> [1, 0, 1]
 * - "TDS" / "TID" / "thrice_daily" -> [1, 1, 1]
 * - "QID" / "four_times_daily" -> [1, 1, 1, 1]
 * - "night" / "before_sleep" -> [0, 0, 1]
 * - "morning" -> [1, 0, 0]
 * - "afternoon" -> [0, 1, 0]
 * - Array: [1, 1, 1]
 */
export function parseFrequency(frequency, slotNames = DEFAULT_SLOT_NAMES) {
  if (Array.isArray(frequency)) {
    return frequency.map((value, index) => {
      const dose = Number(value);
      let slot = slotNames[index] || `SLOT_${index + 1}`;
      if (frequency.length === 3) {
        if (index === 0) slot = 'MORNING';
        else if (index === 1) slot = 'AFTERNOON';
        else if (index === 2) slot = 'NIGHT';
      }
      return {
        slot,
        dose: Number.isFinite(dose) && dose >= 0 ? dose : 0,
      };
    });
  }

  const raw = String(frequency || '').trim();
  const lower = raw.toLowerCase();

  // 1. Explicit Numeric Pattern: e.g. "1-1-1", "1-0-1", "0-0-1", "0-1-0", "1/1/1", "1 0 1", "1-1-1-1"
  const patternMatch = raw.match(/^(\d+)\s*[-/.,|\s]\s*(\d+)\s*[-/.,|\s]\s*(\d+)(?:\s*[-/.,|\s]\s*(\d+))?$/);
  if (patternMatch) {
    if (patternMatch[4] !== undefined) {
      return [
        { slot: 'MORNING', dose: Number(patternMatch[1]) || 0 },
        { slot: 'AFTERNOON', dose: Number(patternMatch[2]) || 0 },
        { slot: 'EVENING', dose: Number(patternMatch[3]) || 0 },
        { slot: 'NIGHT', dose: Number(patternMatch[4]) || 0 },
      ];
    } else {
      return [
        { slot: 'MORNING', dose: Number(patternMatch[1]) || 0 },
        { slot: 'AFTERNOON', dose: Number(patternMatch[2]) || 0 },
        { slot: 'NIGHT', dose: Number(patternMatch[3]) || 0 },
      ];
    }
  }

  // 2-digit pattern: e.g. "1-1" (Morning & Night) or "1-0" (Morning) or "0-1" (Night)
  const twoDigitMatch = raw.match(/^(\d+)\s*[-/.,|\s]\s*(\d+)$/);
  if (twoDigitMatch) {
    return [
      { slot: 'MORNING', dose: Number(twoDigitMatch[1]) || 0 },
      { slot: 'AFTERNOON', dose: 0 },
      { slot: 'NIGHT', dose: Number(twoDigitMatch[2]) || 0 },
    ];
  }

  // 2. Multi-word Natural Language Detection (e.g. "Morning, Afternoon, Night", "Morning & Night", "Night only")
  const hasMorning = /morning|breakfast|subah|\bam\b/i.test(lower);
  const hasAfternoon = /afternoon|lunch|dopahar|\bnoon\b/i.test(lower);
  const hasEvening = /evening|sunset|shaam/i.test(lower);
  const hasNight = /night|dinner|bedtime|raat|\bhs\b/i.test(lower);

  const matchedKeywordsCount = (hasMorning ? 1 : 0) + (hasAfternoon ? 1 : 0) + (hasEvening ? 1 : 0) + (hasNight ? 1 : 0);
  if (matchedKeywordsCount >= 1) {
    const slots = [];
    if (hasMorning) slots.push({ slot: 'MORNING', dose: 1 });
    if (hasAfternoon) slots.push({ slot: 'AFTERNOON', dose: 1 });
    if (hasEvening) slots.push({ slot: 'EVENING', dose: 1 });
    if (hasNight) slots.push({ slot: 'NIGHT', dose: 1 });
    return slots;
  }

  // 3. Latin / Medical Abbreviations
  if (/qid|4 times|four times/i.test(lower)) {
    return [
      { slot: 'MORNING', dose: 1 },
      { slot: 'AFTERNOON', dose: 1 },
      { slot: 'EVENING', dose: 1 },
      { slot: 'NIGHT', dose: 1 },
    ];
  }
  if (/tds|tid|thrice|3 times|three times/i.test(lower)) {
    return [
      { slot: 'MORNING', dose: 1 },
      { slot: 'AFTERNOON', dose: 1 },
      { slot: 'NIGHT', dose: 1 },
    ];
  }
  if (/bd|bid|twice|2 times|two times/i.test(lower)) {
    return [
      { slot: 'MORNING', dose: 1 },
      { slot: 'AFTERNOON', dose: 0 },
      { slot: 'NIGHT', dose: 1 },
    ];
  }
  if (/hs|bedtime|night/i.test(lower)) {
    return [
      { slot: 'MORNING', dose: 0 },
      { slot: 'AFTERNOON', dose: 0 },
      { slot: 'NIGHT', dose: 1 },
    ];
  }
  if (/noon|afternoon/i.test(lower)) {
    return [
      { slot: 'MORNING', dose: 0 },
      { slot: 'AFTERNOON', dose: 1 },
      { slot: 'NIGHT', dose: 0 },
    ];
  }

  // 4. Number of times per day
  if (typeof frequency === 'number') {
    if (frequency === 1) return [{ slot: 'MORNING', dose: 1 }];
    if (frequency === 2) return [{ slot: 'MORNING', dose: 1 }, { slot: 'NIGHT', dose: 1 }];
    if (frequency === 3) return [{ slot: 'MORNING', dose: 1 }, { slot: 'AFTERNOON', dose: 1 }, { slot: 'NIGHT', dose: 1 }];
    if (frequency === 4) return [{ slot: 'MORNING', dose: 1 }, { slot: 'AFTERNOON', dose: 1 }, { slot: 'EVENING', dose: 1 }, { slot: 'NIGHT', dose: 1 }];
  }

  // Default: Once Daily (Morning)
  return [
    { slot: 'MORNING', dose: 1 },
    { slot: 'AFTERNOON', dose: 0 },
    { slot: 'NIGHT', dose: 0 },
  ];
}

/**
 * Converts a timing profile into { SLOT: "HH:mm" }.
 * Accepted forms:
 *   { MORNING: "08:00", EVENING: "20:00" }
 *   [{ slot: "MORNING", time: "08:00" }]
 */
export function normalizeTimingProfile(profile) {
  if (!profile) return {};
  const result = {};

  if (Array.isArray(profile)) {
    for (const item of profile) {
      if (!item) continue;
      const slot = String(item.slot || item.name || "").toUpperCase();
      const time = item.time || item.scheduledTime;
      if (slot && time) {
        try {
          result[slot] = normalizeTime(time, `${slot} time`);
        } catch {
          // Ignore bad single timing
        }
      }
    }
    return result;
  }

  for (const [rawSlot, rawTime] of Object.entries(profile)) {
    if (rawTime == null || rawTime === "") continue;
    const slot = String(rawSlot).toUpperCase();
    try {
      result[slot] = normalizeTime(rawTime, `${slot} time`);
    } catch {
      // Ignore
    }
  }
  return result;
}

/**
 * Timing priority is explicit and configurable:
 * doctor -> medicine -> patient -> default.
 * The first configured time for each slot wins.
 */
export function resolveTimingProfile({
  doctorTimings,
  medicineTimings,
  patientTimingProfile,
  defaultTimingProfile = DEFAULT_MEDICATION_TIMING_CONFIG,
  priority = ["doctor", "medicine", "patient", "default"],
} = {}) {
  const sources = {
    doctor: normalizeTimingProfile(doctorTimings),
    medicine: normalizeTimingProfile(medicineTimings),
    patient: normalizeTimingProfile(patientTimingProfile),
    default: normalizeTimingProfile(defaultTimingProfile),
  };

  const slots = new Set(
    Object.values(sources).flatMap((profile) => Object.keys(profile)),
  );
  const resolved = {};

  for (const slot of slots) {
    for (const sourceName of priority) {
      if (sources[sourceName]?.[slot]) {
        resolved[slot] = sources[sourceName][slot];
        break;
      }
    }
  }

  // Fallback defaults for core slots
  const fallback = normalizeTimingProfile(DEFAULT_MEDICATION_TIMING_CONFIG);
  for (const [slot, time] of Object.entries(fallback)) {
    if (!resolved[slot]) {
      resolved[slot] = time;
    }
  }

  return resolved;
}

export class FrequencyScheduleResolver {
  constructor({
    timingProfile = DEFAULT_MEDICATION_TIMING_CONFIG,
    slotNames = DEFAULT_SLOT_NAMES,
  } = {}) {
    this.timingProfile = normalizeTimingProfile(timingProfile);
    this.slotNames = slotNames;
  }

  resolve(frequency, timingProfile = this.timingProfile) {
    const frequencySlots = parseFrequency(frequency, this.slotNames);
    const profile = normalizeTimingProfile({
      ...DEFAULT_MEDICATION_TIMING_CONFIG,
      ...this.timingProfile,
      ...timingProfile,
    });

    return frequencySlots.map(({ slot, dose }) => {
      const time = profile[slot] || DEFAULT_MEDICATION_TIMING_CONFIG[slot] || "08:00";
      return {
        slot,
        time,
        dose,
      };
    });
  }
}

export function calculateQuantityPlan(quantity, frequency, durationDays) {
  const frequencySlots = parseFrequency(frequency);
  const dailyQuantity = sum(frequencySlots.map((slot) => slot.dose)) || 1;

  let prescribedQuantity = Number(quantity);
  let expectedDays = 0;

  if (Number.isFinite(prescribedQuantity) && prescribedQuantity > 0) {
    expectedDays = Math.ceil(prescribedQuantity / dailyQuantity);
  } else if (Number.isFinite(Number(durationDays)) && Number(durationDays) > 0) {
    expectedDays = Number(durationDays);
    prescribedQuantity = dailyQuantity * expectedDays;
  } else {
    // Default to 7-day course
    expectedDays = 7;
    prescribedQuantity = dailyQuantity * expectedDays;
  }

  const fullDays = Math.floor(prescribedQuantity / dailyQuantity);
  const remainder = prescribedQuantity % dailyQuantity;

  return {
    prescribedQuantity,
    dailyQuantity,
    fullDays,
    remainder,
    totalDays: expectedDays,
    expectedDurationDays: expectedDays,
  };
}

export function expectedCompletionDate(startDate, durationDays) {
  return durationDays > 0 ? addDays(startDate, durationDays - 1) : startDate;
}

// ---------------------------------------------------------------------------
// Medication lifecycle and schedule generation
// ---------------------------------------------------------------------------

export function getRemainingQuantity(prescribedQuantity, consumedQuantity = 0) {
  return Math.max(
    0,
    nonNegativeNumber(prescribedQuantity || 0, "prescribedQuantity") -
      nonNegativeNumber(consumedQuantity || 0, "consumedQuantity"),
  );
}

export function getMedicationStatus({
  startDate,
  endDate,
  prescribedQuantity,
  consumedQuantity = 0,
  cancelled = false,
  now = new Date(),
}) {
  const currentDate = todayInUtc(new Date(now));
  const remainingQuantity = getRemainingQuantity(
    prescribedQuantity,
    consumedQuantity,
  );

  if (cancelled) return MEDICATION_STATUS.CANCELLED;
  // A zero-quantity prescription is never ACTIVE.
  if (remainingQuantity === 0) return MEDICATION_STATUS.COMPLETED;
  if (compareDates(currentDate, startDate) < 0) return MEDICATION_STATUS.UPCOMING;
  if (endDate && compareDates(currentDate, endDate) > 0) {
    return MEDICATION_STATUS.EXPIRED;
  }
  return MEDICATION_STATUS.ACTIVE;
}

export function isCancelledStatus(status) {
  return status === SCHEDULE_STATUS.CANCELLED || status === ALARM_STATUS.CANCELLED;
}

/**
 * Creates exactly one schedule/alarm candidate per active frequency slot.
 * A final partial day is capped with Math.min(), so generated quantity can
 * never exceed the prescription quantity.
 */
export function generateSchedules(medicine, {
  timingProfile = DEFAULT_MEDICATION_TIMING_CONFIG,
  slotNames = DEFAULT_SLOT_NAMES,
  now = new Date(),
} = {}) {
  const quantityPlan = calculateQuantityPlan(
    medicine.prescribedQuantity ?? medicine.quantity ?? medicine.qty,
    medicine.frequency,
    medicine.durationDays ?? medicine.duration,
  );

  const quantity = quantityPlan.prescribedQuantity;

  if (quantity === 0 || medicine.cancelled) return [];

  const resolver = new FrequencyScheduleResolver({ timingProfile, slotNames });
  const resolvedSlots = resolver.resolve(medicine.frequency, timingProfile);
  const timezoneOffset = normalizeTimezoneOffset(
    medicine.timezoneOffset || DEFAULT_TIMEZONE_OFFSET,
  );
  const startDate = toDateOnly(medicine.startDate || todayInUtc(now));
  const expectedEndDate = expectedCompletionDate(
    startDate,
    quantityPlan.expectedDurationDays,
  );
  const schedules = [];
  let generatedQuantity = 0;
  let dayIndex = 0;

  while (generatedQuantity < quantity) {
    const scheduledDate = addDays(startDate, dayIndex);
    if (medicine.endDate && compareDates(scheduledDate, medicine.endDate) > 0) {
      break;
    }

    for (let slotIndex = 0; slotIndex < resolvedSlots.length; slotIndex += 1) {
      const slot = resolvedSlots[slotIndex];
      if (slot.dose <= 0 || generatedQuantity >= quantity) continue;

      const doseQuantity = Math.min(slot.dose, quantity - generatedQuantity);
      const scheduledAt = localDateTime(
        scheduledDate,
        slot.time,
        timezoneOffset,
      );
      const scheduleId = stableId(
        "schedule",
        medicine.patientId,
        medicine.prescriptionId,
        medicine.medicinePrescriptionId,
        scheduledDate,
        slot.slot,
      );

      schedules.push({
        id: scheduleId,
        scheduleId,
        prescriptionId: String(medicine.prescriptionId || "RX-LOCAL"),
        medicinePrescriptionId: String(medicine.medicinePrescriptionId || medicine.medicineId || "MED-1"),
        patientId: String(medicine.patientId || "PAT-1"),
        medicineId: String(medicine.medicineId || "MED-1"),
        medicineName: medicine.medicineName || medicine.name || "Medicine",
        dosage: medicine.dosage || medicine.dose || "1 tablet",
        doseQuantity,
        scheduledDate,
        scheduledTime: slot.time,
        scheduledTime12h: formatTime12h(slot.time),
        scheduledAt,
        timezone: medicine.timezone || "Asia/Kolkata",
        timezoneOffset,
        slot: slot.slot,
        notes: medicine.notes || medicine.remark || "",
        timingInstruction: medicine.timingInstruction || medicine.foodInstruction || "After food",
        status: SCHEDULE_STATUS.SCHEDULED,
        createdAt: new Date(now).toISOString(),
        expectedCompletionDate: expectedEndDate,
      });

      generatedQuantity += doseQuantity;
    }

    dayIndex += 1;
    // A bad custom profile/frequency must never create an infinite loop.
    if (dayIndex > quantityPlan.totalDays + 3660) {
      break;
    }
  }

  return schedules;
}

export function makeMedicationDomainRecord(prescription, medicine, previous = {}, now = new Date()) {
  const quantityPlan = calculateQuantityPlan(
    medicine.prescribedQuantity ?? medicine.quantity ?? medicine.qty,
    medicine.frequency,
    medicine.durationDays ?? medicine.duration,
  );
  const timingProfile = resolveTimingProfile({
    doctorTimings: medicine.doctorTimings || prescription.doctorTimings,
    medicineTimings: medicine.medicineTimings,
    patientTimingProfile: medicine.patientTimingProfile,
  });

  const consumedQuantity = nonNegativeNumber(
    previous.consumedQuantity || 0,
    "consumedQuantity",
  );
  const remainingQuantity = getRemainingQuantity(
    quantityPlan.prescribedQuantity,
    consumedQuantity,
  );
  const cancelled =
    prescription.cancelled || medicine.cancelled || previous.cancelled === true;

  const startDate = toDateOnly(medicine.startDate || todayInUtc(now));
  const expectedEnd = expectedCompletionDate(
    startDate,
    quantityPlan.expectedDurationDays,
  );

  return {
    id: stableId(
      "medication",
      prescription.patientId,
      prescription.prescriptionId,
      medicine.medicinePrescriptionId,
    ),
    patientId: String(prescription.patientId),
    doctorId: prescription.doctorId == null ? null : String(prescription.doctorId),
    prescriptionId: String(prescription.prescriptionId),
    prescriptionVersion: Number(prescription.version || 1),
    prescribedAt: prescription.prescribedAt || new Date(now).toISOString(),
    medicinePrescriptionId: String(medicine.medicinePrescriptionId),
    medicineId: String(medicine.medicineId),
    medicineName: String(medicine.medicineName || medicine.name),
    dosage: medicine.dosage || medicine.dose || "",
    prescribedQuantity: quantityPlan.prescribedQuantity,
    consumedQuantity,
    remainingQuantity,
    scheduledQuantity: previous.scheduledQuantity || 0,
    frequency: medicine.frequency,
    dailyQuantity: quantityPlan.dailyQuantity,
    medicationDurationDays: quantityPlan.expectedDurationDays,
    startDate,
    endDate: medicine.endDate || expectedEnd,
    expectedCompletionDate: expectedEnd,
    notes: medicine.notes || medicine.remark || "",
    timingInstruction: medicine.timingInstruction || medicine.foodInstruction || "After food",
    timingProfile,
    timezone: medicine.timezone || "Asia/Kolkata",
    timezoneOffset: medicine.timezoneOffset || DEFAULT_TIMEZONE_OFFSET,
    cancelled,
    status: getMedicationStatus({
      startDate,
      endDate: medicine.endDate || expectedEnd,
      prescribedQuantity: quantityPlan.prescribedQuantity,
      consumedQuantity,
      cancelled,
      now,
    }),
    updatedAt: new Date(now).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// SmartCare & Generic API Mapping Layer
// ---------------------------------------------------------------------------

/**
 * Maps HIS or application prescription formats into normalized domain shape.
 */
export function mapApiPrescription(raw, customMapper) {
  if (typeof customMapper === "function") {
    return normalizePrescription(customMapper(raw));
  }

  const source = raw?.data?.prescription || raw?.prescription || raw?.data || raw;
  const rawMedicines =
    source?.medicines || source?.medications || source?.items || source?.itemList || [];

  const prescriptionId = String(
    firstDefined(source, ["prescriptionId", "id", "rxId", "serverId", "bookingId"], "RX-1")
  );
  const patientId = String(
    firstDefined(source, ["patientId", "patient_id", "clientid", "clientId"], "PAT-1")
  );
  const doctorId = firstDefined(source, [
    "doctorId",
    "doctor_id",
    "practid",
    "practitionerId",
    "_doctorPractid",
  ]);
  const prescribedAt = firstDefined(source, [
    "prescribedAt",
    "prescribed_at",
    "lastmodified",
    "date",
    "createdAt",
  ]);
  const version = firstDefined(source, ["version", "revision"], 1);

  return normalizePrescription({
    prescriptionId,
    patientId,
    doctorId,
    prescribedAt,
    version,
    status: source?.status,
    cancelled: source?.cancelled || source?.status === "CANCELLED",
    medicines: rawMedicines.map((rawMedicine, index) => {
      // Map SmartCare HIS fields: drug, dose, frequencyNote, duration, qty, remark
      const medName = firstDefined(rawMedicine, [
        "medicineName",
        "name",
        "drug",
        "drugName",
        "genericname",
        "medicine",
      ], `Medicine ${index + 1}`);

      const dosage = firstDefined(rawMedicine, [
        "dosage",
        "dose",
        "strength",
      ], "1 tablet");

      const frequency = firstDefined(rawMedicine, [
        "frequency",
        "frequencyNote",
        "frequency_note",
        "frequencyText",
        "dosageFrequency",
        "dosage_frequency",
        "schedule",
        "timing",
        "period",
        "routine",
        "dose_frequency",
      ], "1-0-1");

      const rawDuration = firstDefined(rawMedicine, [
        "durationDays",
        "duration",
        "durDays",
      ]);
      const durType = String(firstDefined(rawMedicine, ["priscdurationtype", "durationUnit", "duration_type"], "Days")).toLowerCase();
      let durationDays = 7;
      if (rawDuration) {
        const n = parseFloat(rawDuration) || 7;
        if (durType.includes("month")) durationDays = n * 30;
        else if (durType.includes("week")) durationDays = n * 7;
        else durationDays = n;
      }

      const quantity = firstDefined(rawMedicine, [
        "quantity",
        "qty",
        "prescribedQuantity",
        "totalQuantity",
      ]);

      const notes = firstDefined(rawMedicine, [
        "notes",
        "remark",
        "instructions",
        "instruction",
      ], "");

      const timingInstruction = firstDefined(rawMedicine, [
        "timingInstruction",
        "timingInstructions",
        "foodInstruction",
        "whenToTake",
      ], "After food");

      const startDate = firstDefined(rawMedicine, [
        "startDate",
        "start_date",
      ], source?.date || source?.lastmodified?.slice(0, 10) || todayInUtc());

      return {
        medicinePrescriptionId: firstDefined(rawMedicine, [
          "medicinePrescriptionId",
          "prescriptionMedicineId",
          "id",
        ], `${prescriptionId}-MED-${index + 1}`),
        medicineId: String(firstDefined(rawMedicine, [
          "medicineId",
          "medicine_id",
          "medicineid",
          "drugId",
          "id",
        ], `${index + 1}`)),
        medicineName: medName,
        dosage,
        quantity,
        durationDays,
        frequency,
        startDate,
        endDate: rawMedicine?.endDate || null,
        notes,
        timingInstruction,
        cancelled: rawMedicine?.cancelled || rawMedicine?.status === "CANCELLED",
        status: rawMedicine?.status,
        doctorTimings: rawMedicine?.doctorTimings || null,
        medicineTimings: rawMedicine?.medicineTimings || null,
        timezone: rawMedicine?.timezone || "Asia/Kolkata",
        timezoneOffset: rawMedicine?.timezoneOffset || DEFAULT_TIMEZONE_OFFSET,
      };
    }),
  });
}

export function normalizePrescription(prescription) {
  const source = required(prescription, "prescription");
  const medicines = Array.isArray(source.medicines) ? source.medicines : [];
  if (medicines.length === 0) {
    throw new Error("Prescription must contain at least one medicine");
  }

  return {
    prescriptionId: String(
      required(source.prescriptionId, "prescriptionId"),
    ),
    patientId: String(required(source.patientId, "patientId")),
    doctorId: source.doctorId == null ? null : String(source.doctorId),
    prescribedAt: source.prescribedAt || null,
    version: Number(source.version || 1),
    status: source.status || null,
    cancelled: Boolean(source.cancelled) || source.status === "CANCELLED",
    medicines: medicines.map((medicine, index) =>
      normalizeMedicine(medicine, index),
    ),
  };
}

function normalizeMedicine(medicine, index = 0) {
  const source = required(medicine, `medicines[${index}]`);
  const startDate = toDateOnly(
    source.startDate || todayInUtc(),
    `medicines[${index}].startDate`,
  );
  const endDate = source.endDate
    ? toDateOnly(source.endDate, `medicines[${index}].endDate`)
    : null;

  return {
    medicinePrescriptionId: String(
      source.medicinePrescriptionId ||
        source.prescriptionMedicineId ||
        `${source.medicineId || "MED"}-${index + 1}`,
    ),
    medicineId: String(
      required(source.medicineId, `medicines[${index}].medicineId`),
    ),
    medicineName: String(
      required(source.medicineName, `medicines[${index}].medicineName`),
    ),
    dosage: source.dosage == null ? "" : String(source.dosage),
    prescribedQuantity: nonNegativeNumber(
      source.prescribedQuantity ?? source.quantity ?? source.qty ?? 0,
      `medicines[${index}].quantity`,
    ),
    durationDays: source.durationDays ? Number(source.durationDays) : 7,
    frequency: source.frequency || "1-0-1",
    startDate,
    endDate,
    notes: source.notes == null ? "" : String(source.notes),
    cancelled:
      Boolean(source.cancelled) ||
      ["CANCELLED", "DISCONTINUED"].includes(String(source.status).toUpperCase()),
    doctorTimings: source.doctorTimings || source.explicitTimings || null,
    medicineTimings: source.medicineTimings || source.medicineTiming || null,
    timingInstruction: source.timingInstruction || "After food",
    timezone: source.timezone || source.timeZone || "Asia/Kolkata",
    timezoneOffset:
      source.timezoneOffset || source.timeZoneOffset || DEFAULT_TIMEZONE_OFFSET,
    patientTimingProfile: source.patientTimingProfile || null,
  };
}

// ---------------------------------------------------------------------------
// In-Memory Adapters (for testing / fallbacks)
// ---------------------------------------------------------------------------

export class InMemoryMedicationStore {
  constructor() {
    this.prescriptions = new Map();
    this.medications = new Map();
    this.schedules = new Map();
    this.alarms = new Map();
    this.events = [];
  }

  getMedication(id) {
    return this.medications.get(id);
  }

  saveMedication(medication) {
    this.medications.set(medication.id, clone(medication));
    return clone(medication);
  }

  listMedications() {
    return [...this.medications.values()].map(clone);
  }

  getSchedulesForMedication(medication) {
    return [...this.schedules.values()].filter(
      (schedule) =>
        schedule.prescriptionId === medication.prescriptionId &&
        schedule.medicinePrescriptionId === medication.medicinePrescriptionId &&
        schedule.patientId === medication.patientId,
    ).map(clone);
  }

  getSchedule(id) {
    return this.schedules.get(id);
  }

  saveSchedule(schedule) {
    this.schedules.set(schedule.id, clone(schedule));
    return clone(schedule);
  }

  listSchedules() {
    return [...this.schedules.values()].map(clone);
  }

  getAlarm(id) {
    return this.alarms.get(id);
  }

  saveAlarm(alarm) {
    this.alarms.set(alarm.id, clone(alarm));
    return clone(alarm);
  }

  listAlarms() {
    return [...this.alarms.values()].map(clone);
  }

  appendEvent(event) {
    this.events.push(clone(event));
  }

  listEvents() {
    return clone(this.events);
  }
}

export class InMemoryNotificationManager {
  constructor() {
    this.notifications = new Map();
  }

  schedule(notification) {
    this.notifications.set(notification.notificationId, clone(notification));
    return clone(notification);
  }

  cancel(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.status = ALARM_STATUS.CANCELLED;
      this.notifications.set(notificationId, notification);
    }
  }

  list() {
    return [...this.notifications.values()].map(clone);
  }
}

// ---------------------------------------------------------------------------
// Main Synchronization Engine
// ---------------------------------------------------------------------------

export class MedicationSchedulingEngine {
  constructor({
    repository,
    store = new InMemoryMedicationStore(),
    notificationManager = new InMemoryNotificationManager(),
    timingConfig = DEFAULT_MEDICATION_TIMING_CONFIG,
    slotNames = DEFAULT_SLOT_NAMES,
    prescriptionMapper = mapApiPrescription,
  } = {}) {
    this.repository = repository;
    this.store = store;
    this.notificationManager = notificationManager;
    this.timingConfig = timingConfig;
    this.slotNames = slotNames;
    this.prescriptionMapper = prescriptionMapper;
  }

  /**
   * Normal application entry point:
   * 1. Fetch API data.
   * 2. Map it into the domain.
   * 3. Reconcile every medicine.
   *
   * Repeating this method is safe and idempotent.
   */
  async syncPrescriptions({ patientId, now = new Date() } = {}) {
    if (!this.repository?.fetchPrescriptions) {
      throw new Error("repository.fetchPrescriptions is required");
    }

    const apiResponse = await this.repository.fetchPrescriptions(patientId);
    const rawPrescriptions = Array.isArray(apiResponse)
      ? apiResponse
      : apiResponse?.prescriptions ||
        apiResponse?.data?.prescriptions ||
        apiResponse?.data ||
        [apiResponse];

    const prescriptions = rawPrescriptions
      .filter(Boolean)
      .map((raw) => this.prescriptionMapper(raw));

    prescriptions.sort(comparePrescriptionsNewestFirst);

    const results = [];
    for (const prescription of prescriptions) {
      results.push(await this.syncPrescription(prescription, { now }));
    }
    return results;
  }

  async syncPrescription(input, { now = new Date() } = {}) {
    const prescription =
      input?.medicines && input?.medicines[0]?.medicineId !== undefined
        ? input
        : this.prescriptionMapper(input);

    if (this.store?.savePrescription) {
      await this.store.savePrescription(prescription);
    } else if (this.store?.prescriptions?.set) {
      this.store.prescriptions.set(
        stableId("prescription", prescription.patientId, prescription.prescriptionId),
        clone(prescription),
      );
    }

    const results = [];
    for (const medicine of prescription.medicines) {
      results.push(await this.syncMedicine(prescription, medicine, { now }));
    }
    return {
      prescriptionId: prescription.prescriptionId,
      patientId: prescription.patientId,
      medicines: results,
    };
  }

  async syncMedicine(prescription, medicine, { now = new Date() } = {}) {
    const medicationId = stableId(
      "medication",
      prescription.patientId,
      prescription.prescriptionId,
      medicine.medicinePrescriptionId,
    );
    const previous = (await this.store.getMedication(medicationId)) || {};

    await this.supersedeOlderPrescriptions(prescription, medicine, { now });

    const medication = makeMedicationDomainRecord(
      prescription,
      medicine,
      previous,
      now,
    );
    await this.store.saveMedication(medication);

    const desiredSchedules = medication.cancelled
      ? []
      : generateSchedules(
          {
            ...medicine,
            ...medication,
            prescribedQuantity: medication.prescribedQuantity,
          },
          {
            timingProfile: medication.timingProfile,
            slotNames: this.slotNames,
            now,
          },
        );

    const reconciled = await this.reconcileSchedulesAndAlarms(
      medication,
      desiredSchedules,
      { now },
    );

    const currentSchedules = await this.store.getSchedulesForMedication(medication);
    const scheduledQuantity = sum(
      currentSchedules
        .filter((schedule) => !isCancelledStatus(schedule.status))
        .map((schedule) => schedule.doseQuantity),
    );
    medication.scheduledQuantity = scheduledQuantity;
    medication.remainingQuantity = getRemainingQuantity(
      medication.prescribedQuantity,
      medication.consumedQuantity,
    );
    medication.status = getMedicationStatus({
      startDate: medication.startDate,
      endDate: medication.endDate,
      prescribedQuantity: medication.prescribedQuantity,
      consumedQuantity: medication.consumedQuantity,
      cancelled: medication.cancelled,
      now,
    });
    await this.store.saveMedication(medication);

    return {
      medication: clone(medication),
      schedulesCreated: reconciled.schedulesCreated,
      schedulesCancelled: reconciled.schedulesCancelled,
      alarmsCreated: reconciled.alarmsCreated,
      alarmsCancelled: reconciled.alarmsCancelled,
    };
  }

  async supersedeOlderPrescriptions(newPrescription, newMedicine, { now }) {
    const allMeds = await this.store.listMedications();
    const olderMedications = allMeds.filter(
      (oldMedication) =>
        oldMedication.patientId === newPrescription.patientId &&
        oldMedication.medicineId === newMedicine.medicineId &&
        oldMedication.prescriptionId !== newPrescription.prescriptionId &&
        comparePrescriptions(newPrescription, {
          prescriptionId: oldMedication.prescriptionId,
          prescribedAt: oldMedication.prescribedAt,
          version: oldMedication.prescriptionVersion,
        }) > 0,
    );

    for (const oldMedication of olderMedications) {
      const oldSchedules = await this.store.getSchedulesForMedication(oldMedication);
      for (const schedule of oldSchedules) {
        if (
          isFutureInstant(schedule.scheduledAt, now) &&
          schedule.status !== SCHEDULE_STATUS.TAKEN &&
          schedule.status !== SCHEDULE_STATUS.SKIPPED
        ) {
          schedule.status = SCHEDULE_STATUS.CANCELLED;
          schedule.cancelReason = "SUPERSEDED_BY_NEW_PRESCRIPTION";
          await this.store.saveSchedule(schedule);
          await this.cancelAlarmForSchedule(schedule);
        }
      }
      oldMedication.supersededBy = newPrescription.prescriptionId;
      oldMedication.updatedAt = new Date(now).toISOString();
      await this.store.saveMedication(oldMedication);
    }
  }

  async reconcileSchedulesAndAlarms(medication, desiredSchedules, { now }) {
    const desiredById = new Map(desiredSchedules.map((item) => [item.id, item]));
    const existingSchedules = await this.store.getSchedulesForMedication(medication);
    let schedulesCreated = 0;
    let schedulesCancelled = 0;
    let alarmsCreated = 0;
    let alarmsCancelled = 0;

    // Cancel only obsolete FUTURE schedules. Historical events are immutable.
    for (const existing of existingSchedules) {
      const isHistorical =
        existing.status === SCHEDULE_STATUS.TAKEN ||
        existing.status === SCHEDULE_STATUS.SKIPPED ||
        isPastOrNow(existing.scheduledAt, now);
      const noLongerDesired = !desiredById.has(existing.id);

      if (noLongerDesired && !isHistorical && !isCancelledStatus(existing.status)) {
        existing.status = SCHEDULE_STATUS.CANCELLED;
        existing.cancelReason = "PRESCRIPTION_RECONCILIATION";
        await this.store.saveSchedule(existing);
        await this.cancelAlarmForSchedule(existing);
        schedulesCancelled += 1;
      }
    }

    // Upsert desired schedules by deterministic ID
    for (const desired of desiredSchedules) {
      const existing = await this.store.getSchedule(desired.id);
      if (existing?.status === SCHEDULE_STATUS.TAKEN) {
        await this.store.saveSchedule({
          ...desired,
          status: existing.status,
          takenAt: existing.takenAt,
        });
      } else if (existing?.status === SCHEDULE_STATUS.SKIPPED) {
        await this.store.saveSchedule({
          ...desired,
          status: existing.status,
          skippedAt: existing.skippedAt,
          skipReason: existing.skipReason,
        });
      } else {
        await this.store.saveSchedule({
          ...desired,
          status: existing?.status || SCHEDULE_STATUS.SCHEDULED,
        });
        if (!existing) schedulesCreated += 1;
      }

      if (
        isFutureInstant(desired.scheduledAt, now) &&
        medication.status !== MEDICATION_STATUS.CANCELLED &&
        medication.status !== MEDICATION_STATUS.EXPIRED &&
        medication.remainingQuantity > 0
      ) {
        const alarmResult = await this.upsertAlarmForSchedule(desired, now);
        if (alarmResult.created) alarmsCreated += 1;
      }
    }

    // Completed/cancelled/expired medicine cleanup
    if (
      [MEDICATION_STATUS.COMPLETED, MEDICATION_STATUS.CANCELLED, MEDICATION_STATUS.EXPIRED]
        .includes(medication.status)
    ) {
      const schedules = await this.store.getSchedulesForMedication(medication);
      for (const schedule of schedules) {
        if (isFutureInstant(schedule.scheduledAt, now)) {
          const alarm = await this.store.getAlarm(stableId("alarm", schedule.id));
          if (alarm && alarm.status !== ALARM_STATUS.CANCELLED) {
            await this.cancelAlarmForSchedule(schedule);
            alarmsCancelled += 1;
          }
        }
      }
    }

    return {
      schedulesCreated,
      schedulesCancelled,
      alarmsCreated,
      alarmsCancelled,
    };
  }

  async upsertAlarmForSchedule(schedule, now = new Date()) {
    const alarmId = stableId("alarm", schedule.id);
    const notificationId = stableId("notification", schedule.id);
    const existing = await this.store.getAlarm(alarmId);
    const alarm = {
      alarmId,
      id: alarmId,
      scheduleId: schedule.id,
      medicineId: schedule.medicineId,
      medicineName: schedule.medicineName,
      dosage: schedule.dosage,
      doseQuantity: schedule.doseQuantity,
      scheduledDate: schedule.scheduledDate,
      scheduledTime: schedule.scheduledTime,
      scheduledAt: schedule.scheduledAt,
      timingInstruction: schedule.timingInstruction,
      notificationId,
      status: existing?.status === ALARM_STATUS.FIRED
        ? existing.status
        : ALARM_STATUS.SCHEDULED,
      title: "💊 Medicine Reminder",
      body: [
        `${schedule.medicineName}${schedule.dosage ? ` (${schedule.dosage})` : ""}`,
        `Dose: ${schedule.doseQuantity} • ${schedule.timingInstruction || "Take on time"}`,
        `Scheduled for ${schedule.scheduledTime12h || schedule.scheduledTime}`,
      ].filter(Boolean).join("\n"),
      data: {
        scheduleId: schedule.id,
        medicineId: schedule.medicineId,
        doseQuantity: schedule.doseQuantity,
        medicineName: schedule.medicineName,
        scheduledTime: schedule.scheduledTime,
      },
      updatedAt: new Date(now).toISOString(),
    };

    await this.store.saveAlarm(alarm);
    await this.notificationManager.schedule(alarm);
    return { alarm, created: !existing };
  }

  async cancelAlarmForSchedule(schedule) {
    const alarmId = stableId("alarm", schedule.id);
    const alarm = await this.store.getAlarm(alarmId);
    if (!alarm) return;

    alarm.status = ALARM_STATUS.CANCELLED;
    alarm.cancelledAt = new Date().toISOString();
    await this.store.saveAlarm(alarm);
    await this.notificationManager.cancel(alarm.notificationId);
  }

  // -----------------------------------------------------------------------
  // User actions
  // -----------------------------------------------------------------------

  async markTaken(scheduleId, { now = new Date() } = {}) {
    const schedule = await this.store.getSchedule(scheduleId);
    if (!schedule) throw new Error(`Schedule not found: ${scheduleId}`);
    if (schedule.status === SCHEDULE_STATUS.TAKEN) {
      return await this.store.getMedication(
        stableId(
          "medication",
          schedule.patientId,
          schedule.prescriptionId,
          schedule.medicinePrescriptionId,
        ),
      );
    }
    if (schedule.status === SCHEDULE_STATUS.CANCELLED) {
      throw new Error("A cancelled schedule cannot be marked TAKEN");
    }

    const medicationId = stableId(
      "medication",
      schedule.patientId,
      schedule.prescriptionId,
      schedule.medicinePrescriptionId,
    );
    const medication = await this.store.getMedication(medicationId);
    if (!medication) throw new Error(`Medication not found: ${medicationId}`);

    const doseQuantity = nonNegativeNumber(schedule.doseQuantity || 1, "doseQuantity");

    schedule.status = SCHEDULE_STATUS.TAKEN;
    schedule.takenAt = new Date(now).toISOString();
    await this.store.saveSchedule(schedule);

    medication.consumedQuantity = (medication.consumedQuantity || 0) + doseQuantity;
    medication.remainingQuantity = getRemainingQuantity(
      medication.prescribedQuantity,
      medication.consumedQuantity,
    );
    if (medication.remainingQuantity === 0) {
      medication.status = MEDICATION_STATUS.COMPLETED;
    }
    medication.updatedAt = new Date(now).toISOString();
    await this.store.saveMedication(medication);

    await this.store.appendEvent({
      type: "DOSE_TAKEN",
      scheduleId,
      medicationId,
      medicineName: schedule.medicineName,
      doseQuantity,
      at: new Date(now).toISOString(),
    });

    // Cancel matching alarm
    await this.cancelAlarmForSchedule(schedule);

    if (medication.status === MEDICATION_STATUS.COMPLETED) {
      const futureSchedules = await this.store.getSchedulesForMedication(medication);
      for (const future of futureSchedules) {
        if (isFutureInstant(future.scheduledAt, now)) {
          await this.cancelAlarmForSchedule(future);
        }
      }
    }
    return clone(medication);
  }

  async markSkipped(scheduleId, { reason = "", now = new Date() } = {}) {
    const schedule = await this.store.getSchedule(scheduleId);
    if (!schedule) return null;
    if (schedule.status === SCHEDULE_STATUS.TAKEN) {
      return clone(schedule);
    }
    if (schedule.status === SCHEDULE_STATUS.SKIPPED) {
      return clone(schedule);
    }
    if (schedule.status === SCHEDULE_STATUS.CANCELLED) {
      return clone(schedule);
    }

    schedule.status = SCHEDULE_STATUS.SKIPPED;
    schedule.skippedAt = new Date(now).toISOString();
    schedule.skipReason = reason;
    await this.store.saveSchedule(schedule);
    await this.cancelAlarmForSchedule(schedule);

    await this.store.appendEvent({
      type: "DOSE_SKIPPED",
      scheduleId,
      medicineName: schedule.medicineName,
      reason,
      at: new Date(now).toISOString(),
    });
    return clone(schedule);
  }

  async snooze(scheduleId, minutes = 15, { now = new Date() } = {}) {
    const schedule = await this.store.getSchedule(scheduleId);
    if (!schedule) return null;
    const delayMinutes = positiveNumber(minutes, "snooze minutes");
    if (schedule.status === SCHEDULE_STATUS.TAKEN) {
      return clone(schedule);
    }
    if (schedule.status === SCHEDULE_STATUS.SKIPPED) {
      return clone(schedule);
    }
    if (schedule.status === SCHEDULE_STATUS.CANCELLED) {
      return clone(schedule);
    }

    const currentBase = isFutureInstant(schedule.scheduledAt, now)
      ? Date.parse(schedule.scheduledAt)
      : new Date(now).getTime();

    const snoozedAt = new Date(currentBase + delayMinutes * 60 * 1000);
    schedule.status = SCHEDULE_STATUS.SNOOZED;
    schedule.snoozedUntil = snoozedAt.toISOString();
    schedule.snoozedAt = new Date(now).toISOString();
    await this.store.saveSchedule(schedule);

    const alarmId = stableId("alarm", schedule.id);
    const alarm = await this.store.getAlarm(alarmId);
    if (alarm) {
      alarm.scheduledAt = schedule.snoozedUntil;
      alarm.status = ALARM_STATUS.SCHEDULED;
      await this.store.saveAlarm(alarm);
      await this.notificationManager.schedule(alarm);
    }
    return clone(schedule);
  }

  // -----------------------------------------------------------------------
  // UI Selectors
  // -----------------------------------------------------------------------

  async getActiveMedicines({ patientId, now = new Date() } = {}) {
    const allMeds = await this.store.listMedications();
    const active = allMeds.filter(
      (medication) =>
        (!patientId || medication.patientId === patientId) &&
        [MEDICATION_STATUS.ACTIVE, MEDICATION_STATUS.UPCOMING].includes(
          medication.status,
        ),
    );

    return await Promise.all(
      active.map(async (medication) => ({
        ...medication,
        nextDose: await this.getNextDose(medication, now),
      })),
    );
  }

  async getNextDose(medication, now = new Date()) {
    const schedules = await this.store.getSchedulesForMedication(medication);
    return (
      schedules
        .filter(
          (schedule) =>
            !isCancelledStatus(schedule.status) &&
            schedule.status !== SCHEDULE_STATUS.TAKEN &&
            schedule.status !== SCHEDULE_STATUS.SKIPPED &&
            isFutureInstant(schedule.scheduledAt, now),
        )
        .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0] || null
    );
  }

  async getTodaysMedicationTimeline({ patientId, date = todayInUtc() } = {}) {
    const allSchedules = await this.store.listSchedules();
    return allSchedules
      .filter(
        (schedule) =>
          schedule.scheduledDate === date &&
          (!patientId || schedule.patientId === patientId) &&
          !isCancelledStatus(schedule.status),
      )
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }
}

// ---------------------------------------------------------------------------
// Helpers & Self-tests
// ---------------------------------------------------------------------------

function comparePrescriptions(left, right) {
  const leftVersion = Number(left.version || left.prescriptionVersion || 0);
  const rightVersion = Number(right.version || right.prescriptionVersion || 0);
  if (leftVersion !== rightVersion) return leftVersion - rightVersion;

  const leftTime = Date.parse(left.prescribedAt || "") || 0;
  const rightTime = Date.parse(right.prescribedAt || "") || 0;
  if (leftTime !== rightTime) return leftTime - rightTime;

  return String(left.prescriptionId).localeCompare(String(right.prescriptionId));
}

function comparePrescriptionsNewestFirst(left, right) {
  return comparePrescriptions(right, left);
}

export function createPrescriptionRepository(fetcher) {
  if (typeof fetcher !== "function") {
    throw new Error("createPrescriptionRepository requires a fetcher function");
  }
  return {
    fetchPrescriptions(patientId) {
      return fetcher(patientId);
    },
  };
}

export const EXAMPLE_PRESCRIPTION = {
  prescriptionId: "RX-1001",
  patientId: "PAT-100",
  doctorId: "DOC-100",
  prescribedAt: "2026-08-26T10:00:00+05:30",
  medicines: [
    {
      medicinePrescriptionId: "RX-1001-MED-001",
      medicineId: "MED-001",
      medicineName: "Paracetamol",
      dosage: "500 mg",
      quantity: 21,
      frequency: "1-1-1",
      startDate: "2026-08-26",
      notes: "Take after food",
      timezone: "Asia/Kolkata",
      timezoneOffset: "+05:30",
    },
  ],
};

function testAssert(condition, message) {
  if (!condition) throw new Error(`SELF-TEST FAILED: ${message}`);
}

export async function runMedicationEngineSelfTests() {
  const cases = [
    [21, "1-1-1", 21],
    [14, "1-0-1", 14],
    [7, "1-0-0", 7],
    [30, "1-1-1", 30],
    [10, "1-1-1", 10],
  ];

  for (const [quantity, frequency, expectedCount] of cases) {
    const schedules = generateSchedules(
      {
        patientId: "P",
        prescriptionId: `RX-${quantity}`,
        medicinePrescriptionId: "MP-1",
        medicineId: "M-1",
        medicineName: "Test medicine",
        dosage: "1 tablet",
        prescribedQuantity: quantity,
        frequency,
        startDate: "2026-08-26",
        timezoneOffset: "+05:30",
      },
      { now: new Date("2026-08-26T00:00:00+05:30") },
    );
    testAssert(schedules.length > 0, `${quantity}/${frequency} generated no schedules`);
    testAssert(
      sum(schedules.map((schedule) => schedule.doseQuantity)) === quantity,
      `${quantity}/${frequency} scheduled the wrong quantity`,
    );
    testAssert(
      schedules.length <= quantity,
      `${quantity}/${frequency} created too many schedule records`,
    );
    testAssert(
      schedules[0].scheduledDate === "2026-08-26",
      "first schedule should use the prescription start date",
    );
  }

  testAssert(
    getMedicationStatus({
      startDate: "2026-08-26",
      prescribedQuantity: 0,
      now: new Date("2026-08-26T10:00:00+05:30"),
    }) === MEDICATION_STATUS.COMPLETED,
    "zero quantity must not be active",
  );
  testAssert(
    getMedicationStatus({
      startDate: "2026-08-27",
      prescribedQuantity: 1,
      now: new Date("2026-08-26T10:00:00+05:30"),
    }) === MEDICATION_STATUS.UPCOMING,
    "future start must be UPCOMING",
  );
  testAssert(
    getMedicationStatus({
      startDate: "2026-08-01",
      endDate: "2026-08-10",
      prescribedQuantity: 1,
      now: new Date("2026-08-26T10:00:00+05:30"),
    }) === MEDICATION_STATUS.EXPIRED,
    "past end date must be EXPIRED",
  );

  const store = new InMemoryMedicationStore();
  const engine = new MedicationSchedulingEngine({
    repository: createPrescriptionRepository(() => EXAMPLE_PRESCRIPTION),
    store,
  });
  const now = new Date("2026-08-26T09:00:00+05:30");
  const firstSync = await engine.syncPrescriptions({ patientId: "PAT-100", now });
  const secondSync = await engine.syncPrescriptions({ patientId: "PAT-100", now });
  const schedules = await store.listSchedules();
  const alarms = await store.listAlarms();

  testAssert(
    firstSync[0].medicines[0].schedulesCreated === 21,
    "first sync should create 21 schedules",
  );
  testAssert(
    secondSync[0].medicines[0].schedulesCreated === 0,
    "second sync must not create duplicate schedules",
  );
  testAssert(schedules.length === 21, "idempotent sync must keep 21 schedules");
  testAssert(alarms.length === 20, "past first dose should not receive a future alarm");

  const firstFutureSchedule = schedules.find(
    (schedule) => schedule.scheduledDate === "2026-08-27",
  );
  testAssert(Boolean(firstFutureSchedule), "future schedule should exist");
  const medicationAfterTaken = await engine.markTaken(firstFutureSchedule.id, { now });
  testAssert(
    medicationAfterTaken.consumedQuantity === firstFutureSchedule.doseQuantity,
    "TAKEN must increase consumedQuantity",
  );
  testAssert(
    medicationAfterTaken.remainingQuantity ===
      21 - firstFutureSchedule.doseQuantity,
    "TAKEN must decrease remainingQuantity",
  );

  return {
    passed: true,
    message: "Medication scheduling engine self-tests passed",
    schedules: (await store.listSchedules()).length,
    alarms: (await store.listAlarms()).length,
  };
}

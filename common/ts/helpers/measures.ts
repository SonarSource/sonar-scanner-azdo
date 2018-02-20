const HOURS_IN_DAY = 8;

interface Formatter {
  (value: string | number, options?: any): string;
}

export function formatMeasure(
  value: string | number | undefined,
  type: string,
  options?: any
): string {
  const formatter = getFormatter(type);
  return useFormatter(value, formatter, options);
}

function useFormatter(
  value: string | number | undefined,
  formatter: Formatter,
  options?: any
): string {
  return value !== undefined && value !== '' ? formatter(value, options) : '';
}

function getFormatter(type: string): Formatter {
  const FORMATTERS: { [type: string]: Formatter } = {
    INT: intFormatter,
    SHORT_INT: shortIntFormatter,
    FLOAT: floatFormatter,
    PERCENT: percentFormatter,
    WORK_DUR: durationFormatter,
    SHORT_WORK_DUR: shortDurationFormatter,
    RATING: ratingFormatter,
    LEVEL: levelFormatter,
    MILLISEC: millisecondsFormatter,
    COMPARATOR: comparatorFormatter
  };
  return FORMATTERS[type] || noFormatter;
}

function numberFormatter(
  value: number,
  minimumFractionDigits = 0,
  maximumFractionDigits = minimumFractionDigits
) {
  const { format } = new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits
  });
  return format(value);
}

function noFormatter(value: string | number): string {
  return value.toString();
}

function intFormatter(value: number): string {
  return numberFormatter(value);
}

function shortIntFormatter(value: number): string {
  if (value >= 1e9) {
    return numberFormatter(value / 1e9) + 'G';
  } else if (value >= 1e6) {
    return numberFormatter(value / 1e6) + 'M';
  } else if (value >= 1e4) {
    return numberFormatter(value / 1e3) + 'k';
  } else if (value >= 1e3) {
    return numberFormatter(value / 1e3, 0, 1) + 'k';
  } else {
    return numberFormatter(value);
  }
}

function floatFormatter(value: number): string {
  return numberFormatter(value, 1, 5);
}

function percentFormatter(value: string | number, options: { decimals?: number } = {}): string {
  if (typeof value === 'string') {
    value = parseFloat(value);
  }
  if (options.decimals) {
    return numberFormatter(value, options.decimals) + '%';
  }
  return value === 100 ? '100%' : numberFormatter(value, 1) + '%';
}

function ratingFormatter(value: string | number): string {
  if (typeof value === 'string') {
    value = parseInt(value, 10);
  }
  return String.fromCharCode(97 + value - 1).toUpperCase();
}

function levelFormatter(value: string): string {
  const l10nKeys = {
    ERROR: 'Failed',
    WARN: 'Warning',
    OK: 'Passed',
    NONE: 'None'
  };
  const result = l10nKeys[value.toUpperCase()];
  return result ? result : value;
}

function comparatorFormatter(value: string): string {
  const l10nKeys = {
    EQ: '&#61;',
    GT: '&#62;',
    LT: '&#60;',
    NE: '&#8800;'
  };
  const result = l10nKeys[value.toUpperCase()];
  return result ? result : value;
}

function millisecondsFormatter(value: number): string {
  const ONE_SECOND = 1000;
  const ONE_MINUTE = 60 * ONE_SECOND;
  if (value >= ONE_MINUTE) {
    const minutes = Math.round(value / ONE_MINUTE);
    return `${minutes}min`;
  } else if (value >= ONE_SECOND) {
    const seconds = Math.round(value / ONE_SECOND);
    return `${seconds}s`;
  } else {
    return `${value}ms`;
  }
}

function shouldDisplayDays(days: number): boolean {
  return days > 0;
}

function shouldDisplayDaysInShortFormat(days: number): boolean {
  return days > 0.9;
}

function shouldDisplayHours(days: number, hours: number): boolean {
  return hours > 0 && days < 10;
}

function shouldDisplayHoursInShortFormat(hours: number): boolean {
  return hours > 0.9;
}

function shouldDisplayMinutes(days: number, hours: number, minutes: number): boolean {
  return minutes > 0 && hours < 10 && days === 0;
}

function addSpaceIfNeeded(value: string): string {
  return value.length > 0 ? value + ' ' : value;
}

function formatDuration(isNegative: boolean, days: number, hours: number, minutes: number): string {
  let formatted = '';
  if (shouldDisplayDays(days)) {
    formatted += (isNegative ? -1 * days : days) + 'd';
  }
  if (shouldDisplayHours(days, hours)) {
    formatted = addSpaceIfNeeded(formatted);
    formatted += (isNegative && formatted.length === 0 ? -1 * hours : hours) + 'h';
  }
  if (shouldDisplayMinutes(days, hours, minutes)) {
    formatted = addSpaceIfNeeded(formatted);
    formatted += (isNegative && formatted.length === 0 ? -1 * minutes : minutes) + 'min';
  }
  return formatted;
}

function formatDurationShort(
  isNegative: boolean,
  days: number,
  hours: number,
  minutes: number
): string {
  if (shouldDisplayDaysInShortFormat(days)) {
    const roundedDays = Math.round(days);
    const formattedDays = formatMeasure(isNegative ? -1 * roundedDays : roundedDays, 'SHORT_INT');
    return formattedDays + 'd';
  }

  if (shouldDisplayHoursInShortFormat(hours)) {
    const roundedHours = Math.round(hours);
    const formattedHours = formatMeasure(
      isNegative ? -1 * roundedHours : roundedHours,
      'SHORT_INT'
    );
    return formattedHours + 'h';
  }

  const formattedMinutes = formatMeasure(isNegative ? -1 * minutes : minutes, 'SHORT_INT');
  return formattedMinutes + 'min';
}

function durationFormatter(value: string | number): string {
  if (typeof value === 'string') {
    value = parseInt(value, 10);
  }
  if (value === 0) {
    return '0';
  }
  const hoursInDay = HOURS_IN_DAY;
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const days = Math.floor(absValue / hoursInDay / 60);
  let remainingValue = absValue - days * hoursInDay * 60;
  const hours = Math.floor(remainingValue / 60);
  remainingValue -= hours * 60;
  return formatDuration(isNegative, days, hours, remainingValue);
}

function shortDurationFormatter(value: string | number): string {
  if (typeof value === 'string') {
    value = parseInt(value, 10);
  }
  if (value === 0) {
    return '0';
  }
  const hoursInDay = HOURS_IN_DAY;
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const days = absValue / hoursInDay / 60;
  let remainingValue = absValue - Math.floor(days) * hoursInDay * 60;
  const hours = remainingValue / 60;
  remainingValue -= Math.floor(hours) * 60;
  return formatDurationShort(isNegative, days, hours, remainingValue);
}

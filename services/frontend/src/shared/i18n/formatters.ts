export interface LocaleFormattingOptions {
  locale: string;
  timeZone: string;
  currency: string;
}

export const defaultFormattingOptions: LocaleFormattingOptions = {
  locale: 'en-IN',
  timeZone: 'Asia/Kolkata',
  currency: 'INR',
};

export const formatDateTime = (
  dateIso: string,
  options: LocaleFormattingOptions = defaultFormattingOptions
): string =>
  new Intl.DateTimeFormat(options.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: options.timeZone,
  }).format(new Date(dateIso));

export const formatCurrency = (
  value: number,
  options: LocaleFormattingOptions = defaultFormattingOptions
): string =>
  new Intl.NumberFormat(options.locale, {
    style: 'currency',
    currency: options.currency,
    maximumFractionDigits: 2,
  }).format(value);

export const normalizeLocalizedCopy = (value: string): string => value.trim();

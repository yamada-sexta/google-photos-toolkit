export function dateToHHMMSS(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  return date.toLocaleTimeString('en-GB', options);
}

export function timeToHHMMSS(time: number): string {
  const seconds = Math.floor((time / 1000) % 60);
  const minutes = Math.floor((time / (1000 * 60)) % 60);
  const hours = Math.floor((time / (1000 * 60 * 60)) % 24);
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return formattedTime;
}

export function isPatternValid(pattern: string): true | Error {
  try {
    // Validate regex pattern
    // eslint-disable-next-line no-new
    new RegExp(pattern);
    return true;
  } catch (e: unknown) {
    return e instanceof Error ? e : new Error(String(e));
  }
}

export function assertType(variable: unknown, expectedType: string): void {
  const actualType = typeof variable;
  if (actualType !== expectedType) {
    throw new TypeError(`Expected type ${expectedType} but got ${actualType}`);
  }
}

export function assertInstance<T>(
  variable: unknown,
  expectedClass: new (...args: any[]) => T
): void {
  const actualClass = (variable as any)?.constructor?.name ?? typeof variable;
  if (!(variable instanceof expectedClass)) {
    throw new TypeError(`Expected instance of ${expectedClass.name} but got ${actualClass}`);
  }
}

// Defer execution to prevent UI blocking
export function defer<T>(fn: () => T | Promise<T>): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fn()), 0));
}

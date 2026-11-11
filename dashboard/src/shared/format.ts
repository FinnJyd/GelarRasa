const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
});

export const number = (value: number): string => numberFormatter.format(value);
export const date = (value: string): string => dateFormatter.format(new Date(`${value}T12:00:00+07:00`));
export const period = (start: string, end: string): string => `${date(start)} – ${date(end)}`;
export const shortCity = (value: string): string => value.replace(/^Kota Administrasi |^Kabupaten |^Kota /, '');

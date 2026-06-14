const FULL_NAME_LETTERS = 'A-Za-zА-Яа-яІіЇїЄєҐґ';

export const sanitizeMilUnit = (value = '') => (
  String(value ?? '')
    .toUpperCase()
    .replace(/\s/g, '')
    .replace(/[^А-ЯІЇЄҐ0-9]/g, '')
);

export const normalizeFullName = (value = '') => (
  String(value ?? '')
    .replace(new RegExp(`[^\\s${FULL_NAME_LETTERS}\\-''’ʼ\`]`, 'g'), '')
    .replace(/\s+/g, ' ')
    .trimStart()
    .toLocaleLowerCase('uk-UA')
    .replace(
      new RegExp(`(^|[\\s\\-])([${FULL_NAME_LETTERS}])`, 'g'),
      (_, prefix, letter) => `${prefix}${letter.toLocaleUpperCase('uk-UA')}`
    )
);

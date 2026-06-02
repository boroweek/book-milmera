export const SPECIALTY_INFO = [
  {
    code: 'therapist', label: 'Терапевт', genitive: 'терапевта', emoji: '🩺',
    symptoms: 'Підвищена температура, кашель, слабкість, тиск, загальне погіршення самопочуття.',
    hint: 'Не впевнені? Оберіть терапевта.',
  },
  {
    code: 'ent', label: 'ЛОР', genitive: 'ЛОРа', emoji: '👂',
    symptoms: 'Біль у вусі, горлі або носі, нежить, зниження слуху, гайморит.',
  },
  {
    code: 'surgeon', label: 'Хірург', genitive: 'хірурга', emoji: '✂️',
    symptoms: 'Травми, рани, переломи, гнійні процеси, біль після удару або підозра на оперативне втручання.',
  },
  {
    code: 'vascular_surgeon', label: 'Судинний хірург', genitive: 'судинного хірурга', emoji: '🩸',
    symptoms: 'Біль у ногах при ходьбі, набряки, варикоз, підозра на тромбоз, кровотечі з судин, рани з кровотечею.',
  },
  {
    code: 'neurologist', label: 'Невролог', genitive: 'невролога', emoji: '🧠',
    symptoms: 'Головний біль, запаморочення, оніміння кінцівок, біль у спині, порушення сну.',
  },
  {
    code: 'dentist', label: 'Стоматолог', genitive: 'стоматолога', emoji: '🦷',
    symptoms: 'Зубний біль, запалення ясен, пошкодження зуба.',
  },
];

export const DAYS_FULL_UK = ['неділя','понеділок','вівторок','середа','четвер','пʼятниця','субота'];

export const SERVICE_TYPES = ["Не визначено", "Мобілізація", "Контракт"];

export const SUBDIVISIONS = [
  '1ШБ','2ШБ','1МБ','2МБ','САДн','АДн','ПТБ','ТБ','ББС',
  'ЗРАДн','РО','БМЗ','ББНК','РРЕБ','РБ','РЕАбатр','РВП',
  'РВБ','СБІ','53 зр','51 зр','Шквал','ВС','БЗ','Управління',
  'РХБЗ','БП','НШР','БУАР','ШРР', 'Медрота'
];

export const RANKS = [
  "Солдат", "Старший солдат", "Молодший сержант", "Сержант",
  "Старший сержант", "Майстер-сержант", "Штаб-сержант", "Головний сержант", 
  "Молодший лейтенант", "Лейтенант", "Старший лейтенант", "Капітан", "Майор", 
  "Підполковник", "Полковник",
];

export const APPOINTMENT_STATUS = {
  IN_PROGRESS:    'in_progress',
  IN_APPOINTMENT: 'in_appointment',
  COMPLETED:      'completed',
  CANCELLED:      'cancelled',
};

export const QUEUE_SLOT_ACTIVE = [
  APPOINTMENT_STATUS.IN_PROGRESS,
  APPOINTMENT_STATUS.IN_APPOINTMENT,
  APPOINTMENT_STATUS.COMPLETED,
];

export const getSpecialtyLabel = (code) => {
  const found = SPECIALTY_INFO.find((s) => s.code === code);
  return found ? found.label : code;
};

export const specialtyEmoji = (code) => {
  const found = SPECIALTY_INFO.find((s) => s.code === code);
  return found?.emoji || '';
};

// Демо-данные прототипа baza-friends (хранятся локально, без живой базы)
const I18N = {
  ru: {
    nav_home: 'Главная', nav_catalog: 'Жильё', nav_territory: 'Территория', nav_manager: 'Админка',
    hero_title: 'База отдыха «Друзья»',
    hero_sub: 'Каспийское море · песчаный пляж · 15 вариантов жилья',
    hero_cta: 'Подобрать жильё',
    catalog_title: 'Где остановиться',
    catalog_sub: 'Выберите категорию — покажем все объекты',
    from: 'от', per_night: '₽/ночь', details: 'Подробнее', book: 'Отправить заявку',
    capacity: 'Гостей', beds: 'Кроватей',
    territory_title: 'Территория',
    territory_sub: 'Всё для отдыха — рядом и бесплатно',
    restaurant_title: 'Большой ресторан',
    restaurant_soon: 'Бронирование столиков и банкетов — скоро',
    request_title: 'Оставить заявку',
    request_sub: 'Менеджер свяжется и подтвердит бронь',
    f_name: 'Ваше имя', f_phone: 'Телефон', f_checkin: 'Заезд', f_checkout: 'Выезд',
    f_adults: 'Взрослые', f_kids: 'Сколько детей', f_has_kids: 'Есть дети', f_total: 'Всего гостей',
    f_comment: 'Комментарий', send: 'Отправить заявку', sent: 'Заявка отправлена! Менеджер скоро свяжется.',
    manager_title: 'Заявки', manager_sub: 'Все заявки гостей в одном месте',
    m_unit: 'Объект', m_guest: 'Гость', m_dates: 'Даты', m_status: 'Статус', m_actions: 'Действия',
    m_adults: 'взр.', m_kids: 'дет.',
    confirm: 'Подтвердить', reject: 'Отклонить', confirmed: 'Подтверждена', rejected: 'Отклонена', new: 'Новая',
    settings_title: 'Настройки базы (белый лейбл)',
    s_brand: 'Название', s_color: 'Цвет', s_phone: 'Телефон', s_save: 'Применить',
    photo_ext: 'Экстерьер', photo_int: 'Интерьер', photo_view: 'Вид', photo_terr: 'Территория',
    fullscreen: 'На весь экран', empty: 'Заявок пока нет.', back: 'На главную'
  },
  en: {
    nav_home: 'Home', nav_catalog: 'Stay', nav_territory: 'Territory', nav_manager: 'Admin',
    hero_title: '«Друзья» recreation base',
    hero_sub: 'Caspian sea · sandy beach · 15 places to stay',
    hero_cta: 'Choose a stay',
    catalog_title: 'Where to stay',
    catalog_sub: 'Pick a category — we will show every unit',
    from: 'from', per_night: '₽/night', details: 'Details', book: 'Send a request',
    capacity: 'Guests', beds: 'Beds',
    territory_title: 'Territory',
    territory_sub: 'Everything for rest — nearby and free',
    restaurant_title: 'Big restaurant',
    restaurant_soon: 'Table and banquet booking — coming soon',
    request_title: 'Send a request',
    request_sub: 'A manager will contact you and confirm',
    f_name: 'Your name', f_phone: 'Phone', f_checkin: 'Check-in', f_checkout: 'Check-out',
    f_adults: 'Adults', f_kids: 'How many children', f_has_kids: 'Children coming', f_total: 'Total guests',
    f_comment: 'Comment', send: 'Send request', sent: 'Request sent! A manager will contact you soon.',
    manager_title: 'Requests', manager_sub: 'All guest requests in one place',
    m_unit: 'Unit', m_guest: 'Guest', m_dates: 'Dates', m_status: 'Status', m_actions: 'Actions',
    m_adults: 'adults', m_kids: 'kids',
    confirm: 'Confirm', reject: 'Reject', confirmed: 'Confirmed', rejected: 'Rejected', new: 'New',
    settings_title: 'Base settings (white-label)',
    s_brand: 'Name', s_color: 'Color', s_phone: 'Phone', s_save: 'Apply',
    photo_ext: 'Exterior', photo_int: 'Interior', photo_view: 'View', photo_terr: 'Territory',
    fullscreen: 'Full screen', empty: 'No requests yet.', back: 'Back home'
  }
};

/* --- современные inline-SVG иконки (без эмодзи) --- */
const ICONS = {
  bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  umbrella: '<path d="M12 12v8"/><path d="M12 12a6 6 0 0 0-6 6"/><path d="M12 12a6 6 0 0 1 6 6"/><path d="M6 12a6 6 0 0 1 12 0"/>',
  waves: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 3.5 0 3.5-2 6-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 3.5 0 3.5-2 6-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  swing: '<path d="M3 5h18"/><path d="M7 5v5"/><path d="M17 5v5"/><path d="M5 10h4v3.5a2 2 0 0 1-4 0z"/><path d="M15 10h4v3.5a2 2 0 0 1-4 0z"/>',
  parking: '<path d="M12.34 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5.66"/><path d="M16 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
  grill: '<path d="M4 5h16l-2.5 8h-11z"/><path d="M6.5 13 5 20"/><path d="M17.5 13 19 20"/><path d="M4 20h16"/><path d="M9 9h6"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/><path d="M21 15v7"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>'
};
function iconHTML(name, size, cls) {
  const p = ICONS[name]; if (!p) return '';
  const s = size || 24;
  return '<svg class="ic ' + (cls || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
}

/* --- генератор фото-заглушек: плоские иллюстрации, без эмодзи --- */
function hexToRgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function shade(hex,amt){var c=hexToRgb(hex);function f(v){return Math.max(0,Math.min(255,Math.round(v+amt*255)));}return 'rgb('+f(c[0])+','+f(c[1])+','+f(c[2])+')';}
function svgURI(s){return 'data:image/svg+xml,'+encodeURIComponent(s);}
function makeScene(kind,accent,code){
  var sea=accent, seaD=shade(sea,-0.15), seaL=shade(sea,0.30), sand='#EFD9A6', sky1='#CDEBFF', sky2='#EDF8FF';
  var wall=shade(accent,0.62), wallD=shade(accent,0.40), roof=shade(accent,-0.32);
  var grass='#6FBF73', grassD='#4E9E58', wood='#C98F52', woodD='#A9743C', dark='#2C3E3A';
  var defs='<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+sky1+'"/><stop offset="1" stop-color="'+sky2+'"/></linearGradient></defs>';
  var head='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">';
  var chip='<g><rect x="24" y="24" rx="16" width="120" height="40" fill="rgba(0,0,0,.4)"/><text x="84" y="51" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700" fill="#fff" text-anchor="middle">'+code+'</text></g>';
  var body='';
  if(kind==='view'){
    body='<rect width="800" height="600" fill="url(#g)"/>'+
      '<circle cx="628" cy="142" r="62" fill="#FFE9A8"/>'+
      '<rect y="360" width="800" height="240" fill="'+sea+'"/>'+
      '<path d="M0 360 H800" stroke="'+seaD+'" stroke-width="10"/>'+
      '<path d="M40 420 q40 -18 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" fill="none" stroke="'+seaL+'" stroke-width="7" stroke-linecap="round"/>'+
      '<path d="M0 512 Q200 486 400 512 T800 512 L800 600 L0 600 Z" fill="'+sand+'"/>'+
      '<path d="M232 372 h60 l-12 30 h-36 z" fill="'+wood+'"/>'+
      '<path d="M262 372 v-78 l58 78 z" fill="#ffffff"/>';
  } else if(kind==='exterior'){
    body='<rect width="800" height="600" fill="url(#g)"/>'+
      '<rect y="430" width="800" height="170" fill="'+grass+'"/>'+
      '<rect y="430" width="800" height="12" fill="'+grassD+'"/>'+
      '<path d="M400 150 L600 250 L200 250 Z" fill="'+roof+'"/>'+
      '<rect x="250" y="250" width="300" height="180" fill="'+wall+'"/>'+
      '<rect x="250" y="250" width="300" height="16" fill="'+wallD+'"/>'+
      '<rect x="290" y="292" width="70" height="60" rx="6" fill="#CDEBFF" stroke="'+wallD+'" stroke-width="7"/>'+
      '<rect x="440" y="292" width="70" height="60" rx="6" fill="#CDEBFF" stroke="'+wallD+'" stroke-width="7"/>'+
      '<rect x="360" y="340" width="80" height="90" rx="6" fill="'+wood+'"/>'+
      '<circle cx="428" cy="388" r="5" fill="'+dark+'"/>'+
      '<rect x="640" y="330" width="16" height="102" fill="'+wood+'"/>'+
      '<circle cx="648" cy="304" r="58" fill="'+grassD+'"/>'+
      '<circle cx="598" cy="332" r="40" fill="'+grass+'"/>'+
      '<circle cx="700" cy="336" r="37" fill="'+grass+'"/>';
  } else if(kind==='interior'){
    body='<rect width="800" height="600" fill="'+wall+'"/>'+
      '<rect y="470" width="800" height="130" fill="'+wood+'"/>'+
      '<rect y="470" width="800" height="10" fill="'+woodD+'"/>'+
      '<rect x="500" y="110" width="200" height="160" rx="8" fill="#CDEBFF" stroke="'+wallD+'" stroke-width="10"/>'+
      '<path d="M600 110 V270" stroke="'+wallD+'" stroke-width="8"/>'+
      '<path d="M500 190 H700" stroke="'+wallD+'" stroke-width="8"/>'+
      '<rect x="170" y="270" width="290" height="70" rx="10" fill="'+shade(accent,0.22)+'"/>'+
      '<rect x="170" y="330" width="290" height="120" rx="10" fill="#ffffff"/>'+
      '<rect x="170" y="330" width="290" height="34" rx="10" fill="#EDE7DC"/>'+
      '<rect x="196" y="344" width="70" height="46" rx="8" fill="#ffffff" stroke="#DCD5C6" stroke-width="4"/>'+
      '<rect x="170" y="450" width="18" height="42" fill="'+woodD+'"/>'+
      '<rect x="442" y="450" width="18" height="42" fill="'+woodD+'"/>'+
      '<path d="M120 205 v115" stroke="'+dark+'" stroke-width="8"/>'+
      '<path d="M94 205 h52 l-13 -52 h-26 z" fill="'+shade(accent,0.3)+'"/>';
  } else {
    body='<rect width="800" height="600" fill="url(#g)"/>'+
      '<rect y="400" width="800" height="200" fill="'+grass+'"/>'+
      '<path d="M250 250 L400 158 L550 250 Z" fill="'+roof+'"/>'+
      '<rect x="275" y="250" width="16" height="172" fill="'+wood+'"/>'+
      '<rect x="509" y="250" width="16" height="172" fill="'+wood+'"/>'+
      '<rect x="275" y="408" width="250" height="14" rx="4" fill="'+woodD+'"/>'+
      '<rect x="330" y="290" width="140" height="70" rx="8" fill="'+dark+'"/>'+
      '<path d="M346 316 h108 M346 340 h108" stroke="'+shade(accent,0.45)+'" stroke-width="6" stroke-linecap="round"/>'+
      '<path d="M350 360 l-16 58 M450 360 l16 58" stroke="'+dark+'" stroke-width="10" stroke-linecap="round"/>'+
      '<circle cx="120" cy="330" r="52" fill="'+grassD+'"/>'+
      '<rect x="113" y="360" width="14" height="62" fill="'+wood+'"/>'+
      '<circle cx="690" cy="340" r="46" fill="'+grassD+'"/>'+
      '<rect x="684" y="366" width="12" height="56" fill="'+wood+'"/>';
  }
  return svgURI(head+defs+body+chip+'</svg>');
}

const CATEGORIES = [
  { id: 'room',    name_ru: 'Номера',         name_en: 'Rooms',             count: 7, price: 7000,  icon: 'bed' },
  { id: 'cottage', name_ru: 'Коттеджи',       name_en: 'Cottages',          count: 5, price: 10000, icon: 'home' },
  { id: 'house',   name_ru: '2-этажные дома', name_en: 'Two-storey houses', count: 3, price: 15000, icon: 'building' },
];

function buildUnits() {
  const list = [];
  const amenitiesByCat = {
    room:    ['Кондиционер', 'Телевизор', 'Санузел', 'Wi-Fi'],
    cottage: ['Кухня', 'Санузел', 'Телевизор', 'Кондиционер', 'Стиральная машина'],
    house:   ['Кухня', '2 санузла', 'Терраса', 'Кондиционер', 'Телевизор', 'Стиральная машина']
  };
  const capByCat = { room: 4, cottage: 8, house: 10 };
  const bedsByCat = { room: 2, cottage: 5, house: 6 };
  const pref = { room: 'Н', cottage: 'К', house: 'Д' };
  const colorOf = c => c === 'room' ? '#5DCAA5' : c === 'cottage' ? '#1D9E75' : '#0F6E56';
  CATEGORIES.forEach(cat => {
    for (let i = 1; i <= cat.count; i++) {
      const color = colorOf(cat.id);
      const code = pref[cat.id] + '-' + i;
      list.push({
        id: cat.id + '-' + i,
        category: cat.id,
        code: code,
        name_ru: cat.name_ru + ' №' + i,
        name_en: cat.name_en + ' #' + i,
        price: cat.price,
        capacity: capByCat[cat.id],
        beds: bedsByCat[cat.id],
        amenities: amenitiesByCat[cat.id],
        desc_ru: 'Уютный вариант для отдыха у моря. ' +
          (cat.id === 'house' ? 'Просторный двухэтажный дом для большой компании.' :
           cat.id === 'cottage' ? 'Коттедж со всеми удобствами на первой линии.' :
           'Комфортный номер рядом с пляжем.'),
        desc_en: 'Cozy stay by the sea. ' +
          (cat.id === 'house' ? 'Spacious two-storey house for a big group.' :
           cat.id === 'cottage' ? 'Cottage with all amenities on the first line.' :
           'Comfortable room near the beach.'),
        photoColor: color,
        photos: [
          { svg: makeScene('exterior', color, code), labelKey: 'photo_ext' },
          { svg: makeScene('interior', color, code), labelKey: 'photo_int' },
          { svg: makeScene('view', color, code),     labelKey: 'photo_view' },
          { svg: makeScene('terrace', color, code),  labelKey: 'photo_terr' }
        ],
        active: true
      });
    }
  });
  return list;
}
const UNITS = buildUnits();

const TERRITORY = [
  { icon: 'umbrella', name_ru: 'Пляж на Каспии',            name_en: 'Caspian beach' },
  { icon: 'waves',    name_ru: 'Летний бассейн',            name_en: 'Summer pool' },
  { icon: 'swing',    name_ru: 'Детская площадка',          name_en: 'Kids playground' },
  { icon: 'parking',  name_ru: 'Парковка (бесплатно)',      name_en: 'Parking (free)' },
  { icon: 'grill',    name_ru: 'Беседки с мангалами',        name_en: 'Gazebos with BBQ' },
  { icon: 'music',    name_ru: 'Веранда: кафе · дискотека', name_en: 'Veranda: cafe · disco' },
  { icon: 'wifi',     name_ru: 'Бесплатный Wi-Fi',          name_en: 'Free Wi-Fi' },
];

const DEFAULT_SETTINGS = {
  brandName: 'Друзья',
  primaryColor: '#0F6E56',
  contactPhone: '8 928 556 22 33',
  contactEmail: '',
  domain: ''
};

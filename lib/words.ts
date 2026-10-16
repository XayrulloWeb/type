export const wordsEn = [
  "the", "be", "of", "and", "a", "to", "in", "he", "have", "it", "that", "for", "they", "I", "with", "as", "not", "on", "she", "at", "by", "this", "we", "you", "do", "but", "from", "or", "which", "one", "would", "all", "will", "there", "say", "who", "make", "when", "can", "more", "if", "no", "man", "out", "other", "so", "what", "time", "up", "go", "about", "than", "into", "could", "state", "only", "new", "year", "some", "take", "come", "these", "know", "see", "use", "get", "like", "then", "first", "any", "work", "now", "may", "such", "give", "over", "think", "most", "even", "find", "day", "also", "after", "way", "many", "must", "look", "before", "great", "back", "through", "long", "where", "much", "should", "well", "people", "down", "own", "just", "because", "good", "each", "those", "feel", "seem", "how", "high", "too", "place", "little", "world", "very", "still", "nation", "hand", "old", "life", "tell", "write", "become", "here", "show", "house", "both", "between", "need", "mean", "call", "develop", "under", "last", "right", "move", "thing", "general", "school", "never", "same", "another", "begin", "while", "number", "part", "turn", "real", "leave", "might", "want", "point", "form", "off", "child", "few", "small", "since", "against", "ask", "late", "home", "interest", "large", "person", "end", "open", "public", "follow", "during", "present", "without", "again", "hold", "counsel", "keep", "fact", "stand", "system", "group", "play", "word", "beautiful", "country", "provide", "service", "friendly", "helpful"
];

export const wordsRu = [
  "и", "в", "не", "он", "на", "я", "что", "тот", "быть", "с", "а", "весь", "это", "как", "она", "по", "но", "они", "к", "у", "ты", "из", "мы", "за", "вы", "так", "же", "от", "сказать", "этот", "который", "мочь", "человек", "о", "один", "еще", "бы", "такой", "только", "себя", "свое", "какой", "когда", "уже", "для", "вот", "кто", "да", "говорить", "год", "знать", "мой", "до", "или", "если", "время", "сам", "нет", "уж", "под", "где", "дело", "есть", "сам", "свой", "чтобы", "два", "там", "чем", "глаз", "жизнь", "первый", "день", "тут", "во", "ничто", "потом", "очень", "со", "хотеть", "ли", "при", "голова", "надо", "без", "видеть", "идти", "теперь", "тоже", "стоять", "друг", "дом", "сейчас", "можно", "после", "слово", "здесь", "думать", "место", "спросить", "через", "лицо", "что", "тогда", "ведь", "хороший", "каждый", "новый", "жить", "должный", "смотреть", "почему", "потому", "сторона", "просто", "понять", "иметь", "конечный", "делать", "вдруг", "над", "взять", "никто", "сделать", "дверь", "перед", "нужный", "пойти", "чуть", "много", "раз", "наш"
];

export const wordsUz = [
  "va", "bu", "bilan", "uchun", "bir", "da", "ham", "shu", "edi", "o'z", "ular", "u", "deb", "esa", "ga", "ni", "biz", "yil", "dan", "yoki", "qildi", "bo'lib", "mumkin", "kabi", "ko'p", "o'zi", "ammo", "kerak", "odam", "kun", "ularning", "mana", "bo'lgan", "faqat", "yangi", "yana", "ikki", "bor", "hamda", "yaxshi", "xil", "barcha", "boshqa", "vaqt", "bo'ladi", "men", "ish", "yo'q", "shunday", "kelib", "katta", "qilish", "shuni", "qilib", "hozirgi", "ham", "eng", "siz", "shahar", "yuz", "lekin", "uning", "ko'ra", "davlat", "aytib", "bizning", "endi", "qanday", "berdi", "shunda", "xalq", "odamlar", "har", "chunki", "yo'l", "unga", "so'ng", "narsa", "hech", "yer", "hozir", "mumkin", "uch", "ko'rib", "qilishi", "davomida", "qolgan", "turib", "bilan", "so'z", "keyin", "bo'lishi", "tomonidan", "qator", "o'sha", "qilish", "olish", "olib", "doim", "butun", "hatto", "birinchi", "kerak", "kelgan", "hammasi", "kim", "qachon", "orqali", "albatta", "oldingi", "yuqori"
];

function shuffle<T>(values: readonly T[]) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }
  return copy;
}

export function getRandomWords(language: "en" | "ru", count: number, exclude?: string): string {
  const dictionary = language === "en" ? wordsEn : wordsRu;
  let result = "";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const selected: string[] = [];
    let bag = shuffle(dictionary);
    while (selected.length < count) {
      if (!bag.length) bag = shuffle(dictionary);
      const next = bag.pop();
      if (next && next !== selected[selected.length - 1]) selected.push(next);
    }
    result = selected.join(" ");
    if (result !== exclude) return result;
  }
  return result;
}

const sentenceBanks = {
  en: [
    "A calm morning gives us time to plan the day and choose the most important task.",
    "Regular practice improves speed, accuracy, and confidence without creating unnecessary stress.",
    "Good questions help students notice details and understand difficult ideas more clearly.",
    "The school library is a quiet place where every shelf can open a new world.",
    "When a team listens carefully, even a complicated project becomes easier to complete.",
    "Fresh air, clean water, and green trees make every neighborhood healthier and more pleasant.",
    "A short walk after class can restore attention and prepare the mind for new work.",
    "Digital tools are useful when we check sources and protect personal information.",
    "Reading different authors teaches us to compare opinions and form our own conclusions.",
    "Small daily decisions often create larger results than one rare burst of effort.",
    "A clear goal shows the direction, while a simple plan explains the next step.",
    "Mistakes are valuable when we study them calmly and change our method.",
    "The changing seasons remind us that progress can be slow and still remain meaningful.",
    "Science begins with careful observation, honest measurement, and curiosity about the result.",
    "Music can improve concentration when the rhythm is gentle and the volume is comfortable.",
    "Helping a classmate strengthens both knowledge and trust inside the group.",
    "Healthy sleep supports memory, attention, and the ability to solve unfamiliar problems.",
    "A well organized desk saves time because every useful item has its own place.",
    "Learning another language allows people to share ideas across cultures and borders.",
    "The best solutions are often simple, understandable, and easy to test in practice.",
    "Patience helps us keep a steady rhythm when a long exercise feels challenging.",
    "History connects personal stories with events that changed entire communities.",
    "Respectful discussion lets people disagree without losing the desire to cooperate.",
    "Writing a brief summary is a powerful way to check whether a topic is understood.",
    "Every finished project provides experience that makes the next beginning easier.",
    "Careful typing depends on relaxed hands, correct posture, and attention to each line.",
    "A useful habit becomes stronger when it is connected to the same time and place.",
    "Maps show more than roads because they also describe distance, landscape, and direction.",
    "Creative work combines imagination with patient revision and attention to detail.",
    "Sharing reliable knowledge makes a school community stronger and more independent.",
  ],
  ru: [
    "Спокойное утро даёт время составить план и выбрать самое важное дело на день.",
    "Регулярная практика развивает скорость, точность и уверенность без лишнего напряжения.",
    "Хорошие вопросы помогают ученикам замечать детали и яснее понимать сложные идеи.",
    "Школьная библиотека остаётся тихим местом, где каждая полка открывает новый мир.",
    "Когда команда внимательно слушает друг друга, сложный проект становится понятнее.",
    "Чистая вода, свежий воздух и зелёные деревья делают любой район приятнее для жизни.",
    "Короткая прогулка после уроков возвращает внимание и готовит мысли к новой работе.",
    "Цифровые инструменты полезны, если проверять источники и защищать личные данные.",
    "Чтение разных авторов учит сравнивать мнения и формулировать собственные выводы.",
    "Небольшие ежедневные решения часто дают больший результат, чем редкие усилия.",
    "Ясная цель показывает направление, а простой план объясняет следующий шаг.",
    "Ошибки приносят пользу, когда мы спокойно изучаем их и меняем свой подход.",
    "Смена времён года напоминает, что медленный прогресс тоже может быть важным.",
    "Наука начинается с внимательного наблюдения, честного измерения и любопытства.",
    "Негромкая музыка помогает сосредоточиться, если её ритм остаётся спокойным.",
    "Помощь однокласснику укрепляет одновременно знания и доверие внутри группы.",
    "Здоровый сон поддерживает память, внимание и способность решать новые задачи.",
    "На аккуратном рабочем столе каждый полезный предмет находится на своём месте.",
    "Изучение другого языка помогает людям обмениваться идеями между странами.",
    "Лучшие решения часто бывают простыми, понятными и удобными для проверки.",
    "Терпение помогает сохранять ровный ритм, когда длинное упражнение кажется трудным.",
    "История связывает личные рассказы с событиями, которые изменили целые сообщества.",
    "Уважительный разговор позволяет спорить и при этом сохранять желание сотрудничать.",
    "Краткий пересказ хорошо показывает, насколько точно человек понял новую тему.",
    "Каждый завершённый проект даёт опыт, который облегчает следующее начинание.",
    "Точная печать зависит от свободных рук, правильной посадки и внимания к строке.",
    "Полезная привычка становится прочнее, если повторять её в одно время и в одном месте.",
    "Карта показывает не только дороги, но также расстояние, направление и особенности местности.",
    "Творческая работа соединяет воображение, терпеливую проверку и внимание к деталям.",
    "Обмен надёжными знаниями делает школьное сообщество сильнее и самостоятельнее.",
  ],
  uz: [
    "Sokin tong kunni rejalashtirish va eng muhim vazifani tanlash uchun vaqt beradi.",
    "Muntazam mashq tezlik, aniqlik va ishonchni ortiqcha zo‘riqishsiz rivojlantiradi.",
    "Yaxshi savollar o‘quvchilarga tafsilotlarni ko‘rish va murakkab fikrlarni tushunishga yordam beradi.",
    "Maktab kutubxonasi har bir javon yangi olamni ochadigan tinch joydir.",
    "Jamoa bir-birini diqqat bilan tinglasa, murakkab loyiha ham osonlashadi.",
    "Toza suv, musaffo havo va yashil daraxtlar har bir mahallani yanada yoqimli qiladi.",
    "Darsdan keyingi qisqa sayr diqqatni tiklaydi va ongni yangi ishga tayyorlaydi.",
    "Raqamli vositalar manbalarni tekshirib, shaxsiy ma’lumotlarni himoya qilganda foydalidir.",
    "Turli mualliflarni o‘qish fikrlarni solishtirish va mustaqil xulosa chiqarishni o‘rgatadi.",
    "Kundalik kichik qarorlar ba’zan katta, ammo kam uchraydigan harakatdan kuchliroq natija beradi.",
    "Aniq maqsad yo‘nalishni ko‘rsatadi, sodda reja esa keyingi qadamni tushuntiradi.",
    "Xatolarni xotirjam tahlil qilib, usulni o‘zgartirsak, ular foydali tajribaga aylanadi.",
    "Fasllarning almashishi sekin rivojlanish ham muhim ekanini eslatadi.",
    "Ilm diqqatli kuzatuv, to‘g‘ri o‘lchov va natijaga qiziqishdan boshlanadi.",
    "Sokin ritmdagi musiqa ovozi baland bo‘lmasa, diqqatni jamlashga yordam beradi.",
    "Sinfdoshga yordam berish bilimni ham, guruh ichidagi ishonchni ham mustahkamlaydi.",
    "Sog‘lom uyqu xotira, diqqat va yangi masalalarni yechish qobiliyatini qo‘llab-quvvatlaydi.",
    "Tartibli ish stolida har bir kerakli buyumning o‘z joyi bo‘ladi.",
    "Boshqa tilni o‘rganish turli madaniyat vakillari bilan fikr almashish imkonini beradi.",
    "Eng yaxshi yechimlar ko‘pincha sodda, tushunarli va amalda tekshirishga qulay bo‘ladi.",
    "Sabr uzoq mashq qiyin tuyulganda ham bir xil sur’atni saqlashga yordam beradi.",
    "Tarix shaxsiy hikoyalarni butun jamiyatni o‘zgartirgan voqealar bilan bog‘laydi.",
    "Hurmatli suhbat odamlar turlicha fikrlasa ham hamkorlikni davom ettirishga imkon beradi.",
    "Qisqa xulosa yozish yangi mavzu qanchalik yaxshi tushunilganini ko‘rsatadi.",
    "Har bir tugallangan loyiha keyingi boshlanishni osonlashtiradigan tajriba beradi.",
    "Aniq yozish erkin qo‘llar, to‘g‘ri o‘tirish va har bir qatorga e’tibor berishga bog‘liq.",
    "Foydali odat bir xil vaqt va joyda takrorlanganda yanada mustahkam bo‘ladi.",
    "Xarita faqat yo‘llarni emas, masofa, yo‘nalish va yer tuzilishini ham ko‘rsatadi.",
    "Ijodiy ish tasavvur, sabr bilan tahrirlash va tafsilotlarga e’tiborni birlashtiradi.",
    "Ishonchli bilimni ulashish maktab jamoasini kuchli va mustaqil qiladi.",
  ],
};

export function getPreparedText(language: "en" | "ru", exclude?: string) {
  const bank = sentenceBanks[language];
  let result = "";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const sentenceCount = 4 + Math.floor(Math.random() * 3);
    result = shuffle(bank).slice(0, sentenceCount).join(" ");
    if (result !== exclude) return result;
  }
  return result;
}

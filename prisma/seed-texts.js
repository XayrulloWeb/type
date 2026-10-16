/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const source = {
  ru: [
    ["Мой класс", "В нашем классе светло и уютно. Мы читаем, пишем и помогаем друг другу."],
    ["Полезный день", "Утром я собираю портфель и иду в школу. На уроках мы узнаём новое и задаём вопросы."],
    ["Природа рядом", "Весной деревья покрываются зелёными листьями. Птицы возвращаются и строят гнёзда во дворах."],
    ["Сила привычки", "Ежедневная практика помогает печатать быстрее и точнее. Важно не спешить, а сохранять ровный ритм."],
    ["Знания и любопытство", "Любопытство побуждает человека наблюдать, сравнивать и искать объяснения. Так обычный вопрос превращается в небольшое исследование."],
    ["Ответственность", "Ответственный человек заранее планирует работу, соблюдает договорённости и исправляет ошибки. Эти навыки помогают всей команде двигаться вперёд."],
    ["Технологии в обучении", "Цифровые инструменты ускоряют поиск информации, но требуют внимательной проверки источников. Полезно сравнивать факты и отделять мнение от доказательства."],
    ["Выбор и результат", "Большая цель становится достижимой, когда её делят на ясные этапы. Регулярные небольшие усилия формируют навык, а анализ результата помогает выбрать следующий шаг."],
  ],
  uz: [
    ["Mening sinfim", "Bizning sinfimiz yorug‘ va shinam. Biz o‘qiymiz, yozamiz va bir-birimizga yordam beramiz."],
    ["Foydali kun", "Ertalab sumkamni tayyorlab, maktabga boraman. Darslarda yangi bilim olamiz va savollar beramiz."],
    ["Atrofimizdagi tabiat", "Bahorda daraxtlar yashil barglar bilan qoplanadi. Qushlar qaytib kelib, hovlilarda uya quradi."],
    ["Odatning kuchi", "Har kungi mashq tez va aniq yozishga yordam beradi. Shoshilmasdan, bir xil sur’atni saqlash muhim."],
    ["Bilim va qiziqish", "Qiziqish insonni kuzatish, taqqoslash va izoh izlashga undaydi. Oddiy savol shu tariqa kichik tadqiqotga aylanadi."],
    ["Mas’uliyat", "Mas’uliyatli inson ishni oldindan rejalashtiradi, kelishuvlarga amal qiladi va xatolarini tuzatadi. Bu ko‘nikmalar jamoaga oldinga yurishga yordam beradi."],
    ["Ta’limdagi texnologiyalar", "Raqamli vositalar ma’lumot izlashni tezlashtiradi, ammo manbalarni sinchiklab tekshirishni talab qiladi. Faktlarni solishtirish va fikrni dalildan ajratish foydali."],
    ["Tanlov va natija", "Katta maqsad aniq bosqichlarga bo‘linganda unga erishish osonlashadi. Muntazam kichik harakatlar ko‘nikma hosil qiladi, natijani tahlil qilish esa keyingi qadamni ko‘rsatadi."],
  ],
  en: [
    ["My classroom", "Our classroom is bright and comfortable. We read, write, and help one another every day."],
    ["A useful day", "I pack my school bag in the morning and walk to school. We learn new ideas and ask questions in class."],
    ["Nature nearby", "Trees grow fresh green leaves in spring. Birds return and build their nests in quiet yards."],
    ["The power of habit", "Daily practice helps us type faster and more accurately. A steady rhythm is more useful than rushing."],
    ["Knowledge and curiosity", "Curiosity encourages people to observe, compare, and search for explanations. A simple question can become a small investigation."],
    ["Responsibility", "A responsible person plans work, keeps promises, and corrects mistakes. These skills help the entire team move forward together."],
    ["Technology in learning", "Digital tools make information easier to find, but every source still needs careful review. Good learners compare facts and separate opinions from evidence."],
    ["Choice and progress", "A large goal becomes manageable when it is divided into clear stages. Small consistent efforts build skill, while reflection helps us choose the next useful step."],
  ],
};

const additions = {
  ru: {
    medium: " Сначала сосредоточьтесь на точности, затем постепенно увеличивайте скорость.",
    hard: " Сначала сосредоточьтесь на точности, затем постепенно увеличивайте скорость. Следите за знаками препинания, положением рук и спокойным дыханием во время работы.",
  },
  uz: {
    medium: " Avval aniqlikka e’tibor bering, keyin tezlikni asta-sekin oshiring.",
    hard: " Avval aniqlikka e’tibor bering, keyin tezlikni asta-sekin oshiring. Ish paytida tinish belgilari, qo‘llarning holati va sokin nafasga e’tibor bering.",
  },
  en: {
    medium: " Focus on accuracy first, and then increase your speed step by step.",
    hard: " Focus on accuracy first, and then increase your speed step by step. Pay attention to punctuation, hand position, and calm breathing while you work.",
  },
};

const labels = {
  ru: { easy: "лёгкий", medium: "средний", hard: "сложный" },
  uz: { easy: "oson", medium: "o‘rta", hard: "qiyin" },
  en: { easy: "easy", medium: "medium", hard: "hard" },
};

async function main() {
  let created = 0;
  for (const language of ["ru", "en"]) {
    const grades = source[language];
    for (const [gradeIndex, [baseTitle, baseContent]] of grades.entries()) {
      const grade = gradeIndex + 1;
      for (const difficulty of ["easy", "medium", "hard"]) {
        const title = `${baseTitle} · ${labels[language][difficulty]}`;
        const content = baseContent + (difficulty === "easy" ? "" : additions[language][difficulty]);
        const existing = await prisma.text.findFirst({ where: { title, language, grade } });
        if (!existing) {
          await prisma.text.create({ data: { title, content, language, grade, difficulty, isActive: true } });
          created += 1;
        }
      }
    }
  }
  console.log(`Learning texts ready: ${created} created, 48 expected in the starter library.`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => prisma.$disconnect());

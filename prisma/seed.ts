import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
type Locale = "es" | "en" | "de";
type Localized = Record<Locale, string>;
const tr = (es: string, en: string, de: string): Localized => ({ es, en, de });

const categories = [
  { slug: "tacos", sort: 1, name: tr("Tacos", "Tacos", "Tacos") },
  { slug: "burritos", sort: 2, name: tr("Burritos", "Burritos", "Burritos") },
  {
    slug: "quesadillas",
    sort: 3,
    name: tr("Quesadillas", "Quesadillas", "Quesadillas"),
  },
  {
    slug: "especialidades",
    sort: 4,
    name: tr("Especialidades", "Specialities", "Spezialitäten"),
  },
  { slug: "entradas", sort: 5, name: tr("Entradas", "Starters", "Vorspeisen") },
  { slug: "postres", sort: 6, name: tr("Postres", "Desserts", "Desserts") },
  { slug: "bebidas", sort: 7, name: tr("Bebidas", "Drinks", "Getränke") },
];

const products = [
  {
    slug: "tacos-al-pastor",
    cat: "tacos",
    name: tr("Tacos al pastor", "Al pastor tacos", "Tacos al Pastor"),
    desc: tr(
      "Cerdo marinado, piña asada, cebolla y cilantro en tortilla de maíz.",
      "Marinated pork, roasted pineapple, onion and coriander in corn tortillas.",
      "Mariniertes Schweinefleisch, gegrillte Ananas, Zwiebel und Koriander in Maistortillas.",
    ),
    ingredients: ["cerdo", "piña", "cebolla", "cilantro", "maíz"],
    allergens: [],
    price: "12.50",
    image: "/menu/tacos-al-pastor.jpg",
    alt: tr(
      "Tacos con piña y cilantro",
      "Tacos with pineapple and coriander",
      "Tacos mit Ananas und Koriander",
    ),
    featured: true,
  },
  {
    slug: "tacos-carne-asada",
    cat: "tacos",
    name: tr(
      "Tacos de carne asada",
      "Grilled steak tacos",
      "Tacos mit gegrilltem Rind",
    ),
    desc: tr(
      "Ternera a la parrilla, pico de gallo y salsa tatemada.",
      "Grilled beef, pico de gallo and fire-roasted salsa.",
      "Gegrilltes Rindfleisch, Pico de Gallo und geröstete Salsa.",
    ),
    ingredients: ["ternera", "tomate", "cebolla", "cilantro", "maíz"],
    allergens: [],
    price: "13.90",
    image: "/menu/tacos-carne-asada.jpg",
    alt: tr(
      "Tacos de carne a la parrilla",
      "Grilled steak tacos",
      "Tacos mit gegrilltem Rind",
    ),
  },
  {
    slug: "tacos-pollo",
    cat: "tacos",
    name: tr("Tacos de pollo", "Chicken tacos", "Hähnchen-Tacos"),
    desc: tr(
      "Pollo al comal, aguacate, col fresca y crema de limón.",
      "Griddled chicken, avocado, crisp cabbage and lime crema.",
      "Hähnchen vom Grill, Avocado, frischer Kohl und Limettencreme.",
    ),
    ingredients: ["pollo", "aguacate", "col", "crema", "maíz"],
    allergens: ["milk"],
    price: "11.90",
    image: "/menu/tacos-pollo.jpg",
    alt: tr(
      "Tacos de pollo con aguacate",
      "Chicken tacos with avocado",
      "Hähnchen-Tacos mit Avocado",
    ),
  },
  {
    slug: "burrito-norteno",
    cat: "burritos",
    name: tr("Burrito norteño", "Northern burrito", "Burrito Norteño"),
    desc: tr(
      "Tortilla de trigo, frijoles, arroz, pico de gallo y aguacate.",
      "Wheat tortilla, beans, rice, pico de gallo and avocado.",
      "Weizentortilla, Bohnen, Reis, Pico de Gallo und Avocado.",
    ),
    ingredients: ["trigo", "frijoles", "arroz", "tomate", "aguacate"],
    allergens: ["gluten"],
    price: "13.90",
    image: "/menu/burrito-norteno.jpg",
    alt: tr(
      "Burrito relleno de frijoles y aguacate",
      "Burrito filled with beans and avocado",
      "Burrito mit Bohnen und Avocado",
    ),
    featured: true,
  },
  {
    slug: "burrito-pollo",
    cat: "burritos",
    name: tr("Burrito de pollo", "Chicken burrito", "Hähnchen-Burrito"),
    desc: tr(
      "Pollo especiado, arroz, frijoles negros y salsa verde.",
      "Seasoned chicken, rice, black beans and green salsa.",
      "Gewürztes Hähnchen, Reis, schwarze Bohnen und grüne Salsa.",
    ),
    ingredients: ["pollo", "arroz", "frijoles", "tomatillo", "trigo"],
    allergens: ["gluten"],
    price: "12.90",
    image: "/menu/burrito-pollo.jpg",
    alt: tr(
      "Burrito de pollo con salsa verde",
      "Chicken burrito with green salsa",
      "Hähnchen-Burrito mit grüner Salsa",
    ),
  },
  {
    slug: "burrito-verduras",
    cat: "burritos",
    name: tr("Burrito de verduras", "Garden burrito", "Gemüse-Burrito"),
    desc: tr(
      "Pimientos asados, frijoles, arroz, maíz y guacamole.",
      "Roasted peppers, beans, rice, corn and guacamole.",
      "Geröstete Paprika, Bohnen, Reis, Mais und Guacamole.",
    ),
    ingredients: ["pimiento", "frijoles", "arroz", "maíz", "aguacate", "trigo"],
    allergens: ["gluten"],
    price: "11.90",
    image: "/menu/burrito-verduras.jpg",
    alt: tr(
      "Burrito de verduras con guacamole",
      "Vegetable burrito with guacamole",
      "Gemüse-Burrito mit Guacamole",
    ),
  },
  {
    slug: "quesadilla-maiz",
    cat: "quesadillas",
    name: tr("Quesadilla de maíz", "Corn quesadilla", "Mais-Quesadilla"),
    desc: tr(
      "Tortilla de maíz dorada, queso fundido y salsa verde.",
      "Golden corn tortilla, melted cheese and green salsa.",
      "Goldbraune Maistortilla, geschmolzener Käse und grüne Salsa.",
    ),
    ingredients: ["maíz", "queso", "tomatillo"],
    allergens: ["milk"],
    price: "9.80",
    image: "/menu/quesadilla-maiz.jpg",
    alt: tr(
      "Quesadilla de maíz con queso fundido",
      "Corn quesadilla with melted cheese",
      "Mais-Quesadilla mit geschmolzenem Käse",
    ),
    featured: true,
  },
  {
    slug: "quesadilla-hongos",
    cat: "quesadillas",
    name: tr("Quesadilla de hongos", "Mushroom quesadilla", "Pilz-Quesadilla"),
    desc: tr(
      "Setas salteadas, queso Oaxaca y epazote.",
      "Sautéed mushrooms, Oaxaca cheese and epazote.",
      "Gebratene Pilze, Oaxaca-Käse und Epazote.",
    ),
    ingredients: ["setas", "queso oaxaca", "epazote", "maíz"],
    allergens: ["milk"],
    price: "10.50",
    image: "/menu/quesadilla-hongos.jpg",
    alt: tr(
      "Quesadilla dorada de hongos",
      "Golden mushroom quesadilla",
      "Goldbraune Pilz-Quesadilla",
    ),
  },
  {
    slug: "quesadilla-pollo",
    cat: "quesadillas",
    name: tr(
      "Quesadilla de pollo",
      "Chicken quesadilla",
      "Hähnchen-Quesadilla",
    ),
    desc: tr(
      "Pollo a la plancha, queso fundido y pico de gallo.",
      "Griddled chicken, melted cheese and pico de gallo.",
      "Hähnchen vom Grill, geschmolzener Käse und Pico de Gallo.",
    ),
    ingredients: ["pollo", "queso", "tomate", "cebolla", "maíz"],
    allergens: ["milk"],
    price: "11.40",
    image: "/menu/quesadilla-pollo.jpg",
    alt: tr(
      "Quesadilla de pollo con queso",
      "Chicken and cheese quesadilla",
      "Hähnchen-Käse-Quesadilla",
    ),
  },
  {
    slug: "enchiladas-verdes",
    cat: "especialidades",
    name: tr("Enchiladas verdes", "Green enchiladas", "Grüne Enchiladas"),
    desc: tr(
      "Tortillas de pollo, salsa verde y queso fresco.",
      "Chicken-filled tortillas with green salsa and fresh cheese.",
      "Gefüllte Tortillas mit Hähnchen, grüner Salsa und Frischkäse.",
    ),
    ingredients: ["pollo", "tomatillo", "queso", "crema", "maíz"],
    allergens: ["milk"],
    price: "14.50",
    image: "/menu/enchiladas-verdes.jpg",
    alt: tr(
      "Enchiladas verdes servidas con salsa",
      "Green enchiladas with salsa",
      "Grüne Enchiladas mit Salsa",
    ),
  },
  {
    slug: "enchiladas-rojas",
    cat: "especialidades",
    name: tr("Enchiladas rojas", "Red enchiladas", "Rote Enchiladas"),
    desc: tr(
      "Salsa de chile guajillo, pollo deshebrado y crema.",
      "Guajillo chile sauce, shredded chicken and crema.",
      "Guajillo-Chilisauce, gezupftes Hähnchen und Crema.",
    ),
    ingredients: ["chile guajillo", "pollo", "crema", "maíz"],
    allergens: ["milk"],
    price: "14.50",
    image: "/menu/enchiladas-rojas.jpg",
    alt: tr(
      "Enchiladas rojas con crema",
      "Red enchiladas with crema",
      "Rote Enchiladas mit Crema",
    ),
  },
  {
    slug: "chile-relleno",
    cat: "especialidades",
    name: tr("Chile relleno", "Stuffed poblano", "Gefüllte Poblano-Chili"),
    desc: tr(
      "Chile poblano relleno de queso, arroz rojo y frijoles.",
      "Poblano pepper filled with cheese, red rice and beans.",
      "Poblano-Chili mit Käse, rotem Reis und Bohnen.",
    ),
    ingredients: ["chile poblano", "queso", "arroz", "frijoles"],
    allergens: ["milk"],
    price: "15.20",
    image: "/menu/chile-relleno.jpg",
    alt: tr(
      "Chile poblano relleno",
      "Stuffed poblano pepper",
      "Gefüllte Poblano-Chili",
    ),
  },
  {
    slug: "nachos-casa",
    cat: "entradas",
    name: tr("Nachos de la casa", "House nachos", "Nachos des Hauses"),
    desc: tr(
      "Totopos de maíz, frijoles, pico de gallo y queso.",
      "Corn tortilla chips, beans, pico de gallo and cheese.",
      "Maistortilla-Chips, Bohnen, Pico de Gallo und Käse.",
    ),
    ingredients: ["maíz", "frijoles", "tomate", "queso"],
    allergens: ["milk"],
    price: "8.90",
    image: "/menu/nachos-casa.jpg",
    alt: tr(
      "Totopos con frijoles y queso",
      "Tortilla chips with beans and cheese",
      "Tortilla-Chips mit Bohnen und Käse",
    ),
  },
  {
    slug: "guacamole-totopos",
    cat: "entradas",
    name: tr(
      "Guacamole y totopos",
      "Guacamole and chips",
      "Guacamole mit Tortilla-Chips",
    ),
    desc: tr(
      "Aguacate, lima, cilantro y totopos de maíz.",
      "Avocado, lime, coriander and corn tortilla chips.",
      "Avocado, Limette, Koriander und Maistortilla-Chips.",
    ),
    ingredients: ["aguacate", "lima", "cilantro", "maíz"],
    allergens: [],
    price: "7.50",
    image: "/menu/guacamole-totopos.jpg",
    alt: tr(
      "Guacamole fresco con totopos",
      "Fresh guacamole with chips",
      "Frisches Guacamole mit Tortilla-Chips",
    ),
  },
  {
    slug: "elote-asado",
    cat: "entradas",
    name: tr("Elote asado", "Grilled street corn", "Gegrillter Maiskolben"),
    desc: tr(
      "Maíz a la parrilla, lima, queso y chile suave.",
      "Grilled corn, lime, cheese and mild chile.",
      "Gegrillter Mais, Limette, Käse und milder Chili.",
    ),
    ingredients: ["maíz", "lima", "queso", "chile"],
    allergens: ["milk"],
    price: "6.50",
    image: "/menu/elote-asado.jpg",
    alt: tr(
      "Elote a la parrilla con queso",
      "Grilled corn with cheese",
      "Gegrillter Mais mit Käse",
    ),
  },
  {
    slug: "flan-caramelo",
    cat: "postres",
    name: tr("Flan de caramelo", "Caramel flan", "Karamellflan"),
    desc: tr(
      "Flan casero de vainilla con caramelo dorado.",
      "Homemade vanilla custard with golden caramel.",
      "Hausgemachter Vanillepudding mit goldenem Karamell.",
    ),
    ingredients: ["huevo", "leche", "vainilla", "azúcar"],
    allergens: ["egg", "milk"],
    price: "5.90",
    image: "/menu/flan-caramelo.jpg",
    alt: tr(
      "Flan de vainilla con caramelo",
      "Vanilla flan with caramel",
      "Vanilleflan mit Karamell",
    ),
  },
  {
    slug: "churros-chocolate",
    cat: "postres",
    name: tr(
      "Churros con chocolate",
      "Churros and chocolate",
      "Churros mit Schokolade",
    ),
    desc: tr(
      "Churros crujientes con azúcar y salsa de chocolate.",
      "Crisp churros dusted with sugar and chocolate sauce.",
      "Knusprige Churros mit Zucker und Schokoladensauce.",
    ),
    ingredients: ["trigo", "azúcar", "chocolate"],
    allergens: ["gluten", "milk"],
    price: "6.20",
    image: "/menu/churros-chocolate.jpg",
    alt: tr(
      "Churros con azúcar y chocolate",
      "Churros with sugar and chocolate",
      "Churros mit Zucker und Schokolade",
    ),
  },
  {
    slug: "arroz-leche",
    cat: "postres",
    name: tr("Arroz con leche", "Cinnamon rice pudding", "Milchreis mit Zimt"),
    desc: tr(
      "Arroz cremoso con canela y un toque de naranja.",
      "Creamy rice pudding with cinnamon and a hint of orange.",
      "Cremiger Milchreis mit Zimt und einem Hauch Orange.",
    ),
    ingredients: ["arroz", "leche", "canela", "naranja"],
    allergens: ["milk"],
    price: "5.50",
    image: "/menu/arroz-leche.jpg",
    alt: tr(
      "Arroz con leche y canela",
      "Rice pudding with cinnamon",
      "Milchreis mit Zimt",
    ),
  },
  {
    slug: "agua-jamaica",
    cat: "bebidas",
    name: tr(
      "Agua de jamaica",
      "Hibiscus agua fresca",
      "Hibiskus-Erfrischungsgetränk",
    ),
    desc: tr(
      "Infusión fría de flor de jamaica con lima.",
      "Chilled hibiscus infusion with lime.",
      "Kalter Hibiskustee mit Limette.",
    ),
    ingredients: ["flor de jamaica", "lima", "agua"],
    allergens: [],
    price: "4.20",
    image: "/menu/agua-jamaica.jpg",
    alt: tr(
      "Agua fresca de jamaica",
      "Hibiscus agua fresca",
      "Erfrischendes Hibiskusgetränk",
    ),
  },
  {
    slug: "horchata",
    cat: "bebidas",
    name: tr("Horchata", "Horchata", "Horchata"),
    desc: tr(
      "Bebida fría de arroz, canela y vainilla.",
      "Chilled rice drink with cinnamon and vanilla.",
      "Kaltes Reisgetränk mit Zimt und Vanille.",
    ),
    ingredients: ["arroz", "canela", "vainilla", "leche"],
    allergens: ["milk"],
    price: "4.20",
    image: "/menu/horchata.jpg",
    alt: tr(
      "Vaso de horchata con canela",
      "Glass of horchata with cinnamon",
      "Glas Horchata mit Zimt",
    ),
  },
  {
    slug: "limonada-casa",
    cat: "bebidas",
    name: tr(
      "Limonada de la casa",
      "House limeade",
      "Hausgemachte Limettenlimonade",
    ),
    desc: tr(
      "Lima recién exprimida, agua con gas y hierbabuena.",
      "Freshly squeezed lime, sparkling water and mint.",
      "Frisch gepresste Limette, Mineralwasser und Minze.",
    ),
    ingredients: ["lima", "agua con gas", "hierbabuena"],
    allergens: [],
    price: "4.50",
    image: "/menu/limonada-casa.jpg",
    alt: tr(
      "Limonada de lima con hierbabuena",
      "Limeade with mint",
      "Limettenlimonade mit Minze",
    ),
  },
];

async function main() {
  for (const category of categories) {
    const saved = await db.category.upsert({
      where: { slug: category.slug },
      create: {
        slug: category.slug,
        name: category.name.es,
        sortOrder: category.sort,
        translations: {
          create: [
            { locale: "en", name: category.name.en },
            { locale: "de", name: category.name.de },
          ],
        },
      },
      update: {
        name: category.name.es,
        sortOrder: category.sort,
        active: true,
      },
    });
    for (const locale of ["en", "de"] as const) {
      await db.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: saved.id, locale } },
        create: { categoryId: saved.id, locale, name: category.name[locale] },
        update: { name: category.name[locale] },
      });
    }
  }

  for (const [sortOrder, item] of products.entries()) {
    const category = await db.category.findUniqueOrThrow({
      where: { slug: item.cat },
    });
    const base = {
      categoryId: category.id,
      name: item.name.es,
      description: item.desc.es,
      ingredients: item.ingredients,
      allergens: item.allergens,
      price: item.price,
      currency: "EUR",
      available: true,
      featured: Boolean(item.featured),
      sortOrder,
    };
    const product = await db.product.upsert({
      where: { slug: item.slug },
      create: {
        ...base,
        slug: item.slug,
        image: { create: { src: item.image, alt: item.alt.es } },
      },
      update: {
        ...base,
        image: {
          upsert: {
            create: { src: item.image, alt: item.alt.es },
            update: { src: item.image, alt: item.alt.es },
          },
        },
      },
    });
    const image = await db.productImage.findUniqueOrThrow({
      where: { productId: product.id },
    });
    for (const locale of ["en", "de"] as const) {
      await db.productImageTranslation.upsert({
        where: { imageId_locale: { imageId: image.id, locale } },
        create: { imageId: image.id, locale, alt: item.alt[locale] },
        update: { alt: item.alt[locale] },
      });
    }
    for (const locale of ["en", "de"] as const) {
      await db.productTranslation.upsert({
        where: { productId_locale: { productId: product.id, locale } },
        create: {
          productId: product.id,
          locale,
          name: item.name[locale],
          description: item.desc[locale],
        },
        update: { name: item.name[locale], description: item.desc[locale] },
      });
    }
  }

  const modifierGroups = [
    { id: "pv-salsas", required: false, minSelect: 0, maxSelect: 2, names: tr("Salsas (hasta 2)", "Salsas (up to 2)", "Salsas (bis zu 2)"), modifiers: [
      { id: "pv-salsa-verde", names: tr("Salsa verde", "Green salsa", "Grüne Salsa"), price: "0.00" },
      { id: "pv-salsa-roja", names: tr("Salsa roja", "Red salsa", "Rote Salsa"), price: "0.00" },
      { id: "pv-salsa-habanero", names: tr("Habanero", "Habanero", "Habanero"), price: "0.00" },
    ] },
    { id: "pv-extras", required: false, minSelect: 0, maxSelect: 3, names: tr("Extras", "Extras", "Extras"), modifiers: [
      { id: "pv-extra-guacamole", names: tr("Guacamole", "Guacamole", "Guacamole"), price: "2.50" },
      { id: "pv-extra-queso", names: tr("Queso extra", "Extra cheese", "Extra Käse"), price: "1.50" },
      { id: "pv-extra-crema", names: tr("Crema", "Crema", "Crema"), price: "1.00" },
    ] },
  ];
  for (const groupData of modifierGroups) {
    const group = await db.modifierGroup.upsert({ where: { id: groupData.id }, create: { id: groupData.id, name: groupData.names.es, required: groupData.required, minSelect: groupData.minSelect, maxSelect: groupData.maxSelect }, update: { name: groupData.names.es, required: groupData.required, minSelect: groupData.minSelect, maxSelect: groupData.maxSelect, active: true } });
    for (const locale of ["en", "de"] as const) await db.modifierGroupTranslation.upsert({ where: { groupId_locale: { groupId: group.id, locale } }, create: { groupId: group.id, locale, name: groupData.names[locale] }, update: { name: groupData.names[locale] } });
    for (const option of groupData.modifiers) {
      const modifier = await db.modifier.upsert({ where: { id: option.id }, create: { id: option.id, groupId: group.id, name: option.names.es, priceDelta: option.price }, update: { groupId: group.id, name: option.names.es, priceDelta: option.price, available: true } });
      for (const locale of ["en", "de"] as const) await db.modifierTranslation.upsert({ where: { modifierId_locale: { modifierId: modifier.id, locale } }, create: { modifierId: modifier.id, locale, name: option.names[locale] }, update: { name: option.names[locale] } });
    }
  }
  for (const item of products.filter((product) => ["tacos", "burritos", "quesadillas", "especialidades"].includes(product.cat))) {
    const product = await db.product.findUniqueOrThrow({ where: { slug: item.slug }, select: { id: true } });
    for (const groupId of ["pv-salsas", "pv-extras"]) await db.productModifierGroup.upsert({ where: { productId_groupId: { productId: product.id, groupId } }, create: { productId: product.id, groupId }, update: {} });
  }

  await db.restaurantSettings.upsert({
    where: { id: "pancho-villa-default" },
    create: {
      id: "pancho-villa-default",
      name: "Pancho Villa",
      currency: "EUR",
      taxRate: "0.00",
      deliveryFee: "2.50",
      minDeliveryAmount: "15.00",
    },
    update: {},
  });
  console.log(
    "Seed complete: " +
      categories.length +
      " categories and " +
      products.length +
      " products and " +
      modifierGroups.length +
      " customization groups.",
  );
}

main()
  .catch((error) => {
    console.error("Pancho Villa seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());

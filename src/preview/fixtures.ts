import pasta from './images/pasta.webp';
import bread from './images/bread.webp';
import pies from './images/cake.webp';
import pancakes from './images/pancakes.webp';
import harvest from './images/soup.webp';
import salad from './images/salad.webp';
import skillet from '../assets/stock-recipe.webp';

type Dish = {
  name: string;
  description: string;
  tags: string[];
  prepTime: string;
  imageUrl: string;
  ingredients: [string, string, string][];
  instructions: string[];
  utensils: string[];
};

export const previewDishes: Dish[] = [
  {
    name: 'Forest mushroom tagliatelle',
    description:
      'Golden mushrooms, ribbons of pasta, and a little sage butter. For the evenings that ask you to slow down.',
    tags: ['Comfort food', 'Vegetarian', 'Dinner'],
    prepTime: '00:35',
    imageUrl: pasta,
    ingredients: [
      ['Tagliatelle', '250', 'g'],
      ['Mixed mushrooms, sliced', '300', 'g'],
      ['Unsalted butter', '40', 'g'],
      ['Fresh sage', '6', 'leaves'],
      ['Parmesan, grated', '50', 'g'],
      ['Salt and black pepper', '', 'to taste'],
    ],
    instructions: [
      'Bring a large pan of salted water to a boil. Cook the tagliatelle according to the packet, reserving a mug of pasta water before draining.',
      'Heat half the butter in a wide frying pan over medium-high heat. Add the mushrooms in a single layer and cook for 8–10 minutes until golden, turning occasionally.',
      'Lower the heat, then add the remaining butter and sage. Let the butter foam gently for a minute, taking care not to burn it.',
      'Toss the pasta into the pan with the Parmesan and a splash of the reserved water. Stir until glossy, adding more water if needed. Season and serve immediately.',
    ],
    utensils: ['Large saucepan', 'Wide frying pan', 'Tongs', 'Grater'],
  },
  {
    name: 'Rosemary hearth bread',
    description:
      'A flour-dusted crust, a soft heart, and the scent of rosemary through the house. Best broken with friends.',
    tags: ['Baking', 'Slow cooking', 'Vegetarian'],
    prepTime: '02:30',
    imageUrl: bread,
    ingredients: [
      ['Strong bread flour', '500', 'g'],
      ['Instant yeast', '7', 'g'],
      ['Warm water', '325', 'ml'],
      ['Fine salt', '10', 'g'],
      ['Rosemary, chopped', '1', 'tbsp'],
      ['Olive oil', '1', 'tbsp'],
    ],
    instructions: [
      'Mix the flour, yeast, rosemary, and salt. Add the water and olive oil, then knead for 10 minutes until smooth and elastic.',
      'Cover the bowl and leave in a warm place for about an hour, until the dough has doubled in size.',
      'Shape into a round loaf on a floured baking tray. Cover and let rise for another 30 minutes. Heat the oven to 220°C / 425°F.',
      'Score the top and bake for 30–35 minutes until deeply golden. Cool on a rack before cutting.',
    ],
    utensils: ['Mixing bowl', 'Baking tray', 'Clean tea towel', 'Wire rack'],
  },
  {
    name: 'Little bramble berry pies',
    description:
      'The kind of treasure you bring home from the hedgerow. Sharp berries tucked under a buttery lattice.',
    tags: ['Dessert', 'Baking', 'Seasonal'],
    prepTime: '00:55',
    imageUrl: pies,
    ingredients: [
      ['Shortcrust pastry', '400', 'g'],
      ['Mixed berries', '350', 'g'],
      ['Caster sugar', '60', 'g'],
      ['Cornflour', '1', 'tbsp'],
      ['Lemon juice', '1', 'tbsp'],
      ['Egg, beaten', '1', ''],
    ],
    instructions: [
      'Heat the oven to 190°C / 375°F. Roll out two-thirds of the pastry and line four small tart tins.',
      'Toss the berries with the sugar, cornflour, and lemon juice. Divide the filling among the pastry cases.',
      'Cut the remaining pastry into strips and weave a loose lattice over each pie. Brush the pastry with beaten egg.',
      'Bake for 25–30 minutes until the pastry is golden and the filling bubbles. Cool for at least 15 minutes before serving.',
    ],
    utensils: [
      'Four small tart tins',
      'Rolling pin',
      'Mixing bowl',
      'Pastry brush',
    ],
  },
  {
    name: 'Golden Sunday pancakes',
    description:
      'A slow morning, a generous stack, and nowhere else to be. Pass the maple syrup.',
    tags: ['Breakfast', 'Comfort food', 'Quick meals'],
    prepTime: '00:25',
    imageUrl: pancakes,
    ingredients: [
      ['Plain flour', '150', 'g'],
      ['Baking powder', '2', 'tsp'],
      ['Milk', '180', 'ml'],
      ['Egg', '1', ''],
      ['Butter, melted', '25', 'g'],
      ['Maple syrup and fresh fruit', '', 'to serve'],
    ],
    instructions: [
      'Whisk the flour and baking powder in a bowl. In a jug, whisk the milk, egg, and melted butter.',
      'Fold the wet ingredients into the dry until just combined. A few lumps are fine. Rest the batter for 5 minutes.',
      'Warm a lightly buttered frying pan over medium heat. Add small ladlefuls of batter, leaving room between each pancake.',
      'Cook until bubbles appear and the edges set, then flip and cook for another minute or two. Stack and serve with syrup and fruit.',
    ],
    utensils: ['Mixing bowl', 'Whisk', 'Non-stick frying pan', 'Spatula'],
  },
  {
    name: 'The garden keeper’s bowl',
    description:
      'Roasted vegetables, tender grains, and everything good from the garden. A bright lunch for a busy day.',
    tags: ['Lunch', 'Vegetarian', 'Seasonal'],
    prepTime: '00:30',
    imageUrl: harvest,
    ingredients: [
      ['Couscous', '150', 'g'],
      ['Vegetable stock, boiling', '180', 'ml'],
      ['Mixed seasonal vegetables', '400', 'g'],
      ['Olive oil', '2', 'tbsp'],
      ['Lemon', '1', ''],
      ['Fresh parsley, chopped', '2', 'tbsp'],
    ],
    instructions: [
      'Heat the oven to 210°C / 410°F. Chop the vegetables into bite-sized pieces, toss with oil and salt, and roast for 20–25 minutes.',
      'Pour the boiling stock over the couscous. Cover and leave for 5 minutes, then fluff with a fork.',
      'Fold lemon juice and parsley through the couscous. Divide into bowls and top with the roasted vegetables.',
    ],
    utensils: ['Baking tray', 'Heatproof bowl', 'Fork'],
  },
  {
    name: 'Green goddess garden salad',
    description:
      'A generous handful of color. Crunchy leaves, creamy avocado, and a lemon dressing worth keeping.',
    tags: ['Vegan', 'Lunch', 'Quick meals'],
    prepTime: '00:15',
    imageUrl: salad,
    ingredients: [
      ['Mixed salad leaves', '100', 'g'],
      ['Avocado', '1', ''],
      ['Cherry tomatoes', '150', 'g'],
      ['Cooked chickpeas, drained', '200', 'g'],
      ['Lemon juice', '2', 'tbsp'],
      ['Extra virgin olive oil', '3', 'tbsp'],
    ],
    instructions: [
      'Wash and dry the salad leaves. Slice the avocado and halve the cherry tomatoes.',
      'Whisk the lemon juice and olive oil with a pinch of salt and black pepper.',
      'Arrange the leaves, avocado, tomatoes, and chickpeas in a wide bowl. Dress just before serving.',
    ],
    utensils: ['Salad bowl', 'Small jug', 'Knife'],
  },
  {
    name: 'The one-pan harvest supper',
    description:
      'Crisp vegetables and golden tofu in a glossy ginger glaze. One pan, a warm table, and very little washing up.',
    tags: ['Dinner', 'Vegan', 'Quick meals'],
    prepTime: '00:25',
    imageUrl: skillet,
    ingredients: [
      ['Firm tofu, pressed and cubed', '300', 'g'],
      ['Mixed stir-fry vegetables', '400', 'g'],
      ['Soy sauce', '2', 'tbsp'],
      ['Fresh ginger, grated', '1', 'tbsp'],
      ['Maple syrup', '1', 'tbsp'],
      ['Vegetable oil', '2', 'tbsp'],
    ],
    instructions: [
      'Pat the tofu dry. Heat the oil in a large pan over medium-high heat and fry the tofu for 8–10 minutes, turning until golden.',
      'Add the vegetables and stir-fry for 4–5 minutes until tender but still crisp.',
      'Mix the soy sauce, ginger, and maple syrup. Pour into the pan and toss for a minute until glossy. Serve with rice or warm bread.',
    ],
    utensils: ['Large frying pan or wok', 'Spatula', 'Small bowl'],
  },
];

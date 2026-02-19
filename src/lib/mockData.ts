import type { Restaurant } from "@/types";

import coverDefault from "@/assets/cover-default.jpg";
import foodBurger from "@/assets/food-burger.jpg";
import foodSalad from "@/assets/food-salad.jpg";
import foodPasta from "@/assets/food-pasta.jpg";
import foodDessert from "@/assets/food-dessert.jpg";
import foodDrinks from "@/assets/food-drinks.jpg";

export const mockRestaurants: Restaurant[] = [
  {
    id: "1",
    slug: "bella-cucina",
    name: "Bella Cucina",
    logo: "",
    coverImage: coverDefault,
    plan: "pro",
    active: true,
    totalViews: 1284,
    categories: [
      { id: "cat-1", name: "Burgers", order: 0 },
      { id: "cat-2", name: "Salads", order: 1 },
      { id: "cat-3", name: "Pasta", order: 2 },
      { id: "cat-4", name: "Desserts", order: 3 },
      { id: "cat-5", name: "Drinks", order: 4 },
    ],
    products: [
      { id: "p1", name: "Classic Cheeseburger", description: "Juicy beef patty with cheddar, lettuce, and tomato", price: 12.99, image: foodBurger, categoryId: "cat-1", available: true, order: 0 },
      { id: "p2", name: "Smoky BBQ Burger", description: "Smoked bacon, onion rings, and BBQ sauce", price: 14.99, image: foodBurger, categoryId: "cat-1", available: true, order: 1 },
      { id: "p3", name: "Mushroom Swiss Burger", description: "Sautéed mushrooms and Swiss cheese", price: 13.99, image: foodBurger, categoryId: "cat-1", available: false, order: 2 },
      { id: "p4", name: "Quinoa Power Bowl", description: "Fresh quinoa, avocado, cherry tomatoes, and herbs", price: 11.99, image: foodSalad, categoryId: "cat-2", available: true, order: 0 },
      { id: "p5", name: "Caesar Salad", description: "Romaine lettuce, parmesan, croutons, and dressing", price: 9.99, image: foodSalad, categoryId: "cat-2", available: true, order: 1 },
      { id: "p6", name: "Carbonara", description: "Creamy egg sauce with pancetta and parmesan", price: 15.99, image: foodPasta, categoryId: "cat-3", available: true, order: 0 },
      { id: "p7", name: "Penne Arrabbiata", description: "Spicy tomato sauce with garlic and chili", price: 13.49, image: foodPasta, categoryId: "cat-3", available: true, order: 1 },
      { id: "p8", name: "Chocolate Lava Cake", description: "Warm chocolate cake with molten center", price: 8.99, image: foodDessert, categoryId: "cat-4", available: true, order: 0 },
      { id: "p9", name: "Tiramisu", description: "Classic Italian coffee-flavored dessert", price: 7.99, image: foodDessert, categoryId: "cat-4", available: true, order: 1 },
      { id: "p10", name: "Fresh Orange Juice", description: "Freshly squeezed oranges", price: 4.99, image: foodDrinks, categoryId: "cat-5", available: true, order: 0 },
      { id: "p11", name: "Iced Coffee", description: "Cold brew with cream", price: 5.49, image: foodDrinks, categoryId: "cat-5", available: false, order: 1 },
    ],
  },
  {
    id: "2",
    slug: "sakura-sushi",
    name: "Sakura Sushi",
    logo: "",
    coverImage: coverDefault,
    plan: "basic",
    active: true,
    totalViews: 756,
    categories: [
      { id: "cat-10", name: "Rolls", order: 0 },
      { id: "cat-11", name: "Nigiri", order: 1 },
    ],
    products: [
      { id: "p20", name: "California Roll", description: "Crab, avocado, and cucumber", price: 10.99, image: foodSalad, categoryId: "cat-10", available: true, order: 0 },
      { id: "p21", name: "Salmon Nigiri", description: "Fresh Atlantic salmon", price: 8.99, image: foodSalad, categoryId: "cat-11", available: true, order: 0 },
    ],
  },
  {
    id: "3",
    slug: "le-petit-cafe",
    name: "Le Petit Café",
    logo: "",
    coverImage: coverDefault,
    plan: "pro",
    active: false,
    totalViews: 312,
    categories: [
      { id: "cat-20", name: "Coffee", order: 0 },
      { id: "cat-21", name: "Pastries", order: 1 },
    ],
    products: [
      { id: "p30", name: "Espresso", description: "Rich Italian espresso", price: 3.49, image: foodDrinks, categoryId: "cat-20", available: true, order: 0 },
      { id: "p31", name: "Croissant", description: "Buttery French pastry", price: 4.49, image: foodDessert, categoryId: "cat-21", available: true, order: 0 },
    ],
  },
];

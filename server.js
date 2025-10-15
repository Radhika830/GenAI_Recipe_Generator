// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const Recipe = require('./models/Recipe');

const app = express();

// ----------- MIDDLEWARE -----------
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve index.html, CSS, JS

// ----------- MONGODB CONNECTION -----------
mongoose.connect('mongodb://localhost:27017/recipe_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected successfully!'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ----------- API ROUTES -----------

// Get all recipes
app.get('/api/recipes', async (req, res) => {
  try {
    const recipes = await Recipe.find();
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recipes', error });
  }
});

// Add a new recipe
app.post('/api/recipes', async (req, res) => {
  try {
    const newRecipe = new Recipe(req.body);
    await newRecipe.save();
    res.status(201).json({ message: 'Recipe added successfully!' });
  } catch (error) {
    res.status(400).json({ message: 'Error adding recipe', error });
  }
});

// Generate a recipe based on ingredients and filters
app.post('/api/generate', async (req, res) => {
  const { ingredients, dietary, max_time, style } = req.body;

  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'Ingredients are required.' });
  }

  try {
    const query = {};

    // Match any of the ingredients (case-insensitive)
    query.ingredients = { $in: ingredients.map(i => new RegExp(i, 'i')) };

    // Optional filters
    if (dietary && dietary !== 'none') query.dietary = dietary;
    if (style && style !== 'any') query.cuisine = style;
    if (max_time) query.cooking_time = { $lte: max_time };

    const results = await Recipe.find(query);

    if (!results.length) {
      return res.status(404).json({
        title: "No exact match found",
        ingredients,
        steps: ["No matching recipe found. Try changing ingredients or filters."],
        time: max_time || 20,
        servings: 2,
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
        notes: "No recipe found in DB; showing placeholder."
      });
    }

    // Pick a random recipe if multiple results
    const recipe = results[Math.floor(Math.random() * results.length)];

    res.json({
      title: recipe.title,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      time: recipe.cooking_time,
      servings: recipe.servings,
      image: recipe.image_url,
      notes: `Fetched from recipe_db (${results.length} match${results.length > 1 ? 'es' : ''}).`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err });
  }
});

// ----------- START SERVER -----------
const PORT = 5000;
app.listen(PORT, () => console.log(` Server running on http://localhost:${PORT}`));

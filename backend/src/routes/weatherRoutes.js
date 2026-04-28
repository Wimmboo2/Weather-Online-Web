const express = require('express');
const router = express.Router();
const {
  currentByCity,
  forecastByCity,
  currentByCoords,
  forecastByCoords,
  reverseByCoords
} = require('../services/weatherService');

router.get('/current', async (req, res, next) => {
  try {
    const { city } = req.query;
    if (!city) {
      return res.status(400).json({ message: 'city is required' });
    }

    const data = await currentByCity(city);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

router.get('/forecast', async (req, res, next) => {
  try {
    const { city } = req.query;
    if (!city) {
      return res.status(400).json({ message: 'city is required' });
    }

    const data = await forecastByCity(city);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

router.get('/coords', async (req, res, next) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ message: 'lat and lon are required' });
    }

    const data = await currentByCoords(lat, lon);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

router.get('/forecast-coords', async (req, res, next) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ message: 'lat and lon are required' });
    }

    const data = await forecastByCoords(lat, lon);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

router.get('/reverse-geocode', async (req, res, next) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ message: 'lat and lon are required' });
    }

    const data = await reverseByCoords(lat, lon);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

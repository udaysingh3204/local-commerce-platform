const express = require('express');
const languageService = require('../services/languageService');

const router = express.Router();

/**
 * Language & Localization Routes
 * Public endpoints for frontend i18n
 */

/**
 * GET /api/language/supported
 * Get all supported languages
 */
router.get('/supported', (req, res) => {
  try {
    const languages = languageService.getSupportedLanguages();

    res.json({
      success: true,
      languages
    });
  } catch (err) {
    console.error('[LanguageRoutes] GET supported error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/language/:languageCode
 * Get language details
 */
router.get('/:languageCode', (req, res) => {
  try {
    const { languageCode } = req.params;
    const language = languageService.getLanguage(languageCode);

    if (!language) {
      return res.status(404).json({
        success: false,
        error: `Language '${languageCode}' not supported`
      });
    }

    res.json({
      success: true,
      language
    });
  } catch (err) {
    console.error('[LanguageRoutes] GET language error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/language/:languageCode/messages
 * Get all translated messages for a language
 */
router.get('/:languageCode/messages', (req, res) => {
  try {
    const { languageCode } = req.params;

    const language = languageService.getLanguage(languageCode);
    if (!language) {
      return res.status(404).json({
        success: false,
        error: `Language '${languageCode}' not supported`
      });
    }

    const messages = languageService.getLanguageMessages(languageCode);

    res.json({
      success: true,
      languageCode,
      messages
    });
  } catch (err) {
    console.error('[LanguageRoutes] GET messages error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/language/translate
 * Translate specific keys
 * Query: keys=order.status.pending,order.status.delivered&lang=hi
 */
router.get('/translate/keys', (req, res) => {
  try {
    const { keys, lang = 'en' } = req.query;

    if (!keys) {
      return res.status(400).json({
        success: false,
        error: 'keys parameter is required'
      });
    }

    const keyArray = typeof keys === 'string' ? keys.split(',') : keys;
    const translations = languageService.translateMany(keyArray, lang);

    res.json({
      success: true,
      language: lang,
      translations
    });
  } catch (err) {
    console.error('[LanguageRoutes] GET translate error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/language/format-currency/:amount
 * Format currency for language
 * Query: lang=hi
 */
router.get('/format-currency/:amount', (req, res) => {
  try {
    const { amount } = req.params;
    const { lang = 'en' } = req.query;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    const formatted = languageService.formatCurrency(parseFloat(amount), lang);

    res.json({
      success: true,
      amount: parseFloat(amount),
      language: lang,
      formatted
    });
  } catch (err) {
    console.error('[LanguageRoutes] GET format-currency error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/language/format-date
 * Format date for language
 * Query: date=2026-04-16&lang=hi
 */
router.get('/format-date', (req, res) => {
  try {
    const { date, lang = 'en' } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'date parameter is required'
      });
    }

    const formatted = languageService.formatDate(date, lang);

    res.json({
      success: true,
      date,
      language: lang,
      formatted
    });
  } catch (err) {
    console.error('[LanguageRoutes] GET format-date error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/language/detect
 * Detect language from Accept-Language header (or manual header param)
 */
router.get('/detect', (req, res) => {
  try {
    const { header } = req.query;
    const acceptLanguage = header || req.headers['accept-language'];

    const detected = languageService.detectLanguage(acceptLanguage);

    res.json({
      success: true,
      detected,
      acceptLanguage: acceptLanguage || null
    });
  } catch (err) {
    console.error('[LanguageRoutes] GET detect error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

/**
 * Multi-language Service - Support for Hindi, Tamil, Telugu, and English
 * Handles translations, RTL detection, regional formatting
 */
class LanguageService {
  constructor() {
    this.supportedLanguages = {
      en: {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        direction: 'ltr',
        dateFormat: 'DD/MM/YYYY',
        currency: 'INR',
        currencySymbol: '₹'
      },
      hi: {
        code: 'hi',
        name: 'Hindi',
        nativeName: 'हिन्दी',
        direction: 'ltr',
        dateFormat: 'DD/MM/YYYY',
        currency: 'INR',
        currencySymbol: '₹'
      },
      ta: {
        code: 'ta',
        name: 'Tamil',
        nativeName: 'தமிழ்',
        direction: 'ltr',
        dateFormat: 'DD/MM/YYYY',
        currency: 'INR',
        currencySymbol: '₹'
      },
      te: {
        code: 'te',
        name: 'Telugu',
        nativeName: 'తెలుగు',
        direction: 'ltr',
        dateFormat: 'DD/MM/YYYY',
        currency: 'INR',
        currencySymbol: '₹'
      }
    };

    // Translation dictionary
    this.translations = {
      // Common phrases
      'app.home': {
        en: 'Home',
        hi: 'होम',
        ta: 'வீடு',
        te: 'హోమ్'
      },
      'app.orders': {
        en: 'Orders',
        hi: 'ऑर्डर',
        ta: 'ஆர்டர்கள்',
        te: 'ఆర్డర్లు'
      },
      'app.cart': {
        en: 'Cart',
        hi: 'कार्ट',
        ta: 'கூடை',
        te: 'కార్ట్'
      },
      'app.checkout': {
        en: 'Checkout',
        hi: 'चेकआउट',
        ta: 'செலுத்துக',
        te: 'చెక్‌అవుట్'
      },
      'app.profile': {
        en: 'Profile',
        hi: 'प्रोफ़ाइल',
        ta: 'சுயவிவரம்',
        te: 'ప్రొఫైల్'
      },
      'app.settings': {
        en: 'Settings',
        hi: 'सेटिंग्स',
        ta: 'அமைப்புகள்',
        te: 'సెట్టింగ్‌లు'
      },
      'app.language': {
        en: 'Language',
        hi: 'भाषा',
        ta: 'மொழி',
        te: 'భాష'
      },

      // Order statuses
      'order.status.pending': {
        en: 'Order Placed',
        hi: 'ऑर्डर दिया गया',
        ta: 'ஆர்டர் வழங்கப்பட்டுள்ளது',
        te: 'ఆర్డర్ ఉంచబడింది'
      },
      'order.status.confirmed': {
        en: 'Confirmed',
        hi: 'पुष्ट',
        ta: 'உறுதிசெய்யப்பட்டுள்ளது',
        te: 'నిర్ధారిత'
      },
      'order.status.preparing': {
        en: 'Preparing',
        hi: 'तैयार किया जा रहा है',
        ta: 'தயாரிக்கப்படுகிறது',
        te: 'ఉపయోగ చేస్తున్నాము'
      },
      'order.status.outfordelivery': {
        en: 'Out for Delivery',
        hi: 'डिलीवरी के लिए बाहर',
        ta: 'வழங்குவதற்கு வெளியே',
        te: 'డెలివరీకి వెళ్ళారు'
      },
      'order.status.delivered': {
        en: 'Delivered',
        hi: 'वितरित',
        ta: 'வழங்கப்பட்டுள்ளது',
        te: 'డెలివర్ చేయబడింది'
      },
      'order.status.cancelled': {
        en: 'Cancelled',
        hi: 'रद्द',
        ta: 'ரद்து செய்யப்பட்டுள்ளது',
        te: 'రద్దు చేయబడింది'
      },

      // Delivery
      'delivery.eta': {
        en: 'Estimated Arrival',
        hi: 'अनुमानित आगमन',
        ta: 'மதிப்பிடப்பட்ட வருகை',
        te: 'అంచనా రాక'
      },
      'delivery.position': {
        en: 'Queue Position',
        hi: 'कतार की स्थिति',
        ta: 'வரிசை நிலை',
        te: 'క్యూ స్థితి'
      },
      'delivery.driver': {
        en: 'Driver',
        hi: 'ड्राइवर',
        ta: 'ஓட்டுநர்',
        te: 'డ్రైవర్'
      },

      // Payment
      'payment.method': {
        en: 'Payment Method',
        hi: 'भुगतान विधि',
        ta: 'பணம் செலுத்துவதற்கான முறை',
        te: 'చెల్లింపు పద్ధతి'
      },
      'payment.wallet': {
        en: 'Wallet',
        hi: 'बटुआ',
        ta: 'பணப்பை',
        te: 'ఖాళీ'
      },
      'payment.upi': {
        en: 'UPI',
        hi: 'यूपीआई',
        ta: 'யுபிআই',
        te: 'యూపీআই'
      },
      'payment.card': {
        en: 'Card',
        hi: 'कार्ड',
        ta: 'அட்டை',
        te: 'కార్డ్'
      },

      // Subscription
      'subscription.plan': {
        en: 'Plan',
        hi: 'योजना',
        ta: 'திட்டம்',
        te: 'ప్లాన్'
      },
      'subscription.free': {
        en: 'Free',
        hi: 'मुक्त',
        ta: 'இலவசம்',
        te: 'ఉచితం'
      },
      'subscription.plus': {
        en: 'Plus',
        hi: 'अतिरिक्त',
        ta: 'கூடுதல்',
        te: 'ప్లస్'
      },
      'subscription.premium': {
        en: 'Premium',
        hi: 'प्रीमियम',
        ta: 'பிரিமியம்',
        te: 'ప్రీమియం'
      },
      'subscription.elite': {
        en: 'Elite',
        hi: 'अभिजात',
        ta: 'உயர்',
        te: 'ఎలిట్'
      },

      // Support
      'support.contactus': {
        en: 'Contact Us',
        hi: 'हमसे संपर्क करें',
        ta: 'எங்களைத் தொடர்புகொள்ளுங்கள்',
        te: 'మమ్మల్ని సంధర్శించండి'
      },
      'support.faq': {
        en: 'FAQ',
        hi: 'अक्सर पूछे जाने वाले प्रश्न',
        ta: 'அடிக்கடி கேட்கப்படும் கேள்விகள்',
        te: 'తరచుగా అడిగే ప్రశ్నలు'
      },
      'support.chat': {
        en: 'Live Chat',
        hi: 'लाइव चैट',
        ta: 'நরம்பு அரட்டை',
        te: 'లైవ్ చాట్'
      },

      // Gamification
      'gamification.badges': {
        en: 'Badges',
        hi: 'बैज',
        ta: 'பதக்கங்கள்',
        te: 'బ్యాజ్‌లు'
      },
      'gamification.leaderboard': {
        en: 'Leaderboard',
        hi: 'लीडरबोर्ड',
        ta: 'தலைவர் பலகை',
        te: 'లీడర్‌బోర్డ్'
      },
      'gamification.rewards': {
        en: 'Rewards',
        hi: 'पुरस्कार',
        ta: 'பரிசுகள்',
        te: 'అవార్డులు'
      },

      // Common actions
      'action.save': {
        en: 'Save',
        hi: 'सहेजें',
        ta: 'சேமி',
        te: 'సేవ్ చేయండి'
      },
      'action.cancel': {
        en: 'Cancel',
        hi: 'रद्द करें',
        ta: 'இரத்து செய்யுங்கள்',
        te: 'రద్దు చేయండి'
      },
      'action.confirm': {
        en: 'Confirm',
        hi: 'पुष्ट करें',
        ta: 'உறுதிப்படுத்தவும்',
        te: 'నిర్ధారించండి'
      },
      'action.delete': {
        en: 'Delete',
        hi: 'हटाएं',
        ta: 'நீக்கவும்',
        te: 'తొలగించండి'
      },
      'action.edit': {
        en: 'Edit',
        hi: 'संपादित करें',
        ta: 'திருத்தவும்',
        te: 'సవరించండి'
      }
    };

    this.currencyFormats = {
      en: (amount) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`,
      hi: (amount) => `₹${amount.toLocaleString('hi-IN', { minimumFractionDigits: 0 })}`,
      ta: (amount) => `₹${amount.toLocaleString('ta-IN', { minimumFractionDigits: 0 })}`,
      te: (amount) => `₹${amount.toLocaleString('te-IN', { minimumFractionDigits: 0 })}`
    };
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages() {
    return Object.values(this.supportedLanguages);
  }

  /**
   * Get language details
   */
  getLanguage(languageCode) {
    return this.supportedLanguages[languageCode];
  }

  /**
   * Translate a key
   */
  translate(key, languageCode = 'en') {
    const translation = this.translations[key];
    if (!translation) {
      console.warn(`[LanguageService] Missing translation for key: ${key}`);
      return key;
    }

    return translation[languageCode] || translation.en || key;
  }

  /**
   * Translate multiple keys
   */
  translateMany(keys, languageCode = 'en') {
    const result = {};
    keys.forEach(key => {
      result[key] = this.translate(key, languageCode);
    });
    return result;
  }

  /**
   * Format currency for language
   */
  formatCurrency(amount, languageCode = 'en') {
    const formatter = this.currencyFormats[languageCode];
    if (!formatter) {
      return `₹${amount}`;
    }
    return formatter(amount);
  }

  /**
   * Format date for language
   */
  formatDate(date, languageCode = 'en') {
    const dateObj = new Date(date);
    const lang = this.supportedLanguages[languageCode];

    if (!lang) return dateObj.toLocaleDateString();

    // Use Intl for localized formatting
    return dateObj.toLocaleDateString(languageCode === 'en' ? 'en-IN' : `${languageCode}-IN`, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Get all messages for a language (for frontend i18n)
   */
  getLanguageMessages(languageCode = 'en') {
    const messages = {};
    Object.keys(this.translations).forEach(key => {
      messages[key] = this.translations[key][languageCode] || this.translations[key].en;
    });
    return messages;
  }

  /**
   * Add custom translation
   */
  addTranslation(key, translations) {
    if (!this.translations[key]) {
      this.translations[key] = {};
    }
    Object.assign(this.translations[key], translations);
  }

  /**
   * Detect language from Accept-Language header
   */
  detectLanguage(acceptLanguageHeader = '') {
    if (!acceptLanguageHeader) return 'en';

    const languages = acceptLanguageHeader.split(',').map(lang => {
      const [code, q] = lang.trim().split(';');
      return {
        code: code.split('-')[0].toLowerCase(),
        quality: parseFloat(q?.split('=')[1] || 1)
      };
    });

    languages.sort((a, b) => b.quality - a.quality);

    for (const { code } of languages) {
      if (this.supportedLanguages[code]) {
        return code;
      }
    }

    return 'en';
  }
}

// Export singleton
module.exports = new LanguageService();

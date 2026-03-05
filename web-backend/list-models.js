const axios = require('axios');
require('dotenv').config();

async function listModels() {
  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`
    );
    
    console.log('Available models:');
    for (const model of response.data.models) {
      console.log(`- ${model.name}`);
      console.log(`  Display Name: ${model.displayName}`);
      console.log(`  Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
      console.log('');
    }
  } catch (error) {
    console.error('Error listing models:', error.response?.data || error.message);
  }
}

listModels();

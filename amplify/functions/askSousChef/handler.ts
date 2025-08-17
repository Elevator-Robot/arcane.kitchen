import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: "us-east-1" });

export const handler = async (event: any) => {
  console.log('🔮 askSousChef function called with event:', JSON.stringify(event, null, 2));
  
  try {
    const { message } = event.arguments;
    console.log('📝 Processing message:', message);
    
    if (!message) {
      throw new Error('No message provided');
    }
    
    const systemPrompt = `You are the Mystical Sous Chef of Arcane Kitchen, a wise and magical culinary companion. 
    You help users discover recipes, customize them to their taste, and explore the magical properties of ingredients.
    
    Your personality is warm, knowledgeable, and slightly mystical. You speak with the wisdom of ancient culinary traditions
    while being practical and helpful. You can:
    
    - Suggest recipes based on ingredients, dietary restrictions, or magical properties
    - Help modify existing recipes to accommodate different needs
    - Explain the culinary and magical properties of herbs and ingredients
    - Guide users through cooking techniques
    - Share knowledge about seasonal ingredients and traditional cooking methods
    
    Always be encouraging and make cooking feel like a magical, creative process.`;

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: message
        }
      ]
    };

    console.log('🚀 Calling Bedrock with payload:', JSON.stringify(payload, null, 2));

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-haiku-20241022-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload)
    });

    console.log('📡 Sending command to Bedrock...');
    const response = await client.send(command);
    console.log('📨 Bedrock response received:', response);
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('📖 Parsed response body:', JSON.stringify(responseBody, null, 2));
    
    const aiResponse = responseBody.content[0].text;
    console.log('🤖 AI response:', aiResponse);
    
    return aiResponse;
  } catch (error) {
    console.error("💥 Error in askSousChef function:", error);
    
    // Type guard to safely access error properties
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : {
      name: 'UnknownError',
      message: String(error),
      stack: undefined
    };
    
    console.error("Error details:", errorDetails);
    
    // Return a more specific error message based on the error type
    if (errorDetails.name === 'AccessDeniedException') {
      return "I'm having trouble accessing my magical powers. The kitchen administrator needs to grant me permission to use the mystical arts.";
    } else if (errorDetails.name === 'ValidationException') {
      return "There seems to be an issue with how I'm trying to cast this culinary spell. Let me try a different approach.";
    } else {
      return `I apologize, but I'm having trouble accessing my magical cookbook at the moment. Error: ${errorDetails.message}`;
    }
  }
};

# Recipe Bot Interface Rules - Arcane Kitchen

## Bot Purpose
Create an AI-powered conversational interface that generates personalized recipes based on user input and preferences through natural dialogue.

## Core Functionality
- **Conversational Recipe Creation**: Take user input through chat and generate custom recipes
- **Preference Learning**: Understand dietary restrictions, cuisine preferences, ingredient availability
- **Interactive Refinement**: Allow users to modify and adjust recipes through conversation
- **Recipe Persistence**: Save generated recipes to user's Grimoire (personal cookbook)

## Bot Behavior
- **Mystical Persona**: Embody the "Mystical Sous Chef" character with magical culinary wisdom
- **Adaptive Responses**: Adjust recipe complexity based on user cooking skill level
- **Ingredient Substitution**: Suggest alternatives for unavailable or restricted ingredients
- **Seasonal Awareness**: Recommend seasonal ingredients and preparations
- **Cultural Sensitivity**: Respect traditional recipes while offering creative variations

## Technical Implementation
- **AWS Amplify Gen2 Conversations**: Use Amplify AI conversation features
- **Bedrock Integration**: Leverage AWS Bedrock for recipe generation and refinement
- **GraphQL Integration**: Save generated recipes using existing Recipe model
- **Real-time Chat**: Implement streaming responses for natural conversation flow
- **Context Persistence**: Maintain conversation history and user preferences

## User Experience Flow
1. **Initial Greeting**: Welcome user with mystical chef persona
2. **Preference Gathering**: Ask about dietary needs, cuisine interests, available ingredients
3. **Recipe Generation**: Create custom recipe based on conversation context
4. **Interactive Refinement**: Allow modifications through natural language
5. **Recipe Finalization**: Format and save completed recipe to user's collection

## Integration Points
- **Recipe Model**: Use existing GraphQL Recipe schema for persistence
- **User Authentication**: Integrate with Cognito for personalized experiences
- **Conversation History**: Store chat sessions for future reference
- **Community Sharing**: Option to share AI-generated recipes with Coven community

## Response Guidelines
- Use magical/mystical terminology consistently
- Provide clear, actionable cooking instructions
- Include ingredient measurements and cooking times
- Suggest presentation and serving recommendations
- Offer cooking tips and techniques when relevant
